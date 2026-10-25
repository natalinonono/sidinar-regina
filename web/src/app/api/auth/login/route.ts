import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Kredensial login tidak valid.' },
        { status: 401 }
      )
    }

    // Fetch user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Data profil misdinar tidak ditemukan.' },
        { status: 404 }
      )
    }

    const redirectUrl = (profile as any).role === 'pengurus' ? '/pengurus' : '/anggota'

    return NextResponse.json({
      user: authData.user,
      profile,
      redirectUrl,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan pada server saat login.' },
      { status: 500 }
    )
  }
}
