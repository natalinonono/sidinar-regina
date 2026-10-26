import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const { schedule_id, posisi_tugas } = await request.json()

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
        user_id: user.id,
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
