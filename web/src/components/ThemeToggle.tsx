'use client'

import React, { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')

  useEffect(() => {
    // 1. Ambil preferensi tema tersimpan (default: 'system' / Ikuti Sistem HP)
    const saved = (localStorage.getItem('sidinar-theme') as 'system' | 'light' | 'dark') || 'system'
    setTheme(saved)
    applyTheme(saved)

    // 2. Dengarkan perubahan sistem HP secara langsung (prefers-color-scheme)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const current = localStorage.getItem('sidinar-theme') || 'system'
      if (current === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const applyTheme = (mode: 'system' | 'light' | 'dark') => {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
    localStorage.setItem('sidinar-theme', next)
    applyTheme(next)
  }

  return (
    <button
      onClick={cycleTheme}
      type="button"
      className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all flex items-center gap-1.5"
      title={`Tema Tampilan: ${theme === 'system' ? 'Otomatis (Ikuti Sistem HP)' : theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}`}
    >
      <span className="material-symbols-outlined text-[18px]">
        {theme === 'system' ? 'brightness_auto' : theme === 'dark' ? 'dark_mode' : 'light_mode'}
      </span>
      <span className="text-[11px] font-medium hidden md:inline">
        {theme === 'system' ? 'Sistem' : theme === 'dark' ? 'Gelap' : 'Terang'}
      </span>
    </button>
  )
}
