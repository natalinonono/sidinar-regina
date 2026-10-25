'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Login gagal. Periksa kembali email dan password Anda.')
        setLoading(false)
        return
      }

      router.push(data.redirectUrl || '/anggota')
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan jaringan saat login.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Marian Decorative Ambient Accent Blurs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md relative z-10">
        <div className="overflow-hidden bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container">
          <div className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Header Brand & Ecclesiastical Identity */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-surface-container-low shadow-md p-1.5 flex items-center justify-center border border-surface-container">
                  <Image
                    src="/logo-misdinar.png"
                    alt="Logo Misdinar SP. Maria Regina Purbowardayan"
                    width={80}
                    height={80}
                    className="object-contain rounded-full"
                    priority
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                  SPMR
                </span>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container text-primary font-semibold text-xs">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    church
                  </span>
                  <span>Sistem Informasi Misdinar Paroki</span>
                </div>
                <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
                  SiDinar Regina
                </h1>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                  Misdinar Santa Perawan Maria Regina Purbowardayan
                </p>
              </div>

              <p className="text-xs text-secondary italic font-serif">
                &ldquo;The Best Choice For Life&rdquo;
              </p>

              {/* Feature Pills */}
              <div className="grid grid-cols-3 gap-2 w-full pt-1 pb-1">
                <div className="flex flex-col items-center p-2 rounded-xl bg-surface-container-low text-center">
                  <span className="material-symbols-outlined text-primary text-lg">event_available</span>
                  <span className="text-[11px] font-medium text-on-surface mt-1">Jadwal Misa</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-xl bg-surface-container-low text-center">
                  <span className="material-symbols-outlined text-primary text-lg">qr_code_scanner</span>
                  <span className="text-[11px] font-medium text-on-surface mt-1">Presensi Digital</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-xl bg-surface-container-low text-center">
                  <span className="material-symbols-outlined text-secondary text-lg">notifications_active</span>
                  <span className="text-[11px] font-medium text-on-surface mt-1">Pengingat H-1</span>
                </div>
              </div>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="grid grid-cols-2 p-1 bg-surface-container rounded-xl">
              <button
                type="button"
                className="py-2 text-center rounded-lg text-xs font-headline font-bold bg-surface-container-lowest text-primary shadow-xs transition-all"
              >
                Masuk
              </button>
              <Link
                href="/register"
                className="py-2 text-center rounded-lg text-xs font-headline font-medium text-on-surface-variant hover:text-primary transition-all flex items-center justify-center"
              >
                Daftar Akun Baru
              </Link>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2 border border-error/20">
                <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Masuk */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="login-email">
                  Email Akun Misdinar
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                    mail
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="misdinar@spmr-purbowardayan.org"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="login-password">
                    Kata Sandi
                  </label>
                  <a
                    href="https://wa.me/628123456789"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-primary hover:text-secondary transition-colors"
                  >
                    Lupa Password?
                  </a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                    lock
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-on-primary hover:bg-primary-container font-headline font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <span>Memverifikasi Akun...</span>
                ) : (
                  <>
                    <span>Masuk ke Akun Misdinar</span>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <p className="text-[11px] text-on-surface-variant">
                Butuh bantuan login?{' '}
                <a
                  className="font-semibold text-secondary hover:underline"
                  href="https://wa.me/628123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hubungi Pengurus Sakristi
                </a>
              </p>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-surface-container">
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                &copy; 2026 Misdinar Purbowardayan • SiDinar Regina
                <br />
                Paroki SPMR Purbowardayan • Jl. Ahmad Yani No. 10, Surakarta
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
