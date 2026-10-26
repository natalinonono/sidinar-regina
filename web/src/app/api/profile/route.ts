import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/profile - Ambil data profil user yang sedang login
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir.' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profil tidak ditemukan.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat profil.' }, { status: 500 })
  }
}

// PATCH /api/profile - Edit data diri sendiri langsung tanpa approval
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir. Silakan login kembali.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      nama_lengkap,
      nama_panggilan,
      no_telepon,
      asal_wilayah_teks,
      jenjang,
    } = body

    if (!nama_lengkap || !nama_panggilan || !no_telepon || !jenjang) {
      return NextResponse.json(
        { error: 'Nama lengkap, nama panggilan, nomor WhatsApp, dan jenjang wajib diisi.' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Update profil di tabel public.profiles langsung tanpa approval
    const { data: updatedProfile, error: updateError } = await (adminSupabase as any)
      .from('profiles')
      .update({
        nama_lengkap: nama_lengkap.trim(),
        nama_panggilan: nama_panggilan.trim(),
        no_telepon: no_telepon.trim(),
        asal_wilayah_teks: asal_wilayah_teks ? asal_wilayah_teks.trim() : 'Paroki Purbowardayan',
        jenjang,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `Gagal memperbarui data profil: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Update metadata auth juga
    try {
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          nama_lengkap: nama_lengkap.trim(),
          nama_panggilan: nama_panggilan.trim(),
        },
      })
    } catch (ignore) {}

    return NextResponse.json({
      success: true,
      message: 'Data diri Anda berhasil diperbarui!',
      profile: updatedProfile,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan saat menyimpan perubahan data.' },
      { status: 500 }
    )
  }
}
