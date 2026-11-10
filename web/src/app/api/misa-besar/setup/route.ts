import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'
import {
  MISA_BESAR_PRESETS,
  getPresetByKode,
  buildLatihanSessionsList,
} from '@/lib/utils/misaBesar'

export async function POST(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const body = await request.json()
    const { action = 'init_all_presets', tahun = new Date().getFullYear() } = body
    const admin = auth.adminSupabase

    if (action === 'init_all_presets') {
      const paskahJumlah = body.paskah_jumlah_sesi === 2 ? 2 : 3
      let createdCount = 0

      for (const preset of MISA_BESAR_PRESETS) {
        const targetCount =
          preset.kode_perayaan === 'paskah' ? paskahJumlah : preset.jumlah_sesi

        // Cek apakah event tahun ini sudah ada
        const { data: existingEvent } = await (admin as any)
          .from('misa_besar_events')
          .select('id')
          .eq('kode_perayaan', preset.kode_perayaan)
          .eq('tahun', tahun)
          .maybeSingle()

        if (existingEvent) continue

        const { data: newEvent, error: evErr } = await (admin as any)
          .from('misa_besar_events')
          .insert({
            kode_perayaan: preset.kode_perayaan,
            nama_perayaan: preset.nama_perayaan,
            tahun,
            jumlah_sesi: targetCount,
            jenis_sesi: preset.jenis_sesi,
            warna_liturgi: preset.warna_liturgi,
            keterangan: preset.keterangan,
            urutan_tampil: preset.urutan_tampil,
            created_by: auth.user!.id,
          })
          .select()
          .single()

        if (evErr) {
          return NextResponse.json({ error: evErr.message }, { status: 500 })
        }

        const sessionsToInsert = preset.default_sessions(targetCount).map((s) => ({
          event_id: newEvent.id,
          urutan: s.urutan,
          nama_sesi: s.nama_sesi,
          jam_mulai: s.jam_mulai,
          kuota_petugas: s.kuota_petugas,
        }))

        const { error: sessErr } = await (admin as any)
          .from('misa_besar_sessions')
          .insert(sessionsToInsert)

        if (sessErr) {
          return NextResponse.json({ error: sessErr.message }, { status: 500 })
        }

        createdCount++
      }

      return NextResponse.json({
        success: true,
        message:
          createdCount > 0
            ? `Berhasil menyiapkan ${createdCount} paket Perayaan Misa Besar Tahun ${tahun} beserta seluruh sesi Misa/Ibadatnya!`
            : `Seluruh 7 paket Perayaan Misa Besar Tahun ${tahun} sudah tersedia.`,
        created_count: createdCount,
      })
    }

    if (action === 'create_single_preset') {
      const { kode_perayaan, jumlah_sesi } = body
      const preset = getPresetByKode(kode_perayaan)
      if (!preset) {
        return NextResponse.json({ error: 'Kode perayaan tidak valid.' }, { status: 400 })
      }

      const targetCount = Number(jumlah_sesi) || preset.jumlah_sesi
      const { data: existingEvent } = await (admin as any)
        .from('misa_besar_events')
        .select('*')
        .eq('kode_perayaan', preset.kode_perayaan)
        .eq('tahun', tahun)
        .maybeSingle()

      if (existingEvent) {
        return NextResponse.json({
          success: true,
          message: `${preset.nama_perayaan} Tahun ${tahun} sudah terdaftar.`,
          event: existingEvent,
        })
      }

      const { data: newEvent, error: evErr } = await (admin as any)
        .from('misa_besar_events')
        .insert({
          kode_perayaan: preset.kode_perayaan,
          nama_perayaan: preset.nama_perayaan,
          tahun,
          jumlah_sesi: targetCount,
          jenis_sesi: preset.jenis_sesi,
          warna_liturgi: preset.warna_liturgi,
          keterangan: preset.keterangan,
          urutan_tampil: preset.urutan_tampil,
          created_by: auth.user!.id,
        })
        .select()
        .single()

      if (evErr) {
        return NextResponse.json({ error: evErr.message }, { status: 500 })
      }

      const sessionsToInsert = preset.default_sessions(targetCount).map((s) => ({
        event_id: newEvent.id,
        urutan: s.urutan,
        nama_sesi: s.nama_sesi,
        jam_mulai: s.jam_mulai,
        kuota_petugas: s.kuota_petugas,
      }))

      await (admin as any).from('misa_besar_sessions').insert(sessionsToInsert)

      return NextResponse.json({
        success: true,
        message: `Perayaan ${preset.nama_perayaan} (${targetCount} ${preset.jenis_sesi}) berhasil ditambahkan.`,
        event: newEvent,
      })
    }

    if (action === 'update_sessions_count') {
      const { event_id, jumlah_sesi } = body
      if (!event_id || !jumlah_sesi) {
        return NextResponse.json({ error: 'event_id dan jumlah_sesi wajib diisi.' }, { status: 400 })
      }

      const targetCount = Math.max(1, Math.min(5, Number(jumlah_sesi)))

      const { data: ev, error: evErr } = await (admin as any)
        .from('misa_besar_events')
        .select('*')
        .eq('id', event_id)
        .single()

      if (evErr || !ev) {
        return NextResponse.json({ error: 'Perayaan tidak ditemukan.' }, { status: 404 })
      }

      const { data: existingSessions } = await (admin as any)
        .from('misa_besar_sessions')
        .select('*')
        .eq('event_id', event_id)
        .order('urutan', { ascending: true })

      const currentSessions = existingSessions || []
      const preset = getPresetByKode(ev.kode_perayaan)
      const desiredTemplates = preset
        ? preset.default_sessions(targetCount)
        : buildLatihanSessionsList(ev.jenis_sesi, targetCount)

      // Add missing sessions if scaling up
      for (const tpl of desiredTemplates) {
        const exists = currentSessions.find((s: any) => s.urutan === tpl.urutan)
        if (!exists) {
          await (admin as any).from('misa_besar_sessions').insert({
            event_id,
            urutan: tpl.urutan,
            nama_sesi: tpl.nama_sesi,
            jam_mulai: tpl.jam_mulai,
            kuota_petugas: tpl.kuota_petugas,
          })
        }
      }

      // Delete extra sessions if scaling down
      const extraIds = currentSessions
        .filter((s: any) => s.urutan > targetCount)
        .map((s: any) => s.id)

      if (extraIds.length > 0) {
        await (admin as any).from('misa_besar_sessions').delete().in('id', extraIds)
      }

      await (admin as any)
        .from('misa_besar_events')
        .update({ jumlah_sesi: targetCount })
        .eq('id', event_id)

      return NextResponse.json({
        success: true,
        message: `Jumlah sesi ${ev.nama_perayaan} berhasil diubah menjadi ${targetCount} ${ev.jenis_sesi}.`,
      })
    }

    if (action === 'update_session') {
      const { session_id, nama_sesi, tanggal_misa, jam_mulai, kuota_petugas } = body
      if (!session_id) {
        return NextResponse.json({ error: 'session_id wajib diisi.' }, { status: 400 })
      }

      const { data: updated, error: updErr } = await (admin as any)
        .from('misa_besar_sessions')
        .update({
          ...(nama_sesi ? { nama_sesi: nama_sesi.trim() } : {}),
          tanggal_misa: tanggal_misa || null,
          ...(jam_mulai ? { jam_mulai: jam_mulai.trim() } : {}),
          ...(kuota_petugas ? { kuota_petugas: Number(kuota_petugas) } : {}),
        })
        .eq('id', session_id)
        .select()
        .single()

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Detail sesi Misa Besar berhasil diperbarui.',
        session: updated,
      })
    }

    return NextResponse.json({ error: 'Aksi setup tidak dikenali.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengatur perayaan Misa Besar.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json({ error: 'event_id wajib disertakan.' }, { status: 400 })
    }

    const { error } = await (auth.adminSupabase as any)
      .from('misa_besar_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Perayaan Misa Besar berhasil dihapus.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
