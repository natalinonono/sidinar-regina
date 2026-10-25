'use client'

import React, { useState } from 'react'
import { MassSchedule } from '@/types/database'
import { LiturgyBadge } from './LiturgyBadge'
import { LITURGICAL_POSITIONS } from '@/lib/utils/positions'

interface BookingModalProps {
  schedule: MassSchedule | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const BookingModal: React.FC<BookingModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedPosition, setSelectedPosition] = useState<string>('Petugas Altar / Umum')
  const [commitmentChecked, setCommitmentChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !schedule) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commitmentChecked) {
      setErrorMessage('Anda wajib menyetujui komitmen kehadiran tepat waktu.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: schedule.id,
          posisi_tugas: selectedPosition,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal mendaftar jadwal misa.')
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
              church
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-secondary-fixed">
              Pendaftaran Tugas Altar
            </span>
          </div>
          <h2 className="font-headline text-lg sm:text-xl font-bold leading-tight">
            {schedule.judul_misa}
          </h2>
          <p className="text-xs text-on-primary/80 mt-1">
            {schedule.tanggal_misa} • Pukul {schedule.jam_mulai.substring(0, 5)} WIB
          </p>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2 border border-error/20">
              <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Schedule Info Summary Card */}
          <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2.5 border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant font-medium">Batas Booking</span>
              <span className="text-xs font-semibold text-secondary">Maks 1x {schedule.kategori === 'harian' ? 'Harian' : 'Mingguan'} / Pekan</span>
            </div>
          </div>

          {/* Posisi Tugas Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
              <span>Pilih Peran / Posisi Tugas</span>
              <span className="text-[11px] text-on-surface-variant font-normal">Dapat disesuaikan oleh pengurus</span>
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {LITURGICAL_POSITIONS.map((pos) => {
                const isSelected = selectedPosition === pos.name
                return (
                  <label
                    key={pos.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary font-semibold shadow-xs'
                        : 'border-surface-container hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="posisi"
                      value={pos.name}
                      checked={isSelected}
                      onChange={() => setSelectedPosition(pos.name)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{pos.latinName}</span>
                        <span className="text-[11px] text-on-surface-variant font-normal">({pos.name})</span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant font-normal line-clamp-1">
                        {pos.description}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Commitment Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary-fixed/30 border border-secondary/20 cursor-pointer text-xs text-on-secondary-fixed">
            <input
              type="checkbox"
              checked={commitmentChecked}
              onChange={(e) => setCommitmentChecked(e.target.checked)}
              className="mt-0.5 accent-secondary w-4 h-4 rounded cursor-pointer shrink-0"
              required
            />
            <span className="leading-relaxed">
              Saya berkomitmen hadir di sakristi paling lambat <strong>{schedule.kategori === 'harian' ? 'pukul 05.10 WIB' : '30 menit sebelum misa'}</strong>, mengenakan jubah rapi, dan mematuhi Tata Tertib Misdinar SPMR.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md flex items-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Konfirmasi Pendaftaran</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                    check
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
