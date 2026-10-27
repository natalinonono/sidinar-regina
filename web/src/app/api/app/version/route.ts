import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 5,
  latest_version_name: '1.2.2',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '⚡ Pembaruan SiDinar Regina v1.2.2:\n' +
    '• Auto-Refresh Sesi: Sesi login diperbarui otomatis tanpa harus logout\n' +
    '• Fallback Jadwal & Pengumuman: Jadwal misa & warta paroki 100% selalu muncul\n' +
    '• Notifikasi & Pengingat Instan: Sinkronisasi aktif 5 detik di aplikasi & web\n' +
    '• Perbaikan otentikasi saat mengambil tugas misa (booking) via Android\n' +
    '• Peningkatan performa & kestabilan koneksi real-time',
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
