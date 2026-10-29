'use client'

import React from 'react'
import { MassSchedule, Booking } from '@/types/database'
import { LiturgyBadge } from './LiturgyBadge'

interface ScheduleCardProps {
  schedule: MassSchedule
  bookingsCount: number
  userBooking?: Booking | null
  onBookClick: (schedule: MassSchedule) => void
  onCheckinClick: (booking: Booking) => void
  onEditClick?: (booking: Booking) => void
  disabledBooking?: boolean
  disabledReason?: string
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  bookingsCount,
  userBooking,
  onBookClick,
  onCheckinClick,
  onEditClick,
  disabledBooking = false,
  disabledReason,
}) => {
  const isFull = bookingsCount >= schedule.kuota_maksimal
  const remainingSlots = Math.max(0, schedule.kuota_maksimal - bookingsCount)
  const percentFilled = Math.min(100, Math.round((bookingsCount / schedule.kuota_maksimal) * 100))

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      {/* Top Details */}
      <div className="p-5 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary-fixed/40">
            {schedule.kategori === 'harian' ? 'Misa Harian' : 'Misa Mingguan'}
          </span>
          <span className="text-[11px] font-mono text-on-surface-variant font-medium">
            Pukul {schedule.jam_mulai.substring(0, 5)} WIB
          </span>
        </div>

        {/* Title & Time */}
        <div className="flex flex-col gap-1">
          <h3 className="font-headline font-bold text-base text-primary group-hover:text-primary-container transition-colors line-clamp-1">
            {schedule.judul_misa}
          </h3>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              calendar_today
            </span>
            <span>{schedule.tanggal_misa}</span>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Keterisian Kuota</span>
            <span className="font-semibold text-primary">
              {bookingsCount} / {schedule.kuota_maksimal}{' '}
              <span className="text-on-surface-variant font-normal">({remainingSlots} sisa)</span>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFull
                  ? 'bg-error'
                  : percentFilled >= 75
                  ? 'bg-amber-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Action Deck */}
      <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-3">
        {userBooking ? (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span>Terdaftar</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEditClick && (
                <button
                  onClick={() => onEditClick(userBooking)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-surface-container border border-outline/30 text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">edit_calendar</span>
                  <span>Ubah / Batal</span>
                </button>
              )}
              <button
                onClick={() => onCheckinClick(userBooking)}
                className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container shadow-xs transition-colors flex items-center justify-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                <span>Presensi</span>
              </button>
            </div>
          </div>
        ) : isFull ? (
          <div className="w-full py-2 text-center text-xs font-semibold text-error bg-error-container/40 rounded-lg">
            Kuota Penuh ({schedule.kuota_maksimal}/{schedule.kuota_maksimal})
          </div>
        ) : disabledBooking ? (
          <div
            className="w-full py-2 px-2 text-center text-[11px] font-medium text-on-surface-variant bg-surface-container rounded-lg"
            title={disabledReason}
          >
            {disabledReason || 'Batas 1x Seminggu Terpenuhi'}
          </div>
        ) : (
          <button
            onClick={() => onBookClick(schedule)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-headline font-bold bg-primary text-on-primary hover:bg-primary-container shadow-sm transition-all flex items-center justify-center gap-1.5 group"
            type="button"
          >
            <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
              how_to_reg
            </span>
            <span>Daftar Tugas Misa Ini</span>
          </button>
        )}
      </div>
    </div>
  )
}
