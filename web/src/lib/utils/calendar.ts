import { MassSchedule, Profile } from '@/types/database'

/**
 * Format tanggal dan jam ke format ISO yang kompatibel untuk kalender (UTC/Local)
 */
function formatCalendarDateTime(dateStr: string, timeStr: string, minutesOffset = 0): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm:ss
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  const date = new Date(year, month - 1, day, hour, minute)
  if (minutesOffset !== 0) {
    date.setMinutes(date.getMinutes() + minutesOffset)
  }

  // Format ke YYYYMMDDTHHmmSS
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
}

/**
 * Membuat URL Google Calendar 1-klik
 */
export function generateGoogleCalendarUrl(schedule: MassSchedule): string {
  const start = formatCalendarDateTime(schedule.tanggal_misa, schedule.jam_mulai)
  // Durasi misa perkiraan 90 menit
  const end = formatCalendarDateTime(schedule.tanggal_misa, schedule.jam_mulai, 90)

  const title = encodeURIComponent(`Tugas Misdinar: ${schedule.judul_misa}`)
  const details = encodeURIComponent(
    `Jadwal Pelayanan Altar Misdinar Paroki SPMR Purbowardayan.\n\n` +
      `Misa: ${schedule.judul_misa}\n` +
      `Waktu: Pukul ${schedule.jam_mulai.substring(0, 5)} WIB\n` +
      `Ketentuan: Wajib hadir di sakristi paling lambat 30 menit sebelum misa dimulai mengenakan pakaian rapi, sepatu hitam, dan jubah misdinar.`
  )
  const location = encodeURIComponent('Gereja Katolik Santa Perawan Maria Regina (SPMR) Purbowardayan Surakarta')

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
}

/**
 * Membuat dan mengunduh file iCalendar (.ics) untuk Apple Calendar, Outlook, atau Android
 */
export function downloadIcsFile(schedule: MassSchedule) {
  const start = formatCalendarDateTime(schedule.tanggal_misa, schedule.jam_mulai)
  const end = formatCalendarDateTime(schedule.tanggal_misa, schedule.jam_mulai, 90)

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SiDinar Regina//Misdinar SPMR Purbowardayan//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:Tugas Misdinar: ${schedule.judul_misa}`,
    `DESCRIPTION:Jadwal Tugas Pelayanan Altar di Gereja Katolik SPMR Purbowardayan. Wajib hadir 30 menit sebelum misa.`,
    `LOCATION:Gereja Katolik SPMR Purbowardayan Surakarta`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Pengingat Tugas Misdinar 1 Jam Lagi',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Pengingat Tugas Misdinar Besok',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `Tugas_Misdinar_${schedule.tanggal_misa}.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Membuat teks reminder WhatsApp resmi untuk pengurus ke misdinar
 */
export function generateWhatsAppReminderMessage(
  schedule: MassSchedule,
  profile: Profile
): { message: string; waUrl: string } {
  const cleanPhone = (profile.no_telepon || '').replace(/^0/, '62').replace(/\D/g, '')

  const message =
    `*PENGINGAT TUGAS MISDINAR SPMR PURBOWARDAYAN* 🔔\n\n` +
    `Halo *${profile.nama_panggilan || profile.nama_lengkap}*,\n` +
    `Mengingatkan jadwal pelayanan altar Anda:\n\n` +
    `⛪ *Misa*: ${schedule.judul_misa}\n` +
    `📅 *Tanggal*: ${schedule.tanggal_misa}\n` +
    `⏰ *Pukul*: ${schedule.jam_mulai.substring(0, 5)} WIB\n\n` +
    `⚠️ *Ketentuan Sakristi*:\n` +
    `1. Harap hadir paling lambat *30 menit sebelum misa* untuk doa bersama dan persiapan vestimentum.\n` +
    `2. Mengenakan celana/rok panjang hitam sopan dan sepatu hitam.\n` +
    `3. Melakukan presensi mandiri (scan QR code) di sakristi sebelum misa dimulai.\n\n` +
    `Mohon konfirmasi kehadirannya ya. Terima kasih atas semangat pelayanannya. Berkah Dalem! 🙏✨`

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`

  return { message, waUrl }
}
