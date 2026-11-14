'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MassSchedule, BookingWithDetails, WarnaLiturgi } from '@/types/database'
import { LiturgyBadge } from '@/components/LiturgyBadge'
import { PositionBadge } from '@/components/PositionBadge'
import { getCurrentLiturgicalWeek, getLiturgicalWeekForDate, isMassToleranceExpired, toWibDateString } from '@/lib/utils/time'
import { generateWhatsAppReminderMessage } from '@/lib/utils/calendar'

export default function PengurusJadwalPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialScheduleId = searchParams.get('schedule_id')

  const [schedules, setSchedules] = useState<MassSchedule[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(initialScheduleId)
  const [selectedBulkScheduleIds, setSelectedBulkScheduleIds] = useState<string[]>([])
  const [filterMode, setFilterMode] = useState<'pekan_ini' | 'mendatang' | 'semua'>('pekan_ini')
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // New Schedule Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newScheduleData, setNewScheduleData] = useState({
    judul_misa: '',
    kategori: 'mingguan' as 'harian' | 'mingguan',
    tanggal_misa: toWibDateString(),
    jam_mulai: '08:00',
    kuota_maksimal: 12,
    tahun_liturgi: 'Tahun B / II',
    warna_liturgi: 'Hijau' as WarnaLiturgi,
    nama_selebran: '',
  })

  const { weekNumber, yearNumber, startDateStr, endDateStr } = useMemo(() => getCurrentLiturgicalWeek(), [])

  const loadSchedulesAndBookings = async () => {
    try {
      let scheduleQuery = supabase
        .from('mass_schedules')
        .select('*')
        .order('tanggal_misa', { ascending: true })
        .order('jam_mulai', { ascending: true })

      if (filterMode === 'pekan_ini') {
        scheduleQuery = scheduleQuery
          .gte('tanggal_misa', startDateStr)
          .lte('tanggal_misa', endDateStr)
      } else if (filterMode === 'mendatang') {
        scheduleQuery = scheduleQuery.gte('tanggal_misa', startDateStr)
      }

      const { data: scheduleList } = await scheduleQuery

      const list = (scheduleList as MassSchedule[]) || []
      setSchedules(list)
      if (!selectedScheduleId && list.length > 0) {
        setSelectedScheduleId(list[0].id)
      } else if (selectedScheduleId && !list.some((s) => s.id === selectedScheduleId)) {
        setSelectedScheduleId(list[0]?.id || null)
      }

      let bookingList: any[] = []
      if (list.length > 0) {
        const scheduleIds = list.map((s) => s.id)
        const { data: bData } = await supabase
          .from('bookings')
          .select('*, schedule:mass_schedules(*), profile:profiles(*)')
          .in('schedule_id', scheduleIds)
        bookingList = bData || []
      }

      const items = (bookingList || []) as BookingWithDetails[]
      const expiredIds: string[] = []
      const now = new Date()

      for (const b of items) {
        if (
          b.status_kehadiran === 'terdaftar' &&
          b.schedule &&
          isMassToleranceExpired(b.schedule.tanggal_misa, b.schedule.jam_mulai, b.schedule.kategori, now)
        ) {
          b.status_kehadiran = 'alpa'
          expiredIds.push(b.id)
        }
      }

      if (expiredIds.length > 0) {
        ;(supabase.from('bookings') as any)
          .update({ status_kehadiran: 'alpa' })
          .in('id', expiredIds)
          .then(() => {})
      }

      setBookings(items)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedulesAndBookings()

    const channel = supabase
      .channel('pengurus_jadwal_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadSchedulesAndBookings()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mass_schedules' }, () => {
        loadSchedulesAndBookings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekNumber, yearNumber, filterMode])

  const selectedSchedule = useMemo(() => {
    return schedules.find((s) => s.id === selectedScheduleId) || schedules[0] || null
  }, [schedules, selectedScheduleId])

  const selectedBookings = useMemo(() => {
    if (!selectedSchedule) return []
    return bookings.filter((b) => b.schedule_id === selectedSchedule.id)
  }, [bookings, selectedSchedule])

  const [isDeleting, setIsDeleting] = useState(false)

  const toggleSelectSchedule = (id: string) => {
    setSelectedBulkScheduleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const isAllSelected = schedules.length > 0 && schedules.every((s) => selectedBulkScheduleIds.includes(s.id))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBulkScheduleIds([])
    } else {
      setSelectedBulkScheduleIds(schedules.map((s) => s.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedBulkScheduleIds.length === 0) return

    const count = selectedBulkScheduleIds.length
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus ${count} jadwal misa terpilih sekaligus?\n\nSemua pendaftaran dan data penugasan altar pada jadwal-jadwal tersebut akan ikut terhapus permanen.\n\nTindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch('/api/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBulkScheduleIds }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Gagal menghapus beberapa jadwal misa.')
        setIsDeleting(false)
        return
      }

      alert(data.message || `Berhasil menghapus ${count} jadwal misa sekaligus.`)

      if (selectedScheduleId && selectedBulkScheduleIds.includes(selectedScheduleId)) {
        setSelectedScheduleId(null)
      }
      setSelectedBulkScheduleIds([])
      await loadSchedulesAndBookings()
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus jadwal misa.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string, judulMisa: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus jadwal "${judulMisa}" beserta seluruh pendaftaran di dalamnya?\n\nTindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/schedules?id=${encodeURIComponent(scheduleId)}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Gagal menghapus jadwal misa.')
        setIsDeleting(false)
        return
      }

      alert(data.message || 'Jadwal misa berhasil dihapus.')
      setSelectedBulkScheduleIds((prev) => prev.filter((id) => id !== scheduleId))
      if (selectedScheduleId === scheduleId) {
        setSelectedScheduleId(null)
      }
      await loadSchedulesAndBookings()
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus jadwal.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdatePosition = async (bookingId: string, newPosition: string) => {
    try {
      const { error } = await (supabase.from('bookings') as any)
        .update({ posisi_tugas: newPosition })
        .eq('id', bookingId)

      if (error) {
        alert(error.message)
      } else {
        loadSchedulesAndBookings()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const targetWeek = getLiturgicalWeekForDate(newScheduleData.tanggal_misa)
      const jamFormatted = newScheduleData.jam_mulai.length === 5
        ? `${newScheduleData.jam_mulai}:00`
        : newScheduleData.jam_mulai
      const { data, error } = await (supabase.from('mass_schedules') as any)
        .insert({
          ...newScheduleData,
          jam_mulai: jamFormatted,
          minggu_ke: targetWeek.weekNumber,
          tahun: targetWeek.yearNumber,
        })
        .select()
        .single()

      if (error) {
        alert(error.message)
        return
      }

      setShowAddModal(false)
      loadSchedulesAndBookings()
      if (data) setSelectedScheduleId((data as any).id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">Memuat jadwal &amp; penugasan altar...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              calendar_month
            </span>
            <span className="text-xs uppercase font-bold text-secondary tracking-wider">
              Manajemen Petugas &amp; Jadwal Misa
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
            Penataan Petugas Altar &amp; Jadwal
          </h1>
          <p className="text-xs text-on-surface-variant">
            Atur dan pantau daftar misdinar yang bertugas untuk setiap sesi perayaan Ekaristi.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-headline font-bold transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Tambah Jadwal Baru</span>
        </button>
      </div>

      {/* Main Grid: Left Schedule Selector & Right Duty Assignment Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Schedule Selector List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1.5">
              <span>Jadwal Misa</span>
              <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-[10px] font-bold text-primary">
                {schedules.length}
              </span>
            </h2>
            {schedules.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
                title={isAllSelected ? 'Batalkan pilihan semua jadwal' : 'Pilih semua jadwal dalam daftar'}
              >
                <span className="material-symbols-outlined text-sm leading-none">
                  {isAllSelected ? 'check_box' : 'select_all'}
                </span>
                <span>{isAllSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
              </button>
            )}
          </div>

          {/* Filter Range Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low border border-surface-container text-[11px]">
            <button
              type="button"
              onClick={() => setFilterMode('pekan_ini')}
              className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                filterMode === 'pekan_ini'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Pekan Ini
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('mendatang')}
              className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                filterMode === 'mendatang'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Mendatang
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('semua')}
              className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                filterMode === 'semua'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Semua
            </button>
          </div>

          {/* Bulk Action Banner */}
          {selectedBulkScheduleIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex items-center justify-between gap-2 text-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {selectedBulkScheduleIds.length}
                </span>
                <span className="font-bold text-rose-950 text-[11px] leading-tight">
                  Jadwal dipilih
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedBulkScheduleIds([])}
                  className="px-2 py-1 rounded-lg bg-white text-on-surface-variant hover:text-on-surface text-[11px] font-medium border border-rose-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-2.5 py-1 rounded-lg bg-error text-white hover:bg-error/90 text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Hapus semua jadwal yang dicentang sekaligus"
                >
                  <span className="material-symbols-outlined text-sm leading-none">delete_sweep</span>
                  <span>Hapus Sekaligus ({selectedBulkScheduleIds.length})</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 max-h-[700px] overflow-y-auto pr-1">
            {schedules.map((s) => {
              const isSelected = selectedSchedule?.id === s.id
              const isBulkSelected = selectedBulkScheduleIds.includes(s.id)
              const sBookings = bookings.filter((b) => b.schedule_id === s.id)
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedScheduleId(s.id)}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                    isBulkSelected
                      ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-300'
                      : isSelected
                      ? 'bg-surface-container-lowest border-primary shadow-md ring-1 ring-primary/30'
                      : 'bg-surface-container-low border-surface-container hover:bg-surface-container-lowest'
                  }`}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-0.5 flex items-center shrink-0"
                    title={isBulkSelected ? 'Batalkan pilihan jadwal ini' : 'Pilih jadwal ini untuk dihapus sekaligus'}
                  >
                    <input
                      type="checkbox"
                      checked={isBulkSelected}
                      onChange={() => toggleSelectSchedule(s.id)}
                      className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-fixed/40">
                        {s.kategori === 'harian' ? 'Harian' : 'Mingguan'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-primary">
                          {sBookings.length} / {s.kuota_maksimal} Terisi
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSchedule(s.id, s.judul_misa)
                          }}
                          disabled={isDeleting}
                          title="Hapus jadwal misa ini"
                          className="p-1 rounded-md text-error/70 hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-base leading-none">delete</span>
                        </button>
                      </div>
                    </div>
                    <h3 className="font-headline font-bold text-primary line-clamp-1">{s.judul_misa}</h3>
                    <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] mt-1">
                      <span>{s.tanggal_misa}</span>
                      <span>•</span>
                      <span className="font-semibold text-on-surface">{s.jam_mulai.substring(0, 5)} WIB</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {schedules.length === 0 && (
              <div className="p-8 rounded-2xl bg-surface-container-low text-center text-xs text-on-surface-variant">
                Tidak ada jadwal misa pada periode yang dipilih.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Duty Allocation Deck */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {selectedSchedule ? (
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
              {/* Selected Mass Header Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-secondary-fixed font-bold text-[11px] uppercase">
                    {selectedSchedule.kategori === 'harian' ? 'Misa Harian' : 'Misa Mingguan'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-on-primary/80">
                      Pukul {selectedSchedule.jam_mulai.substring(0, 5)} WIB
                    </span>
                    <button
                      onClick={() => handleDeleteSchedule(selectedSchedule.id, selectedSchedule.judul_misa)}
                      disabled={isDeleting}
                      title="Hapus jadwal misa ini"
                      className="px-3 py-1.5 rounded-xl bg-error/90 hover:bg-error text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm leading-none">delete</span>
                      <span>Hapus Jadwal</span>
                    </button>
                  </div>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-xl">{selectedSchedule.judul_misa}</h2>
                  <p className="text-xs text-on-primary/80 mt-1">
                    {selectedSchedule.tanggal_misa} • Pukul {selectedSchedule.jam_mulai.substring(0, 5)} WIB
                  </p>
                </div>
              </div>

              {/* Enrolled Servers Table */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-headline font-bold text-sm text-primary">
                    Daftar Petugas Terdaftar ({selectedBookings.length} / {selectedSchedule.kuota_maksimal})
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedBookings.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Kirim notifikasi pengingat otomatis ke seluruh ${selectedBookings.length} petugas misa ini?`)) return
                          for (const b of selectedBookings) {
                            try {
                              await fetch(`/api/bookings/${b.id}/reminder`, { method: 'POST' })
                              // Siarkan broadcast realtime langsung dari browser agar seketika muncul di web & HP anggota
                              const broadcastChannel = supabase.channel('reminders-broadcast')
                              await broadcastChannel.send({
                                type: 'broadcast',
                                event: 'reminder_alert',
                                payload: {
                                  booking_id: b.id,
                                  user_id: b.user_id,
                                  recipient_name: b.profile?.nama_lengkap || 'Petugas',
                                  title: `🔔 Pengingat Tugas: ${selectedSchedule.judul_misa}`,
                                  message: `Pengurus sakristi mengingatkan tugas altar pada ${selectedSchedule.tanggal_misa} pukul ${selectedSchedule.jam_mulai.substring(0, 5)} WIB (${b.posisi_tugas || 'Petugas Altar'}).`,
                                  timestamp: Date.now(),
                                },
                              })
                            } catch (e) {
                              console.warn('Reminder broadcast err:', e)
                            }
                          }
                          loadSchedulesAndBookings()
                          alert('Notifikasi pengingat berhasil disiarkan ke seluruh web dan handphone petugas!')
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                        type="button"
                        title="Kirim notifikasi otomatis ke semua petugas"
                      >
                        <span className="material-symbols-outlined text-sm">notifications_active</span>
                        <span>Ingatkan Semua Petugas</span>
                      </button>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">print</span>
                      <span>Cetak Lembar Tugas</span>
                    </button>
                  </div>
                </div>

                {selectedBookings.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-surface-container-low text-center text-xs text-on-surface-variant">
                    Belum ada anggota yang mendaftar untuk jadwal misa ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-surface-container">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-surface-container">
                        <tr>
                          <th className="py-3 px-3.5">Nama Petugas</th>
                          <th className="py-3 px-3.5">Jenjang</th>
                          <th className="py-3 px-3.5">Asal Wilayah &amp; Lingkungan</th>
                          <th className="py-3 px-3.5">Presensi</th>
                          <th className="py-3 px-3.5">Pengingat (WA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container">
                        {selectedBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-surface-container-low/40">
                            <td className="py-3 px-3.5 font-bold text-primary">
                              {b.profile?.nama_lengkap}
                              <span className="block font-normal text-[11px] text-on-surface-variant">
                                ({b.profile?.nama_panggilan})
                              </span>
                            </td>
                            <td className="py-3 px-3.5 font-medium">{b.profile?.jenjang}</td>
                            <td className="py-3 px-3.5 text-on-surface-variant">
                              {b.profile?.asal_wilayah_teks}
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-block font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                                  b.status_kehadiran === 'hadir'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.status_kehadiran === 'terlambat'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-surface-container text-on-surface-variant'
                                }`}
                              >
                                {b.status_kehadiran}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              {b.profile ? (
                                <button
                                  onClick={async () => {
                                    const { waUrl } = generateWhatsAppReminderMessage(selectedSchedule, b.profile!)
                                    window.open(waUrl, '_blank')
                                    try {
                                      await fetch(`/api/bookings/${b.id}/reminder`, { method: 'POST' })
                                      // Siarkan broadcast realtime langsung dari browser
                                      const broadcastChannel = supabase.channel('reminders-broadcast')
                                      await broadcastChannel.send({
                                        type: 'broadcast',
                                        event: 'reminder_alert',
                                        payload: {
                                          booking_id: b.id,
                                          user_id: b.user_id,
                                          recipient_name: b.profile?.nama_lengkap || 'Petugas',
                                          title: `🔔 Pengingat Tugas: ${selectedSchedule.judul_misa}`,
                                          message: `Pengurus sakristi mengingatkan tugas altar pada ${selectedSchedule.tanggal_misa} pukul ${selectedSchedule.jam_mulai.substring(0, 5)} WIB (${b.posisi_tugas || 'Petugas Altar'}).`,
                                          timestamp: Date.now(),
                                        },
                                      })
                                    } catch (e) {
                                      console.warn('Reminder broadcast err:', e)
                                    }
                                    loadSchedulesAndBookings()
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs ${
                                    b.wa_reminder_sent
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                  type="button"
                                  title="Kirim pesan pengingat resmi ke WhatsApp misdinar"
                                >
                                  <span className="material-symbols-outlined text-[13px]">chat</span>
                                  <span>{b.wa_reminder_sent ? 'Diingatkan (Kirim Ulang)' : 'Kirim Pengingat WA'}</span>
                                </button>
                              ) : (
                                <span className="text-on-surface-variant">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-surface-container-lowest border border-surface-container text-center text-xs text-on-surface-variant">
              Pilih jadwal misa di sebelah kiri untuk melihat detail penugasan.
            </div>
          )}
        </div>
      </div>

      {/* Add Mass Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-2xl border border-surface-container flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-headline font-bold text-base text-primary">
                Tambah Jadwal Misa Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface">Judul Misa</label>
                <input
                  type="text"
                  required
                  value={newScheduleData.judul_misa}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, judul_misa: e.target.value })}
                  placeholder="Contoh: Misa Hari Raya Kristus Raja"
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Kategori Misa</label>
                  <select
                    value={newScheduleData.kategori}
                    onChange={(e) =>
                      setNewScheduleData({
                        ...newScheduleData,
                        kategori: e.target.value as any,
                        kuota_maksimal: e.target.value === 'harian' ? 8 : 12,
                      })
                    }
                    className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container"
                  >
                    <option value="harian">Misa Harian (Kuota 8)</option>
                    <option value="mingguan">Misa Mingguan (Kuota 12)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Tanggal Misa</label>
                  <input
                    type="date"
                    required
                    value={newScheduleData.tanggal_misa}
                    onChange={(e) => setNewScheduleData({ ...newScheduleData, tanggal_misa: e.target.value })}
                    className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface">Jam Mulai (WIB)</label>
                <input
                  type="time"
                  required
                  value={newScheduleData.jam_mulai}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, jam_mulai: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary-container shadow-sm"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
