import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi login tidak valid' }, { status: 401 })
    }

    // Ambil tanggal hari ini dalam format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]

    // 1. Ambil penugasan mendatang yang sudah diingatkan (wa_reminder_sent = true)
    const { data: reminderBookings, error: bError } = await (supabase as any)
      .from('bookings')
      .select('*, schedule:mass_schedules(*)')
      .eq('user_id', user.id)
      .eq('wa_reminder_sent', true)
      .order('created_at', { ascending: false })

    // 2. Ambil pengumuman sakristi terbaru
    const { data: announcements, error: aError } = await (supabase as any)
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    const notifications: any[] = []

    // Format notifikasi pengingat misa
    if (reminderBookings && reminderBookings.length > 0) {
      reminderBookings.forEach((b: any) => {
        // Hanya tampilkan jika jadwal misa belum lewat (atau tanggal hari ini ke atas)
        if (b.schedule && (!b.schedule.tanggal_misa || b.schedule.tanggal_misa >= today)) {
          notifications.push({
            id: `reminder-${b.id}`,
            booking_id: b.id,
            schedule_id: b.schedule_id,
            type: 'reminder',
            title: `🔔 Pengingat Tugas: ${b.schedule.kategori?.toUpperCase()} (${b.posisi_tugas || 'Petugas Altar'})`,
            message: `Pengurus Sakristi mengingatkan tugas altar pada ${b.schedule.tanggal_misa || ''} pukul ${b.schedule.jam_mulai || ''} WIB. Harap hadir di sakristi paling lambat 30 menit sebelum misa.`,
            schedule: b.schedule,
            created_at: b.created_at,
            is_active: true,
          })
        }
      })
    }

    // Format notifikasi pengumuman
    if (announcements && announcements.length > 0) {
      announcements.forEach((a: any) => {
        notifications.push({
          id: `announcement-${a.id}`,
          type: 'announcement',
          title: `📢 ${a.judul}`,
          message: a.isi,
          created_at: a.created_at,
          is_pinned: a.is_pinned,
        })
      })
    }

    return NextResponse.json({
      success: true,
      notifications,
      unread_count: notifications.filter((n) => n.type === 'reminder').length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memuat notifikasi' },
      { status: 500 }
    )
  }
}
