import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function normalizeJenjang(raw: string): 'SD' | 'SMP' | 'SMA/K' | 'Mahasiswa' | 'Umum' {
  if (!raw) return 'SMP'
  const upper = raw.toUpperCase().trim()
  if (upper.includes('MAHASISWA') || upper.includes('KULIAH')) return 'Mahasiswa'
  if (upper.includes('UMUM') || upper.includes('BEKERJA')) return 'Umum'
  if (upper.includes('SMA') || upper.includes('SMK') || upper.includes('SMA/K')) return 'SMA/K'
  if (upper.includes('SMP')) return 'SMP'
  if (upper.includes('SD')) return 'SD'
  return 'SMP'
}


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
    const normalizedJenjang = normalizeJenjang(jenjang)

    // 1. Buat user langsung auto-confirmed via Supabase Admin API
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
      // Periksa apakah user auth sudah ada (misalnya dari percobaan registrasi sebelumnya yang gagal simpan profil)
      const { data: listData } = await adminSupabase.auth.admin.listUsers()
      const existingUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      )

      if (existingUser) {
        // Cek apakah user sudah punya profil di tabel profiles
        const { data: existingProfile } = await (adminSupabase as any)
          .from('profiles')
          .select('id')
          .eq('id', existingUser.id)
          .maybeSingle()

        if (existingProfile) {
          return NextResponse.json(
            { error: 'Email ini sudah terdaftar. Silakan langsung masuk (login) dengan email dan kata sandi Anda.' },
            { status: 400 }
          )
        } else {
          // User auth sudah ada dari percobaan sebelumnya, update password dan lanjutkan pembuatan profil
          await adminSupabase.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
            user_metadata: { nama_lengkap, nama_panggilan },
          })
          userId = existingUser.id
        }
      } else {
        return NextResponse.json(
          { error: adminUserError?.message || 'Gagal membuat akun autentikasi.' },
          { status: 400 }
        )
      }
    }

    // 2. Simpan profil misdinar ke tabel public.profiles
    const { data: profile, error: profileError } = await (adminSupabase as any)
      .from('profiles')
      .upsert({
        id: userId,
        email,
        nama_lengkap: nama_lengkap.trim(),
        nama_panggilan: nama_panggilan.trim(),
        no_telepon: no_telepon.trim(),
        asal_wilayah_teks: asal_wilayah_teks ? asal_wilayah_teks.trim() : 'Paroki Purbowardayan',
        jenjang: normalizedJenjang,
        role: 'anggota',
        status: 'aktif', // Langsung aktif tanpa memerlukan approval agar dapat segera memilih jadwal tugas
      }, { onConflict: 'id' })
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
