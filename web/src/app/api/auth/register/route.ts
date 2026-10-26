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

    const adminSupabase = createAdminClient()

    // 1. Buat user langsung auto-confirmed via Supabase Admin API
    // Ini menghilangkan kewajiban klik link konfirmasi di email 100%!
    let userId: string | null = null

    const { data: adminUserData, error: adminUserError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nama_lengkap,
        nama_panggilan,
      },
    })

    if (adminUserData?.user) {
      userId = adminUserData.user.id
    } else {
      // Fallback ke regular signUp jika admin client mengalami kendala
      const supabase = await createClient()
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
          { error: adminUserError?.message || authError?.message || 'Gagal membuat akun autentikasi.' },
          { status: 400 }
        )
      }
      userId = authData.user.id
    }

    // 2. Simpan profil misdinar ke tabel public.profiles
    const { data: profile, error: profileError } = await (adminSupabase as any)
      .from('profiles')
      .insert({
        id: userId,
        email,
        nama_lengkap,
        nama_panggilan,
        no_telepon,
        asal_wilayah_teks: asal_wilayah_teks || 'Paroki Purbowardayan',
        jenjang,
        role: 'anggota',
        status: 'aktif', // Langsung aktif tanpa memerlukan approval agar dapat segera memilih jadwal tugas
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
      message: 'Pendaftaran akun Misdinar berhasil! Akun Anda langsung aktif dan dapat segera memilih jadwal tugas misa.',
      profile,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan server saat registrasi.' },
      { status: 500 }
    )
  }
}
