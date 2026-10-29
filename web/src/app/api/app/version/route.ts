import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 9,
  latest_version_name: '1.2.6',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '⚡ Pembaruan SiDinar Regina v1.2.6:\n' +
    '• 📋 Formulir Jadwal Ringkas: Pembuatan jadwal misa kini lebih cepat dan langsung fokus pada penentuan kuota petugas altar.\n' +
    '• 📱 Roster Petugas Altar: Tampilan daftar petugas misa di aplikasi Android kini lebih bersih, rapi, dan responsif.\n' +
    '• 🌐 Sinkronisasi Multi-Platform: Sinkronisasi data real-time antara Web Dashboard dan Android semakin mulus dan konsisten.\n' +
    '• 🛡️ Stabilitas & Keandalan: Penyempurnaan performa pemuatan jadwal serta penanganan koneksi Supabase.',
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
