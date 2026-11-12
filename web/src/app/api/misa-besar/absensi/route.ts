import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'

const ALLOWED_STATUSES = new Set(['hadir', 'terlambat', 'izin', 'alpa'])
const MAX_ALPA_STRIKEOUT = 3

/**
 * Evaluasi aturan 3x Alpa untuk satu atau banyak petugas_id:
 * - Jika jumlah absensi 'alpa' >= 3 -> status_petugas otomatis diubah menjadi 'dicoret'
 * - Jika jumlah 'alpa' turun < 3 karena koreksi absensi -> otomatis dipulihkan ke 'aktif'
 */
async function evaluateThreeAlpaRule(
  admin: any,
  petugasIds: string[],
  triggeredByAlpa: boolean = true
) {
  if (!petugasIds || petugasIds.length === 0) {
    return { newlyDicoretNames: [] as string[], alpaCounts: {} as Record<string, number> }
  }

  const [{ data: alpaRows }, { data: petugasRows }] = await Promise.all([
    admin
      .from('misa_besar_absensi')
      .select('petugas_id')
      .in('petugas_id', petugasIds)
      .eq('status_kehadiran', 'alpa'),
    admin
      .from('misa_besar_petugas')
      .select('id, status_petugas, alasan_coret, profile:profiles(nama_lengkap)')
      .in('id', petugasIds),
  ])

  const alpaCounts: Record<string, number> = {}
  for (const id of petugasIds) alpaCounts[id] = 0
  for (const row of alpaRows || []) {
    alpaCounts[row.petugas_id] = (alpaCounts[row.petugas_id] || 0) + 1
  }

  const newlyDicoretNames: string[] = []
  const nowIso = new Date().toISOString()

  for (const p of petugasRows || []) {
    const count = alpaCounts[p.id] || 0
    if (triggeredByAlpa && count >= MAX_ALPA_STRIKEOUT && p.status_petugas !== 'dicoret') {
      await admin
        .from('misa_besar_petugas')
        .update({
          status_petugas: 'dicoret',
          alasan_coret: `Tidak mengikuti latihan ${count} kali tanpa keterangan (Alpa)`,
          dicoret_at: nowIso,
        })
        .eq('id', p.id)
      newlyDicoretNames.push(p.profile?.nama_lengkap || 'Petugas')
    } else if (
      count < MAX_ALPA_STRIKEOUT &&
      p.status_petugas === 'dicoret' &&
      String(p.alasan_coret || '').toLowerCase().includes('alpa')
    ) {
      await admin
        .from('misa_besar_petugas')
        .update({
          status_petugas: 'aktif',
          alasan_coret: '',
          dicoret_at: null,
        })
        .eq('id', p.id)
    }
  }

  return { newlyDicoretNames, alpaCounts }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const body = await request.json()
    const {
      latihan_id,
      petugas_id,
      status_kehadiran,
      catatan = '',
      bulk_action,
      session_id,
    } = body
    const admin = auth.adminSupabase

    if (!latihan_id) {
      return NextResponse.json(
        { error: 'ID sesi latihan (latihan_id) wajib disertakan.' },
        { status: 400 }
      )
    }

    const { data: latihanData, error: latErr } = await (admin as any)
      .from('misa_besar_latihan')
      .select('id, event_id, session_id, judul_latihan')
      .eq('id', latihan_id)
      .single()

    if (latErr || !latihanData) {
      return NextResponse.json({ error: 'Sesi latihan tidak ditemukan.' }, { status: 404 })
    }

    const nowIso = new Date().toISOString()

    // MODE 1: Bulk Action ('all_hadir' | 'remaining_alpa') khusus petugas aktif
    if (bulk_action) {
      let petugasQuery = (admin as any)
        .from('misa_besar_petugas')
        .select('id, user_id, session_id')
        .eq('event_id', latihanData.event_id)
        .neq('status_petugas', 'dicoret')

      const targetSessionId = session_id || latihanData.session_id
      if (targetSessionId) {
        petugasQuery = petugasQuery.eq('session_id', targetSessionId)
      }

      const { data: targetPetugas, error: pErr } = await petugasQuery
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

      if (!targetPetugas || targetPetugas.length === 0) {
        return NextResponse.json(
          { error: 'Belum ada petugas aktif pada sesi ini.' },
          { status: 400 }
        )
      }

      if (bulk_action === 'all_hadir') {
        const rows = targetPetugas.map((p: any) => ({
          latihan_id,
          petugas_id: p.id,
          user_id: p.user_id,
          status_kehadiran: 'hadir',
          waktu_absen: nowIso,
          catatan: '',
          dicatat_oleh: auth.user!.id,
          updated_at: nowIso,
        }))

        const { error: upsErr } = await (admin as any)
          .from('misa_besar_absensi')
          .upsert(rows, { onConflict: 'latihan_id,petugas_id' })

        if (upsErr) return NextResponse.json({ error: upsErr.message }, { status: 500 })

        await evaluateThreeAlpaRule(
          admin,
          targetPetugas.map((p: any) => p.id),
          false
        )

        return NextResponse.json({
          success: true,
          auto_dicoret: false,
          dicoret_names: [],
          message: `Berhasil menandai ${rows.length} petugas sebagai HADIR.`,
        })
      }

      if (bulk_action === 'remaining_alpa') {
        const { data: existingAbs } = await (admin as any)
          .from('misa_besar_absensi')
          .select('petugas_id')
          .eq('latihan_id', latihan_id)

        const recordedSet = new Set((existingAbs || []).map((a: any) => a.petugas_id))
        const remaining = targetPetugas.filter((p: any) => !recordedSet.has(p.id))

        if (remaining.length === 0) {
          return NextResponse.json({
            success: true,
            auto_dicoret: false,
            dicoret_names: [],
            message: 'Seluruh petugas aktif pada sesi ini sudah tercatat absensinya.',
          })
        }

        const rows = remaining.map((p: any) => ({
          latihan_id,
          petugas_id: p.id,
          user_id: p.user_id,
          status_kehadiran: 'alpa',
          waktu_absen: nowIso,
          catatan: 'Tidak hadir tanpa keterangan (Alpa)',
          dicatat_oleh: auth.user!.id,
          updated_at: nowIso,
        }))

        const { error: upsErr } = await (admin as any)
          .from('misa_besar_absensi')
          .upsert(rows, { onConflict: 'latihan_id,petugas_id' })

        if (upsErr) return NextResponse.json({ error: upsErr.message }, { status: 500 })

        const { newlyDicoretNames } = await evaluateThreeAlpaRule(
          admin,
          remaining.map((p: any) => p.id),
          true
        )

        const baseMsg = `Berhasil menandai ${rows.length} petugas yang belum absen sebagai ALPA.`
        const dicoretMsg =
          newlyDicoretNames.length > 0
            ? ` ⚠️ Otomatis dicoret karena mencapai 3x Alpa: ${newlyDicoretNames.join(', ')}.`
            : ''

        return NextResponse.json({
          success: true,
          auto_dicoret: newlyDicoretNames.length > 0,
          dicoret_names: newlyDicoretNames,
          message: baseMsg + dicoretMsg,
        })
      }

      return NextResponse.json({ error: 'bulk_action tidak dikenali.' }, { status: 400 })
    }

    // MODE 2: Single Click Status Toggle / Reset
    if (!petugas_id || !status_kehadiran) {
      return NextResponse.json(
        { error: 'petugas_id dan status_kehadiran wajib disertakan.' },
        { status: 400 }
      )
    }

    if (status_kehadiran === 'reset') {
      const { error: delErr } = await (admin as any)
        .from('misa_besar_absensi')
        .delete()
        .eq('latihan_id', latihan_id)
        .eq('petugas_id', petugas_id)

      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

      await evaluateThreeAlpaRule(admin, [petugas_id], false)
      return NextResponse.json({
        success: true,
        auto_dicoret: false,
        dicoret_names: [],
        message: 'Status absensi dikembalikan ke Belum Absen.',
      })
    }

    if (!ALLOWED_STATUSES.has(status_kehadiran)) {
      return NextResponse.json({ error: 'Status kehadiran tidak valid.' }, { status: 400 })
    }

    const { data: petugasData, error: petErr } = await (admin as any)
      .from('misa_besar_petugas')
      .select('id, user_id')
      .eq('id', petugas_id)
      .single()

    if (petErr || !petugasData) {
      return NextResponse.json({ error: 'Data petugas tidak ditemukan.' }, { status: 404 })
    }

    const { data: saved, error: saveErr } = await (admin as any)
      .from('misa_besar_absensi')
      .upsert(
        {
          latihan_id,
          petugas_id: petugasData.id,
          user_id: petugasData.user_id,
          status_kehadiran,
          waktu_absen: nowIso,
          catatan: String(catatan || '').trim(),
          dicatat_oleh: auth.user!.id,
          updated_at: nowIso,
        },
        { onConflict: 'latihan_id,petugas_id' }
      )
      .select()
      .single()

    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 })
    }

    const { newlyDicoretNames, alpaCounts } = await evaluateThreeAlpaRule(
      admin,
      [petugasData.id],
      status_kehadiran === 'alpa'
    )
    const isDicoretNow = newlyDicoretNames.length > 0

    return NextResponse.json({
      success: true,
      auto_dicoret: isDicoretNow,
      dicoret_names: newlyDicoretNames,
      alpa_count: alpaCounts[petugasData.id] || 0,
      message: isDicoretNow
        ? `⚠️ ${newlyDicoretNames[0]} tercatat Alpa ke-${alpaCounts[petugasData.id]} dan OTOMATIS DICORET dari daftar petugas misa!`
        : 'Absensi latihan berhasil disimpan.',
      absensi: saved,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mencatat absensi latihan.' },
      { status: 500 }
    )
  }
}
