'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookingWithDetails } from '@/types/database'
import { LiturgyBadge } from '@/components/LiturgyBadge'
import { PositionBadge } from '@/components/PositionBadge'

export default function RiwayatTugasPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('bookings')
          .select('*, schedule:mass_schedules(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setBookings(data || [])
      }
      setLoading(false)
    }

    loadHistory()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">Memuat riwayat pelayanan...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            history_edu
          </span>
          <span className="text-xs uppercase font-bold text-secondary tracking-wider">
            Rekapitulasi Pelayanan
          </span>
        </div>
        <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
          Riwayat Tugas &amp; Presensi Altar
        </h1>
        <p className="text-xs text-on-surface-variant">
          Catatan seluruh perayaan Ekaristi yang telah Anda layani di Paroki SPMR Purbowardayan.
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface-container-lowest border border-surface-container text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-outline">
            receipt_long
          </span>
          <p className="text-xs text-on-surface-variant font-medium">
            Belum ada riwayat tugas misa yang tercatat.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider font-semibold border-b border-surface-container">
              <tr>
                <th className="py-3.5 px-4">Jadwal Misa</th>
                <th className="py-3.5 px-4">Tanggal &amp; Waktu</th>
                <th className="py-3.5 px-4">Posisi Tugas</th>
                <th className="py-3.5 px-4">Status Kehadiran</th>
                <th className="py-3.5 px-4">Waktu Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-primary">
                    {b.schedule?.judul_misa || 'Misa Kudus'}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {b.schedule?.tanggal_misa}
                    <span className="block text-[11px] text-on-surface-variant font-sans">
                      Pukul {b.schedule?.jam_mulai.substring(0, 5)} WIB
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
                        }) + ' WIB'
                      : '-'}
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
