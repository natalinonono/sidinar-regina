'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

interface NotificationItem {
  id: string
  booking_id?: string
  schedule_id?: string
  type: 'reminder' | 'announcement'
  title: string
  message: string
  created_at?: string
  is_pinned?: boolean
}

interface NotificationCenterProps {
  profile: Profile | null
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ profile }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Web Audio API Synthesized Chime (No external audio file needed!)
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      const now = ctx.currentTime
      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(659.25, now)
      gain1.gain.setValueAtTime(0.15, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.4)

      // Tone 2: A5 (880 Hz)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, now + 0.15)
      gain2.gain.setValueAtTime(0.18, now + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.15)
      osc2.stop(now + 0.7)
    } catch (e) {
      console.warn('Audio chime warning:', e)
    }
  }

  const knownNotificationIds = useRef<Set<string>>(new Set())
  const isInitialLoad = useRef(true)

  // Load existing notifications
  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications)
        const unread = data.notifications.filter((n: any) => n.type === 'reminder').length
        setUnreadCount(unread)

        // Check for new reminders arrived since last poll
        if (!isInitialLoad.current) {
          for (const item of data.notifications) {
            if (item.type === 'reminder' && !knownNotificationIds.current.has(item.id)) {
              triggerInAppNotification(item)
              break
            }
          }
        } else {
          isInitialLoad.current = false
        }

        // Register all current IDs
        data.notifications.forEach((item: any) => {
          knownNotificationIds.current.add(item.id)
        })
      }
    } catch {
      // silent
    }
  }

  // Request browser desktop notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Listen to Supabase Realtime for instant notification triggers + 5s polling fallback
  useEffect(() => {
    loadNotifications()

    // 5-second active polling fallback to guarantee real-time delivery even if WebSockets are throttled
    const pollInterval = setInterval(() => {
      loadNotifications()
    }, 5000)

    const supabase = createClient()

    // 1. Listen to broadcast on 'reminders-broadcast' (matched with server channel)
    const broadcastChannel = supabase
      .channel('reminders-broadcast')
      .on('broadcast', { event: 'reminder_alert' }, (event) => {
        const payload = event.payload
        if (profile && payload && payload.user_id === profile.id) {
          const notifId = `reminder-${payload.booking_id || Date.now()}`
          if (!knownNotificationIds.current.has(notifId)) {
            knownNotificationIds.current.add(notifId)
            triggerInAppNotification({
              id: notifId,
              booking_id: payload.booking_id,
              type: 'reminder',
              title: payload.title || '🔔 Pengingat Tugas Misdinar!',
              message: payload.message || 'Pengurus mengingatkan jadwal tugas misa Anda.',
            })
          }
        }
      })
      .subscribe()

    // 2. Also listen to table changes on 'bookings'
    const bookingsChannel = supabase
      .channel('bookings-reminder-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          const newBooking = payload.new as any
          if (profile && newBooking.user_id === profile.id && newBooking.wa_reminder_sent) {
            const notifId = `reminder-${newBooking.id}`
            if (!knownNotificationIds.current.has(notifId)) {
              knownNotificationIds.current.add(notifId)
              triggerInAppNotification({
                id: notifId,
                booking_id: newBooking.id,
                type: 'reminder',
                title: '🔔 Pengingat Tugas Misdinar!',
                message: 'Pengurus sakristi baru saja mengirimkan pengingat tugas misa Anda. Harap hadir H-30 menit.',
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(broadcastChannel)
      supabase.removeChannel(bookingsChannel)
    }
  }, [profile?.id])

  const triggerInAppNotification = (item: NotificationItem) => {
    playNotificationChime()

    // Show floating in-app banner toast
    setActiveToast(item)
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === item.id ? null : curr))
    }, 8000)

    // Also trigger Browser native Desktop Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(item.title, {
          body: item.message,
          icon: '/logo-misdinar.png',
        })
      } catch (e) {
        console.warn('Native notification failed:', e)
      }
    }

    // Refresh notifications list
    loadNotifications()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Floating In-App Top Notification Banner Toast */}
      {activeToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full bg-surface-container-lowest border-2 border-primary shadow-2xl rounded-2xl p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm animate-bounce">
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-primary line-clamp-1">{activeToast.title}</span>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-on-surface-variant hover:text-primary p-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">{activeToast.message}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveToast(null)
                    setIsOpen(true)
                  }}
                  className="px-2.5 py-1 bg-primary text-on-primary rounded-lg text-[11px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  Lihat Detail
                </button>
                <button
                  onClick={() => setActiveToast(null)}
                  className="px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-lg text-[11px] font-medium hover:bg-surface-container-high transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Bell Button in Navbar */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            loadNotifications()
          }
        }}
        className="relative p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
        title="Notifikasi Pengingat Tugas"
        type="button"
        aria-label="Notifikasi Pengingat"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-error text-on-error text-[9px] font-bold items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest border border-surface-container shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">notifications</span>
              <span className="font-headline font-bold text-sm text-primary">Notifikasi &amp; Pengingat</span>
            </div>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-bold">
                {unreadCount} Pengingat Baru
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-surface-container">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-xs">
                <span className="material-symbols-outlined text-3xl text-outline-variant block mb-1">
                  notifications_off
                </span>
                Belum ada notifikasi atau pengingat aktif saat ini.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 hover:bg-surface-container-low/60 transition-colors ${
                    n.type === 'reminder' ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                        n.type === 'reminder' ? 'text-amber-700' : 'text-primary'
                      }`}
                    >
                      {n.type === 'reminder' ? 'alarm' : 'campaign'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-on-surface line-clamp-1">{n.title}</h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{n.message}</p>
                      {n.type === 'reminder' && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                            Tugas Altar Terjadwal
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-surface-container-low border-t border-surface-container text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-primary font-semibold hover:underline"
            >
              Tutup Panel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
