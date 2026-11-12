import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('mass_schedules')
      .select('*')
      .order('tanggal_misa', { ascending: true })
      .order('jam_mulai', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat jadwal misa' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    // Ambil id dari searchParams (?id=...) atau body JSON ({ id: ... })
    const { searchParams } = new URL(request.url)
    let scheduleId = searchParams.get('id')

    if (!scheduleId) {
      try {
        const body = await request.json()
        scheduleId = body.id || body.schedule_id
      } catch {
        // body might be empty if query params was used
      }
    }

    if (!scheduleId) {
      return NextResponse.json({ error: 'ID jadwal misa wajib disertakan.' }, { status: 400 })
    }

    const admin = (auth as any).adminSupabase

    // Hapus booking terkait terlebih dahulu agar referential integrity aman
    await admin.from('bookings').delete().eq('schedule_id', scheduleId)

    // Hapus jadwal misa
    const { error } = await admin.from('mass_schedules').delete().eq('id', scheduleId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal misa beserta data penugasan terkait berhasil dihapus.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus jadwal misa.' },
      { status: 500 }
    )
  }
}
