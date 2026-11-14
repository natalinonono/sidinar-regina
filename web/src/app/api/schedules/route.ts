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

    const { searchParams } = new URL(request.url)
    let scheduleIds: string[] = []

    // 1. Single param ?id=...
    const singleId = searchParams.get('id')
    if (singleId && singleId.trim()) {
      scheduleIds.push(singleId.trim())
    }

    // 2. Comma-separated ?ids=id1,id2,...
    const idsParam = searchParams.get('ids')
    if (idsParam) {
      const parsed = idsParam.split(',').map((id) => id.trim()).filter(Boolean)
      scheduleIds.push(...parsed)
    }

    // 3. Body payload { id, ids, schedule_id, schedule_ids }
    try {
      const body = await request.json()
      if (body) {
        if (Array.isArray(body.ids)) {
          scheduleIds.push(
            ...body.ids
              .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
              .map((id: string) => id.trim())
          )
        }
        if (Array.isArray(body.schedule_ids)) {
          scheduleIds.push(
            ...body.schedule_ids
              .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
              .map((id: string) => id.trim())
          )
        }
        if (typeof body.id === 'string' && body.id.trim()) {
          scheduleIds.push(body.id.trim())
        }
        if (typeof body.schedule_id === 'string' && body.schedule_id.trim()) {
          scheduleIds.push(body.schedule_id.trim())
        }
      }
    } catch {
      // Body is optional if params are provided
    }

    // Deduplicate
    scheduleIds = Array.from(new Set(scheduleIds))

    if (scheduleIds.length === 0) {
      return NextResponse.json({ error: 'ID jadwal misa wajib disertakan.' }, { status: 400 })
    }

    const admin = (auth as any).adminSupabase

    // Hapus booking terkait terlebih dahulu agar referential integrity aman
    const { error: bookingError } = await admin.from('bookings').delete().in('schedule_id', scheduleIds)
    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 })
    }

    // Hapus jadwal misa
    const { error: scheduleError } = await admin.from('mass_schedules').delete().in('id', scheduleIds)

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: scheduleIds.length,
      deleted_ids: scheduleIds,
      message:
        scheduleIds.length > 1
          ? `Berhasil menghapus ${scheduleIds.length} jadwal misa beserta seluruh data penugasan altar terkait.`
          : 'Jadwal misa beserta data penugasan terkait berhasil dihapus.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus jadwal misa.' },
      { status: 500 }
    )
  }
}
