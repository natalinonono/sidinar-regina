'use client'

import React, { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BookingWithDetails } from '@/types/database'
import { evaluateCheckinWindow, CheckinEvaluation } from '@/lib/utils/time'

interface CheckinModalProps {
  booking: BookingWithDetails | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CheckinModal: React.FC<CheckinModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [evaluation, setEvaluation] = useState<CheckinEvaluation | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successStatus, setSuccessStatus] = useState<'hadir' | 'terlambat' | null>(null)

  useEffect(() => {
    if (!booking || !booking.schedule) return

    const checkWindow = () => {
      const evalRes = evaluateCheckinWindow(
        booking.schedule!.tanggal_misa,
        booking.schedule!.jam_mulai,
        booking.schedule!.kategori
      )
      setEvaluation(evalRes)
    }

    checkWindow()
    const timer = setInterval(checkWindow, 10000)
    return () => clearInterval(timer)
  }, [booking])

  if (!isOpen || !booking || !booking.schedule) return null

  const isAlreadyCheckedIn = booking.status_kehadiran === 'hadir' || booking.status_kehadiran === 'terlambat' || booking.status_kehadiran === 'alpa'

  const handlePerformCheckin = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/bookings/${booking.id}/checkin`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Presensi gagal diproses.')
        setLoading(false)
        return
      }

      setSuccessStatus(data.status)
      setLoading(false)
      onSuccess()
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan jaringan.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-primary to-primary-container text-on-primary text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-on-primary/70 hover:text-on-primary hover:bg-white/10 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-secondary-fixed">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              qr_code_scanner
            </span>
          </div>
          <h2 className="font-headline text-lg font-bold">Presensi Sakristi Digital</h2>
          <p className="text-xs text-on-primary/80 mt-1">
            {booking.schedule.judul_misa} • Pukul {booking.schedule.jam_mulai.substring(0, 5)} WIB
          </p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-5 text-center">
          {errorMessage && (
            <div className="w-full p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2 border border-error/20 text-left">
              <span className="material-symbols-outlined text-error text-base shrink-0">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* QR Code Container */}
          <div className="p-4 rounded-2xl bg-white shadow-md border-2 border-primary/20 flex flex-col items-center gap-2">
            <QRCodeSVG
              value={`SIDINAR:${booking.id}:${booking.user_id}:${booking.schedule.tanggal_misa}`}
              size={180}
              level="H"
              includeMargin={false}
            />
            <span className="font-mono text-[10px] text-on-surface-variant tracking-wider uppercase">
              KODE TUGAS: {booking.id.substring(0, 8)}
            </span>
          </div>

          {/* Duty & Person Info */}
          <div className="w-full p-3 rounded-xl bg-surface-container-low flex flex-col gap-1.5 text-xs text-left border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-medium">Status Saat Ini:</span>
              <span
                className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                  booking.status_kehadiran === 'hadir'
                    ? 'bg-emerald-100 text-emerald-800'
                    : booking.status_kehadiran === 'terlambat'
                    ? 'bg-amber-100 text-amber-800'
                    : booking.status_kehadiran === 'alpa'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-primary-fixed text-primary'
                }`}
              >
                {booking.status_kehadiran}
              </span>
            </div>
            {booking.waktu_checkin && (
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Waktu Presensi:</span>
                <span className="font-mono text-on-surface">
                  {new Date(booking.waktu_checkin).toLocaleTimeString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  WIB
                </span>
              </div>
            )}
          </div>

          {/* Check-in Rule Live Banner */}
          {evaluation && !isAlreadyCheckedIn && (
            <div
              className={`w-full p-3.5 rounded-xl text-xs flex items-start gap-2.5 text-left border ${
                evaluation.status === 'hadir'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : evaluation.status === 'terlambat'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-surface-container text-on-surface-variant border-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-base mt-0.5 shrink-0">
                {evaluation.status === 'hadir' ? 'check_circle' : 'schedule'}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold capitalize">Status Jendela: {evaluation.status}</span>
                <span className="text-[11px]">{evaluation.message}</span>
              </div>
            </div>
          )}

          {/* Success Banner if just checked in */}
          {successStatus && (
            <div className="w-full p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">
                verified
              </span>
              <span>
                Presensi berhasil! Berkah Dalem atas pelayanan tulus di altar Tuhan.
              </span>
            </div>
          )}

          {/* Button Action */}
          {!isAlreadyCheckedIn ? (
            <button
              onClick={handlePerformCheckin}
              disabled={loading || Boolean(evaluation && !evaluation.allowed)}
              className="w-full py-3 px-4 rounded-xl font-headline font-bold text-xs bg-primary text-on-primary hover:bg-primary-container shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
            >
              {loading ? (
                <span>Memvalidasi Sakristi...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                  <span>Presensi Sakristi Sekarang</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              type="button"
            >
              Tutup Jendela
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
