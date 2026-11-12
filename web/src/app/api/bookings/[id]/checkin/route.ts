import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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

    const adminSupabase = createAdminClient()

    // Fetch booking along with schedule details
    const { data: booking, error: bookingErr } = await (adminSupabase.from('bookings') as any)
      .select('*, schedule:mass_schedules(*)')
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking || !booking.schedule) {
      return NextResponse.json({ error: 'Data pendaftaran tugas tidak ditemukan.' }, { status: 404 })
    }

    // Check if user is owner or active pengurus
    const { data: profile } = await (adminSupabase.from('profiles') as any)
      .select('role, status')
      .eq('id', user.id)
      .single()

    const isPengurus = (profile as any)?.role === 'pengurus' && (profile as any)?.status === 'aktif'
    if (booking.user_id !== user.id && !isPengurus) {
      return NextResponse.json({ error: 'Anda tidak memiliki hak akses untuk presensi tugas ini.' }, { status: 403 })
    }

    if (booking.status_kehadiran === 'hadir' || booking.status_kehadiran === 'terlambat') {
      return NextResponse.json({
        success: true,
        already_checked_in: true,
        status: booking.status_kehadiran,
        message: `Presensi sudah tercatat sebelumnya (${booking.status_kehadiran === 'hadir' ? 'Hadir Tepat Waktu' : 'Terlambat'}).`,
        booking,
      })
    }

    const now = new Date()

    // Cek batas toleransi akhir (+45 menit toleransi pasca misa: 75m untuk harian, 120m untuk mingguan)
    if (isMassToleranceExpired(booking.schedule.tanggal_misa, booking.schedule.jam_mulai, booking.schedule.kategori, now)) {
      await (adminSupabase.from('bookings') as any)
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
    const { data: updatedBooking, error: updateErr } = await (adminSupabase.from('bookings') as any)
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
