'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface ScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccessCheckin?: (petugasData: any) => void
  endpoint?: string
  extraPayload?: Record<string, any>
  modalTitle?: string
  modalSubtitle?: string
  manualPlaceholder?: string
  manualHint?: string
}

export default function ScannerModal({
  isOpen,
  onClose,
  onSuccessCheckin,
  endpoint = '/api/checkin',
  extraPayload,
  modalTitle = 'Pindai Presensi Petugas',
  modalSubtitle = 'Sorot kamera ke QR Code di layar HP misdinar',
  manualPlaceholder = 'Contoh: 7E587393 atau SIDINAR:...',
  manualHint = 'Ketik 8 karakter kode tugas yang tertera tepat di bawah QR code HP anggota.',
}: ScannerModalProps) {
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [processing, setProcessing] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    petugas?: any
  } | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isRunningRef = useRef(false)
  const endpointRef = useRef(endpoint)
  const extraPayloadRef = useRef(extraPayload)
  endpointRef.current = endpoint
  extraPayloadRef.current = extraPayload

  // Start scanner when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      setScanResult(null)
      setCameraError(null)
      return
    }

    let isMounted = true

    const startScanner = async () => {
      setCameraError(null)
      setScanning(true)

      try {
        // Tunggu elemen reader ter-render di DOM
        await new Promise((resolve) => setTimeout(resolve, 300))
        if (!isMounted) return

        const html5QrCode = new Html5Qrcode('qr-reader-container')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (processing) return
            // Pause scanner momentarily during processing
            await handleCheckin(decodedText)
          },
          () => {
            // QR scan failure - normal when frame has no QR
          }
        )

        isRunningRef.current = true
      } catch (err: any) {
        console.warn('Gagal mengakses kamera:', err)
        setCameraError(
          err?.message ||
            'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser atau gunakan input kode manual di bawah.'
        )
      } finally {
        if (isMounted) setScanning(false)
      }
    }

    startScanner()

    return () => {
      isMounted = false
      stopScanner()
    }
  }, [isOpen])

  const stopScanner = async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (e) {
        // ignore already stopped
      }
      isRunningRef.current = false
      scannerRef.current = null
    }
  }

  const handleCheckin = async (codeToVerify: string) => {
    if (!codeToVerify.trim() || processing) return

    setProcessing(true)
    setScanResult(null)

    try {
      const res = await fetch(endpointRef.current, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(extraPayloadRef.current || {}),
          qr_data: codeToVerify.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setScanResult({
          success: false,
          message: data.error || 'Gagal memproses presensi.',
        })
        return
      }

      // Success
      setScanResult({
        success: true,
        message: data.message,
        petugas: data.petugas,
      })

      if (onSuccessCheckin) {
        onSuccessCheckin(data.petugas)
      }

      setManualCode('')
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'Terjadi kesalahan koneksi saat memproses presensi.',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleCheckin(manualCode)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-surface-container-lowest border border-surface-container shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              qr_code_scanner
            </span>
            <div>
              <h3 className="font-headline font-bold text-base">{modalTitle}</h3>
              <p className="text-[11px] text-on-primary/80">{modalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-on-primary transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Scan Result Feedback Alert */}
          {scanResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-slide-up ${
                scanResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl shrink-0 ${
                  scanResult.success ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {scanResult.success ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1">
                <p className="font-bold text-sm leading-tight">{scanResult.message}</p>
                {scanResult.petugas && (
                  <div className="mt-1.5 pt-1.5 border-t border-emerald-200 text-[11px] flex flex-col gap-0.5">
                    <span>
                      <strong>Petugas:</strong> {scanResult.petugas.nama} ({scanResult.petugas.posisi})
                    </span>
                    <span>
                      <strong>Misa:</strong> {scanResult.petugas.misa} ({scanResult.petugas.waktu_checkin} WIB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera Viewfinder */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-primary/20 shadow-inner">
            <div id="qr-reader-container" className="w-full h-full" />

            {scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white text-xs">
                <span className="material-symbols-outlined text-3xl animate-spin text-primary-fixed">
                  progress_activity
                </span>
                <span>Mengaktifkan kamera...</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center gap-2 bg-neutral-900/90 text-white text-xs">
                <span className="material-symbols-outlined text-3xl text-amber-400">
                  videocam_off
                </span>
                <p className="font-medium">{cameraError}</p>
                <span className="text-[11px] text-neutral-300">
                  Silakan gunakan input manual kode tugas di bawah.
                </span>
              </div>
            )}

            {processing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/80 backdrop-blur-xs text-white text-xs">
                <span className="material-symbols-outlined text-3xl animate-spin">
                  progress_activity
                </span>
                <span className="font-bold">Memverifikasi Presensi Sakristi...</span>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2 pt-1 border-t border-surface-container">
            <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
              Atau Input Kode Tugas / ID Manual
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={manualPlaceholder}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <button
                type="submit"
                disabled={!manualCode.trim() || processing}
                className="px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Check-in</span>
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant">
              {manualHint}
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-container-low border-t border-surface-container flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors"
            type="button"
          >
            Tutup Scanner
          </button>
        </div>
      </div>
    </div>
  )
}

