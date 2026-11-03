import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

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

    const resolvedParams = await Promise.resolve(params)
    const scheduleId = resolvedParams.id
    if (!scheduleId) {
      return NextResponse.json({ error: 'ID jadwal misa wajib disertakan.' }, { status: 400 })
    }

    const admin = createAdminClient()
    await admin.from('bookings').delete().eq('schedule_id', scheduleId)
    const { error } = await admin.from('mass_schedules').delete().eq('id', scheduleId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal misa berhasil dihapus.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus jadwal misa.' },
      { status: 500 }
    )
  }
}
