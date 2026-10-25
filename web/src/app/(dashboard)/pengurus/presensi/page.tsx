'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookingWithDetails, AttendanceStatus } from '@/types/database'
import { PositionBadge } from '@/components/PositionBadge'
import { getCurrentLiturgicalWeek } from '@/lib/utils/time'

export default function PengurusPresensiPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'semua' | AttendanceStatus>('semua')

  const { weekNumber, yearNumber, formattedRange } = useMemo(() => getCurrentLiturgicalWeek(), [])

  const loadPresensi = async () => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*, schedule:mass_schedules(*), profile:profiles(*)')
        .eq('minggu_ke', weekNumber)
        .eq('tahun', yearNumber)
        .order('waktu_checkin', { ascending: false, nullsFirst: false })

      setBookings(data || [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPresensi()

    // Supabase Realtime subscription
    const channel = supabase
      .channel('pengurus_presensi_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadPresensi()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekNumber, yearNumber])

  const handleUpdateAttendance = async (bookingId: string, newStatus: AttendanceStatus) => {
    try {
      const { error } = await (supabase.from('bookings') as any)
        .update({
          status_kehadiran: newStatus,
          waktu_checkin: newStatus === 'hadir' || newStatus === 'terlambat' ? new Date().toISOString() : null,
        })
        .eq('id', bookingId)

      if (error) {
        alert(error.message)
      } else {
        loadPresensi()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.profile?.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.schedule?.judul_misa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.posisi_tugas.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'semua' || b.status_kehadiran === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [bookings, searchTerm, statusFilter])

  // Summary counters
  const counters = useMemo(() => {
    return {
      total: bookings.length,
      hadir: bookings.filter((b) => b.status_kehadiran === 'hadir').length,
      terlambat: bookings.filter((b) => b.status_kehadiran === 'terlambat').length,
      izin: bookings.filter((b) => b.status_kehadiran === 'izin').length,
      alpa: bookings.filter((b) => b.status_kehadiran === 'alpa').length,
      terdaftar: bookings.filter((b) => b.status_kehadiran === 'terdaftar').length,
    }
  }, [bookings])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">Memuat live presensi sakristi...</p>
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
              qr_code_scanner
            </span>
            <span className="text-xs uppercase font-bold text-secondary tracking-wider">
              Live Monitor Sakristi SPMR ({formattedRange})
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
            Monitor Presensi Digital &amp; Kedisiplinan
          </h1>
          <p className="text-xs text-on-surface-variant">
            Pelacakan real-time kehadiran petugas altar, verifikasi keterlambatan (H-30/H-20), dan override manual pengurus.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base text-primary">print</span>
          <span>Cetak Rekap Presensi</span>
        </button>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col">
          <span className="text-[10px] text-on-surface-variant uppercase font-medium">Total Terdaftar</span>
          <span className="font-headline font-bold text-xl text-primary">{counters.total}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col">
          <span className="text-[10px] text-emerald-800 uppercase font-medium">Hadir Tepat Waktu</span>
          <span className="font-headline font-bold text-xl text-emerald-700">{counters.hadir}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col">
          <span className="text-[10px] text-amber-800 uppercase font-medium">Terlambat</span>
          <span className="font-headline font-bold text-xl text-amber-600">{counters.terlambat}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col">
          <span className="text-[10px] text-primary uppercase font-medium">Belum Presensi</span>
          <span className="font-headline font-bold text-xl text-primary">{counters.terdaftar}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col">
          <span className="text-[10px] text-purple-800 uppercase font-medium">Izin Sakristi</span>
          <span className="font-headline font-bold text-xl text-purple-700">{counters.izin}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col">
          <span className="text-[10px] text-error uppercase font-medium">Alpa (Tanpa Kabar)</span>
          <span className="font-headline font-bold text-xl text-error">{counters.alpa}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-surface-container">
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, misa, atau posisi..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {(['semua', 'hadir', 'terlambat', 'terdaftar', 'izin', 'alpa'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-xs font-bold'
                  : 'bg-surface-container text-on-surface-variant hover:text-primary'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Attendance Feed Table */}
      {filteredBookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface-container-lowest border border-surface-container text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-outline">
            checklist
          </span>
          <p className="text-xs text-on-surface-variant font-medium">
            Tidak ada catatan presensi yang sesuai.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider font-semibold border-b border-surface-container">
              <tr>
                <th className="py-3.5 px-4">Nama Petugas Misdinar</th>
                <th className="py-3.5 px-4">Misa yang Dilayani</th>
                <th className="py-3.5 px-4">Peran / Posisi</th>
                <th className="py-3.5 px-4">Status Presensi</th>
                <th className="py-3.5 px-4">Waktu Check-In</th>
                <th className="py-3.5 px-4 text-right">Override Pengurus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-primary block">
                      {b.profile?.nama_lengkap}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-normal">
                      WA: {b.profile?.no_telepon} • Jenjang {b.profile?.jenjang}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-on-surface block">
                      {b.schedule?.judul_misa}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {b.schedule?.tanggal_misa} ({b.schedule?.jam_mulai.substring(0, 5)} WIB)
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <PositionBadge position={b.posisi_tugas} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block font-bold text-[11px] uppercase px-2.5 py-0.5 rounded-full ${
                        b.status_kehadiran === 'hadir'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status_kehadiran === 'terlambat'
                          ? 'bg-amber-100 text-amber-800'
                          : b.status_kehadiran === 'izin'
                          ? 'bg-purple-100 text-purple-800'
                          : b.status_kehadiran === 'alpa'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {b.status_kehadiran}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-on-surface-variant">
                    {b.waktu_checkin
                      ? new Date(b.waktu_checkin).toLocaleTimeString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }) + ' WIB'
                      : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateAttendance(b.id, 'hadir')}
                        title="Set Hadir Tepat Waktu"
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-emerald-100 text-emerald-700 transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>
                      <button
                        onClick={() => handleUpdateAttendance(b.id, 'terlambat')}
                        title="Set Terlambat"
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-amber-100 text-amber-700 transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                      </button>
                      <button
                        onClick={() => handleUpdateAttendance(b.id, 'izin')}
                        title="Set Izin"
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-purple-100 text-purple-700 transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">event_busy</span>
                      </button>
                      <button
                        onClick={() => handleUpdateAttendance(b.id, 'alpa')}
                        title="Set Alpa (Tidak Hadir)"
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-error-container text-error transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
