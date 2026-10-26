import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWhatsAppReminderMessage } from '@/lib/utils/calendar'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const adminSupabase = createAdminClient()

    // 1. Ambil data booking beserta relasi schedule dan profile
    const { data: booking, error: fetchErr } = await (adminSupabase as any)
      .from('bookings')
      .select('*, schedule:mass_schedules(*), profile:profiles(*)')
      .eq('id', id)
      .single()

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Data penugasan tidak ditemukan.' }, { status: 404 })
    }

    // 2. Tandai wa_reminder_sent = true
    const { error: updateErr } = await (adminSupabase as any)
      .from('bookings')
      .update({ wa_reminder_sent: true })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    // 3. Buat URL WhatsApp & pesan otomatis jika data lengkap
    let waUrl = ''
    let message = ''
    if (booking.schedule && booking.profile) {
      const waInfo = generateWhatsAppReminderMessage(booking.schedule, booking.profile)
      waUrl = waInfo.waUrl
      message = waInfo.message
    }

    const memberName = booking.profile?.nama_panggilan || booking.profile?.nama_lengkap || 'Misdinar'
    const scheduleTitle = booking.schedule?.kategori ? booking.schedule.kategori.toUpperCase() : 'Misa'
    const notifTitle = `🔔 Pengingat Tugas: Misa ${scheduleTitle}`
    const notifBody = `Halo ${memberName}, pengurus sakristi mengingatkan tugas altar pada ${booking.schedule?.tanggal_misa || ''} pukul ${booking.schedule?.jam_mulai || ''} WIB (${booking.posisi_tugas || 'Petugas Altar'}). Harap hadir di sakristi H-30 menit!`

    // 4. Broadcast via Supabase Realtime agar web dan handphone otomatis menerima notifikasi
    try {
      const channel = adminSupabase.channel('reminders-broadcast')
      await new Promise<void>((resolve) => {
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'reminder_alert',
              payload: {
                booking_id: booking.id,
                user_id: booking.user_id,
                title: notifTitle,
                message: notifBody,
                tanggal: booking.schedule?.tanggal_misa,
                jam_mulai: booking.schedule?.jam_mulai,
                kategori: booking.schedule?.kategori,
                posisi_tugas: booking.posisi_tugas,
                timestamp: new Date().toISOString(),
              },
            })
            adminSupabase.removeChannel(channel)
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            adminSupabase.removeChannel(channel)
            resolve()
          }
        })
        // Safety timeout
        setTimeout(() => resolve(), 1200)
      })
    } catch (broadcastErr) {
      console.warn('Realtime broadcast warning:', broadcastErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Status reminder dan notifikasi berhasil dikirim!',
      wa_reminder_sent: true,
      wa_url: waUrl,
      reminder_text: message,
      notification: {
        title: notifTitle,
        body: notifBody,
        user_id: booking.user_id,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses reminder.' }, { status: 500 })
  }
}
