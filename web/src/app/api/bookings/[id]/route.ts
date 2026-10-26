import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // 1. Ambil data booking
    const { data: existingBooking, error: fetchErr } = await (adminSupabase as any)
      .from('bookings')
      .select('*, schedule:mass_schedules(*)')
      .eq('id', id)
      .single()

    if (fetchErr || !existingBooking) {
      return NextResponse.json({ error: 'Jadwal tugas tidak ditemukan.' }, { status: 404 })
    }

    // 2. CEK KEPEMILIKAN: Misdinar hanya boleh membatalkan jadwal miliknya sendiri!
    const { data: profile } = await (adminSupabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isPengurus = profile?.role === 'pengurus'
    if (existingBooking.user_id !== user.id && !isPengurus) {
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

    // 3. Hapus booking
    const { error: deleteErr } = await (adminSupabase as any)
      .from('bookings')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal tugas misa berhasil dibatalkan.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membatalkan jadwal tugas.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const body = await request.json()
    const newScheduleId = body.new_schedule_id || body.schedule_id
    const posisiTugas = body.posisi_tugas || 'Petugas Altar'

    const adminSupabase = createAdminClient()

    // 1. Ambil data booking
    const { data: existingBooking, error: fetchErr } = await (adminSupabase as any)
      .from('bookings')
      .select('*, schedule:mass_schedules(*)')
      .eq('id', id)
      .single()

    if (fetchErr || !existingBooking) {
      return NextResponse.json({ error: 'Jadwal tugas tidak ditemukan.' }, { status: 404 })
    }

    // 2. CEK KEPEMILIKAN
    const { data: profile } = await (adminSupabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isPengurus = profile?.role === 'pengurus'
    if (existingBooking.user_id !== user.id && !isPengurus) {
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
      const { data: targetSchedule, error: targetErr } = await (adminSupabase as any)
        .from('mass_schedules')
        .select('*')
        .eq('id', newScheduleId)
        .single()

      if (targetErr || !targetSchedule) {
        return NextResponse.json({ error: 'Jadwal misa tujuan tidak ditemukan.' }, { status: 404 })
      }

      const { count: currentTargetBooked } = await (adminSupabase as any)
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_id', newScheduleId)

      if ((currentTargetBooked || 0) >= targetSchedule.kuota_maksimal && !isPengurus) {
        return NextResponse.json(
          { error: `Jadwal misa tujuan (${targetSchedule.judul_misa}) sudah penuh.` },
          { status: 409 }
        )
      }

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
        .eq('id', id)
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
      const { data: updatedBooking, error: updateErr } = await (adminSupabase as any)
        .from('bookings')
        .update({ posisi_tugas: posisiTugas })
        .eq('id', id)
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
