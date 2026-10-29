'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MassSchedule, BookingWithDetails, WarnaLiturgi } from '@/types/database'
import { LiturgyBadge } from '@/components/LiturgyBadge'
import { PositionBadge } from '@/components/PositionBadge'
import { LITURGICAL_POSITIONS } from '@/lib/utils/positions'
import { getCurrentLiturgicalWeek, isMassToleranceExpired } from '@/lib/utils/time'
import { generateWhatsAppReminderMessage } from '@/lib/utils/calendar'

export default function PengurusJadwalPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialScheduleId = searchParams.get('schedule_id')

  const [schedules, setSchedules] = useState<MassSchedule[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(initialScheduleId)
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // New Schedule Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newScheduleData, setNewScheduleData] = useState({
    judul_misa: '',
    kategori: 'mingguan' as 'harian' | 'mingguan',
    tanggal_misa: new Date().toISOString().split('T')[0],
    jam_mulai: '08:00',
    kuota_maksimal: 12,
    tahun_liturgi: 'Tahun B / II',
    warna_liturgi: 'Hijau' as WarnaLiturgi,
    nama_selebran: '',
  })

  const { weekNumber, yearNumber, startDateStr, endDateStr } = useMemo(() => getCurrentLiturgicalWeek(), [])

  const loadSchedulesAndBookings = async () => {
    try {
      const { data: scheduleList } = await supabase
        .from('mass_schedules')
        .select('*')
        .gte('tanggal_misa', startDateStr)
        .lte('tanggal_misa', endDateStr)
        .order('tanggal_misa', { ascending: true })
        .order('jam_mulai', { ascending: true })

      const list = (scheduleList as MassSchedule[]) || []
      setSchedules(list)
      if (!selectedScheduleId && list.length > 0) {
        setSelectedScheduleId(list[0].id)
      }

      const { data: bookingList } = await supabase
        .from('bookings')
        .select('*, schedule:mass_schedules(*), profile:profiles(*)')
        .eq('minggu_ke', weekNumber)
        .eq('tahun', yearNumber)

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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekNumber, yearNumber])

  const selectedSchedule = useMemo(() => {
    return schedules.find((s) => s.id === selectedScheduleId) || schedules[0] || null
  }, [schedules, selectedScheduleId])

  const selectedBookings = useMemo(() => {
    if (!selectedSchedule) return []
    return bookings.filter((b) => b.schedule_id === selectedSchedule.id)
  }, [bookings, selectedSchedule])

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
      const { data, error } = await (supabase.from('mass_schedules') as any)
        .insert({
          ...newScheduleData,
          jam_mulai: `${newScheduleData.jam_mulai}:00`,
          minggu_ke: weekNumber,
          tahun: yearNumber,
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
          <h2 className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">
            Pilih Jadwal Misa ({schedules.length})
          </h2>
          <div className="flex flex-col gap-2 max-h-[700px] overflow-y-auto pr-1">
            {schedules.map((s) => {
              const isSelected = selectedSchedule?.id === s.id
              const sBookings = bookings.filter((b) => b.schedule_id === s.id)
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedScheduleId(s.id)}
                  className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-surface-container-lowest border-primary shadow-md ring-1 ring-primary/30'
                      : 'bg-surface-container-low border-surface-container hover:bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-fixed/40">
                      {s.kategori === 'harian' ? 'Harian' : 'Mingguan'}
                    </span>
                    <span className="text-[11px] font-semibold text-primary">
                      {sBookings.length} / {s.kuota_maksimal} Terisi
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-primary line-clamp-1">{s.judul_misa}</h3>
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] mt-1">
                    <span>{s.tanggal_misa}</span>
                    <span>•</span>
                    <span className="font-semibold text-on-surface">{s.jam_mulai.substring(0, 5)} WIB</span>
                  </div>
                </div>
              )
            })}
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
                  <span className="text-xs font-mono text-on-primary/80">
                    Pukul {selectedSchedule.jam_mulai.substring(0, 5)} WIB
                  </span>
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
