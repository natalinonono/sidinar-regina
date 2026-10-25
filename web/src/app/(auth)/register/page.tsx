'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { JenjangPendidikan } from '@/types/database'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    nama_panggilan: '',
    no_telepon: '',
    email: '',
    password: '',
    asal_wilayah_teks: '',
    jenjang: 'SMP' as JenjangPendidikan,
    commitment: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.commitment) {
      setErrorMessage('Anda wajib menyetujui komitmen pelayanan liturgi.')
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Pendaftaran gagal diproses.')
        setLoading(false)
        return
      }

      setSuccessMessage(data.message)
      setLoading(false)
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan server saat mendaftar.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 sm:p-6 relative overflow-hidden py-10">
      {/* Decorative Ambient Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-lg relative z-10">
        <div className="overflow-hidden bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container">
          <div className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Header Brand */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-surface-container-low shadow-md p-1.5 flex items-center justify-center border border-surface-container">
                <Image
                  src="/logo-misdinar.png"
                  alt="Logo Misdinar SPMR"
                  width={64}
                  height={64}
                  className="object-contain rounded-full"
                />
              </div>
              <h1 className="font-headline font-bold text-xl text-primary tracking-tight">
                Pendaftaran Anggota SiDinar
              </h1>
              <p className="text-xs text-on-surface-variant">
                Putra-Putri Altar Paroki SPMR Purbowardayan
              </p>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="grid grid-cols-2 p-1 bg-surface-container rounded-xl">
              <Link
                href="/login"
                className="py-2 text-center rounded-lg text-xs font-headline font-medium text-on-surface-variant hover:text-primary transition-all flex items-center justify-center"
              >
                Masuk
              </Link>
              <button
                type="button"
                className="py-2 text-center rounded-lg text-xs font-headline font-bold bg-surface-container-lowest text-primary shadow-xs transition-all"
              >
                Daftar Akun Baru
              </button>
            </div>

            {/* Ecclesiastical Info Banner */}
            <div className="flex items-start gap-3 p-3.5 bg-secondary-fixed/40 rounded-xl text-on-secondary-fixed border border-secondary/20">
              <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <p className="text-xs leading-relaxed">
                <span className="font-bold text-secondary">Persetujuan Diperlukan:</span> Akun baru memerlukan persetujuan (Approve) dari Tim Pendamping Misdinar SPMR sebelum dapat memilih jadwal tugas misa.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2 border border-error/20">
                <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
                </div>
                <h3 className="font-headline font-bold text-emerald-900 text-sm">Pendaftaran Berhasil!</h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {successMessage}
                </p>
                <Link
                  href="/login"
                  className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-all"
                >
                  Beralih ke Halaman Masuk
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Nama Lengkap */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="reg-fullname">
                    Nama Lengkap <span className="text-error">*</span>{' '}
                    <span className="text-[10px] text-on-surface-variant font-normal">(sesuai data paroki)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                      badge
                    </span>
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      value={formData.nama_lengkap}
                      onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                      placeholder="Fransiskus Xaverius Budi Santoso"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container"
                    />
                  </div>
                </div>

                {/* Nickname & WA Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-nickname">
                      Nama Panggilan <span className="text-error">*</span>
                    </label>
                    <input
                      id="reg-nickname"
                      type="text"
                      required
                      value={formData.nama_panggilan}
                      onChange={(e) => setFormData({ ...formData, nama_panggilan: e.target.value })}
                      placeholder="Budi"
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest border border-surface-container"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-wa">
                      Nomor WhatsApp <span className="text-error">*</span>
                    </label>
                    <input
                      id="reg-wa"
                      type="tel"
                      required
                      value={formData.no_telepon}
                      onChange={(e) => setFormData({ ...formData, no_telepon: e.target.value })}
                      placeholder="081234567890"
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest border border-surface-container"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-secondary flex items-center gap-1 -mt-2">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Notifikasi jadwal &amp; evaluasi presensi akan dikirim via WhatsApp.
                </p>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="reg-email">
                    Email Pribadi / Orang Tua <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                      alternate_email
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="misdinar@spmr-purbowardayan.org"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest border border-surface-container"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="reg-password">
                    Kata Sandi Akun <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                      lock
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 8 karakter (huruf & angka)"
                      className="w-full pl-10 pr-10 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest border border-surface-container"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface flex items-center"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Wilayah & Jenjang Pendidikan */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-wilayah">
                      Asal Wilayah &amp; Lingkungan <span className="text-error">*</span>
                    </label>
                    <input
                      id="reg-wilayah"
                      type="text"
                      required
                      placeholder="Contoh: Wilayah 3 - Lingkungan Santo Tarsisius"
                      value={formData.asal_wilayah_teks}
                      onChange={(e) => setFormData({ ...formData, asal_wilayah_teks: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface focus:outline-none focus:bg-surface-container-lowest border border-surface-container"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-jenjang">
                      Jenjang Pendidikan <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="reg-jenjang"
                        value={formData.jenjang}
                        onChange={(e) => setFormData({ ...formData, jenjang: e.target.value as JenjangPendidikan })}
                        className="w-full appearance-none pl-3.5 pr-10 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface focus:outline-none focus:bg-surface-container-lowest border border-surface-container"
                      >
                        <option value="SD">SD (Kelas 4-6)</option>
                        <option value="SMP">SMP</option>
                        <option value="SMA/K">SMA / SMK</option>
                        <option value="Mahasiswa">Mahasiswa / Kuliah</option>
                        <option value="Umum">Umum / Bekerja</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-lg">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                {/* Komitmen Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.commitment}
                    onChange={(e) => setFormData({ ...formData, commitment: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded text-primary focus:ring-0 accent-primary cursor-pointer shrink-0"
                    required
                  />
                  <span className="text-xs text-on-surface-variant leading-relaxed">
                    Saya berkomitmen melayani perayaan Ekaristi dengan tertib, hadir{' '}
                    <strong className="text-primary font-bold">30 menit sebelum misa</strong>, dan mematuhi Tata Tertib Misdinar SPMR.
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-primary text-on-primary hover:bg-primary-container font-headline font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Mengirim Formulir...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">how_to_reg</span>
                      <span>Kirim Formulir Pendaftaran</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-surface-container">
              <p className="text-[10px] text-on-surface-variant">
                &copy; 2026 Misdinar Purbowardayan • SiDinar Regina
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
