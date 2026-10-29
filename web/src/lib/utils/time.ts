import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, addMinutes, subMinutes, getISOWeek, getYear } from 'date-fns'

/**
 * Returns current week and year in Indonesia/WIB context (Monday - Sunday)
 */
export function getCurrentLiturgicalWeek(targetDate: Date = new Date()) {
  const weekNumber = getISOWeek(targetDate)
  const yearNumber = getYear(targetDate)
  
  // Week interval Monday 00:00 to Sunday 23:59
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 })

  return {
    weekNumber,
    yearNumber,
    weekStart,
    weekEnd,
    startDateStr: format(weekStart, 'yyyy-MM-dd'),
    endDateStr: format(weekEnd, 'yyyy-MM-dd'),
    formattedRange: `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`
  }
}

export type CheckinEvaluation = {
  allowed: boolean
  status: 'hadir' | 'terlambat' | 'belum_buka' | 'lewat'
  message: string
  minutesRemaining?: number
  windowOpenTime: Date
  ontimeDeadline: Date
  massStartTime: Date
}

/**
 * Evaluate check-in rules according to SPMR Purbowardayan Church Rules:
 * Misa Harian:
 * - Start: 05:30 WIB
 * - Window opens: 05:00 WIB (H-30)
 * - Ontime cutoff: 05:10 WIB (H-20)
 * - Late: 05:11 - 05:30 WIB
 * 
 * Misa Mingguan (17:00, 06:00, 08:00, 16:00, 18:00 WIB):
 * - Window opens: H-60 minutes
 * - Ontime cutoff: H-30 minutes
 * - Late: H-29 minutes until mass start
 */
export function evaluateCheckinWindow(
  tanggalMisa: string,
  jamMulai: string,
  kategori: 'harian' | 'mingguan',
  now: Date = new Date()
): CheckinEvaluation {
  // Combine date and time with explicit WIB (+07:00) context
  const timeClean = jamMulai.length === 5 ? `${jamMulai}:00` : jamMulai
  const massDateTimeStr = `${tanggalMisa}T${timeClean}+07:00`
  const massStartTime = new Date(massDateTimeStr)

  let windowOpenTime: Date
  let ontimeDeadline: Date

  if (kategori === 'harian') {
    // Window opens H-30 mins, on-time cutoff is H-20 mins
    windowOpenTime = subMinutes(massStartTime, 30)
    ontimeDeadline = subMinutes(massStartTime, 20)
  } else {
    // Mingguan: Window opens H-60 mins, on-time cutoff is H-30 mins
    windowOpenTime = subMinutes(massStartTime, 60)
    ontimeDeadline = subMinutes(massStartTime, 30)
  }

  const cutoffMinutes = kategori === 'harian' ? 75 : 120 // 30m+45m vs 75m+45m
  const cutoffToleranceTime = addMinutes(massStartTime, cutoffMinutes)

  // Comparison
  if (now < windowOpenTime) {
    const diffMins = Math.ceil((windowOpenTime.getTime() - now.getTime()) / (1000 * 60))
    return {
      allowed: false,
      status: 'belum_buka',
      message: `Presensi belum dibuka. Presensi dibuka ${kategori === 'harian' ? 'pukul 05.00 WIB (H-30)' : '60 menit sebelum misa'}. Tunggu ${diffMins} menit lagi.`,
      minutesRemaining: diffMins,
      windowOpenTime,
      ontimeDeadline,
      massStartTime
    }
  }

  if (now > cutoffToleranceTime) {
    return {
      allowed: false,
      status: 'lewat',
      message: 'Masa tugas telah berakhir dan melewati batas toleransi presensi (45 menit pasca misa). Status tugas otomatis Alpa.',
      windowOpenTime,
      ontimeDeadline,
      massStartTime
    }
  }

  if (now > massStartTime) {
    return {
      allowed: false,
      status: 'lewat',
      message: 'Perayaan Ekaristi telah dimulai. Presensi mandiri ditutup. Hubungi Pengurus Sakristi untuk konfirmasi.',
      windowOpenTime,
      ontimeDeadline,
      massStartTime
    }
  }

  // Inside open window
  if (now <= ontimeDeadline) {
    return {
      allowed: true,
      status: 'hadir',
      message: 'Presensi Tepat Waktu (Hadir)',
      windowOpenTime,
      ontimeDeadline,
      massStartTime
    }
  } else {
    return {
      allowed: true,
      status: 'terlambat',
      message: `Presensi Terlambat (Melewati batas tepat waktu ${format(ontimeDeadline, 'HH:mm')} WIB)`,
      windowOpenTime,
      ontimeDeadline,
      massStartTime
    }
  }
}

/**
 * Checks if a duty has passed the mass cutoff tolerance window (+45 minutes after estimated mass end).
 * Rule:
 * - Misa Harian: 30m mass duration + 45m tolerance = 75m from start time. (e.g. 05:30 -> Cutoff at 06:45 WIB).
 * - Misa Mingguan: 75m mass duration + 45m tolerance = 120m from start time. (e.g. 05:30 -> Cutoff at 07:30 WIB).
 * After cutoff, unconfirmed attendance is marked as 'alpa'.
 */
export function isMassToleranceExpired(
  tanggalMisa: string,
  jamMulai: string,
  kategori: 'harian' | 'mingguan' | string = 'mingguan',
  now: Date = new Date()
): boolean {
  try {
    const timeClean = jamMulai.length === 5 ? `${jamMulai}:00` : jamMulai
    const massDateTimeStr = `${tanggalMisa}T${timeClean}+07:00`
    const massStartTime = new Date(massDateTimeStr)
    const cutoffMinutes = (kategori && kategori.toLowerCase() === 'harian') ? 75 : 120
    const cutoffTime = addMinutes(massStartTime, cutoffMinutes)
    return now.getTime() > cutoffTime.getTime()
  } catch {
    return false
  }
}
