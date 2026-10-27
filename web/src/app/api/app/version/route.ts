import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 4,
  latest_version_name: '1.2.1',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '⚡ Pembaruan SiDinar Regina v1.2.1:\n' +
    '• Notifikasi & Pengingat Tugas Super Cepat: sinkronisasi otomatis tiap 5 detik di aplikasi & web\n' +
    '• Perbaikan channel broadcast pengingat misa dari pengurus ke anggota\n' +
    '• Perbaikan otentikasi saat mengambil tugas misa (booking) via Android\n' +
    '• Suara notifikasi & banner pengingat tugas langsung muncul di layar\n' +
    '• Peningkatan performa & kestabilan koneksi data real-time',
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
