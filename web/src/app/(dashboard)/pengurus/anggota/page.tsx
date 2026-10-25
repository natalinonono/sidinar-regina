'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

export default function PengurusAnggotaPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'semua' | 'pending' | 'aktif' | 'nonaktif'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadMembers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      setMembers(data || [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()

    const channel = supabase
      .channel('pengurus_members_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadMembers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdateStatus = async (memberId: string, status: 'aktif' | 'nonaktif') => {
    setActionLoading(memberId)
    try {
      const res = await fetch('/api/pengurus/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, status }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Gagal mengubah status.')
      } else {
        loadMembers()
      }
    } catch (err: any) {
      alert(err.message || 'Gangguan jaringan.')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredMembers = members.filter((m) => {
    if (filterStatus === 'semua') return true
    return m.status === filterStatus
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">Memuat data anggota...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              badge
            </span>
            <span className="text-xs uppercase font-bold text-secondary tracking-wider">
              Master Database Putra-Putri Altar
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
            Verifikasi &amp; Direktori Anggota
          </h1>
          <p className="text-xs text-on-surface-variant">
            Persetujuan pendaftaran akun baru dan pengelolaan status keanggotaan misdinar.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="inline-flex p-1 bg-surface-container rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-100 text-amber-900 shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Pending ({members.filter((m) => m.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilterStatus('aktif')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'aktif'
                ? 'bg-emerald-100 text-emerald-900 shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Aktif ({members.filter((m) => m.status === 'aktif').length})
          </button>
          <button
            onClick={() => setFilterStatus('semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'semua'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Semua ({members.length})
          </button>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface-container-lowest border border-surface-container text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-outline">
            person_search
          </span>
          <p className="text-xs text-on-surface-variant font-medium">
            Tidak ada data anggota dengan filter status ini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider font-semibold border-b border-surface-container">
              <tr>
                <th className="py-3.5 px-4">Nama Misdinar</th>
                <th className="py-3.5 px-4">Kontak WhatsApp</th>
                <th className="py-3.5 px-4">Wilayah &amp; Lingkungan</th>
                <th className="py-3.5 px-4">Jenjang</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-primary block">
                      {m.nama_lengkap}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-normal">
                      Panggilan: {m.nama_panggilan} • {m.email}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <a
                      href={`https://wa.me/62${m.no_telepon.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-secondary font-semibold hover:underline"
                    >
                      <span className="material-symbols-outlined text-[15px] text-emerald-600">
                        chat
                      </span>
                      <span>{m.no_telepon}</span>
                    </a>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-on-surface-variant">
                    {m.asal_wilayah_teks}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container font-medium text-[11px]">
                      {m.jenjang}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 uppercase text-[10px] font-bold">
                    <span className={m.role === 'pengurus' ? 'text-secondary' : 'text-primary'}>
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block font-bold text-[11px] uppercase px-2.5 py-0.5 rounded-full ${
                        m.status === 'aktif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {m.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'aktif')}
                          disabled={actionLoading === m.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                          type="button"
                        >
                          Setujui (Approve)
                        </button>
                      )}
                      {m.status === 'aktif' && (
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'nonaktif')}
                          disabled={actionLoading === m.id}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-error hover:bg-error-container/40 font-semibold text-xs transition-colors"
                          type="button"
                        >
                          Nonaktifkan
                        </button>
                      )}
                      {m.status === 'nonaktif' && (
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'aktif')}
                          disabled={actionLoading === m.id}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition-colors"
                          type="button"
                        >
                          Aktifkan Kembali
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
