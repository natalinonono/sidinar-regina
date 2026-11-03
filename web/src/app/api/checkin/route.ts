import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { evaluateCheckinWindow, isMassToleranceExpired } from '@/lib/utils/time'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const body = await request.json()
    const { qr_data, booking_id, code } = body

    const rawInput = (qr_data || booking_id || code || '').trim()
    if (!rawInput) {
      return NextResponse.json({ error: 'Data QR Code atau ID Tugas tidak boleh kosong.' }, { status: 400 })
    }

    let targetBookingId = ''
    if (rawInput.startsWith('SIDINAR:')) {
      const parts = rawInput.split(':')
      targetBookingId = parts[1] || ''
    } else {
      targetBookingId = rawInput
    }

    const admin = createAdminClient()

    let booking: any = null
    const { data: directBooking } = await (admin.from('bookings') as any)
      .select('*, profile:profiles(*), schedule:mass_schedules(*)')
      .eq('id', targetBookingId)
      .maybeSingle()

    booking = directBooking

    // Jika belum ketemu dan panjangnya >= 8 karakter, coba cari dengan prefix
    if (!booking && targetBookingId.length >= 8) {
      const { data: prefixBookings } = await (admin.from('bookings') as any)
        .select('*, profile:profiles(*), schedule:mass_schedules(*)')
        .like('id', `${targetBookingId}%`)
        .limit(1)

      if (prefixBookings && prefixBookings.length > 0) {
        booking = prefixBookings[0]
      }
    }

    if (!booking || !booking.schedule) {
      return NextResponse.json(
        { error: 'Data pendaftaran tugas altar tidak ditemukan. Pastikan QR code valid.' },
        { status: 404 }
      )
    }

    // Verifikasi hak akses: pengurus atau pemilik booking
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isPengurus = (callerProfile as any)?.role === 'pengurus'
    if (booking.user_id !== user.id && !isPengurus) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengurus atau petugas bersangkutan yang dapat memindai presensi.' },
        { status: 403 }
      )
    }

    const now = new Date()

    // Cek batas toleransi akhir (+45 menit setelah perkiraan misa selesai)
    if (isMassToleranceExpired(booking.schedule.tanggal_misa, booking.schedule.jam_mulai, booking.schedule.kategori, now)) {
      await (admin.from('bookings') as any)
        .update({ status_kehadiran: 'alpa' })
        .eq('id', booking.id)

      return NextResponse.json(
        {
          allowed: false,
          status: 'alpa',
          error: `Batas waktu toleransi presensi telah berakhir (+45 menit pasca misa). Tugas ${booking.profile?.nama_lengkap || 'petugas'} otomatis tercatat Alpa.`,
        },
        { status: 400 }
      )
    }

    // Evaluasi jendela presensi (apakah tepat waktu atau terlambat)
    const evaluation = evaluateCheckinWindow(
      booking.schedule.tanggal_misa,
      booking.schedule.jam_mulai,
      booking.schedule.kategori,
      now
    )

    // Jika belum dibuka dan bukan pengurus, tolak
    if (!evaluation.allowed && !isPengurus) {
      return NextResponse.json(
        {
          allowed: false,
          status: evaluation.status,
          error: evaluation.message,
        },
        { status: 400 }
      )
    }

    const finalStatus = evaluation.status === 'terlambat' ? 'terlambat' : 'hadir'

    // Update status kehadiran
    const { data: updatedBooking, error: updateErr } = await (admin.from('bookings') as any)
      .update({
        status_kehadiran: finalStatus,
        waktu_checkin: now.toISOString(),
      })
      .eq('id', booking.id)
      .select('*, profile:profiles(*), schedule:mass_schedules(*)')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      status: finalStatus,
      message: `Presensi Berhasil! ${booking.profile?.nama_lengkap || 'Petugas'} (${finalStatus === 'hadir' ? 'Tepat Waktu' : 'Terlambat'})`,
      petugas: {
        id: booking.id,
        nama: booking.profile?.nama_lengkap || 'Petugas Altar',
        misa: booking.schedule.judul_misa,
        jam: booking.schedule.jam_mulai,
        posisi: booking.posisi_tugas || 'Petugas Altar',
        status: finalStatus,
        waktu_checkin: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
      booking: updatedBooking,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan sistem saat memproses presensi.' },
      { status: 500 }
    )
  }
}
