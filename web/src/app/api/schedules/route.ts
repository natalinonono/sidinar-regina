import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    // Verifikasi role pengurus
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as any)?.role !== 'pengurus') {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengurus yang dapat menghapus jadwal misa.' },
        { status: 403 }
      )
    }

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

    const admin = createAdminClient()

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
