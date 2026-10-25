'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Announcement } from '@/types/database'

export default function PengurusPengumumanPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  const loadAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      setAnnouncements(data || [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()

    const channel = supabase
      .channel('pengumuman_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        loadAnnouncements()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await (supabase.from('announcements') as any).insert({
        judul: newTitle,
        isi: newContent,
        is_pinned: isPinned,
        created_by: user?.id || null,
      })

      if (error) {
        alert(error.message)
      } else {
        setNewTitle('')
        setNewContent('')
        setIsPinned(false)
        setShowAddModal(false)
        loadAnnouncements()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) {
        alert(error.message)
      } else {
        loadAnnouncements()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">Memuat pengumuman sakristi...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              campaign
            </span>
            <span className="text-xs uppercase font-bold text-secondary tracking-wider">
              Warta &amp; Publikasi Liturgi
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
            Pengumuman Sakristi Paroki
          </h1>
          <p className="text-xs text-on-surface-variant">
            Publikasikan informasi penting, gladi bersih, dan tata tertib kepada seluruh anggota misdinar.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-headline font-bold transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between gap-4 ${
              ann.is_pinned
                ? 'bg-secondary-fixed/20 border-secondary/30'
                : 'bg-surface-container-lowest border-surface-container'
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-headline font-bold text-sm text-primary">
                  {ann.judul}
                </span>
                {ann.is_pinned && (
                  <span className="bg-secondary text-on-secondary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">push_pin</span>
                    Utama
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {ann.isi}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container text-[11px] text-on-surface-variant">
              <span>{new Date(ann.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
              <button
                onClick={() => handleDeleteAnnouncement(ann.id)}
                className="text-error hover:underline flex items-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Hapus</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-2xl border border-surface-container flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline font-bold text-base text-primary">
                Publikasikan Pengumuman Sakristi
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Gladi Bersih Misa Krisma Paroki SPMR"
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface">Isi Pengumuman</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Tuliskan detail pengumuman untuk seluruh putra-putri altar..."
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="accent-secondary w-4 h-4 rounded cursor-pointer"
                />
                <span className="font-semibold text-on-surface">
                  Sematkan di Atas (Pinned / Prioritas Utama)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary-container shadow-sm"
                >
                  Publikasikan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
