import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 10,
  latest_version_name: '1.2.7',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '⚡ Pembaruan SiDinar Regina v1.2.7:\n' +
    '• 📷 Kamera Scanner QR Presensi: Pengurus kini dapat memindai QR code tiket tugas misdinar langsung menggunakan kamera HP di sakristi.\n' +
    '• 🗑️ Hapus Jadwal Misa: Opsi pembatalan/penghapusan jadwal misa kini tersedia langsung di dialog roster pengurus dengan konfirmasi aman.\n' +
    '• ⚡ Optimasi Kecepatan Presensi: Verifikasi kehadiran instan mendeteksi batas toleransi secara otomatis.\n' +
    '• 🛡️ Peningkatan Stabilitas: Penyempurnaan sinkronisasi data multi-platform real-time.',
  force_update: false,
  published_at: new Date().toISOString(),
}

export async function GET() {
  return NextResponse.json(APP_VERSION_CONFIG, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
