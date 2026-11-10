import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'

export async function POST(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const body = await request.json()
    const {
      event_id,
      session_id = null,
      judul_latihan,
      tanggal_latihan,
      jam_mulai = '16:00',
      lokasi = 'Gereja & Sakristi SPMR Purbowardayan',
      catatan = '',
    } = body

    if (!event_id || !judul_latihan || !tanggal_latihan) {
      return NextResponse.json(
        { error: 'Perayaan, judul latihan, dan tanggal latihan wajib diisi.' },
        { status: 400 }
      )
    }

    const { data: created, error } = await (auth.adminSupabase as any)
      .from('misa_besar_latihan')
      .insert({
        event_id,
        session_id: session_id || null,
        judul_latihan: judul_latihan.trim(),
        tanggal_latihan,
        jam_mulai: jam_mulai.trim(),
        lokasi: lokasi.trim(),
        catatan: catatan.trim(),
        created_by: auth.user!.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal sesi latihan Misa Besar berhasil dibuat!',
      latihan: created,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal membuat jadwal latihan.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const body = await request.json()
    const { id, session_id, judul_latihan, tanggal_latihan, jam_mulai, lokasi, catatan } = body

    if (!id) {
      return NextResponse.json({ error: 'ID latihan wajib disertakan.' }, { status: 400 })
    }

    const { data: updated, error } = await (auth.adminSupabase as any)
      .from('misa_besar_latihan')
      .update({
        ...(session_id !== undefined ? { session_id: session_id || null } : {}),
        ...(judul_latihan ? { judul_latihan: judul_latihan.trim() } : {}),
        ...(tanggal_latihan ? { tanggal_latihan } : {}),
        ...(jam_mulai ? { jam_mulai: jam_mulai.trim() } : {}),
        ...(lokasi ? { lokasi: lokasi.trim() } : {}),
        ...(catatan !== undefined ? { catatan: catatan.trim() } : {}),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal latihan berhasil diperbarui.',
      latihan: updated,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')
    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID latihan wajib disertakan.' }, { status: 400 })
    }

    const { error } = await (auth.adminSupabase as any)
      .from('misa_besar_latihan')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Sesi latihan dan catatan absensinya berhasil dihapus.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

