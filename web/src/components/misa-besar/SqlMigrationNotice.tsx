'use client'

import React, { useState } from 'react'

interface SqlMigrationNoticeProps {
  migrationSql: string
  onRetry: () => void
}

export function SqlMigrationNotice({ migrationSql, onRetry }: SqlMigrationNoticeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(migrationSql)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      alert('Gagal menyalin otomatis. Silakan salin dari file supabase/migrations/20261110000000_misa_besar_latihan.sql')
    }
  }

  return (
    <div className="rounded-3xl bg-amber-50 border border-amber-200 p-6 sm:p-8 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-2xl">database</span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-headline font-bold text-lg text-amber-950">
            Aktivasi Database Fitur Latihan Misa Besar (1x Setup)
          </h2>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            Tabel khusus Misa Besar belum dijalankan di proyek Supabase Anda. Klik tombol <strong>Salin SQL Migrasi</strong> di bawah, buka <strong>Supabase Dashboard &rarr; SQL Editor</strong>, tempel (paste), lalu klik <strong>Run</strong>. Setelah selesai, klik <strong>Muat Ulang Data</strong>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={handleCopy}
          type="button"
          className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-base">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'SQL Tersalin!' : 'Salin Kode SQL Migrasi'}</span>
        </button>

        <button
          onClick={onRetry}
          type="button"
          className="px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          <span>Muat Ulang Data</span>
        </button>
      </div>

      <pre className="p-3.5 rounded-xl bg-neutral-900 text-emerald-300 text-[10px] font-mono overflow-x-auto max-h-56">
        {migrationSql}
      </pre>
    </div>
  )
}

