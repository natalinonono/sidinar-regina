'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { MisaBesarEvent, MisaBesarAbsensi, LatihanAttendanceStatus } from '@/types/misaBesar'
import { Profile } from '@/types/database'

const STATUS_STYLE: Record<LatihanAttendanceStatus, { label: string; cls: string }> = {
  hadir: { label: 'Hadir', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  terlambat: { label: 'Terlambat', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  izin: { label: 'Izin', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  alpa: { label: 'Alpa', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
}

export default function AnggotaMisaBesarPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<MisaBesarEvent[]>([])
  const [myAbsensi, setMyAbsensi] = useState<MisaBesarAbsensi[]>([])
  const [loading, setLoading] = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (prof) setProfile(prof as unknown as Profile)
      }

      const tahun = new Date().getFullYear()
      const res = await fetch(`/api/misa-besar?tahun=${tahun}`, { cache: 'no-store' })
      const data = await res.json()

      if (data.needs_migration) {
        setNeedsMigration(true)
        setLoading(false)
        return
      }

      if (res.ok) {
        setEvents(data.events || [])
        setMyAbsensi(data.absensi || [])
      }
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('anggota_misa_besar_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_petugas' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_latihan' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'misa_besar_absensi' }, () => loadData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData])

  // Assignments belonging to the logged-in member
  const myAssignments = useMemo(() => {
    if (!profile) return []
    const list: Array<{
      event: MisaBesarEvent
      petugas: NonNullable<MisaBesarEvent['petugas']>[number]
    }> = []

    for (const ev of events) {
      for (const p of ev.petugas || []) {
        if (p.user_id === profile.id) {
          list.push({ event: ev, petugas: p })
        }
      }
    }
    return list
  }, [events, profile])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">
          Memuat informasi Misa Besar &amp; QR Latihan...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            celebration
          </span>
          <span className="text-xs uppercase font-bold text-secondary tracking-wider">
            Hari Raya Natal &amp; Pekan Suci Paskah
          </span>
        </div>
        <h1 className="font-headline font-bold text-2xl text-primary tracking-tight">
          Jadwal &amp; Absensi Latihan Misa Besar
        </h1>
        <p className="text-xs text-on-surface-variant">
          Pantau penugasan khusus Misa Besar Anda, jadwal latihan di gereja, serta tunjukkan Kartu QR kepada pengurus saat hadir latihan.
        </p>
      </div>

      {needsMigration ? (
        <div className="p-8 rounded-3xl bg-surface-container-lowest border border-surface-container text-center text-xs text-on-surface-variant">
          Modul jadwal Misa Besar sedang disiapkan oleh Tim Pengurus Sakristi.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Kartu QR Absen Latihan Pribadi */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-container text-on-primary p-6 shadow-md flex flex-col items-center text-center gap-4 sticky top-24">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-primary/75">
                  Kartu QR Latihan Misdinar
                </span>
                <h2 className="font-headline font-bold text-lg">
                  {profile?.nama_lengkap || 'Anggota Misdinar'}
                </h2>
                <span className="text-xs text-on-primary/80">
                  {profile?.jenjang} &bull; {profile?.asal_wilayah_teks}
                </span>
              </div>

              {profile && (
                <div className="p-4 rounded-2xl bg-white shadow-inner flex flex-col items-center gap-2">
                  <QRCodeSVG
                    value={`SIDINAR:USER:${profile.id}`}
                    size={176}
                    level="M"
                    includeMargin={false}
                  />
                  <span className="text-[11px] font-mono font-bold text-primary tracking-wider">
                    ID: {profile.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-on-primary/85 leading-relaxed">
                Tunjukkan QR Code di atas kepada Pengurus saat tiba di gereja/sakristi untuk absen latihan Misa Besar secara cepat.
              </p>
            </div>
          </div>

          {/* Kolom Kanan: Penugasan Saya + Jadwal Latihan + Info 7 Perayaan */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Penugasan Misa Besar Saya */}
            <section className="flex flex-col gap-3">
              <h2 className="font-headline font-bold text-base text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">assignment_ind</span>
                <span>Tugas Misa Besar &amp; Kehadiran Latihan Saya</span>
              </h2>

              {myAssignments.length === 0 ? (
                <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">
                    event_busy
                  </span>
                  <p className="text-xs font-semibold text-on-surface">
                    Anda belum terdaftar dalam daftar petugas Misa Besar tahun ini.
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Pengurus akan memasukkan daftar petugas setiap menjelang Hari Raya Natal maupun Pekan Suci Paskah.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {myAssignments.map(({ event, petugas }) => {
                    const relevantLatihan = (event.latihan || []).filter(
                      (l) => !l.session_id || l.session_id === petugas.session_id
                    )

                    return (
                      <div
                        key={petugas.id}
                        className="rounded-2xl bg-surface-container-lowest border border-surface-container overflow-hidden shadow-xs"
                      >
                        <div className="p-4 bg-surface-container-low border-b border-surface-container flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">
                                {event.nama_perayaan} {event.tahun}
                              </span>
                              <span className="text-xs font-bold text-primary">
                                {petugas.session?.nama_sesi}
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant mt-1">
                              Posisi Tugas: <strong className="text-on-surface">{petugas.posisi_tugas}</strong>
                              {petugas.session?.tanggal_misa
                                ? ` • ${petugas.session.tanggal_misa}`
                                : ''}
                              {petugas.session?.jam_mulai
                                ? ` • Pukul ${petugas.session.jam_mulai} WIB`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                            Jadwal &amp; Status Latihan ({relevantLatihan.length} sesi):
                          </span>

                          {relevantLatihan.length === 0 ? (
                            <p className="text-xs text-on-surface-variant italic">
                              Belum ada jadwal latihan yang diumumkan oleh pengurus.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {relevantLatihan.map((lat) => {
                                const rec = myAbsensi.find(
                                  (a) => a.latihan_id === lat.id && a.petugas_id === petugas.id
                                )
                                const badge = rec ? STATUS_STYLE[rec.status_kehadiran] : null

                                return (
                                  <div
                                    key={lat.id}
                                    className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container flex flex-wrap items-center justify-between gap-2"
                                  >
                                    <div>
                                      <p className="text-xs font-bold text-on-surface">
                                        {lat.judul_latihan}
                                      </p>
                                      <p className="text-[11px] text-on-surface-variant">
                                        {lat.tanggal_latihan} &bull; {lat.jam_mulai} WIB &bull;{' '}
                                        {lat.lokasi}
                                      </p>
                                    </div>
                                    {badge ? (
                                      <span
                                        className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${badge.cls}`}
                                      >
                                        {badge.label}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold">
                                        Terjadwal
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Informasi Seluruh Sesi Misa Besar Paroki */}
            <section className="flex flex-col gap-3">
              <h2 className="font-headline font-bold text-base text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">church</span>
                <span>Daftar Rangkaian Misa Besar Paroki ({new Date().getFullYear()})</span>
              </h2>

              {events.length === 0 ? (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface-variant">
                  Belum ada rangkaian Misa Besar yang dipublikasikan untuk tahun ini.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-headline font-bold text-sm sm:text-base text-primary">
                          {ev.nama_perayaan}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            ev.warna_liturgi === 'Merah'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ev.jumlah_sesi} {ev.jenis_sesi}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {(ev.sessions || []).map((s) => {
                          const sessPetugasCount = (ev.petugas || []).filter(
                            (p) => p.session_id === s.id
                          ).length
                          const sessLatihan = (ev.latihan || []).filter(
                            (l) => !l.session_id || l.session_id === s.id
                          )
                          return (
                            <div
                              key={s.id}
                              className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-primary">
                                  {s.nama_sesi}
                                </span>
                                <span className="text-[10px] font-semibold text-on-surface-variant">
                                  {sessPetugasCount}/{s.kuota_petugas} ptg
                                </span>
                              </div>
                              <span className="text-[11px] text-on-surface-variant">
                                {s.tanggal_misa ? `${s.tanggal_misa} • ` : ''}
                                {s.jam_mulai} WIB
                              </span>
                              <span className="text-[10px] text-secondary font-semibold mt-0.5">
                                {sessLatihan.length > 0
                                  ? `${sessLatihan.length} jadwal latihan`
                                  : 'Jadwal latihan menyusul'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
