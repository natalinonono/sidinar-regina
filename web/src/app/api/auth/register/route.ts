import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      nama_lengkap,
      nama_panggilan,
      no_telepon,
      asal_wilayah_teks,
      jenjang,
    } = body

    if (!email || !password || !nama_lengkap || !nama_panggilan || !no_telepon || !jenjang) {
      return NextResponse.json(
        { error: 'Seluruh formulir berbintang (*) wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nama_lengkap,
          nama_panggilan,
        },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Gagal membuat akun autentikasi.' },
        { status: 400 }
      )
    }

    // Insert user into profiles table
    // Use admin client to ensure insertion succeeds even if email confirmation is enabled in Supabase project
    const adminSupabase = createAdminClient()
    const { data: profile, error: profileError } = await (adminSupabase as any)
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        nama_lengkap,
        nama_panggilan,
        no_telepon,
        asal_wilayah_teks: asal_wilayah_teks || 'Paroki Purbowardayan',
        jenjang,
        role: 'anggota',
        status: 'pending', // Menunggu persetujuan Pengurus
      })
      .select()
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: `Gagal menyimpan data profil: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran akun Misdinar berhasil! Akun Anda sedang menunggu persetujuan (Approve) dari Tim Pendamping/Pengurus sebelum dapat memilih jadwal tugas.',
      profile,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan server saat registrasi.' },
      { status: 500 }
    )
  }
}
