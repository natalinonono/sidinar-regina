'use client'

import React, { useState, useEffect } from 'react'
import { Profile, JenjangPendidikan } from '@/types/database'

interface EditProfileModalProps {
  profile: Profile | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedProfile: Profile) => void
}

const JENJANG_OPTIONS: JenjangPendidikan[] = ['SD', 'SMP', 'SMA/K', 'Mahasiswa', 'Umum']

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [namaLengkap, setNamaLengkap] = useState('')
  const [namaPanggilan, setNamaPanggilan] = useState('')
  const [noTelepon, setNoTelepon] = useState('')
  const [asalWilayahTeks, setAsalWilayahTeks] = useState('')
  const [jenjang, setJenjang] = useState<JenjangPendidikan>('SMP')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setNamaLengkap(profile.nama_lengkap || '')
      setNamaPanggilan(profile.nama_panggilan || '')
      setNoTelepon(profile.no_telepon || '')
      setAsalWilayahTeks(profile.asal_wilayah_teks || '')
      setJenjang(profile.jenjang || 'SMP')
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [profile, isOpen])

  if (!isOpen || !profile) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_lengkap: namaLengkap,
          nama_panggilan: namaPanggilan,
          no_telepon: noTelepon,
          asal_wilayah_teks: asalWilayahTeks,
          jenjang,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal menyimpan perubahan data profil.')
        setLoading(false)
        return
      }

      setSuccessMessage('Data diri berhasil diperbarui!')
      setLoading(false)
      onSuccess(data.profile)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan.')
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
            <span
              className="material-symbols-outlined text-secondary-fixed text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              manage_accounts
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-secondary-fixed">
              Data Pribadi Misdinar
            </span>
          </div>
          <h2 className="font-headline text-lg sm:text-xl font-bold leading-tight">
            Perbarui Data Diri Anggota
          </h2>
          <p className="text-xs text-on-primary/80 mt-1">
            Perubahan data diri Anda akan langsung aktif tanpa memerlukan persetujuan admin/pengurus.
          </p>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-error text-base shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-300">
              <span className="material-symbols-outlined text-emerald-600 text-base shrink-0">
                check_circle
              </span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-on-surface">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              placeholder="Contoh: Yohanes Maria Vianney"
              className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nama Panggilan */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-on-surface">Nama Panggilan *</label>
              <input
                type="text"
                required
                value={namaPanggilan}
                onChange={(e) => setNamaPanggilan(e.target.value)}
                placeholder="Contoh: Vianney"
                className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Nomor WhatsApp */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-on-surface">Nomor WhatsApp Aktif *</label>
              <input
                type="tel"
                required
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Asal Wilayah / Lingkungan */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-on-surface">Wilayah &amp; Lingkungan</label>
              <input
                type="text"
                value={asalWilayahTeks}
                onChange={(e) => setAsalWilayahTeks(e.target.value)}
                placeholder="Contoh: Wilayah 3 - St. Petrus"
                className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Jenjang */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-on-surface">Jenjang Pendidikan *</label>
              <select
                value={jenjang}
                onChange={(e) => setJenjang(e.target.value as JenjangPendidikan)}
                className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                {JENJANG_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant italic mt-1">
            * Email akun Anda ({profile.email}) terdaftar secara permanen sebagai identitas login unik Anda.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary-container transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
