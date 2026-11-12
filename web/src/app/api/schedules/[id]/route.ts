import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const resolvedParams = await Promise.resolve(params)
    const scheduleId = resolvedParams.id
    if (!scheduleId) {
      return NextResponse.json({ error: 'ID jadwal misa wajib disertakan.' }, { status: 400 })
    }

    const admin = (auth as any).adminSupabase
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
