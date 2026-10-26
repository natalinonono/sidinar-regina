# 📖 Panduan Lengkap: Update & Rilis Aplikasi SiDinar Regina Tanpa Kirim APK di Grup WA

Dokumen ini menjelaskan alur kerja pembaruan aplikasi Android **SiDinar Regina**. Dengan sistem **In-App OTA Update** yang telah terpasang, setiap kali Anda merilis fitur baru atau perbaikan di Android Studio, seluruh anggota dan pengurus misdinar akan **otomatis mendapatkan notifikasi pembaruan di HP masing-masing dan dapat memperbarui aplikasi secara langsung dengan 1 tombol.**

---

## 🔄 Alur Kerja Pembaruan (Overview)

```
[Android Studio]
  1. Naikkan versionCode & versionName
  2. Build APK (Build APKs / Generate Signed APK)
       │
       ▼
[GitHub Releases]
  3. Upload file APK ke GitHub Release: "app-release.apk"
       │
       ▼
[Server SiDinar (Web)]
  4. Ubah nomor versi di route.ts & Git Push
       │
       ▼
[HP Anggota & Pengurus]
  5. Aplikasi auto-mendeteksi versi baru, muncul pop-up pembaruan, dan otomatis terinstal!
```

---

## 🛠️ Langkah Demi Langkah (Step-by-Step)

### Langkah 1: Naikkan Angka Versi di Android Studio
Buka proyek di Android Studio, lalu buka file:
📁 `android/app/build.gradle.kts`

Cari blok `defaultConfig` (sekitar baris 9 - 15):
```kotlin
defaultConfig {
    applicationId = "org.purbowardayan.sidinar"
    minSdk = 24
    targetSdk = 34
    versionCode = 2          // ⬅️ NAIKKAN 1 ANGKA (misal: 1 -> 2 -> 3)
    versionName = "1.1.0"    // ⬅️ UBAH NAMA VERSI (misal: 1.0.0 -> 1.1.0)
    ...
}
```

> ⚠️ **Catatan Penting:** 
> - `versionCode` **harus selalu bilangan bulat yang lebih tinggi** dari versi sebelumnya (contoh: jika sebelumnya 1, ubah jadi 2). Ini yang digunakan sistem HP untuk mendeteksi adanya pembaruan.
> - `versionName` adalah teks versi yang ditampilkan ke pengguna (misal: "1.1.0", "1.2.0").

---

### Langkah 2: Build File APK di Android Studio

1. Di menu atas Android Studio, klik:
   👉 **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
   *(Atau **Build > Generate Signed Bundle / APK** jika Anda sudah mengatur signing key rilis).*
2. Tunggu proses kompilasi Gradle selesai (biasanya muncul notifikasi popup hijau di pojok kanan bawah: *Build APK(s): APK(s) generated successfully*).
3. Klik link **locate** pada notifikasi tersebut, atau buka folder:
   📁 `d:\.Project Misdinar\android\app\build\outputs\apk\debug\` (atau `release/`)
4. Di dalam folder tersebut terdapat file: `app-debug.apk` (atau `app-release.apk`).
5. **Ubah nama file tersebut menjadi:**
   `app-release.apk`

---

### Langkah 3: Upload APK ke GitHub Releases

1. Buka repositori GitHub proyek di browser:
   🌐 [https://github.com/natalinonono/sidinar-regina](https://github.com/natalinonono/sidinar-regina)
2. Di sebelah kanan halaman, cari menu **Releases** lalu klik **Draft a new release** (atau Buat Rilis Baru).
3. Isi informasi rilis:
   - **Choose a tag**: Buat tag baru sesuai versi, contoh: `v1.1.0` (klik *Create new tag*).
   - **Release title**: Beri judul, contoh: `SiDinar Regina v1.1.0`
   - **Description**: Tuliskan ringkasan fitur baru atau perbaikan liturgi.
4. **Lampirkan File APK:**
   - Di kotak putus-putus (*Attach binaries by dropping them here or selecting them*), tarik (*drag & drop*) file `app-release.apk` dari Langkah 2 ke kotak ini.
   - Pastikan nama file adalah **`app-release.apk`**.
5. Klik tombol hijau: **Publish release**.

> 💡 **Kenapa nama filenya harus `app-release.apk`?**
> Karena GitHub secara otomatis menyediakan tautan unduh permanen versi terbaru:
> `https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk`
> Tautan ini tidak akan pernah berubah meskipun versinya terus diperbarui!

---

### Langkah 4: Perbarui Info Versi di Server Web

Buka file konfigurasi versi di proyek web:
📁 `web/src/app/api/app/version/route.ts`

Sesuaikan nilainya dengan rilis baru Anda:
```typescript
const APP_VERSION_CONFIG = {
  latest_version_code: 2,          // ⬅️ Samakan dengan versionCode di Langkah 1
  latest_version_name: '1.1.0',    // ⬅️ Samakan dengan versionName di Langkah 1
  min_required_version: 1,
  download_url: 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk',
  release_notes:                   // ⬅️ Tulis apa saja yang baru di versi ini
    '✨ Pembaruan Terbaru SiDinar Regina:\n' +
    '• Notifikasi Pengingat Tugas Otomatis ke HP & Web\n' +
    '• Fitur Mode Gelap (Dark Mode) otomatis\n' +
    '• Edit data diri langsung aktif tanpa approval\n' +
    '• Sistem update otomatis dalam aplikasi',
  force_update: false,             // Set true jika versi lama wajib update (tidak bisa ditutup)
  published_at: new Date().toISOString(),
}
```

Simpan file, lalu commit dan push ke GitHub:
```bash
git add .
git commit -m "chore(release): bump app version to 1.1.0"
git push origin main
```
*(Vercel akan otomatis men-deploy perubahan ini dalam waktu ~1 menit).*

---

### Langkah 5: Selesai! 🎉

Sekarang Anda **tidak perlu mengirim apa pun di grup WhatsApp misdinar!**

- **Ketika anggota membuka aplikasi:**
  Aplikasi akan otomatis menampilkan dialog:
  > **🚀 Pembaruan SiDinar Regina (v1.1.0)**  
  > *Versi terbaru SiDinar Regina telah tersedia:*  
  > • Poin-poin pembaruan...  
  > `[Nanti Saja]` `[Perbarui Sekarang]`

- **Ketika anggota klik "Perbarui Sekarang":**
  1. Handphone langsung mengunduh file pembaruan di latar belakang (bisa dipantau di status bar notifikasi HP).
  2. Begitu selesai mengunduh, sistem Android otomatis menampilkan layar pemasangan aplikasi SiDinar Regina.
  3. Anggota cukup klik **Update / Pasang**, dan aplikasi langsung terpasang versi terbaru dengan data akun yang tetap aman!

---

## ❓ Tanya Jawab & Troubleshooting

### Q: Bagaimana jika ada HP anggota yang baru pertama kali melakukan update?
**A:** Pada Android 8.0 ke atas, sistem Android akan meminta izin keamanan standar: *"Izinkan dari sumber ini"*. Aplikasi SiDinar Regina sudah otomatis memunculkan tombol **"Buka Pengaturan"** yang langsung mengarahkan anggota ke menu izin tersebut. Anggota hanya perlu menggeser saklar izin ke **ON** (sekali saja untuk seterusnya).

### Q: Bagaimana jika anggota melewatkan pop-up saat buka aplikasi?
**A:** Anggota bisa mengklik teks versi di bagian paling bawah layar beranda:
`SiDinar Regina v1.0.0 • Cek Pembaruan`. Begitu diklik, aplikasi akan langsung mengecek ke server dan memunculkan pop-up update kembali.

### Q: Apakah akun dan sesi login anggota akan hilang setelah di-update?
**A:** **Tidak.** Sistem Android mempertahankan data lokal (*SharedPreferences* dan cache) aplikasi saat proses update berlangsung, sehingga anggota tidak perlu login ulang.
