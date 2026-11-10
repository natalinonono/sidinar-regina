'use client'

import React, { useState, useEffect } from 'react'
import { MisaBesarLatihan, MisaBesarSession } from '@/types/misaBesar'

interface LatihanModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
  sessions: MisaBesarSession[]
  defaultSessionId?: string | null
  editingLatihan?: MisaBesarLatihan | null
  onSuccess: (createdId?: string) => void
}

export function LatihanModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  sessions,
  defaultSessionId = null,
  editingLatihan,
  onSuccess,
}: LatihanModalProps) {
  const [judul, setJudul] = useState('')
  const [sessionId, setSessionId] = useState<string>('') // '' = semua sesi (gabungan)
  const [tanggal, setTanggal] = useState('')
  const [jam, setJam] = useState('16:00')
  const [lokasi, setLokasi] = useState('Gereja & Sakristi SPMR Purbowardayan')
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (editingLatihan) {
      setJudul(editingLatihan.judul_latihan)
      setSessionId(editingLatihan.session_id || '')
      setTanggal(editingLatihan.tanggal_latihan)
      setJam(editingLatihan.jam_mulai || '16:00')
      setLokasi(editingLatihan.lokasi || 'Gereja & Sakristi SPMR Purbowardayan')
      setCatatan(editingLatihan.catatan || '')
    } else {
      const todayStr = new Date().toISOString().split('T')[0]
      const targetSess = defaultSessionId
        ? sessions.find((s) => s.id === defaultSessionId)
        : null
      setJudul(
        targetSess
          ? `Latihan ${eventName} - ${targetSess.nama_sesi}`
          : `Latihan ${eventName}`
      )
      setSessionId(defaultSessionId || '')
      setTanggal(todayStr)
      setJam('16:00')
      setLokasi('Gereja & Sakristi SPMR Purbowardayan')
      setCatatan('')
    }
    setErrorMsg(null)
  }, [isOpen, editingLatihan, eventName, defaultSessionId, sessions])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!judul.trim() || !tanggal) {
      setErrorMsg('Judul dan tanggal latihan wajib diisi.')
      return
    }

    setSaving(true)
    setErrorMsg(null)
    try {
      const isEdit = Boolean(editingLatihan)
      const res = await fetch('/api/misa-besar/latihan', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingLatihan!.id } : { event_id: eventId }),
          session_id: sessionId || null,
          judul_latihan: judul.trim(),
          tanggal_latihan: tanggal,
          jam_mulai: jam,
          lokasi: lokasi.trim(),
          catatan: catatan.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan jadwal latihan.')
        setSaving(false)
        return
      }

      setSaving(false)
      onSuccess(data.latihan?.id)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Gangguan jaringan.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-surface-container-lowest border border-surface-container shadow-2xl overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-primary/75">
              {eventName}
            </span>
            <h3 className="font-headline font-bold text-base">
              {editingLatihan ? 'Edit Sesi Latihan' : 'Buat Jadwal Sesi Latihan'}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
              Judul Pertemuan Latihan *
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Latihan 1 / Gladi Bersih"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
              Cakupan Petugas
            </label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Latihan Gabungan (Seluruh Misa/Ibadat {eventName})</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  Khusus {s.nama_sesi} ({s.jam_mulai} WIB)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                Tanggal Latihan *
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                Jam Mulai (WIB) *
              </label>
              <input
                type="time"
                required
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
              Lokasi Latihan
            </label>
            <input
              type="text"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
              Catatan Persiapan (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Bawa buku panduan liturgi & datang 15 menit lebih awal"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-container">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : editingLatihan ? 'Simpan Perubahan' : 'Buat Sesi Latihan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

