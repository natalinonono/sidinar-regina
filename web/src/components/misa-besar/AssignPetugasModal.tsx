'use client'

import React, { useState, useMemo } from 'react'
import { LITURGICAL_POSITIONS } from '@/lib/utils/positions'
import { MisaBesarPetugas, MisaBesarSession } from '@/types/misaBesar'

interface ActiveMemberOption {
  id: string
  nama_lengkap: string
  nama_panggilan: string
  jenjang: string
  asal_wilayah_teks: string
}

interface AssignPetugasModalProps {
  isOpen: boolean
  onClose: () => void
  session: MisaBesarSession | null
  eventName: string
  activeMembers: ActiveMemberOption[]
  existingPetugas: MisaBesarPetugas[]
  onSuccess: () => void
}

export function AssignPetugasModal({
  isOpen,
  onClose,
  session,
  eventName,
  activeMembers,
  existingPetugas,
  onSuccess,
}: AssignPetugasModalProps) {
  const [search, setSearch] = useState('')
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({})
  const [defaultPosisi, setDefaultPosisi] = useState<string>(
    LITURGICAL_POSITIONS[LITURGICAL_POSITIONS.length - 1].name
  )
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const alreadyAssignedIds = useMemo(() => {
    if (!session) return new Set<string>()
    return new Set(
      existingPetugas.filter((p) => p.session_id === session.id).map((p) => p.user_id)
    )
  }, [existingPetugas, session])

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return activeMembers.filter((m) => {
      if (!q) return true
      return (
        m.nama_lengkap.toLowerCase().includes(q) ||
        m.nama_panggilan.toLowerCase().includes(q) ||
        m.jenjang.toLowerCase().includes(q) ||
        m.asal_wilayah_teks.toLowerCase().includes(q)
      )
    })
  }, [activeMembers, search])

  if (!isOpen || !session) return null

  const toggleMember = (memberId: string) => {
    setSelectedMap((prev) => {
      const next = { ...prev }
      if (next[memberId] !== undefined) {
        delete next[memberId]
      } else {
        next[memberId] = defaultPosisi
      }
      return next
    })
  }

  const updateMemberPosition = (memberId: string, posisi: string) => {
    setSelectedMap((prev) => ({
      ...prev,
      [memberId]: posisi,
    }))
  }

  const selectedCount = Object.keys(selectedMap).length

  const handleSave = async () => {
    if (selectedCount === 0) {
      setErrorMsg('Pilih minimal 1 misdinar untuk ditambahkan.')
      return
    }

    setSaving(true)
    setErrorMsg(null)
    try {
      const members = Object.entries(selectedMap).map(([user_id, posisi_tugas]) => ({
        user_id,
        posisi_tugas,
      }))

      const res = await fetch('/api/misa-besar/petugas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          members,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan daftar petugas.')
        setSaving(false)
        return
      }

      setSelectedMap({})
      setSearch('')
      setSaving(false)
      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Gangguan jaringan.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest border border-surface-container shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-primary/75">
              {eventName}
            </span>
            <h3 className="font-headline font-bold text-base sm:text-lg">
              Tambah Petugas &bull; {session.nama_sesi}
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

        {/* Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Search & Default Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                Cari Anggota Aktif
              </label>
              <div className="relative">
                <span className="material-symbols-outlined text-base text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik nama, jenjang, wilayah..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                Posisi Tugas Awal (Default)
              </label>
              <select
                value={defaultPosisi}
                onChange={(e) => setDefaultPosisi(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {LITURGICAL_POSITIONS.map((pos) => (
                  <option key={pos.id} value={pos.name}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrollable Members List */}
          <div className="flex-1 overflow-y-auto border border-surface-container rounded-2xl divide-y divide-surface-container bg-surface-container-low/40 min-h-[240px]">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">
                Tidak ada anggota aktif yang cocok dengan pencarian.
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isAlready = alreadyAssignedIds.has(member.id)
                const isSelected = selectedMap[member.id] !== undefined

                return (
                  <div
                    key={member.id}
                    className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                      isSelected ? 'bg-primary-fixed/35' : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isAlready}
                        onChange={() => toggleMember(member.id)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-on-surface">
                            {member.nama_lengkap}
                          </span>
                          {isAlready && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Sudah Terdaftar
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-on-surface-variant">
                          {member.nama_panggilan} &bull; {member.jenjang} &bull; {member.asal_wilayah_teks}
                        </span>
                      </div>
                    </label>

                    {isSelected && (
                      <select
                        value={selectedMap[member.id]}
                        onChange={(e) => updateMemberPosition(member.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-primary/30 text-[11px] font-semibold text-primary focus:outline-none"
                      >
                        {LITURGICAL_POSITIONS.map((pos) => (
                          <option key={pos.id} value={pos.name}>
                            {pos.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-on-surface-variant">
            {selectedCount} anggota dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selectedCount === 0}
              type="button"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>{saving ? 'Menyimpan...' : `Tambahkan (${selectedCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

