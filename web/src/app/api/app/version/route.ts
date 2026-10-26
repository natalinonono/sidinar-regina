import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 2,
  latest_version_name: '1.1.0',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '✨ Pembaruan Terbaru SiDinar Regina:\n' +
    '• Notifikasi Pengingat Tugas Otomatis ke HP & Web\n' +
    '• Fitur Mode Gelap (Dark Mode) otomatis menyesuaikan sistem HP\n' +
    '• Edit data diri langsung aktif tanpa menunggu approval\n' +
    '• Perbaikan layout & visual identitas misdinar\n' +
    '• Sistem update otomatis dalam aplikasi (In-App OTA Updater)',
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
