import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateCheckinWindow, isMassToleranceExpired } from '@/lib/utils/time'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    // Fetch booking along with schedule details
    const { data: booking, error: bookingErr } = await (supabase.from('bookings') as any)
      .select('*, schedule:mass_schedules(*)')
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking || !booking.schedule) {
      return NextResponse.json({ error: 'Data pendaftaran tugas tidak ditemukan.' }, { status: 404 })
    }

    // Check if user is owner or pengurus
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single()

    const isPengurus = (profile as any)?.role === 'pengurus'
    if (booking.user_id !== user.id && !isPengurus) {
      return NextResponse.json({ error: 'Anda tidak memiliki hak akses untuk presensi tugas ini.' }, { status: 403 })
    }

    const now = new Date()

    // Cek batas toleransi akhir (durasi misa ~75 menit + 45 menit toleransi pasca misa = 120 menit)
    if (isMassToleranceExpired(booking.schedule.tanggal_misa, booking.schedule.jam_mulai, now)) {
      await (supabase.from('bookings') as any)
        .update({ status_kehadiran: 'alpa' })
        .eq('id', bookingId)

      return NextResponse.json({
        allowed: false,
        status: 'alpa',
        error: 'Batas waktu toleransi presensi telah berakhir (45 menit pasca misa). Status tugas otomatis tercatat Alpa.',
      }, { status: 400 })
    }

    // Evaluate checkin window
    const evaluation = evaluateCheckinWindow(
      booking.schedule.tanggal_misa,
      booking.schedule.jam_mulai,
      booking.schedule.kategori,
      now
    )

    if (!evaluation.allowed && !isPengurus) {
      return NextResponse.json({
        allowed: false,
        status: evaluation.status,
        error: evaluation.message,
      }, { status: 400 })
    }

    // Determine final status
    const finalStatus = evaluation.status === 'terlambat' ? 'terlambat' : 'hadir'

    // Update booking record
    const { data: updatedBooking, error: updateErr } = await (supabase.from('bookings') as any)
      .from('bookings')
      .update({
        status_kehadiran: finalStatus,
        waktu_checkin: now.toISOString(),
      })
      .eq('id', bookingId)
      .select('*, schedule:mass_schedules(*)')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      status: finalStatus,
      message: evaluation.message,
      booking: updatedBooking,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses presensi sakristi.' }, { status: 500 })
  }
}
