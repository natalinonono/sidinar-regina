import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'

const ALLOWED_STATUSES = new Set(['hadir', 'terlambat', 'izin', 'alpa'])

function parseLatihanTimeStatus(tanggalLatihan: string, jamMulai: string): 'hadir' | 'terlambat' {
  try {
    const cleanTime = jamMulai.length === 5 ? `${jamMulai}:00` : jamMulai
    const startMs = new Date(`${tanggalLatihan}T${cleanTime}+07:00`).getTime()
    const nowMs = Date.now()
    // Jika tanggal sama dan sudah melewati jam mulai + toleransi 15 menit, tandai terlambat
    const todayWIB = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    if (tanggalLatihan === todayWIB && nowMs > startMs + 15 * 60 * 1000) {
      return 'terlambat'
    }
    return 'hadir'
  } catch {
    return 'hadir'
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const body = await request.json()
    const { latihan_id, petugas_id, status_kehadiran, catatan = '', bulk_action, session_id, qr_data } = body
    const admin = auth.adminSupabase

    if (!latihan_id) {
      return NextResponse.json({ error: 'ID sesi latihan (latihan_id) wajib disertakan.' }, { status: 400 })
    }

    // Pastikan latihan valid
    const { data: latihanData, error: latErr } = await (admin as any)
      .from('misa_besar_latihan')
      .select('*, event:misa_besar_events(nama_perayaan)')
      .eq('id', latihan_id)
      .single()

    if (latErr || !latihanData) {
      return NextResponse.json({ error: 'Sesi latihan tidak ditemukan.' }, { status: 404 })
    }

    const nowIso = new Date().toISOString()

    // MODE 1: Scan QR Anggota saat Latihan
    if (qr_data) {
      const raw = String(qr_data).trim()
      let targetUserId: string | null = null

      if (raw.startsWith('SIDINAR:USER:')) {
        targetUserId = raw.replace('SIDINAR:USER:', '').trim()
      } else if (raw.startsWith('SIDINAR:')) {
        const parts = raw.split(':')
        const maybeId = parts[1] || ''
        // Coba cari di bookings untuk mendapatkan user_id jika anak menunjukkan QR tiket misa
        const { data: bData } = await (admin as any)
          .from('bookings')
          .select('user_id')
          .eq('id', maybeId)
          .maybeSingle()
        targetUserId = bData?.user_id || maybeId
      } else {
        targetUserId = raw
      }

      if (!targetUserId) {
        return NextResponse.json({ error: 'Format QR Code tidak dikenali.' }, { status: 400 })
      }

      // Cari user di profiles jika input hanya 8 karakter prefix ID
      if (targetUserId.length >= 6 && targetUserId.length < 36) {
        const { data: usersMatch } = await (admin as any)
          .from('profiles')
          .select('id')
          .ilike('id', `${targetUserId}%`)
          .limit(1)
        if (usersMatch && usersMatch.length > 0) {
          targetUserId = usersMatch[0].id
        }
      }

      // Cari penugasan petugas di event (dibatasi ke session jika latihan khusus atau panel sesi dipilih)
      const scopedSessionId = latihanData.session_id || session_id || null
      let petugasQuery = (admin as any)
        .from('misa_besar_petugas')
        .select('*, profile:profiles(nama_lengkap, nama_panggilan), session:misa_besar_sessions(nama_sesi)')
        .eq('event_id', latihanData.event_id)
        .eq('user_id', targetUserId)

      if (scopedSessionId) {
        petugasQuery = petugasQuery.eq('session_id', scopedSessionId)
      }

      const { data: matchedPetugas } = await petugasQuery

      if (!matchedPetugas || matchedPetugas.length === 0) {
        // Cek apakah user memang terdaftar di tabel profiles tetapi belum dimasukkan ke roster Misa Besar
        const { data: userProf } = await (admin as any)
          .from('profiles')
          .select('nama_lengkap')
          .eq('id', targetUserId)
          .maybeSingle()

        if (userProf) {
          return NextResponse.json(
            {
              error: `${userProf.nama_lengkap} belum terdaftar sebagai petugas pada ${latihanData.event?.nama_perayaan || 'perayaan ini'}${scopedSessionId ? ' (sesi misa/ibadat ini)' : ''}. Tambahkan ke Daftar Petugas sesi ini terlebih dahulu.`,
            },
            { status: 404 }
          )
        }

        return NextResponse.json(
          { error: 'QR Code anggota tidak ditemukan di sistem.' },
          { status: 404 }
        )
      }

      const computedStatus = parseLatihanTimeStatus(latihanData.tanggal_latihan, latihanData.jam_mulai)
      const upsertRows = matchedPetugas.map((p: any) => ({
        latihan_id,
        petugas_id: p.id,
        user_id: p.user_id,
        status_kehadiran: computedStatus,
        waktu_absen: nowIso,
        catatan: 'Scan QR Latihan',
        dicatat_oleh: auth.user!.id,
        updated_at: nowIso,
      }))

      const { error: upsErr } = await (admin as any)
        .from('misa_besar_absensi')
        .upsert(upsertRows, { onConflict: 'latihan_id,petugas_id' })

      if (upsErr) {
        return NextResponse.json({ error: upsErr.message }, { status: 500 })
      }

      const first = matchedPetugas[0]
      const sessionsText = matchedPetugas
        .map((p: any) => `${p.session?.nama_sesi || 'Sesi'} (${p.posisi_tugas})`)
        .join(', ')

      return NextResponse.json({
        success: true,
        status: computedStatus,
        message: `Absensi Latihan Berhasil! ${first.profile?.nama_lengkap || 'Petugas'} (${computedStatus === 'hadir' ? 'Hadir' : 'Terlambat'})`,
        petugas: {
          nama: first.profile?.nama_lengkap || 'Petugas Altar',
          posisi: sessionsText,
          misa: `${latihanData.event?.nama_perayaan || 'Misa Besar'} • ${latihanData.judul_latihan}`,
          status: computedStatus,
          waktu_checkin: new Date().toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      })
    }

    // MODE 2: Bulk Action ('all_hadir' | 'remaining_alpa')
    if (bulk_action) {
      let petugasQuery = (admin as any)
        .from('misa_besar_petugas')
        .select('id, user_id, session_id')
        .eq('event_id', latihanData.event_id)

      const targetSessionId = session_id || latihanData.session_id
      if (targetSessionId) {
        petugasQuery = petugasQuery.eq('session_id', targetSessionId)
      }

      const { data: targetPetugas, error: pErr } = await petugasQuery
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

      if (!targetPetugas || targetPetugas.length === 0) {
        return NextResponse.json({ error: 'Belum ada petugas yang terdaftar pada sesi ini.' }, { status: 400 })
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

        return NextResponse.json({
          success: true,
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
            message: 'Seluruh petugas pada sesi ini sudah tercatat absensinya.',
          })
        }

        const rows = remaining.map((p: any) => ({
          latihan_id,
          petugas_id: p.id,
          user_id: p.user_id,
          status_kehadiran: 'alpa',
          waktu_absen: nowIso,
          catatan: 'Belum hadir saat sesi latihan',
          dicatat_oleh: auth.user!.id,
          updated_at: nowIso,
        }))

        const { error: upsErr } = await (admin as any)
          .from('misa_besar_absensi')
          .upsert(rows, { onConflict: 'latihan_id,petugas_id' })

        if (upsErr) return NextResponse.json({ error: upsErr.message }, { status: 500 })

        return NextResponse.json({
          success: true,
          message: `Berhasil menandai ${rows.length} petugas yang belum absen sebagai ALPA.`,
        })
      }

      return NextResponse.json({ error: 'bulk_action tidak dikenali.' }, { status: 400 })
    }

    // MODE 3: Single Petugas Toggle / Reset
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
      return NextResponse.json({ success: true, message: 'Status absensi dikembalikan ke Belum Absen.' })
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

    return NextResponse.json({
      success: true,
      message: 'Absensi latihan berhasil disimpan.',
      absensi: saved,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mencatat absensi latihan.' },
      { status: 500 }
    )
  }
}

