import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'

const ALLOWED_STATUSES = new Set(['pending', 'aktif', 'nonaktif'])
const ALLOWED_ROLES = new Set(['anggota', 'pengurus'])

export async function POST(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const { member_id, status, role } = await request.json()

    if (!member_id || !status) {
      return NextResponse.json({ error: 'member_id dan status wajib disertakan.' }, { status: 400 })
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Nilai status keanggotaan tidak valid.' }, { status: 400 })
    }

    if (role && !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Nilai role tidak valid.' }, { status: 400 })
    }

    const adminSupabase = (auth as any).adminSupabase
    const updatePayload: any = { status, updated_at: new Date().toISOString() }
    if (role) {
      updatePayload.role = role
    }

    const { data: updatedProfile, error } = await (adminSupabase as any)
      .from('profiles')
      .update(updatePayload)
      .eq('id', member_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Akun anggota berhasil diubah menjadi: ${status.toUpperCase()}`,
      profile: updatedProfile,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses persetujuan akun.' }, { status: 500 })
  }
}
