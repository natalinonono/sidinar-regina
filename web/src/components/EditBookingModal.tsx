'use client'

import React, { useState } from 'react'
import { BookingWithDetails, MassSchedule } from '@/types/database'

interface EditBookingModalProps {
  booking: BookingWithDetails | null
  allSchedules: MassSchedule[]
  allBookings: BookingWithDetails[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  booking,
  allSchedules,
  allBookings,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (!isOpen || !booking || !booking.schedule) return null

  // Jadwal alternatif dalam kategori yang sama atau pekan yang sama
  const candidateSchedules = allSchedules.filter((s) => {
    // Sembunyikan jadwal saat ini
    if (s.id === booking.schedule_id) return false
    // Tampilkan kategori yang sama
    return s.kategori === booking.schedule?.kategori
  })

  // Hitung sisa kuota untuk setiap opsi jadwal alternatif
  const schedulesWithQuota = candidateSchedules.map((s) => {
    const bookedCount = allBookings.filter((b) => b.schedule_id === s.id).length
    const remaining = Math.max(0, s.kuota_maksimal - bookedCount)
    return {
      schedule: s,
      bookedCount,
      remaining,
      isFull: remaining <= 0,
    }
  })

  // 1. Handler Batalkan Jadwal Tugas
  const handleCancelBooking = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/bookings?id=${booking.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal membatalkan jadwal tugas.')
        setLoading(false)
        return
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan koneksi.')
      setLoading(false)
    }
  }

  // 2. Handler Pindah Jadwal Tugas (Reschedule)
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedScheduleId) {
      setErrorMessage('Silakan pilih jadwal misa tujuan baru.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          new_schedule_id: selectedScheduleId,
          posisi_tugas: 'Petugas Altar',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal mengubah jadwal tugas.')
        setLoading(false)
        return
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan koneksi.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container">
        {/* Marian Top Banner */}
        <div className="relative p-6 bg-gradient-to-r from-primary to-primary-container text-on-primary">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-on-primary/70 hover:text-on-primary hover:bg-white/10 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary-fixed text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              edit_calendar
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-secondary-fixed">
              Kelola Tugas Pelayanan Altar Anda
            </span>
          </div>
          <h2 className="font-headline text-lg sm:text-xl font-bold leading-tight">
            Ubah / Batalkan Jadwal Tugas
          </h2>
          <p className="text-xs text-on-primary/80 mt-1">
            Anda hanya dapat mengelola jadwal tugas milik Anda sendiri.
          </p>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2 border border-error/20">
              <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Booking Card */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Jadwal Tugas Anda Saat Ini:
            </span>
            <h3 className="font-headline font-bold text-base text-on-surface">
              {booking.schedule.judul_misa}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-secondary">event</span>
                {booking.schedule.tanggal_misa}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <span className="material-symbols-outlined text-sm">schedule</span>
                {booking.schedule.jam_mulai.substring(0, 5)} WIB
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">
                Status: {booking.status_kehadiran}
              </span>
            </div>
          </div>

          {/* Form Pindah Jadwal */}
          {!confirmCancel ? (
            <form onSubmit={handleReschedule} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                  <span>Pindah ke Pilihan Jadwal Misa Lain:</span>
                  <span className="text-[11px] text-secondary font-normal">
                    Kategori {booking.schedule.kategori === 'harian' ? 'Harian' : 'Mingguan'}
                  </span>
                </label>

                {schedulesWithQuota.length === 0 ? (
                  <p className="text-xs text-on-surface-variant p-3 rounded-lg bg-surface-container text-center">
                    Tidak ada jadwal misa alternatif lain yang tersedia pada kategori ini.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {schedulesWithQuota.map(({ schedule, remaining, isFull }) => (
                      <label
                        key={schedule.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                          selectedScheduleId === schedule.id
                            ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs'
                            : isFull
                            ? 'border-surface-container opacity-50 cursor-not-allowed bg-surface-container-low'
                            : 'border-surface-container hover:border-outline hover:bg-surface-container-lowest'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="new_schedule"
                            value={schedule.id}
                            disabled={isFull}
                            checked={selectedScheduleId === schedule.id}
                            onChange={(e) => setSelectedScheduleId(e.target.value)}
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="text-on-surface font-semibold">
                              {schedule.judul_misa}
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              {schedule.tanggal_misa} • Pukul {schedule.jam_mulai.substring(0, 5)} WIB
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-error-container text-error'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isFull ? 'Penuh' : `Sisa ${remaining} kuota`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons for Reschedule */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-error hover:bg-error-container/40 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  <span>Batalkan Tugas</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !selectedScheduleId}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    <span>{loading ? 'Menyimpan...' : 'Pindah Jadwal'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Confirm Cancel Panel */
            <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 flex flex-col gap-3">
              <div className="flex items-start gap-2.5 text-error">
                <span className="material-symbols-outlined text-xl shrink-0">warning</span>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-sm">Konfirmasi Pembatalan Jadwal</span>
                  <p className="text-on-surface-variant leading-relaxed">
                    Apakah Anda yakin ingin membatalkan tugas di <strong>{booking.schedule.judul_misa}</strong>? Slot kuota Anda akan langsung dibuka kembali untuk misdinar lain.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-error/20">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-error text-on-error hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">delete_forever</span>
                  <span>{loading ? 'Membatalkan...' : 'Ya, Batalkan Tugas Saya'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
