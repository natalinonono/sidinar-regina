import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 3,
  latest_version_name: '1.2.0',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '✨ Pembaruan SiDinar Regina v1.2.0:\n' +
    '• Perbaikan sistem pendaftaran & normalisasi jenjang pendidikan\n' +
    '• Tampilan pesan error yang lebih ramah & berbahasa Indonesia\n' +
    '• Ikon aplikasi (adaptive icon) & ikon notifikasi baru yang lebih elegan\n' +
    '• Peningkatan kestabilan pengunduh pembaruan otomatis (OTA update)\n' +
    '• Akun baru langsung aktif tanpa menunggu approval',
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
