import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 6,
  latest_version_name: '1.2.3',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '⚡ Pembaruan SiDinar Regina v1.2.3:\n' +
    '• Notifikasi Latar Belakang: Pengingat tugas tetap masuk meskipun aplikasi ditutup (closed/swiped)\n' +
    '• Auto-Start Boot Receiver: Pemantau tugas otomatis aktif kembali saat HP dinyalakan (reboot)\n' +
    '• Auto-Refresh Sesi: Token login diperbarui otomatis tanpa perlu login ulang\n' +
    '• Fallback Server: Jadwal misa & warta sakristi 100% selalu muncul di layar\n' +
    '• Peningkatan kestabilan & performa koneksi real-time',
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
