import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    // Verify current user is pengurus
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((currentProfile as any)?.role !== 'pengurus') {
      return NextResponse.json({ error: 'Akses ditolak. Fitur ini khusus Pengurus Misdinar.' }, { status: 403 })
    }

    const { member_id, status, role } = await request.json()

    if (!member_id || !status) {
      return NextResponse.json({ error: 'member_id dan status wajib disertakan.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
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
