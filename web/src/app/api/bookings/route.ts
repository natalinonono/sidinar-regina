import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isMassToleranceExpired } from '@/lib/utils/time'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('schedule_id')
    const userId = searchParams.get('user_id')
    const week = searchParams.get('week')

    const supabase = await createClient()

    let query = supabase
      .from('bookings')
      .select('*, schedule:mass_schedules(*), profile:profiles(*)')
      .order('created_at', { ascending: false })

    if (scheduleId) {
      query = query.eq('schedule_id', scheduleId)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (week) {
      query = query.eq('minggu_ke', parseInt(week, 10))
    }

    const { data: bookings, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Auto-update bookings yang telah melewati toleransi misa (120 menit pasca jam mulai)
    if (bookings && bookings.length > 0) {
      const expiredIds: string[] = []
      const now = new Date()

      for (const b of bookings as any[]) {
        if (
          b.status_kehadiran === 'terdaftar' &&
          b.schedule &&
          isMassToleranceExpired(b.schedule.tanggal_misa, b.schedule.jam_mulai, now)
        ) {
          b.status_kehadiran = 'alpa'
          expiredIds.push(b.id)
        }
      }

      if (expiredIds.length > 0) {
        try {
          const adminSupabase = createAdminClient()
          await (adminSupabase as any)
            .from('bookings')
            .update({ status_kehadiran: 'alpa' })
            .in('id', expiredIds)
        } catch {
          // Non-blocking background sync
        }
      }
    }

    return NextResponse.json({ bookings })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await request.json()
    const { schedule_id, posisi_tugas, user_id } = body

    let effectiveUserId = user?.id

    if (!effectiveUserId && user_id) {
      const adminSupabase = createAdminClient()
      const { data: profile } = await (adminSupabase as any)
        .from('profiles')
        .select('id, status')
        .eq('id', user_id)
        .eq('status', 'aktif')
        .maybeSingle()
      if (profile) {
        effectiveUserId = profile.id
      }
    }

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Autentikasi diperlukan. Silakan login kembali.' }, { status: 401 })
    }

    if (!schedule_id) {
      return NextResponse.json({ error: 'Jadwal misa (schedule_id) wajib dipilih.' }, { status: 400 })
    }

    // Insert booking using createAdminClient to ensure database trigger trg_validate_booking
    // can lock mass_schedules FOR UPDATE atomically without being blocked by RLS
    const adminSupabase = createAdminClient()
    const { data: newBooking, error } = await (adminSupabase as any)
      .from('bookings')
      .insert({
        schedule_id,
        user_id: effectiveUserId,
        posisi_tugas: posisi_tugas || 'Petugas Altar',
        status_kehadiran: 'terdaftar',
      })
      .select('*, schedule:mass_schedules(*)')
      .single()

    if (error) {
      // Check for custom exception messages from the database trigger
      if (error.message.includes('sudah penuh')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.message.includes('belum disetujui')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.code === '23505') { // Postgres unique_violation
        return NextResponse.json(
          { error: 'Anda sudah memiliki pendaftaran untuk kategori misa ini pada pekan tersebut (Batas: 1x seminggu).' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran tugas misa berhasil dicatat!',
      booking: newBooking,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses pendaftaran tugas.' }, { status: 500 })
  }
}

// PATCH: Mengubah jadwal tugas (pindah ke jadwal misa lain atau update posisi)
// Keamanan: Hanya pemilik booking yang bersangkutan (atau pengurus) yang dapat mengubah!
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await request.json()
    const bookingId = body.booking_id || body.id
    const newScheduleId = body.new_schedule_id || body.schedule_id
    const posisiTugas = body.posisi_tugas || 'Petugas Altar'
    const requestUserId = body.user_id

    let effectiveUserId = user?.id
    if (!effectiveUserId && requestUserId) {
      const adminSupabase = createAdminClient()
      const { data: profile } = await (adminSupabase as any)
        .from('profiles')
        .select('id, status')
        .eq('id', requestUserId)
        .eq('status', 'aktif')
        .maybeSingle()
      if (profile) {
        effectiveUserId = profile.id
      }
    }

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Autentikasi diperlukan. Silakan login kembali.' }, { status: 401 })
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'ID penugasan (booking_id) wajib disertakan.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Ambil data booking yang ingin diubah
    const { data: existingBooking, error: fetchErr } = await (adminSupabase as any)
      .from('bookings')
      .select('*, schedule:mass_schedules(*)')
      .eq('id', bookingId)
      .single()

    if (fetchErr || !existingBooking) {
      return NextResponse.json({ error: 'Jadwal tugas tidak ditemukan.' }, { status: 404 })
    }

    // 2. CEK KEPEMILIKAN: Misdinar hanya boleh mengedit jadwal miliknya sendiri!
    const { data: profile } = await (adminSupabase as any)
      .from('profiles')
      .select('role')
      .eq('id', effectiveUserId)
      .single()

    const isPengurus = profile?.role === 'pengurus'
    if (existingBooking.user_id !== effectiveUserId && !isPengurus) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda hanya dapat mengedit jadwal tugas milik Anda sendiri.' },
        { status: 403 }
      )
    }

    if (existingBooking.status_kehadiran === 'hadir') {
      return NextResponse.json(
        { error: 'Jadwal tugas yang sudah dipresensi / selesai tidak dapat diubah.' },
        { status: 400 }
      )
    }

    // 3. Jika berpindah jadwal ke misa lain:
    if (newScheduleId && newScheduleId !== existingBooking.schedule_id) {
      // Ambil detail jadwal misa tujuan
      const { data: targetSchedule, error: targetErr } = await (adminSupabase as any)
        .from('mass_schedules')
        .select('*')
        .eq('id', newScheduleId)
        .single()

      if (targetErr || !targetSchedule) {
        return NextResponse.json({ error: 'Jadwal misa tujuan tidak ditemukan.' }, { status: 404 })
      }

      // Hitung keterisian kuota jadwal tujuan
      const { count: currentTargetBooked, error: countErr } = await (adminSupabase as any)
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_id', newScheduleId)

      if ((currentTargetBooked || 0) >= targetSchedule.kuota_maksimal && !isPengurus) {
        return NextResponse.json(
          { error: `Jadwal misa tujuan (${targetSchedule.judul_misa}) sudah penuh.` },
          { status: 409 }
        )
      }

      // Lakukan pemindahan jadwal atomik
      const { data: updatedBooking, error: updateErr } = await (adminSupabase as any)
        .from('bookings')
        .update({
          schedule_id: targetSchedule.id,
          kategori_misa: targetSchedule.kategori,
          minggu_ke: targetSchedule.minggu_ke,
          tahun: targetSchedule.tahun,
          posisi_tugas: posisiTugas,
          status_kehadiran: 'terdaftar',
        })
        .eq('id', bookingId)
        .select('*, schedule:mass_schedules(*)')
        .single()

      if (updateErr) {
        if (updateErr.code === '23505') {
          return NextResponse.json(
            { error: 'Anda sudah terdaftar pada kategori misa ini pada pekan tersebut.' },
            { status: 409 }
          )
        }
        return NextResponse.json({ error: updateErr.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Jadwal tugas misa berhasil dipindahkan ke jadwal baru!',
        booking: updatedBooking,
      })
    } else {
      // Update posisi tugas saja
      const { data: updatedBooking, error: updateErr } = await (adminSupabase as any)
        .from('bookings')
        .update({ posisi_tugas: posisiTugas })
        .eq('id', bookingId)
        .select('*, schedule:mass_schedules(*)')
        .single()

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Data tugas misa berhasil diperbarui!',
        booking: updatedBooking,
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengubah jadwal tugas.' }, { status: 500 })
  }
}

// DELETE: Membatalkan jadwal tugas misa
// Keamanan: Hanya pemilik booking yang bersangkutan (atau pengurus) yang dapat membatalkan!
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    let bookingId = searchParams.get('id') || searchParams.get('booking_id')
    const queryUserId = searchParams.get('user_id')

    if (!bookingId) {
      try {
        const body = await request.json()
        bookingId = body.booking_id || body.id
      } catch {}
    }

    let effectiveUserId = user?.id
    if (!effectiveUserId && queryUserId) {
      const adminSupabase = createAdminClient()
      const { data: profile } = await (adminSupabase as any)
        .from('profiles')
        .select('id, status')
        .eq('id', queryUserId)
        .eq('status', 'aktif')
        .maybeSingle()
      if (profile) {
        effectiveUserId = profile.id
      }
    }

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Autentikasi diperlukan. Silakan login kembali.' }, { status: 401 })
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'ID penugasan (id) wajib disertakan.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Ambil data booking yang ingin dibatalkan
    const { data: existingBooking, error: fetchErr } = await (adminSupabase as any)
      .from('bookings')
      .select('*, schedule:mass_schedules(*)')
      .eq('id', bookingId)
      .single()

    if (fetchErr || !existingBooking) {
      return NextResponse.json({ error: 'Jadwal tugas tidak ditemukan.' }, { status: 404 })
    }

    // 2. CEK KEPEMILIKAN: Misdinar hanya boleh membatalkan jadwal miliknya sendiri!
    const { data: profile } = await (adminSupabase as any)
      .from('profiles')
      .select('role')
      .eq('id', effectiveUserId)
      .single()

    const isPengurus = profile?.role === 'pengurus'
    if (existingBooking.user_id !== effectiveUserId && !isPengurus) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda hanya dapat membatalkan jadwal tugas milik Anda sendiri.' },
        { status: 403 }
      )
    }

    if (existingBooking.status_kehadiran === 'hadir') {
      return NextResponse.json(
        { error: 'Jadwal tugas yang sudah dipresensi / selesai tidak dapat dibatalkan.' },
        { status: 400 }
      )
    }

    // 3. Hapus booking untuk mengembalikan kuota misa
    const { error: deleteErr } = await (adminSupabase as any)
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal tugas misa berhasil dibatalkan. Kuota telah dikembalikan untuk misdinar lain.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membatalkan jadwal tugas.' }, { status: 500 })
  }
}
