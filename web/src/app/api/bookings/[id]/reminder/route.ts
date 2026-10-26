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

    return NextResponse.json({
      success: true,
      message: 'Status reminder berhasil diperbarui!',
      wa_reminder_sent: true,
      wa_url: waUrl,
      reminder_text: message,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses reminder.' }, { status: 500 })
  }
}
