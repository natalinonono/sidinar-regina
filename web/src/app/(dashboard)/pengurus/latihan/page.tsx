'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MisaBesarEvent,
  MisaBesarAbsensi,
  MisaBesarLatihan,
  MisaBesarSession,
  LatihanAttendanceStatus,
} from '@/types/misaBesar'
import { MISA_BESAR_PRESETS, NATAL_CODES, PASKAH_CODES } from '@/lib/utils/misaBesar'
import { LITURGICAL_POSITIONS } from '@/lib/utils/positions'
import { AssignPetugasModal } from '@/components/misa-besar/AssignPetugasModal'
import { LatihanModal } from '@/components/misa-besar/LatihanModal'
import { SqlMigrationNotice } from '@/components/misa-besar/SqlMigrationNotice'

const STATUS_BADGE_MAP: Record<
  LatihanAttendanceStatus,
  { label: string; badgeClass: string; icon: string }
> = {
  hadir: {
    label: 'Hadir',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'check_circle',
  },
  terlambat: {
    label: 'Terlambat',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: 'schedule',
  },
  izin: {
    label: 'Izin',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: 'mail',
  },
  alpa: {
    label: 'Alpa',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: 'cancel',
  },
}

function formatWaPhone(phone?: string): string {
  if (!phone) return ''
  let clean = phone.replace(/[^0-9]/g, '')
  if (clean.startsWith('0')) clean = '62' + clean.substring(1)
  return clean
}

export default function PengurusLatihanMisaBesarPage() {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()

  const [tahun, setTahun] = useState<number>(currentYear)
  const [loading, setLoading] = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)
  const [migrationSql, setMigrationSql] = useState('')
  const [events, setEvents] = useState<MisaBesarEvent[]>([])
  const [absensiList, setAbsensiList] = useState<MisaBesarAbsensi[]>([])
  const [activeMembers, setActiveMembers] = useState<any[]>([])

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'absensi' | 'petugas' | 'rekap'>('absensi')
  const [selectedLatihanId, setSelectedLatihanId] = useState<string | null>(null)
  const [rekapScope, setRekapScope] = useState<'session' | 'event'>('session')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDicoretList, setShowDicoretList] = useState(true)

  // Setup & Action States
  const [paskahPresetCount, setPaskahPresetCount] = useState<2 | 3>(3)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning'
    text: string
  } | null>(null)

  // Modals
  const [assignSession, setAssignSession] = useState<MisaBesarSession | null>(null)
  const [showLatihanModal, setShowLatihanModal] = useState(false)
  const [editingLatihan, setEditingLatihan] = useState<MisaBesarLatihan | null>(null)
  const [editingSession, setEditingSession] = useState<MisaBesarSession | null>(null)
  const [sessionForm, setSessionForm] = useState({
    nama_sesi: '',
    tanggal_misa: '',
    jam_mulai: '',
    kuota_petugas: 16,
  })

  const showToast = (type: 'success' | 'error' | 'warning', text: string) => {
    setFeedbackBanner({ type, text })
    setTimeout(() => setFeedbackBanner(null), 6500)
  }

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/misa-besar?tahun=${tahun}`, { cache: 'no-store' })
      const data = await res.json()

      if (data.needs_migration) {
        setNeedsMigration(true)
        setMigrationSql(data.migration_sql || '')
        setLoading(false)
        return
      }

      if (!res.ok) {
        showToast('error', data.error || 'Gagal memuat data Misa Besar.')
        setLoading(false)
        return
      }

      setNeedsMigration(false)
      const fetchedEvents: MisaBesarEvent[] = data.events || []
      setEvents(fetchedEvents)
      setAbsensiList(data.absensi || [])
      setActiveMembers(data.active_members || [])

      setSelectedEventId((prev) => {
        if (prev && fetchedEvents.some((e) => e.id === prev)) return prev
        return fetchedEvents[0]?.id || null
      })

      setLoading(false)
    } catch (err: any) {
      showToast('error', err.message || 'Gagal terhubung ke server.')
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => {
    setLoading(true)
    loadData()

    const channel = supabase
      .channel('misa_besar_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_events' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_sessions' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_petugas' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_latihan' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_absensi' }, () => loadData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData])

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || null
  }, [events, selectedEventId])

  const eventSessions = useMemo(() => selectedEvent?.sessions || [], [selectedEvent])
  const eventLatihan = useMemo(() => selectedEvent?.latihan || [], [selectedEvent])
  const eventPetugas = useMemo(() => selectedEvent?.petugas || [], [selectedEvent])

  // Selalu pilih sesi Misa/Ibadat spesifik agar terpisah per Misa (Misa 1, Misa 2, dst.)
  useEffect(() => {
    if (!selectedEvent || eventSessions.length === 0) {
      setSelectedSessionId(null)
      return
    }
    setSelectedSessionId((prev) => {
      if (prev && eventSessions.some((s) => s.id === prev)) return prev
      return eventSessions[0].id
    })
  }, [selectedEvent?.id, eventSessions])

  const selectedSession = useMemo(() => {
    return eventSessions.find((s) => s.id === selectedSessionId) || eventSessions[0] || null
  }, [eventSessions, selectedSessionId])

  const visibleLatihan = useMemo(() => {
    if (!selectedSession) return eventLatihan
    return [...eventLatihan]
      .filter((l) => !l.session_id || l.session_id === selectedSession.id)
      .sort((a, b) => {
        const aSpec = a.session_id === selectedSession.id ? 0 : 1
        const bSpec = b.session_id === selectedSession.id ? 0 : 1
        return aSpec - bSpec
      })
  }, [eventLatihan, selectedSession])

  useEffect(() => {
    if (visibleLatihan.length === 0) {
      setSelectedLatihanId(null)
    } else if (!selectedLatihanId || !visibleLatihan.some((l) => l.id === selectedLatihanId)) {
      setSelectedLatihanId(visibleLatihan[0].id)
    }
  }, [selectedEvent?.id, selectedSession?.id, visibleLatihan])

  const selectedLatihan = useMemo(() => {
    return visibleLatihan.find((l) => l.id === selectedLatihanId) || visibleLatihan[0] || null
  }, [visibleLatihan, selectedLatihanId])

  // Hitung total Alpa sepanjang seluruh pertemuan latihan per petugas_id
  const alpaCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of absensiList) {
      if (a.status_kehadiran === 'alpa') {
        map[a.petugas_id] = (map[a.petugas_id] || 0) + 1
      }
    }
    return map
  }, [absensiList])

  // Petugas KHUSUS sesi terpilih, dipisah antara Aktif dan Dicoret (3x Alpa)
  const sessionAllPetugas = useMemo(() => {
    if (!selectedSession) return []
    return eventPetugas.filter((p) => p.session_id === selectedSession.id)
  }, [eventPetugas, selectedSession])

  const activeSessionPetugas = useMemo(
    () => sessionAllPetugas.filter((p) => p.status_petugas !== 'dicoret'),
    [sessionAllPetugas]
  )

  const dicoretSessionPetugas = useMemo(
    () => sessionAllPetugas.filter((p) => p.status_petugas === 'dicoret'),
    [sessionAllPetugas]
  )

  const visibleActivePetugas = useMemo(() => {
    if (!searchTerm.trim()) return activeSessionPetugas
    const q = searchTerm.toLowerCase()
    return activeSessionPetugas.filter(
      (p) =>
        p.profile?.nama_lengkap?.toLowerCase().includes(q) ||
        p.profile?.nama_panggilan?.toLowerCase().includes(q) ||
        p.posisi_tugas.toLowerCase().includes(q) ||
        p.profile?.asal_wilayah_teks?.toLowerCase().includes(q)
    )
  }, [activeSessionPetugas, searchTerm])

  const absensiMapForSelectedLatihan = useMemo(() => {
    const map: Record<string, MisaBesarAbsensi> = {}
    if (!selectedLatihan) return map
    for (const a of absensiList) {
      if (a.latihan_id === selectedLatihan.id) {
        map[a.petugas_id] = a
      }
    }
    return map
  }, [absensiList, selectedLatihan])

  const latihanStats = useMemo(() => {
    let hadir = 0
    let terlambat = 0
    let izin = 0
    let alpa = 0
    let belum = 0
    for (const p of activeSessionPetugas) {
      const rec = absensiMapForSelectedLatihan[p.id]
      if (!rec) belum++
      else if (rec.status_kehadiran === 'hadir') hadir++
      else if (rec.status_kehadiran === 'terlambat') terlambat++
      else if (rec.status_kehadiran === 'izin') izin++
      else if (rec.status_kehadiran === 'alpa') alpa++
    }
    return {
      total: activeSessionPetugas.length,
      dicoret: dicoretSessionPetugas.length,
      hadir,
      terlambat,
      izin,
      alpa,
      belum,
    }
  }, [activeSessionPetugas, dicoretSessionPetugas, absensiMapForSelectedLatihan])

  // Handlers Setup Perayaan (Pilih / Tambah / Hapus)
  const handleInitPresetPaket = async (paket: 'semua' | 'natal' | 'paskah') => {
    setBusyAction(`init_${paket}`)
    try {
      const res = await fetch('/api/misa-besar/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init_all_presets',
          paket,
          tahun,
          paskah_jumlah_sesi: paskahPresetCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Gagal menyiapkan perayaan Misa Besar.')
      } else {
        showToast('success', data.message)
        setShowAddEventModal(false)
        await loadData()
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal memproses.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleAddSinglePreset = async (kodePerayaan: string) => {
    setBusyAction(`single_${kodePerayaan}`)
    try {
      const res = await fetch('/api/misa-besar/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_single_preset',
          kode_perayaan: kodePerayaan,
          jumlah_sesi: kodePerayaan === 'paskah' ? paskahPresetCount : undefined,
          tahun,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Gagal menambahkan perayaan.')
      } else {
        showToast('success', data.message)
        if (data.event?.id) setSelectedEventId(data.event.id)
        setShowAddEventModal(false)
        await loadData()
      }
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteEvent = async (ev: MisaBesarEvent) => {
    if (
      !window.confirm(
        `Hapus tugas perayaan "${ev.nama_perayaan} ${ev.tahun}" beserta seluruh sesi, daftar petugas, dan catatan latihannya?`
      )
    ) {
      return
    }
    setBusyAction(`del_ev_${ev.id}`)
    try {
      const res = await fetch(`/api/misa-besar/setup?event_id=${ev.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Gagal menghapus perayaan.')
      } else {
        showToast('success', data.message)
        await loadData()
      }
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleToggleSessionsCount = async (eventId: string, jumlah: number) => {
    setBusyAction(`count-${eventId}`)
    try {
      const res = await fetch('/api/misa-besar/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sessions_count',
          event_id: eventId,
          jumlah_sesi: jumlah,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Gagal mengubah jumlah misa.')
      } else {
        showToast('success', data.message)
        await loadData()
      }
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleMarkAbsensi = async (
    petugasId: string,
    status: LatihanAttendanceStatus | 'reset',
    existingNote = ''
  ) => {
    if (!selectedLatihan) return
    let catatan = existingNote
    if (status === 'izin') {
      const promptNote = window.prompt(
        'Masukkan alasan izin petugas (opsional):',
        existingNote || 'Izin keperluan keluarga / sekolah'
      )
      if (promptNote === null) return
      catatan = promptNote
    }

    setBusyAction(`abs-${petugasId}`)
    try {
      const res = await fetch('/api/misa-besar/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latihan_id: selectedLatihan.id,
          petugas_id: petugasId,
          status_kehadiran: status,
          catatan,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Gagal menyimpan absensi.')
      } else {
        if (data.auto_dicoret) {
          showToast('warning', data.message)
        }
        await loadData()
      }
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleBulkAbsensi = async (bulkAction: 'all_hadir' | 'remaining_alpa') => {
    if (!selectedLatihan || !selectedSession) return
    const label =
      bulkAction === 'all_hadir'
        ? `Tandai SELURUH petugas aktif di ${selectedSession.nama_sesi} sebagai HADIR?`
        : `Tandai petugas aktif yang BELUM ABSEN di ${selectedSession.nama_sesi} sebagai ALPA? (Petugas dengan 3x Alpa akan otomatis dicoret dari daftar petugas misa)`
    if (!window.confirm(label)) return

    setBusyAction(bulkAction)
    try {
      const res = await fetch('/api/misa-besar/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latihan_id: selectedLatihan.id,
          session_id: selectedSession.id,
          bulk_action: bulkAction,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Gagal menjalankan aksi massal.')
      } else {
        showToast(data.auto_dicoret ? 'warning' : 'success', data.message)
        await loadData()
      }
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleCopyWaSummary = async () => {
    if (!selectedEvent || !selectedLatihan || !selectedSession) return
    const lines: string[] = [
      `*REKAP ABSENSI LATIHAN MISA BESAR*`,
      `Perayaan: *${selectedEvent.nama_perayaan} ${selectedEvent.tahun}*`,
      `Sesi: *${selectedSession.nama_sesi}* (${selectedSession.jam_mulai} WIB)`,
      `Latihan: *${selectedLatihan.judul_latihan}*`,
      `Tanggal: ${selectedLatihan.tanggal_latihan} (${selectedLatihan.jam_mulai} WIB)`,
      ``,
      `Ringkasan: Hadir ${latihanStats.hadir} | Terlambat ${latihanStats.terlambat} | Izin ${latihanStats.izin} | Alpa ${latihanStats.alpa} | Belum ${latihanStats.belum}`,
      ``,
      `*Petugas Aktif ${selectedSession.nama_sesi}* (${activeSessionPetugas.length}):`,
    ]

    if (activeSessionPetugas.length === 0) {
      lines.push(`  - Belum ada petugas aktif`)
    } else {
      activeSessionPetugas.forEach((p, idx) => {
        const rec = absensiMapForSelectedLatihan[p.id]
        const st = rec ? rec.status_kehadiran.toUpperCase() : 'BELUM ABSEN'
        const alpaCnt = alpaCountMap[p.id] || 0
        const icon =
          st === 'HADIR' ? '✅' : st === 'TERLAMBAT' ? '⏰' : st === 'IZIN' ? '📝' : st === 'ALPA' ? '❌' : '⬜'
        lines.push(
          `  ${idx + 1}. ${p.profile?.nama_lengkap || 'Misdinar'} (${p.posisi_tugas}) - ${icon} ${st}${
            alpaCnt > 0 ? ` [Alpa ${alpaCnt}/3]` : ''
          }`
        )
      })
    }

    if (dicoretSessionPetugas.length > 0) {
      lines.push(``)
      lines.push(`*Dicoret karena 3x Alpa:*`)
      dicoretSessionPetugas.forEach((p) => {
        lines.push(`  - ~${p.profile?.nama_lengkap || 'Misdinar'}~ (Dicoret 3x Alpa)`)
      })
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      showToast('success', `Rekap absensi ${selectedSession.nama_sesi} siap ditempel ke WhatsApp!`)
    } catch {
      showToast('error', 'Gagal menyalin ke clipboard.')
    }
  }

  const handleUpdatePetugasPosition = async (petugasId: string, newPos: string) => {
    try {
      const res = await fetch('/api/misa-besar/petugas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: petugasId, posisi_tugas: newPos }),
      })
      if (res.ok) await loadData()
    } catch {}
  }

  const handleRestorePetugas = async (petugasId: string, nama: string) => {
    if (!window.confirm(`Pulihkan ${nama} kembali ke daftar petugas aktif?`)) return
    try {
      const res = await fetch('/api/misa-besar/petugas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: petugasId, status_petugas: 'aktif' }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', data.message || `${nama} dipulihkan ke daftar petugas aktif.`)
        await loadData()
      }
    } catch {}
  }

  const handleRemovePetugas = async (petugasId: string, nama: string) => {
    if (!window.confirm(`Hapus permanen ${nama} dari daftar petugas sesi ini?`)) return
    try {
      const res = await fetch(`/api/misa-besar/petugas?id=${petugasId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('success', `${nama} dihapus dari daftar petugas.`)
        await loadData()
      }
    } catch {}
  }

  const handleDeleteLatihan = async (latId: string, judul: string) => {
    if (!window.confirm(`Hapus sesi latihan "${judul}" beserta seluruh data absensinya?`)) return
    try {
      const res = await fetch(`/api/misa-besar/latihan?id=${latId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('success', 'Sesi latihan berhasil dihapus.')
        await loadData()
      }
    } catch {}
  }

  const handleSaveSessionEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSession) return
    setBusyAction('edit_session')
    try {
      const res = await fetch('/api/misa-besar/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_session',
          session_id: editingSession.id,
          ...sessionForm,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Gagal memperbarui sesi.')
      } else {
        showToast('success', 'Detail sesi diperbarui.')
        setEditingSession(null)
        await loadData()
      }
    } finally {
      setBusyAction(null)
    }
  }

  const handleExportCsv = () => {
    if (!selectedEvent) return
    const targetList = rekapScope === 'session' ? sessionAllPetugas : eventPetugas
    const latColsSrc = rekapScope === 'session' ? visibleLatihan : eventLatihan

    const headers = [
      'Sesi Misa/Ibadat',
      'Nama Lengkap',
      'Jenjang',
      'Wilayah',
      'Posisi Tugas',
      'Status Petugas',
      'Total Alpa',
      ...latColsSrc.map((l) => `${l.judul_latihan} (${l.tanggal_latihan})`),
    ]

    const rows = targetList.map((p) => {
      const sessName = p.session?.nama_sesi || '-'
      const alpaTotal = alpaCountMap[p.id] || 0
      const latCols = latColsSrc.map((l) => {
        const rec = absensiList.find((a) => a.latihan_id === l.id && a.petugas_id === p.id)
        return rec ? rec.status_kehadiran.toUpperCase() : 'Belum Absen'
      })
      return [
        sessName,
        p.profile?.nama_lengkap || '-',
        p.profile?.jenjang || '-',
        p.profile?.asal_wilayah_teks || '-',
        p.posisi_tugas,
        p.status_petugas === 'dicoret' ? 'DICORET (3x ALPA)' : 'AKTIF',
        String(alpaTotal),
        ...latCols,
      ]
    })

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Rekap_Latihan_${selectedEvent.nama_perayaan.replace(/\s+/g, '_')}_${selectedEvent.tahun}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">
          Memuat modul Latihan Petugas Misa Besar...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              church
            </span>
            <span className="text-xs uppercase font-bold text-secondary tracking-wider">
              Panel Khusus Pengurus Sakristi Paroki SPMR
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
            Absensi Latihan Petugas Misa Besar
          </h1>
          <p className="text-xs text-on-surface-variant">
            Pilih perayaan Natal / Paskah, klik nama petugas terpilih per sesi misa/ibadat, dan catat presensi latihan. <strong>Aturan: 3x Alpa otomatis dicoret dari daftar petugas misa.</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>

          {!needsMigration && (
            <button
              onClick={() => setShowAddEventModal(true)}
              type="button"
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>Pilih / Tambah Tugas Misa</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedbackBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {feedbackBanner.type === 'success'
              ? 'check_circle'
              : feedbackBanner.type === 'warning'
              ? 'warning'
              : 'error'}
          </span>
          <span>{feedbackBanner.text}</span>
        </div>
      )}

      {/* SQL Setup Assistant */}
      {needsMigration ? (
        <SqlMigrationNotice migrationSql={migrationSql} onRetry={loadData} />
      ) : events.length === 0 ? (
        /* Empty State: Pilih Natal, Paskah, atau Semua 7 Perayaan */
        <div className="rounded-3xl bg-surface-container-lowest border border-surface-container p-6 sm:p-10 text-center flex flex-col items-center gap-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">celebration</span>
          </div>
          <div className="max-w-xl flex flex-col gap-1.5">
            <h2 className="font-headline font-bold text-xl text-primary">
              Pilih Tugas Misa Besar Tahun {tahun}
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Pilih rangkaian perayaan yang akan dikelola pengurus: <strong>Paket Natal</strong> (Malam Natal 2 Misa, Natal 2 Misa), <strong>Paket Paskah</strong> (Minggu Palma 3 Misa, Kamis Putih 2 Misa, Jumat Agung 3 Ibadat, Malam Paskah 2 Misa, Paskah 2/3 Misa), atau buat semua sekaligus.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 bg-surface-container-low p-2 rounded-2xl border border-surface-container">
            <span className="text-xs font-bold text-on-surface-variant px-2">
              Opsi Misa Hari Raya Paskah:
            </span>
            {[2, 3].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setPaskahPresetCount(cnt as 2 | 3)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  paskahPresetCount === cnt
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Paskah {cnt} Misa
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleInitPresetPaket('natal')}
              disabled={busyAction !== null}
              type="button"
              className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-headline font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">star</span>
              <span>+ Paket Natal (2 Perayaan)</span>
            </button>
            <button
              onClick={() => handleInitPresetPaket('paskah')}
              disabled={busyAction !== null}
              type="button"
              className="px-5 py-3 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-headline font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">church</span>
              <span>+ Paket Paskah (5 Perayaan)</span>
            </button>
            <button
              onClick={() => handleInitPresetPaket('semua')}
              disabled={busyAction !== null}
              type="button"
              className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary text-xs sm:text-sm font-headline font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              <span>+ Semua 7 Perayaan</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Perayaan Event Cards dengan Pemisah Per Misa & Tombol Hapus Perayaan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {events.map((ev) => {
              const isSelected = ev.id === selectedEvent?.id
              const isRed = ev.warna_liturgi === 'Merah'
              const sessionsList = ev.sessions || []
              const activeCnt = (ev.petugas || []).filter((p) => p.status_petugas !== 'dicoret').length

              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedEventId(ev.id)
                    if (sessionsList[0]) setSelectedSessionId(sessionsList[0].id)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedEventId(ev.id)
                      if (sessionsList[0]) setSelectedSessionId(sessionsList[0].id)
                    }
                  }}
                  className={`text-left p-3 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer relative ${
                    isSelected
                      ? 'bg-primary text-on-primary border-primary shadow-md'
                      : 'bg-surface-container-lowest text-on-surface border-surface-container hover:border-primary/40 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isRed
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ev.jumlah_sesi} {ev.jenis_sesi}
                    </span>

                    <button
                      type="button"
                      title={`Hapus perayaan ${ev.nama_perayaan}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteEvent(ev)
                      }}
                      className={`p-1 rounded-lg transition-colors ${
                        isSelected
                          ? 'text-white/75 hover:bg-white/20 hover:text-white'
                          : 'text-rose-500 hover:bg-rose-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>

                  <div>
                    <span className="font-headline font-bold text-xs sm:text-sm leading-tight block">
                      {ev.nama_perayaan}
                    </span>
                    <span
                      className={`text-[10px] ${
                        isSelected ? 'text-on-primary/80' : 'text-on-surface-variant'
                      }`}
                    >
                      {activeCnt} petugas aktif
                    </span>
                  </div>

                  {/* Mini Tombol Langsung per Misa / Ibadat */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {sessionsList.map((sess) => {
                      const isActiveSess = isSelected && sess.id === selectedSession?.id
                      return (
                        <button
                          key={sess.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedEventId(ev.id)
                            setSelectedSessionId(sess.id)
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            isActiveSess
                              ? 'bg-secondary text-on-secondary shadow-xs'
                              : isSelected
                              ? 'bg-white/15 text-white hover:bg-white/25'
                              : 'bg-surface-container text-primary hover:bg-primary-fixed'
                          }`}
                        >
                          {ev.jenis_sesi} {sess.urutan}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {selectedEvent && selectedSession && (
            <div className="flex flex-col gap-5">
              {/* Bar Pemisah Per Misa / Per Ibadat + Sub-tabs */}
              <div className="flex flex-col gap-4 bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-surface-container shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        selectedEvent.warna_liturgi === 'Merah'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">church</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-headline font-bold text-base sm:text-lg text-primary">
                          {selectedEvent.nama_perayaan} {selectedEvent.tahun} &mdash;{' '}
                          <span className="text-secondary">{selectedSession.nama_sesi}</span>
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSession(selectedSession)
                            setSessionForm({
                              nama_sesi: selectedSession.nama_sesi,
                              tanggal_misa: selectedSession.tanggal_misa || '',
                              jam_mulai: selectedSession.jam_mulai,
                              kuota_petugas: selectedSession.kuota_petugas,
                            })
                          }}
                          className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                          <span>Atur Jam/Tgl</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        {selectedSession.tanggal_misa
                          ? `${selectedSession.tanggal_misa} • `
                          : 'Tanggal belum diatur • '}
                        Pukul {selectedSession.jam_mulai} WIB &bull;{' '}
                        {activeSessionPetugas.length}/{selectedSession.kuota_petugas} Petugas Aktif
                        {dicoretSessionPetugas.length > 0
                          ? ` • ${dicoretSessionPetugas.length} Dicoret (3x Alpa)`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {/* 3 Sub-Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-low p-1 rounded-xl border border-surface-container self-start lg:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('absensi')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        activeTab === 'absensi'
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">fact_check</span>
                      <span>Absensi {selectedEvent.jenis_sesi} {selectedSession.urutan}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('petugas')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        activeTab === 'petugas'
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">group_add</span>
                      <span>Pilih Petugas ({activeSessionPetugas.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('rekap')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        activeTab === 'rekap'
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">analytics</span>
                      <span>Rekapitulasi</span>
                    </button>
                  </div>
                </div>

                {/* Tab Pemisah Per Misa / Per Ibadat */}
                <div className="pt-3 border-t border-surface-container flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Pilih {selectedEvent.jenis_sesi}:
                    </span>
                    {eventSessions.map((sess) => {
                      const isSessActive = sess.id === selectedSession.id
                      const cnt = eventPetugas.filter(
                        (p) => p.session_id === sess.id && p.status_petugas !== 'dicoret'
                      ).length
                      return (
                        <button
                          key={sess.id}
                          type="button"
                          onClick={() => setSelectedSessionId(sess.id)}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                            isSessActive
                              ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                              : 'bg-surface-container-low text-on-surface border-surface-container hover:border-primary/40'
                          }`}
                        >
                          <span>{sess.nama_sesi}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isSessActive
                                ? 'bg-black/15 text-white'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}
                          >
                            {sess.jam_mulai} &bull; {cnt} ptg
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Jumlah Sesi (Paskah 2 / 3 Misa) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      Jumlah {selectedEvent.jenis_sesi}:
                    </span>
                    {(selectedEvent.kode_perayaan === 'paskah' ? [2, 3] : [2, 3, 4]).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        disabled={busyAction === `count-${selectedEvent.id}`}
                        onClick={() => {
                          if (
                            cnt < selectedEvent.jumlah_sesi &&
                            !window.confirm(
                              `Mengurangi jumlah sesi menjadi ${cnt} akan menghapus ${selectedEvent.jenis_sesi} ke-${selectedEvent.jumlah_sesi} beserta daftar petugas di dalamnya. Lanjutkan?`
                            )
                          ) {
                            return
                          }
                          handleToggleSessionsCount(selectedEvent.id, cnt)
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          selectedEvent.jumlah_sesi === cnt
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* TAB 1: ABSENSI LATIHAN KHUSUS SESI TERPILIH */}
              {activeTab === 'absensi' && (
                <div className="flex flex-col gap-5">
                  {/* Sesi Latihan Bar */}
                  <div className="rounded-2xl bg-surface-container-lowest border border-surface-container p-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">event_note</span>
                        Jadwal Latihan &bull; {selectedSession.nama_sesi} ({visibleLatihan.length} pertemuan):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLatihan(null)
                          setShowLatihanModal(true)
                        }}
                        className="px-3.5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>+ Latihan {selectedSession.nama_sesi}</span>
                      </button>
                    </div>

                    {visibleLatihan.length === 0 ? (
                      <div className="p-6 rounded-xl bg-surface-container-low text-center flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">
                          calendar_add_on
                        </span>
                        <p className="text-xs font-semibold text-on-surface">
                          Belum ada jadwal latihan untuk {selectedEvent.nama_perayaan} - {selectedSession.nama_sesi}.
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          Klik tombol <strong>+ Latihan {selectedSession.nama_sesi}</strong> di atas untuk membuat pertemuan latihan &amp; mencatat kehadiran.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {visibleLatihan.map((lat) => {
                          const isSel = lat.id === selectedLatihan?.id
                          const scopeSession = eventSessions.find((s) => s.id === lat.session_id)
                          return (
                            <div
                              key={lat.id}
                              className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl border text-xs transition-all ${
                                isSel
                                  ? 'bg-primary-fixed border-primary text-on-primary-fixed shadow-xs'
                                  : 'bg-surface-container-low border-surface-container text-on-surface hover:border-primary/40'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedLatihanId(lat.id)}
                                className="flex flex-col text-left"
                              >
                                <span className="font-bold">{lat.judul_latihan}</span>
                                <span className="text-[10px] opacity-80">
                                  {lat.tanggal_latihan} &bull; {lat.jam_mulai} WIB &bull;{' '}
                                  {scopeSession ? scopeSession.nama_sesi : 'Gabungan Semua Sesi'}
                                </span>
                              </button>
                              <button
                                type="button"
                                title="Edit sesi latihan"
                                onClick={() => {
                                  setEditingLatihan(lat)
                                  setShowLatihanModal(true)
                                }}
                                className="p-1 rounded-lg hover:bg-black/10"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button
                                type="button"
                                title="Hapus sesi latihan"
                                onClick={() => handleDeleteLatihan(lat.id, lat.judul_latihan)}
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-100"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {selectedLatihan && (
                    <>
                      {/* Counters khusus Sesi ini */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                        <div className="p-3 rounded-2xl bg-surface-container-lowest border border-surface-container">
                          <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Petugas Aktif
                          </span>
                          <p className="text-xl font-headline font-bold text-primary">
                            {latihanStats.total}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-bold uppercase text-emerald-700">
                            Hadir
                          </span>
                          <p className="text-xl font-headline font-bold text-emerald-800">
                            {latihanStats.hadir}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] font-bold uppercase text-amber-700">
                            Terlambat
                          </span>
                          <p className="text-xl font-headline font-bold text-amber-800">
                            {latihanStats.terlambat}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200">
                          <span className="text-[10px] font-bold uppercase text-sky-700">
                            Izin
                          </span>
                          <p className="text-xl font-headline font-bold text-sky-800">
                            {latihanStats.izin}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                          <span className="text-[10px] font-bold uppercase text-rose-700">
                            Alpa
                          </span>
                          <p className="text-xl font-headline font-bold text-rose-800">
                            {latihanStats.alpa}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high">
                          <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Belum Absen
                          </span>
                          <p className="text-xl font-headline font-bold text-on-surface">
                            {latihanStats.belum}
                          </p>
                        </div>
                      </div>

                      {/* Search & Action Toolbar */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-2xl border border-surface-container">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Cari petugas ${selectedSession.nama_sesi}...`}
                            className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary w-60"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAssignSession(selectedSession)}
                            className="px-3.5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-bold flex items-center gap-1.5 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-base">person_add</span>
                            <span>Pilih Nama Petugas</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => handleBulkAbsensi('all_hadir')}
                            className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-200 text-xs font-bold flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">done_all</span>
                            <span>Semua Hadir</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => handleBulkAbsensi('remaining_alpa')}
                            className="px-3 py-2 rounded-xl bg-rose-100 text-rose-900 hover:bg-rose-200 text-xs font-bold flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">person_off</span>
                            <span>Sisanya Alpa</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyWaSummary}
                            className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                            <span>Salin Rekap WA</span>
                          </button>
                        </div>
                      </div>

                      {/* Daftar Petugas & 1-Klik Status Kehadiran */}
                      <div className="rounded-2xl bg-surface-container-lowest border border-surface-container overflow-hidden shadow-xs">
                        <div className="px-4 py-3 bg-surface-container-low border-b border-surface-container flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-primary text-on-primary text-xs font-bold">
                              {selectedSession.nama_sesi}
                            </span>
                            <span className="text-[11px] text-on-surface-variant font-medium">
                              Klik status kehadiran di kanan untuk mencatat absensi (3x Alpa = Dicoret otomatis)
                            </span>
                          </div>
                        </div>

                        {activeSessionPetugas.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">
                              group_add
                            </span>
                            <p className="text-xs font-semibold text-on-surface">
                              Belum ada petugas aktif di {selectedEvent.nama_perayaan} - {selectedSession.nama_sesi}.
                            </p>
                            <button
                              type="button"
                              onClick={() => setAssignSession(selectedSession)}
                              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold"
                            >
                              + Pilih Nama Petugas {selectedSession.nama_sesi}
                            </button>
                          </div>
                        ) : visibleActivePetugas.length === 0 ? (
                          <div className="p-6 text-center text-xs text-on-surface-variant">
                            Tidak ada petugas di {selectedSession.nama_sesi} yang cocok dengan kata pencarian.
                          </div>
                        ) : (
                          <div className="divide-y divide-surface-container">
                            {visibleActivePetugas.map((p) => {
                              const absRec = absensiMapForSelectedLatihan[p.id]
                              const curStatus = absRec?.status_kehadiran
                              const totalAlpa = alpaCountMap[p.id] || 0
                              const waNum = formatWaPhone(p.profile?.no_telepon)

                              return (
                                <div
                                  key={p.id}
                                  className={`p-3.5 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                                    totalAlpa >= 2 ? 'bg-amber-50/40' : 'hover:bg-surface-container-low/40'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-xs flex items-center justify-center shrink-0">
                                      {(p.profile?.nama_lengkap || 'M').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs sm:text-sm font-bold text-on-surface">
                                          {p.profile?.nama_lengkap || 'Misdinar'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-secondary-fixed/60 text-on-secondary-fixed text-[10px] font-bold">
                                          {p.posisi_tugas}
                                        </span>
                                        {curStatus && (
                                          <span
                                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold inline-flex items-center gap-1 ${STATUS_BADGE_MAP[curStatus].badgeClass}`}
                                          >
                                            <span className="material-symbols-outlined text-[12px]">
                                              {STATUS_BADGE_MAP[curStatus].icon}
                                            </span>
                                            {STATUS_BADGE_MAP[curStatus].label}
                                          </span>
                                        )}
                                        {totalAlpa > 0 && (
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              totalAlpa >= 2
                                                ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}
                                          >
                                            {totalAlpa >= 2
                                              ? `⚠️ Alpa ${totalAlpa}/3 (1x lagi dicoret!)`
                                              : `Alpa ${totalAlpa}/3`}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-on-surface-variant">
                                        {p.profile?.jenjang || '-'} &bull;{' '}
                                        {p.profile?.asal_wilayah_teks || 'Purbowardayan'}
                                        {absRec?.catatan ? ` • Catatan: "${absRec.catatan}"` : ''}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {(
                                      ['hadir', 'terlambat', 'izin', 'alpa'] as LatihanAttendanceStatus[]
                                    ).map((st) => {
                                      const active = curStatus === st
                                      const colors: Record<LatihanAttendanceStatus, string> = {
                                        hadir: active
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
                                        terlambat: active
                                          ? 'bg-amber-600 text-white border-amber-600'
                                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
                                        izin: active
                                          ? 'bg-sky-600 text-white border-sky-600'
                                          : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
                                        alpa: active
                                          ? 'bg-rose-600 text-white border-rose-600'
                                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
                                      }

                                      return (
                                        <button
                                          key={st}
                                          type="button"
                                          disabled={busyAction === `abs-${p.id}`}
                                          onClick={() =>
                                            handleMarkAbsensi(p.id, st, absRec?.catatan || '')
                                          }
                                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold capitalize transition-all ${colors[st]}`}
                                        >
                                          {STATUS_BADGE_MAP[st].label}
                                        </button>
                                      )
                                    })}

                                    {curStatus && (
                                      <button
                                        type="button"
                                        title="Reset menjadi Belum Absen"
                                        onClick={() => handleMarkAbsensi(p.id, 'reset')}
                                        className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs"
                                      >
                                        <span className="material-symbols-outlined text-sm">
                                          restart_alt
                                        </span>
                                      </button>
                                    )}

                                    {waNum && (
                                      <a
                                        href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                                          `Berkah Dalem ${p.profile?.nama_panggilan || p.profile?.nama_lengkap}, mengingatkan jadwal ${selectedLatihan.judul_latihan} (${selectedEvent.nama_perayaan} - ${selectedSession.nama_sesi}) pada ${selectedLatihan.tanggal_latihan} pukul ${selectedLatihan.jam_mulai} WIB di ${selectedLatihan.lokasi}. Ditunggu kehadirannya!`
                                        )}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Hubungi via WhatsApp"
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-sm">
                                          chat
                                        </span>
                                        <span className="hidden sm:inline">WA</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: PILIH & KELOLA PETUGAS SESI INI */}
              {activeTab === 'petugas' && (
                <div className="rounded-2xl bg-surface-container-lowest border border-surface-container overflow-hidden flex flex-col shadow-xs">
                  <div className="p-4 bg-surface-container-low border-b border-surface-container flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline font-bold text-sm text-primary">
                          Daftar Petugas Terpilih &bull; {selectedEvent.nama_perayaan} - {selectedSession.nama_sesi}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed">
                          {activeSessionPetugas.length}/{selectedSession.kuota_petugas} petugas
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant">
                        Tinggal klik nama anggota aktif untuk menambahkan ke daftar petugas {selectedSession.nama_sesi}.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAssignSession(selectedSession)}
                      className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      <span>+ Klik Pilih Nama Petugas</span>
                    </button>
                  </div>

                  <div className="divide-y divide-surface-container">
                    {activeSessionPetugas.length === 0 ? (
                      <div className="p-8 text-center text-xs text-on-surface-variant">
                        Belum ada petugas terpilih di {selectedSession.nama_sesi}. Klik tombol <strong>+ Klik Pilih Nama Petugas</strong> di atas.
                      </div>
                    ) : (
                      activeSessionPetugas.map((p, idx) => {
                        const alpaCnt = alpaCountMap[p.id] || 0
                        return (
                          <div
                            key={p.id}
                            className="p-3.5 flex flex-wrap items-center justify-between gap-2 hover:bg-surface-container-low/40"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-mono text-on-surface-variant w-6">
                                {idx + 1}.
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-bold text-on-surface">
                                    {p.profile?.nama_lengkap}
                                  </p>
                                  {alpaCnt > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                      Alpa {alpaCnt}/3
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-on-surface-variant">
                                  {p.profile?.jenjang} &bull; {p.profile?.asal_wilayah_teks}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <select
                                value={p.posisi_tugas}
                                onChange={(e) =>
                                  handleUpdatePetugasPosition(p.id, e.target.value)
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-[11px] font-semibold text-primary"
                              >
                                {LITURGICAL_POSITIONS.map((pos) => (
                                  <option key={pos.id} value={pos.name}>
                                    {pos.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemovePetugas(
                                    p.id,
                                    p.profile?.nama_lengkap || 'Petugas'
                                  )
                                }
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                title="Hapus dari daftar petugas"
                              >
                                <span className="material-symbols-outlined text-base">
                                  delete
                                </span>
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: REKAPITULASI KEHADIRAN */}
              {activeTab === 'rekap' && (
                <div className="rounded-2xl bg-surface-container-lowest border border-surface-container overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-surface-container flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-headline font-bold text-sm text-primary">
                        Matriks Kehadiran Latihan &bull;{' '}
                        {rekapScope === 'session'
                          ? `${selectedEvent.nama_perayaan} (${selectedSession.nama_sesi})`
                          : `${selectedEvent.nama_perayaan} (Semua ${selectedEvent.jumlah_sesi} ${selectedEvent.jenis_sesi})`}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant">
                        Rekap presensi &amp; pantauan aturan 3x Alpa otomatis dicoret.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-surface-container">
                        <button
                          type="button"
                          onClick={() => setRekapScope('session')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            rekapScope === 'session'
                              ? 'bg-primary text-on-primary'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          {selectedSession.nama_sesi}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRekapScope('event')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            rekapScope === 'event'
                              ? 'bg-primary text-on-primary'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          Semua {selectedEvent.jenis_sesi}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={eventPetugas.length === 0}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {(rekapScope === 'session' ? sessionAllPetugas : eventPetugas).length === 0 ? (
                    <div className="p-8 text-center text-xs text-on-surface-variant">
                      Belum ada data petugas untuk direkapitulasi.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-surface-container text-[11px] text-on-surface-variant">
                            <th className="py-3 px-4 font-bold">Petugas</th>
                            <th className="py-3 px-3 font-bold">{selectedEvent.jenis_sesi} &amp; Posisi</th>
                            {(rekapScope === 'session' ? visibleLatihan : eventLatihan).map((l) => (
                              <th key={l.id} className="py-3 px-3 font-bold text-center whitespace-nowrap">
                                <div>{l.judul_latihan}</div>
                                <div className="text-[10px] font-normal opacity-75">
                                  {l.tanggal_latihan}
                                </div>
                              </th>
                            ))}
                            <th className="py-3 px-4 font-bold text-center">Status / Alpa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container">
                          {(rekapScope === 'session' ? sessionAllPetugas : eventPetugas).map((p) => {
                            const latColsSrc = rekapScope === 'session' ? visibleLatihan : eventLatihan
                            const alpaTotal = alpaCountMap[p.id] || 0
                            const isDicoret = p.status_petugas === 'dicoret'

                            const cols = latColsSrc.map((l) => {
                              const applicable = !l.session_id || l.session_id === p.session_id
                              if (!applicable) {
                                return (
                                  <td key={l.id} className="py-3 px-3 text-center text-on-surface-variant/40">
                                    &mdash;
                                  </td>
                                )
                              }
                              const rec = absensiList.find(
                                (a) => a.latihan_id === l.id && a.petugas_id === p.id
                              )
                              return (
                                <td key={l.id} className="py-3 px-3 text-center">
                                  {rec ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_BADGE_MAP[rec.status_kehadiran].badgeClass}`}
                                    >
                                      {STATUS_BADGE_MAP[rec.status_kehadiran].label}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-on-surface-variant">
                                      Belum
                                    </span>
                                  )}
                                </td>
                              )
                            })

                            return (
                              <tr
                                key={p.id}
                                className={
                                  isDicoret
                                    ? 'bg-rose-50/60 text-rose-900/75'
                                    : 'hover:bg-surface-container-low/40'
                                }
                              >
                                <td className="py-3 px-4">
                                  <div
                                    className={`font-bold ${
                                      isDicoret ? 'line-through text-rose-800' : 'text-on-surface'
                                    }`}
                                  >
                                    {p.profile?.nama_lengkap}
                                  </div>
                                  <div className="text-[10px] text-on-surface-variant">
                                    {p.profile?.jenjang} &bull; {p.profile?.asal_wilayah_teks}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-primary">
                                    {p.session?.nama_sesi || '-'}
                                  </div>
                                  <div className="text-[10px] text-on-surface-variant">
                                    {p.posisi_tugas}
                                  </div>
                                </td>
                                {cols}
                                <td className="py-3 px-4 text-center">
                                  {isDicoret ? (
                                    <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                                      DICORET ({alpaTotal}x Alpa)
                                    </span>
                                  ) : (
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        alpaTotal >= 2
                                          ? 'bg-rose-100 text-rose-800'
                                          : alpaTotal === 1
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      Aktif &bull; {alpaTotal}/3 Alpa
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* PANEL DAFTAR PETUGAS DICORET (3x ALPA) */}
              {dicoretSessionPetugas.length > 0 && (
                <div className="rounded-2xl bg-rose-50/70 border border-rose-200 overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowDicoretList((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-rose-100/70 border-b border-rose-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-700 text-lg">
                        person_remove
                      </span>
                      <span className="font-headline font-bold text-xs sm:text-sm text-rose-950">
                        Daftar Petugas Dicoret dari {selectedSession.nama_sesi} ({dicoretSessionPetugas.length} orang) &bull; Tidak Ikut Latihan 3x (Alpa)
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-rose-800 text-lg">
                      {showDicoretList ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {showDicoretList && (
                    <div className="divide-y divide-rose-200/80">
                      {dicoretSessionPetugas.map((p) => {
                        const alpaCnt = alpaCountMap[p.id] || 3
                        return (
                          <div
                            key={p.id}
                            className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-rose-900 line-through">
                                  {p.profile?.nama_lengkap}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                                  DICORET ({alpaCnt}x Alpa)
                                </span>
                                <span className="text-[11px] text-rose-800">
                                  {p.posisi_tugas}
                                </span>
                              </div>
                              <span className="text-[11px] text-rose-800/80">
                                {p.alasan_coret || 'Tidak mengikuti latihan 3 kali tanpa keterangan (Alpa)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRestorePetugas(
                                    p.id,
                                    p.profile?.nama_lengkap || 'Petugas'
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 text-[11px] font-bold"
                              >
                                Pulihkan
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemovePetugas(
                                    p.id,
                                    p.profile?.nama_lengkap || 'Petugas'
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold"
                              >
                                Hapus Permanen
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Pilih / Tambah Tugas Misa Besar (Natal / Paskah / Satuan) */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-surface-container-lowest border border-surface-container shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-primary text-on-primary flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-base">
                  Pilih / Tambah Tugas Misa Besar ({tahun})
                </h3>
                <p className="text-[11px] text-on-primary/80">
                  Tambahkan paket Natal, Paskah, atau pilih perayaan secara satuan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              {/* Paket Cepat */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Paket Cepat:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleInitPresetPaket('natal')}
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-left flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-bold text-amber-900">
                      + Paket Natal (Malam Natal &amp; Natal)
                    </span>
                    <span className="text-[10px] text-amber-800/80">
                      Malam Natal 2 Misa, Natal 2 Misa
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleInitPresetPaket('paskah')}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-left flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-bold text-rose-900">
                      + Paket Paskah &amp; Pekan Suci
                    </span>
                    <span className="text-[10px] text-rose-800/80">
                      Palma 3 Misa, Kamis Putih 2, Jumat Agung 3, Paskah {paskahPresetCount} Misa
                    </span>
                  </button>
                </div>
              </div>

              {/* Pilihan Perayaan Satuan */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Atau Tambah Perayaan Satuan:
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span>Paskah:</span>
                    {[2, 3].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPaskahPresetCount(c as 2 | 3)}
                        className={`px-2 py-0.5 rounded font-bold ${
                          paskahPresetCount === c
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {c} Misa
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-surface-container border border-surface-container rounded-2xl overflow-hidden">
                  {MISA_BESAR_PRESETS.map((preset) => {
                    const exists = events.find((e) => e.kode_perayaan === preset.kode_perayaan)
                    const isNatal = NATAL_CODES.includes(preset.kode_perayaan)
                    return (
                      <div
                        key={preset.kode_perayaan}
                        className="p-3 flex items-center justify-between gap-2 bg-surface-container-low/30"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface">
                              {preset.nama_perayaan}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isNatal
                                  ? 'bg-amber-100 text-amber-800'
                                  : PASKAH_CODES.includes(preset.kode_perayaan)
                                  ? 'bg-rose-100 text-rose-800'
                                  : ''
                              }`}
                            >
                              {preset.kode_perayaan === 'paskah'
                                ? `${paskahPresetCount} Misa`
                                : `${preset.jumlah_sesi} ${preset.jenis_sesi}`}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant">
                            {preset.keterangan}
                          </p>
                        </div>

                        {exists ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(exists)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold"
                          >
                            Hapus
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => handleAddSinglePreset(preset.kode_perayaan)}
                            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-[11px] font-bold"
                          >
                            + Tambah
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low border-t border-surface-container flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Klik Pilih Nama Petugas ("Tinggal Klik Tok") */}
      <AssignPetugasModal
        isOpen={Boolean(assignSession)}
        onClose={() => setAssignSession(null)}
        session={assignSession}
        eventName={selectedEvent?.nama_perayaan || ''}
        activeMembers={activeMembers}
        existingPetugas={eventPetugas}
        onSuccess={() => {
          showToast('success', 'Petugas terpilih berhasil ditambahkan ke daftar misa.')
          loadData()
        }}
      />

      {/* Modal Buat / Edit Latihan */}
      {selectedEvent && (
        <LatihanModal
          isOpen={showLatihanModal}
          onClose={() => {
            setShowLatihanModal(false)
            setEditingLatihan(null)
          }}
          eventId={selectedEvent.id}
          eventName={selectedEvent.nama_perayaan}
          sessions={eventSessions}
          defaultSessionId={selectedSession?.id || null}
          editingLatihan={editingLatihan}
          onSuccess={(createdId) => {
            if (createdId) setSelectedLatihanId(createdId)
            showToast('success', 'Sesi latihan berhasil disimpan.')
            loadData()
          }}
        />
      )}

      {/* Modal Edit Session (Tanggal & Jam Misa) */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest border border-surface-container shadow-2xl overflow-hidden">
            <div className="p-4 bg-primary text-on-primary flex items-center justify-between">
              <h3 className="font-headline font-bold text-sm">
                Edit Detail Sesi &bull; {editingSession.nama_sesi}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-1 rounded-full hover:bg-white/15"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveSessionEdit} className="p-5 flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1">Nama Sesi</label>
                <input
                  type="text"
                  required
                  value={sessionForm.nama_sesi}
                  onChange={(e) => setSessionForm((f) => ({ ...f, nama_sesi: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1">Tanggal Misa/Ibadat</label>
                  <input
                    type="date"
                    value={sessionForm.tanggal_misa}
                    onChange={(e) =>
                      setSessionForm((f) => ({ ...f, tanggal_misa: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Jam Mulai (WIB)</label>
                  <input
                    type="time"
                    value={sessionForm.jam_mulai}
                    onChange={(e) => setSessionForm((f) => ({ ...f, jam_mulai: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Kuota Petugas</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={sessionForm.kuota_petugas}
                  onChange={(e) =>
                    setSessionForm((f) => ({ ...f, kuota_petugas: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busyAction === 'edit_session'}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
