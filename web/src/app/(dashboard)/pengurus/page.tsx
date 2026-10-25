'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MassSchedule, BookingWithDetails, Profile } from '@/types/database'
import { LiturgyBadge } from '@/components/LiturgyBadge'
import { getCurrentLiturgicalWeek } from '@/lib/utils/time'

export default function PengurusDashboardPage() {
  const supabase = createClient()

  const [schedules, setSchedules] = useState<MassSchedule[]>([])
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [pendingMembers, setPendingMembers] = useState<Profile[]>([])
  const [totalMembersCount, setTotalMembersCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState<string | null>(null)

  const { weekNumber, yearNumber, formattedRange } = useMemo(() => getCurrentLiturgicalWeek(), [])

  const loadData = async () => {
    try {
      // 1. Fetch schedules for current week
      const { data: scheduleList } = await supabase
        .from('mass_schedules')
        .select('*')
        .eq('minggu_ke', weekNumber)
        .eq('tahun', yearNumber)
        .order('tanggal_misa', { ascending: true })
        .order('jam_mulai', { ascending: true })
      setSchedules(scheduleList || [])

      // 2. Fetch bookings for current week
      const { data: bookingList } = await supabase
        .from('bookings')
        .select('*, schedule:mass_schedules(*), profile:profiles(*)')
        .eq('minggu_ke', weekNumber)
        .eq('tahun', yearNumber)
      setBookings(bookingList || [])

      // 3. Fetch pending members
      const { data: pending } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setPendingMembers(pending || [])

      // 4. Fetch total active members
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aktif')
      setTotalMembersCount(count || 0)

      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Realtime subscription
    const channel = supabase
      .channel('pengurus_live_monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mass_schedules' }, () => loadData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekNumber, yearNumber])

  const handleGenerateMonthSchedule = async () => {
    if (!confirm('Generate jadwal otomatis untuk 30 hari ke depan (Misa Harian 05.30 WIB & Misa Mingguan)?')) {
      return
    }

    setGenerating(true)
    setGenerateMsg(null)

    try {
      const res = await fetch('/api/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysCount: 30 }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Gagal generate jadwal.')
      } else {
        setGenerateMsg(data.message)
        loadData()
      }
      setGenerating(false)
    } catch (err: any) {
      alert(err.message || 'Gangguan jaringan.')
      setGenerating(false)
    }
  }

  const handleQuickApprove = async (memberId: string) => {
    try {
      const res = await fetch('/api/pengurus/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, status: 'aktif' }),
      })
      if (res.ok) {
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    const checkedIn = bookings.filter((b) => b.status_kehadiran === 'hadir' || b.status_kehadiran === 'terlambat')
    const onTime = bookings.filter((b) => b.status_kehadiran === 'hadir')
    const onTimeRate = checkedIn.length > 0 ? Math.round((onTime.length / checkedIn.length) * 100) : 100

    return {
      totalBooked: bookings.length,
      totalCheckedIn: checkedIn.length,
      onTimeCount: onTime.length,
      onTimeRate,
    }
  }, [bookings])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">
          Memuat Pusat Kendali Pengurus...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Upper Command Deck Header */}
      <section className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-surface-container">
              <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield_person
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
                <span className="text-xs uppercase font-bold text-secondary tracking-wider">
                  Pusat Kendali Pengurus Misdinar
                </span>
              </div>
              <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
                SiDinar Regina Purbowardayan
              </h1>
              <p className="text-xs text-on-surface-variant">
                Paroki Santa Perawan Maria Regina Purbowardayan • Siklus {formattedRange}
              </p>
            </div>
          </div>

          {/* Quick Actions Deck */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGenerateMonthSchedule}
              disabled={generating}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-headline font-bold transition-all shadow-sm flex items-center gap-2 group disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-base">bolt</span>
              <span>{generating ? 'Membuat Jadwal...' : 'Generate Jadwal 1 Bulan'}</span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] bg-primary-fixed-dim text-on-primary-fixed font-bold">
                Otomatis
              </span>
            </button>

            <Link
              href="/pengurus/presensi"
              className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-primary">qr_code_scanner</span>
              <span>Scanner Presensi</span>
            </Link>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container">
              <span className="text-xs font-medium text-on-surface">Pendaftaran:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                DIBUKA
              </span>
            </div>
          </div>
        </div>

        {generateMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{generateMsg}</span>
          </div>
        )}

        {/* Quick KPI Counters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* KPI 1 */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl">groups</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                Total Anggota Aktif
              </span>
              <span className="font-headline font-bold text-xl text-primary">
                {totalMembersCount}
              </span>
              <span className="text-[10px] text-secondary font-medium">Lengkap Wilayah 1-7</span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                Verifikasi Pending
              </span>
              <span className="font-headline font-bold text-xl text-amber-700">
                {pendingMembers.length}
              </span>
              <Link href="/pengurus/anggota" className="text-[10px] text-primary font-semibold hover:underline">
                Lihat &amp; Setujui &rarr;
              </Link>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                church
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                Tugas Terdaftar
              </span>
              <span className="font-headline font-bold text-xl text-secondary">
                {attendanceStats.totalBooked}
              </span>
              <span className="text-[10px] text-on-surface-variant">Pekan Berjalan</span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700 shrink-0">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                Ketepatan Waktu
              </span>
              <span className="font-headline font-bold text-xl text-emerald-700">
                {attendanceStats.onTimeRate}%
              </span>
              <span className="text-[10px] text-on-surface-variant">Batas H-30 / H-20</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Pending Members Approval Card (High Priority for Pengurus) */}
      {pendingMembers.length > 0 && (
        <section className="p-6 rounded-3xl bg-amber-50/60 border border-amber-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 text-xl">
                how_to_reg
              </span>
              <h2 className="font-headline font-bold text-base text-amber-900">
                Permohonan Akun Anggota Baru Menunggu Persetujuan ({pendingMembers.length})
              </h2>
            </div>
            <Link
              href="/pengurus/anggota"
              className="text-xs font-bold text-primary hover:underline"
            >
              Buka Semua di Menu Anggota &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingMembers.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-headline font-bold text-xs text-primary">
                    {m.nama_lengkap} ({m.nama_panggilan})
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    WA: {m.no_telepon} • Jenjang {m.jenjang}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/80 line-clamp-1">
                    {m.asal_wilayah_teks}
                  </span>
                </div>
                <button
                  onClick={() => handleQuickApprove(m.id)}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>Setujui (Approve)</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Live Mass Schedule Monitoring Grid */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="font-headline font-bold text-xl text-primary tracking-tight">
              Monitor Keterisian Kuota Misa Minggu Ini
            </h2>
            <p className="text-xs text-on-surface-variant">
              Klik pada jadwal untuk melihat daftar nama petugas altar dan alokasi peran liturgi.
            </p>
          </div>
          <Link
            href="/pengurus/jadwal"
            className="px-4 py-2 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high text-xs font-semibold transition-colors"
          >
            Kelola Detail Jadwal &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider font-semibold border-b border-surface-container">
              <tr>
                <th className="py-3.5 px-4">Jadwal Misa</th>
                <th className="py-3.5 px-4">Tanggal &amp; Waktu</th>
                <th className="py-3.5 px-4">Warna &amp; Selebran</th>
                <th className="py-3.5 px-4">Keterisian Kuota</th>
                <th className="py-3.5 px-4">Petugas Terdaftar</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {schedules.map((s) => {
                const sBookings = bookings.filter((b) => b.schedule_id === s.id)
                const isFull = sBookings.length >= s.kuota_maksimal
                const percent = Math.min(100, Math.round((sBookings.length / s.kuota_maksimal) * 100))

                return (
                  <tr key={s.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-primary">
                      {s.judul_misa}
                      <span className="block text-[11px] font-normal text-on-surface-variant">
                        Kategori: {s.kategori === 'harian' ? 'Harian (05.30 WIB)' : 'Mingguan'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {s.tanggal_misa}
                      <span className="block text-[11px] font-sans text-on-surface-variant">
                        {s.jam_mulai.substring(0, 5)} WIB
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <LiturgyBadge warna={s.warna_liturgi} tahunLiturgi={s.tahun_liturgi} />
                      <span className="block text-[11px] text-on-surface-variant mt-1 font-medium">
                        {s.nama_selebran}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 w-32">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span>{sBookings.length} / {s.kuota_maksimal}</span>
                          <span className={isFull ? 'text-error' : 'text-emerald-700'}>
                            {isFull ? 'Penuh' : `${s.kuota_maksimal - sBookings.length} sisa`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isFull ? 'bg-error' : percent >= 75 ? 'bg-amber-500' : 'bg-primary'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {sBookings.slice(0, 3).map((b) => (
                          <span
                            key={b.id}
                            className="inline-block px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-medium"
                          >
                            {b.profile?.nama_panggilan || b.profile?.nama_lengkap || 'Petugas'}
                          </span>
                        ))}
                        {sBookings.length > 3 && (
                          <span className="text-[10px] text-on-surface-variant font-medium self-center">
                            +{sBookings.length - 3} lainnya
                          </span>
                        )}
                        {sBookings.length === 0 && (
                          <span className="text-[11px] text-on-surface-variant/60 italic">
                            Belum ada pendaftar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/pengurus/jadwal?schedule_id=${s.id}`}
                        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold transition-colors"
                      >
                        Detail &rarr;
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
