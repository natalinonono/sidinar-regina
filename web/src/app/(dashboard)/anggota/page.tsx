'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MassSchedule, BookingWithDetails, Profile, Announcement } from '@/types/database'
import { ScheduleCard } from '@/components/ScheduleCard'
import { BookingModal } from '@/components/BookingModal'
import { CheckinModal } from '@/components/CheckinModal'
import { EditBookingModal } from '@/components/EditBookingModal'
import { EditProfileModal } from '@/components/EditProfileModal'
import { getCurrentLiturgicalWeek, evaluateCheckinWindow, isMassToleranceExpired } from '@/lib/utils/time'
import { generateGoogleCalendarUrl, downloadIcsFile } from '@/lib/utils/calendar'

export default function AnggotaDashboardPage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [schedules, setSchedules] = useState<MassSchedule[]>([])
  const [allBookings, setAllBookings] = useState<BookingWithDetails[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state: 'semua' | 'harian' | 'mingguan'
  const [categoryFilter, setCategoryFilter] = useState<'semua' | 'harian' | 'mingguan'>('semua')

  // Modals
  const [selectedScheduleForBooking, setSelectedScheduleForBooking] = useState<MassSchedule | null>(null)
  const [selectedBookingForCheckin, setSelectedBookingForCheckin] = useState<BookingWithDetails | null>(null)
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<BookingWithDetails | null>(null)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)

  const { weekNumber, yearNumber, startDateStr, endDateStr, formattedRange } = useMemo(() => getCurrentLiturgicalWeek(), [])

  // 1. Initial Data Fetch
  const loadInitialData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(userProfile)
      }

      // Fetch mass schedules for current week
      const { data: scheduleList } = await supabase
        .from('mass_schedules')
        .select('*')
        .gte('tanggal_misa', startDateStr)
        .lte('tanggal_misa', endDateStr)
        .order('tanggal_misa', { ascending: true })
        .order('jam_mulai', { ascending: true })

      setSchedules(scheduleList || [])

      // Fetch bookings for current week
      const { data: bookingList } = await supabase
        .from('bookings')
        .select('*, schedule:mass_schedules(*), profile:profiles(*)')
        .eq('minggu_ke', weekNumber)
        .eq('tahun', yearNumber)

      const items = (bookingList || []) as BookingWithDetails[]
      const expiredIds: string[] = []
      const now = new Date()

      for (const b of items) {
        if (
          b.status_kehadiran === 'terdaftar' &&
          b.schedule &&
          isMassToleranceExpired(b.schedule.tanggal_misa, b.schedule.jam_mulai, now)
        ) {
          b.status_kehadiran = 'alpa'
          expiredIds.push(b.id)
        }
      }

      if (expiredIds.length > 0) {
        ;(supabase.from('bookings') as any)
          .update({ status_kehadiran: 'alpa' })
          .in('id', expiredIds)
          .then(() => {})
      }

      setAllBookings(items)

      // Fetch announcements
      const { data: annList } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)

      setAnnouncements(annList || [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  // 2. Setup Realtime WebSockets for Instant Synchronization
  useEffect(() => {
    loadInitialData()

    const channel = supabase
      .channel('anggota_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          // Re-fetch bookings on any change
          supabase
            .from('bookings')
            .select('*, schedule:mass_schedules(*), profile:profiles(*)')
            .eq('minggu_ke', weekNumber)
            .eq('tahun', yearNumber)
            .then(({ data }) => {
              if (data) {
                const updated = data as BookingWithDetails[]
                const expIds: string[] = []
                const n = new Date()
                for (const b of updated) {
                  if (
                    b.status_kehadiran === 'terdaftar' &&
                    b.schedule &&
                    isMassToleranceExpired(b.schedule.tanggal_misa, b.schedule.jam_mulai, n)
                  ) {
                    b.status_kehadiran = 'alpa'
                    expIds.push(b.id)
                  }
                }
                if (expIds.length > 0) {
                  ;(supabase.from('bookings') as any)
                    .update({ status_kehadiran: 'alpa' })
                    .in('id', expIds)
                    .then(() => {})
                }
                setAllBookings(updated)
              }
            })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mass_schedules' },
        () => {
          supabase
            .from('mass_schedules')
            .select('*')
            .gte('tanggal_misa', startDateStr)
            .lte('tanggal_misa', endDateStr)
            .order('tanggal_misa', { ascending: true })
            .order('jam_mulai', { ascending: true })
            .then(({ data }) => {
              if (data) setSchedules(data)
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekNumber, yearNumber, startDateStr, endDateStr])

  // Count user bookings in current week for limits
  const userBookings = useMemo(() => {
    if (!profile) return []
    return allBookings.filter((b) => b.user_id === profile.id)
  }, [allBookings, profile])

  const hasHarianBooking = useMemo(
    () => userBookings.some((b) => b.kategori_misa === 'harian'),
    [userBookings]
  )
  const hasMingguanBooking = useMemo(
    () => userBookings.some((b) => b.kategori_misa === 'mingguan'),
    [userBookings]
  )

  // Find next upcoming duty for the user
  const nextUserDuty = useMemo(() => {
    if (userBookings.length === 0) return null
    // Sort upcoming
    return [...userBookings].sort((a, b) => {
      if (!a.schedule || !b.schedule) return 0
      return (
        new Date(`${a.schedule.tanggal_misa}T${a.schedule.jam_mulai}`).getTime() -
        new Date(`${b.schedule.tanggal_misa}T${b.schedule.jam_mulai}`).getTime()
      )
    })[0]
  }, [userBookings])

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    if (categoryFilter === 'semua') return schedules
    return schedules.filter((s) => s.kategori === categoryFilter)
  }, [schedules, categoryFilter])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant font-medium">
          Memuat jadwal & data sakristi...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header & Identity Section */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-sm border border-surface-container">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-surface-container-highest/60 blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-48 h-48 rounded-full bg-secondary-fixed/40 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  profile?.status === 'aktif'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {profile?.status === 'aktif' ? 'check_circle' : 'hourglass_top'}
                </span>
                {profile?.status === 'aktif' ? 'Anggota Aktif' : 'Menunggu Persetujuan Pengurus'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">church</span>
                {profile?.asal_wilayah_teks || 'Paroki Purbowardayan'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
                <span className="material-symbols-outlined text-[14px]">school</span>
                Jenjang {profile?.jenjang}
              </span>
            </div>

            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-primary tracking-tight mt-1">
              Berkah Dalem, {profile?.nama_panggilan || profile?.nama_lengkap}!
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Selamat melayani altar Tuhan dengan penuh sukacita, ketulusan doa, dan keheningan hati di Paroki SPMR Purbowardayan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all text-xs font-semibold shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px]">manage_accounts</span>
              <span>Edit Data Diri</span>
            </button>
            <a
              href="#pengumuman-section"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">campaign</span>
              Pengumuman Sakristi
            </a>
            <a
              href="https://wa.me/6285643985341"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
              title="Hubungi Pengurus: 0856-4398-5341"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">support_agent</span>
              <span>Kontak Pengurus</span>
            </a>
            <a
              href="https://wa.me/6281228788912"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
              title="Hubungi Admin: 0812-2878-8912"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">admin_panel_settings</span>
              <span>Kontak Admin</span>
            </a>
          </div>
        </div>
      </section>

      {/* Account Pending Warning (if applicable) */}
      {profile?.status === 'pending' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-amber-900 text-xs">
          <span className="material-symbols-outlined text-amber-700 text-xl shrink-0 mt-0.5">
            info
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-bold">Akun Anda Dalam Tahap Verifikasi</span>
            <p>
              Akun baru sedang diverifikasi oleh Tim Pendamping Misdinar SPMR Purbowardayan. Anda belum dapat memilih jadwal tugas misa sebelum status akun disetujui menjadi &ldquo;Aktif&rdquo;.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Priority Hero: Tugas Pelayanan Altar Mendatang */}
      {nextUserDuty && nextUserDuty.schedule && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary shadow-xl p-6 sm:p-8">
          <div className="absolute top-0 left-0 right-0 h-1.5 gold-accent-gradient" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-on-primary/10">
              <div className="flex items-center gap-2">
                <span className="inline-flex p-1.5 rounded-lg bg-on-primary/10 text-secondary-fixed">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    stars
                  </span>
                </span>
                <span className="text-xs uppercase tracking-wider text-secondary-fixed font-bold font-headline">
                  Tugas Pelayanan Altar Mendatang
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 flex flex-col gap-2">
                <h2 className="font-headline font-bold text-xl sm:text-2xl tracking-tight">
                  {nextUserDuty.schedule.judul_misa}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-primary/80">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-secondary-fixed">
                      event
                    </span>
                    {nextUserDuty.schedule.tanggal_misa}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-secondary-fixed">
                      schedule
                    </span>
                    Pukul {nextUserDuty.schedule.jam_mulai.substring(0, 5)} WIB
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs text-white border border-white/20 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">church</span>
                    Petugas Altar
                  </span>
                  <a
                    href={generateGoogleCalendarUrl(nextUserDuty.schedule)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-on-secondary hover:bg-secondary-container transition-all text-xs font-semibold shadow-xs"
                    title="Pasang Alarm Pengingat di Google Calendar"
                  >
                    <span className="material-symbols-outlined text-[14px]">notifications_active</span>
                    <span>Pasang Alarm Google Calendar</span>
                  </a>
                  <button
                    onClick={() => downloadIcsFile(nextUserDuty.schedule!)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white transition-all border border-white/20"
                    title="Unduh Kalender .ics (Apple / Android / Outlook)"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    <span>Download .ics</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-center justify-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-center">
                  <span className="text-[11px] text-on-primary/70 uppercase tracking-wider block">
                    Status Presensi
                  </span>
                  <span
                    className={`inline-block mt-1 font-bold text-xs uppercase px-3 py-1 rounded-full ${
                      nextUserDuty.status_kehadiran === 'hadir'
                        ? 'bg-emerald-500 text-white'
                        : nextUserDuty.status_kehadiran === 'terlambat'
                        ? 'bg-amber-400 text-on-surface'
                        : nextUserDuty.status_kehadiran === 'alpa' || isMassToleranceExpired(nextUserDuty.schedule?.tanggal_misa, nextUserDuty.schedule?.jam_mulai)
                        ? 'bg-rose-600 text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {nextUserDuty.status_kehadiran === 'terdaftar' && isMassToleranceExpired(nextUserDuty.schedule?.tanggal_misa, nextUserDuty.schedule?.jam_mulai)
                      ? 'alpa'
                      : nextUserDuty.status_kehadiran}
                  </span>
                </div>

                {nextUserDuty.status_kehadiran === 'alpa' || isMassToleranceExpired(nextUserDuty.schedule?.tanggal_misa, nextUserDuty.schedule?.jam_mulai) ? (
                  <div className="w-full mt-2 p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center justify-center gap-2 border border-error/30">
                    <span className="material-symbols-outlined text-base">warning</span>
                    <span>Batas Waktu Presensi Telah Berakhir (Status: ALPA)</span>
                  </div>
                ) : (
                  <div className="w-full flex flex-col sm:flex-row gap-2 mt-2">
                    <button
                      onClick={() => setSelectedBookingForEdit(nextUserDuty)}
                      className="flex-1 py-2.5 px-3 rounded-xl font-headline font-bold text-xs bg-white/15 hover:bg-white/25 text-white transition-all border border-white/20 flex items-center justify-center gap-1.5"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">edit_calendar</span>
                      <span>Ubah / Batal</span>
                    </button>
                    <button
                      onClick={() => setSelectedBookingForCheckin(nextUserDuty)}
                      className="flex-1 py-2.5 px-3 rounded-xl font-headline font-bold text-xs bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed transition-all shadow-md flex items-center justify-center gap-1.5 group"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                      <span>Presensi Sakristi</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Weekly Quota & Allocation Tracker */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Misa Harian Tracker */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl">sunny</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">Jatah Misa Harian (05.30 WIB)</span>
              <span className="text-[11px] text-on-surface-variant">Batas maksimal: 1x dalam sepekan</span>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              hasHarianBooking
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {hasHarianBooking ? '1 / 1 (Terpakai)' : '0 / 1 (Tersedia)'}
          </span>
        </div>

        {/* Misa Mingguan Tracker */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                church
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">Jatah Misa Mingguan</span>
              <span className="text-[11px] text-on-surface-variant">Sabtu Sore & Minggu (Batas 1x / pekan)</span>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              hasMingguanBooking
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {hasMingguanBooking ? '1 / 1 (Terpakai)' : '0 / 1 (Tersedia)'}
          </span>
        </div>
      </section>

      {/* 4. Interactive Schedules Grid */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-secondary tracking-wider">
                Siklus Pekan Berjalan ({formattedRange})
              </span>
            </div>
            <h2 className="font-headline font-bold text-xl text-primary tracking-tight">
              Pilihan Jadwal Misa &amp; Alokasi Tugas Altar
            </h2>
          </div>

          {/* Category Filter Switcher */}
          <div className="inline-flex p-1 bg-surface-container rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setCategoryFilter('semua')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === 'semua'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Semua Misa
            </button>
            <button
              onClick={() => setCategoryFilter('harian')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === 'harian'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Misa Harian (05.30)
            </button>
            <button
              onClick={() => setCategoryFilter('mingguan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === 'mingguan'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Misa Mingguan
            </button>
          </div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface-container-lowest border border-surface-container text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-outline">
              calendar_today
            </span>
            <p className="text-xs text-on-surface-variant font-medium">
              Tidak ada jadwal misa yang tersedia untuk kategori ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchedules.map((schedule) => {
              const bookingsForSchedule = allBookings.filter((b) => b.schedule_id === schedule.id)
              const userBookingThis = userBookings.find((b) => b.schedule_id === schedule.id)

              // Check if booking is disabled due to quota limits or account status
              const isAccountInactive = profile?.status !== 'aktif'
              const isQuotaExceeded =
                (schedule.kategori === 'harian' && hasHarianBooking && !userBookingThis) ||
                (schedule.kategori === 'mingguan' && hasMingguanBooking && !userBookingThis)

              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  bookingsCount={bookingsForSchedule.length}
                  userBooking={userBookingThis}
                  disabledBooking={isAccountInactive || isQuotaExceeded}
                  disabledReason={
                    isAccountInactive
                      ? 'Akun Menunggu Verifikasi Pengurus'
                      : isQuotaExceeded
                      ? `Sudah Mengambil Jatah 1x Misa ${schedule.kategori === 'harian' ? 'Harian' : 'Mingguan'}`
                      : undefined
                  }
                  onBookClick={(s) => setSelectedScheduleForBooking(s)}
                  onCheckinClick={(b) => setSelectedBookingForCheckin(b as any)}
                  onEditClick={(b) => setSelectedBookingForEdit(b as any)}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* 5. Announcements Section */}
      <section id="pengumuman-section" className="flex flex-col gap-4 pt-4 border-t border-surface-container">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            campaign
          </span>
          <h2 className="font-headline font-bold text-lg text-primary tracking-tight">
            Warta &amp; Pengumuman Sakristi Paroki
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-5 rounded-2xl border shadow-xs flex flex-col gap-2 ${
                ann.is_pinned
                  ? 'bg-secondary-fixed/30 border-secondary/30'
                  : 'bg-surface-container-lowest border-surface-container'
              }`}
            >
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
              <span className="text-[10px] text-on-surface-variant/70 mt-1">
                Diumumkan oleh Sekretariat Sakristi Misdinar SPMR
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Modals */}
      <BookingModal
        schedule={selectedScheduleForBooking}
        isOpen={Boolean(selectedScheduleForBooking)}
        onClose={() => setSelectedScheduleForBooking(null)}
        onSuccess={() => loadInitialData()}
      />

      <CheckinModal
        booking={selectedBookingForCheckin}
        isOpen={Boolean(selectedBookingForCheckin)}
        onClose={() => setSelectedBookingForCheckin(null)}
        onSuccess={() => loadInitialData()}
      />

      <EditBookingModal
        booking={selectedBookingForEdit}
        allSchedules={schedules}
        allBookings={allBookings}
        isOpen={Boolean(selectedBookingForEdit)}
        onClose={() => setSelectedBookingForEdit(null)}
        onSuccess={() => loadInitialData()}
      />

      <EditProfileModal
        profile={profile}
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        onSuccess={(updatedProfile) => {
          setProfile(updatedProfile)
          loadInitialData()
        }}
      />
    </div>
  )
}
