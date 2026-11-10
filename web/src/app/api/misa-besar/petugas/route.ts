import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'

export async function POST(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const body = await request.json()
    const { session_id, user_id, posisi_tugas, catatan, members } = body
    const admin = auth.adminSupabase

    if (!session_id) {
      return NextResponse.json({ error: 'Sesi Misa / Ibadat wajib dipilih.' }, { status: 400 })
    }

    // Ambil event_id dari session
    const { data: sessionData, error: sessErr } = await (admin as any)
      .from('misa_besar_sessions')
      .select('id, event_id, nama_sesi')
      .eq('id', session_id)
      .single()

    if (sessErr || !sessionData) {
      return NextResponse.json({ error: 'Sesi Misa Besar tidak ditemukan.' }, { status: 404 })
    }

    // Mode bulk (tambah banyak anggota sekaligus) atau single
    const itemsToInsert: Array<{
      event_id: string
      session_id: string
      user_id: string
      posisi_tugas: string
      status_petugas: 'aktif'
      alasan_coret: string
      dicoret_at: null
      catatan: string
    }> = []

    if (Array.isArray(members) && members.length > 0) {
      for (const m of members) {
        if (m.user_id) {
          itemsToInsert.push({
            event_id: sessionData.event_id,
            session_id: sessionData.id,
            user_id: m.user_id,
            posisi_tugas: (m.posisi_tugas || posisi_tugas || 'Petugas Altar / Cadangan').trim(),
            status_petugas: 'aktif',
            alasan_coret: '',
            dicoret_at: null,
            catatan: (m.catatan || '').trim(),
          })
        }
      }
    } else if (user_id) {
      itemsToInsert.push({
        event_id: sessionData.event_id,
        session_id: sessionData.id,
        user_id,
        posisi_tugas: (posisi_tugas || 'Petugas Altar / Cadangan').trim(),
        status_petugas: 'aktif',
        alasan_coret: '',
        dicoret_at: null,
        catatan: (catatan || '').trim(),
      })
    } else {
      return NextResponse.json(
        { error: 'Minimal satu anggota harus dipilih.' },
        { status: 400 }
      )
    }

    const { data: inserted, error: insErr } = await (admin as any)
      .from('misa_besar_petugas')
      .upsert(itemsToInsert, { onConflict: 'session_id,user_id' })
      .select('*, profile:profiles(id, nama_lengkap, nama_panggilan, jenjang, asal_wilayah_teks)')

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${inserted?.length || 1} petugas berhasil ditambahkan ke ${sessionData.nama_sesi}!`,
      petugas: inserted,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menambahkan petugas Misa Besar.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const body = await request.json()
    const { id, posisi_tugas, catatan, status_petugas, alasan_coret } = body

    if (!id) {
      return NextResponse.json({ error: 'ID petugas wajib disertakan.' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {}
    if (posisi_tugas) updatePayload.posisi_tugas = posisi_tugas.trim()
    if (catatan !== undefined) updatePayload.catatan = String(catatan).trim()
    if (status_petugas === 'aktif') {
      updatePayload.status_petugas = 'aktif'
      updatePayload.alasan_coret = ''
      updatePayload.dicoret_at = null
    } else if (status_petugas === 'dicoret') {
      updatePayload.status_petugas = 'dicoret'
      updatePayload.alasan_coret = String(alasan_coret || 'Dicoret oleh pengurus').trim()
      updatePayload.dicoret_at = new Date().toISOString()
    }

    const { data: updated, error } = await (auth.adminSupabase as any)
      .from('misa_besar_petugas')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message:
        status_petugas === 'aktif'
          ? 'Petugas berhasil dipulihkan ke daftar aktif.'
          : 'Data petugas berhasil diperbarui.',
      petugas: updated,
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
      return NextResponse.json({ error: 'ID petugas wajib disertakan.' }, { status: 400 })
    }

    const { error } = await (auth.adminSupabase as any)
      .from('misa_besar_petugas')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Petugas berhasil dihapus dari sesi ini.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

