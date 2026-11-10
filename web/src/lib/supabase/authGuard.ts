import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function requireAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      profile: null,
      isPengurus: false,
      supabase,
      errorResponse: NextResponse.json(
        { error: 'Autentikasi diperlukan. Silakan login kembali.' },
        { status: 401 }
      ),
    }
  }

  const adminSupabase = createAdminClient()
  const { data: profile } = await (adminSupabase as any)
    .from('profiles')
    .select('id, role, status, nama_lengkap, nama_panggilan')
    .eq('id', user.id)
    .maybeSingle()

  const isPengurus = profile?.role === 'pengurus' && profile?.status === 'aktif'

  return {
    user,
    profile,
    isPengurus,
    supabase,
    adminSupabase,
    errorResponse: null,
  }
}

export async function requirePengurusUser() {
  const auth = await requireAuthenticatedUser()
  if (auth.errorResponse) {
    return auth
  }

  if (!auth.isPengurus) {
    return {
      ...auth,
      errorResponse: NextResponse.json(
        { error: 'Akses ditolak: Fitur ini khusus Pengurus Misdinar aktif.' },
        { status: 403 }
      ),
    }
  }

  return auth
}
