import { NextResponse } from 'next/server'

// Konfigurasi Versi Rilis Aplikasi Android SiDinar Regina
// Ubah latest_version_code dan latest_version_name di sini setiap kali rilis baru!
const APP_VERSION_CONFIG = {
  latest_version_code: 8,
  latest_version_name: '1.2.5',
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:
    '⚡ Pembaruan SiDinar Regina v1.2.5:\n' +
    '• 🔔 Pop-Up Floating Banner Heads-Up (Gaya WhatsApp): Notifikasi tugas altar kini langsung melayang di atas layar lengkap dengan bunyi dering & getar\n' +
    '• 🔘 Tombol Aksi Cepat Interaktif: Akses instan [📅 Lihat Jadwal] dan [✅ Siap Bertugas] langsung dari bilah pop-up notifikasi tanpa harus repot membuka aplikasi\n' +
    '• 🌐 Sinkronisasi Multi-Arah Real-Time: Perbaikan pengiriman notifikasi instan lintas Web-ke-Web, Web-ke-APK, dan APK-ke-APK tanpa hambatan jeda/debounce statis\n' +
    '• 👥 Tombol "Ingatkan Semua" di APK: Pengurus kini dapat menyiarkan pengingat ke seluruh petugas misa sekaligus langsung dari aplikasi Android\n' +
    '• 📢 Notifikasi Otomatis Warta Sakristi: Misdinar otomatis menerima pemberitahuan pop-up saat pengurus menerbitkan pengumuman sakristi terbaru\n' +
    '• 🔔 Uji Mandiri Web: Tombol "Uji Bunyi & Banner Web" di menu lonceng web untuk verifikasi suara lonceng dan izin browser\n' +
    '• 🛡️ Izin Layar Terkunci & Exact Alarm: Dukungan USE_FULL_SCREEN_INTENT agar alarm pengingat tugas tetap tembus saat layar HP terkunci',
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
