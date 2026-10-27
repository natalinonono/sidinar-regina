import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 7,
  latest_version_name: '1.2.4',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '⚡ Pembaruan SiDinar Regina v1.2.4:\n' +
    '• 🔔 Uji Coba Pengingat Instan: Tombol "Tes Notifikasi (5 Detik)" di menu notifikasi untuk membuktikan notifikasi HP aktif saat aplikasi ditutup/layar terkunci\n' +
    '• ⚙️ Perbaikan Arsitektur Background: Menggunakan goAsync() & WakeLock agar Android tidak mematikan proses pengecekan saat aplikasi di-close\n' +
    '• ⏰ Alarm Tepat Waktu (Exact Alarm): Izin SCHEDULE_EXACT_ALARM agar tidak terhambat mode hemat daya (Doze Mode)\n' +
    '• 📅 Pengingat Otomatis H-1 & Hari H: Peringatan otomatis menjelang hari tugas misa tanpa harus menunggu klik manual pengurus\n' +
    '• 🔋 Panduan Optimasi Baterai HP: Akses langsung perizinan latar belakang untuk HP Xiaomi, Oppo, Vivo, dan Samsung\n' +
    '• 🔔 Notifikasi Instan Pendaftaran: Bunyi dan getar langsung saat anggota berhasil memilih jadwal misa',
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
