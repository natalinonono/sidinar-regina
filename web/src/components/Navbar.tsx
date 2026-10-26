'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import { NotificationCenter } from '@/components/NotificationCenter'

interface NavbarProps {
  profile: Profile | null
  realtimeConnected?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({ profile, realtimeConnected = true }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [currentTimeWIB, setCurrentTimeWIB] = useState<string>('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isPengurus = profile?.role === 'pengurus'

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      // Display in WIB
      const timeStr = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const dateStr = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      setCurrentTimeWIB(`${dateStr} • ${timeStr} WIB`)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo & Name */}
          <Link href={isPengurus ? '/pengurus' : '/anggota'} className="flex items-center gap-3 group shrink-0">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-surface-container-low shadow-sm border border-surface-container p-0.5 group-hover:scale-105 transition-transform">
              <Image
                src="/logo-misdinar.png"
                alt="Logo Misdinar SPMR Purbowardayan"
                fill
                className="object-contain rounded-full"
                priority
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-headline font-bold text-base sm:text-lg text-primary tracking-tight">
                  SiDinar Regina
                </span>
                <span className="bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                  SPMR
                </span>
              </div>
              <span className="font-sans text-[11px] text-on-surface-variant hidden sm:inline">
                Misdinar Paroki Purbowardayan
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {isPengurus ? (
              <>
                <Link
                  href="/pengurus"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname === '/pengurus'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">dashboard</span>
                  Pusat Kendali
                </Link>
                <Link
                  href="/pengurus/anggota"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/pengurus/anggota')
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  Approval Anggota
                </Link>
                <Link
                  href="/pengurus/jadwal"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/pengurus/jadwal')
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  Kelola Jadwal
                </Link>
                <Link
                  href="/pengurus/presensi"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/pengurus/presensi')
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                  Monitor Presensi
                </Link>
                <Link
                  href="/pengurus/pengumuman"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/pengurus/pengumuman')
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">campaign</span>
                  Pengumuman
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/anggota"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname === '/anggota'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">event_available</span>
                  Jadwal Misa
                </Link>
                <Link
                  href="/anggota/riwayat"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/anggota/riwayat')
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  Riwayat Tugas
                </Link>
              </>
            )}
          </nav>

          {/* Right Status Block: WIB Clock, Realtime Sync, User Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime WebSocket Badge */}
            <div
              className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                realtimeConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={realtimeConnected ? 'Terhubung ke Supabase Realtime' : 'Menghubungkan ke Supabase...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{realtimeConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {/* Live WIB Clock */}
            {currentTimeWIB && (
              <span className="hidden xl:inline-block text-[11px] font-mono text-on-surface-variant px-2.5 py-1 rounded-md bg-surface-container">
                {currentTimeWIB}
              </span>
            )}

            {/* Notification Bell & Auto Reminder Alert */}
            <NotificationCenter profile={profile} />

            {/* User Profile Pill */}
            {profile && (
              <div className="flex items-center gap-2 pl-2 border-l border-surface-container">
                <div className="flex flex-col text-right hidden sm:flex">
                  <span className="text-xs font-semibold text-primary line-clamp-1">
                    {profile.nama_panggilan || profile.nama_lengkap}
                  </span>
                  <span className="text-[10px] text-on-surface-variant flex items-center justify-end gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        profile.status === 'aktif' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    {isPengurus ? 'Pengurus Sakristi' : 'Misdinar Aktif'}
                  </span>
                </div>

                {/* Role Switcher for Pengurus */}
                {isPengurus && (
                  <Link
                    href={pathname.startsWith('/pengurus') ? '/anggota' : '/pengurus'}
                    className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary transition-colors text-xs font-medium"
                    title={pathname.startsWith('/pengurus') ? 'Lihat Tampilan Anggota' : 'Kembali ke Pusat Kendali'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {pathname.startsWith('/pengurus') ? 'person' : 'admin_panel_settings'}
                    </span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-error hover:bg-error-container/30 transition-colors"
                  title="Keluar dari akun"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container"
              type="button"
            >
              <span className="material-symbols-outlined">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-2 border-t border-surface-container flex flex-col gap-1 bg-surface-container-lowest">
            {isPengurus ? (
              <>
                <Link
                  href="/pengurus"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">dashboard</span>
                  Pusat Kendali
                </Link>
                <Link
                  href="/pengurus/anggota"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">how_to_reg</span>
                  Approval Anggota
                </Link>
                <Link
                  href="/pengurus/jadwal"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  Kelola Jadwal
                </Link>
                <Link
                  href="/pengurus/presensi"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                  Monitor Presensi
                </Link>
                <Link
                  href="/pengurus/pengumuman"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">campaign</span>
                  Pengumuman Sakristi
                </Link>
                <Link
                  href="/anggota"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2 text-secondary"
                >
                  <span className="material-symbols-outlined text-sm">person</span>
                  Mode Tampilan Anggota
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/anggota"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">event_available</span>
                  Jadwal Misa
                </Link>
                <Link
                  href="/anggota/riwayat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  Riwayat Tugas
                </Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="mt-2 w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-error hover:bg-error-container/30 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Keluar dari Aplikasi
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
