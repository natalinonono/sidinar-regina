# SiDinar Regina (Sistem Digital Misdinar Paroki Santa Perawan Maria Regina Purbowardayan)

Platform manajemen Putra-Putri Altar (Misdinar) tingkat enterprise berskala penuh, aman, dan siap produksi 100% untuk di-deploy ke **Vercel** (`sidinar-regina.vercel.app`) dan dikompilasi ke **APK Android Studio**.

---

## 1. Arsitektur Enterprise & Keamanan Data Mutlak

1. **100% Tanpa LocalStorage / SessionStorage:**
   - **Web (Next.js 14 App Router):** Seluruh sesi autentikasi, status login, dan token JWT dikelola secara server-side menggunakan **HTTP-Only Secure Cookies** via `@supabase/ssr`. Tidak ada data kredensial atau profil sensitif yang disimpan di `localStorage` peramban.
   - **Mobile (Android Studio Kotlin):** State sesi autentikasi dan penugasan dikelola menggunakan **in-memory reactive `StateFlow`** (`MemorySessionManager`), sehingga token tidak pernah disimpan di `SharedPreferences` atau unencrypted file storage.
2. **Sinkronisasi Real-Time Multi-Platform:**
   - Web (Next.js) dan Mobile (APK Kotlin) terhubung ke Supabase Database yang sama.
   - Menggunakan **Supabase Realtime WebSockets (`postgres_changes`)** pada tabel `mass_schedules`, `bookings`, dan `announcements`. Perubahan kuota, pendaftaran, alokasi posisi liturgi, dan presensi sakristi langsung ter-update seketika di semua perangkat tanpa perlu refresh.
3. **Satu Akun Multi-Role Dinamis:**
   - Akun ditautkan secara relasional ke `auth.users` dengan tabel `public.profiles`.
   - Middleware dan router secara otomatis mendeteksi kolom `role` (`'anggota'` atau `'pengurus'`) setelah login untuk membatasi hak akses rute.

---

## 2. Aturan Bisnis & Liturgi Paroki SPMR Purbowardayan

Siklus pekan liturgi dihitung dari **Senin pukul 00.00 WIB hingga Minggu pukul 23.59 WIB** (Misa Sabtu sore 17.00 WIB masuk dalam rangkaian Misa Mingguan pekan berjalan).

| Parameter | Misa Harian | Misa Mingguan |
|---|---|---|
| **Hari & Jadwal** | Senin s/d Sabtu, pukul **05.30 WIB** | **Misa Mingguan Sabtu Sore** (**17.00 WIB**), **Misa Mingguan Pagi** (**07.00 WIB**), dan **Misa Mingguan Sore** (**17.00 WIB**) |
| **Kuota Maksimal** | **8 Orang** per sesi | **12 Orang** per sesi |
| **Jendela Presensi Buka** | Pukul **05.00 WIB** (H-30 menit) | **60 menit (1 jam)** sebelum misa dimulai |
| **Batas Tepat Waktu** | Maksimal pukul **05.10 WIB** (H-20 menit) | Maksimal **30 menit** sebelum misa dimulai |
| **Status Terlambat** | Check-in pukul 05.11 – 05.30 WIB otomatis berstatus `terlambat` | Check-in lewat H-30 menit hingga misa dimulai otomatis `terlambat` |
| **Batas Jatah Booking** | Maksimal **1x** Misa Harian / anggota / pekan | Maksimal **1x** Misa Mingguan / anggota / pekan (Sabtu sore & seluruh sesi Minggu berbagi 1 slot yang sama) |
| **Anti-Race Condition** | Trigger PostgreSQL dengan `FOR UPDATE` lock | Trigger PostgreSQL dengan `FOR UPDATE` lock |

### Peran & Posisi Tugas Liturgi
Setiap jadwal mencatat **Tahun Liturgi** (misal: Tahun B / II), **Warna Liturgi** (`Hijau`, `Putih`, `Merah`, `Ungu`, `Merah Muda`), dan **Nama Selebran** (Romo Pemimpin). Posisi penugasan altar meliputi:
- **Crucifer:** Pembawa Salib Prosesi (memimpin perarakan)
- **Ceroferarius I & II:** Pembawa Lilin Kanan dan Kiri
- **Acolyte Meja Kredens:** Petugas piala, sibori, dan persembahan
- **Acolyte Lavabo:** Petugas cuci tangan imam dan bel / genta misa
- **Thurifer:** Pembawa wiruk / pedupaan liturgi
- **Navicularius:** Pembawa wadah dupa wangi
- **Master of Ceremonies (MC):** Penata barisan dan tata gerak sakristi

---

## 3. Struktur Repositori & Direktori

```
D:\.Project Misdinar/
├── web/                               # Aplikasi Web Next.js 14 App Router + Tailwind CSS + @supabase/ssr
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login & register # Portal Autentikasi Desktop & Mobile (Stitch Design)
│   │   │   ├── (dashboard)/anggota/   # Dashboard Anggota, Kuota Realtime, Presensi QR
│   │   │   ├── (dashboard)/pengurus/  # Pusat Kendali Pengurus, Approval, Posisi, Scanner
│   │   │   └── api/                   # Server-side API Routes (Login, Register, Bookings, Checkin, Approve)
│   │   ├── components/                # Navbar, ScheduleCard, BookingModal, CheckinModal, LiturgyBadge
│   │   ├── lib/supabase/              # Client, Server, and Middleware with HTTP-Only Cookies
│   │   └── types/database.ts          # Typed Supabase Database Schema
│   └── package.json
├── android/                           # Native Android Studio Project (Kotlin + Jetpack Compose)
│   ├── app/src/main/
│   │   ├── java/org/purbowardayan/sidinar/
│   │   │   ├── MainActivity.kt        # NavHost & StateFlow Router
│   │   │   ├── data/                  # SupabaseClient (MemorySessionManager), Models, Repositories
│   │   │   └── ui/                    # Compose Themes, ViewModels, Screens (Login, Register, Dashboard)
│   │   └── AndroidManifest.xml
│   ├── build.gradle.kts
│   └── settings.gradle.kts
├── supabase/
│   └── migrations/
│       ├── 20261025000000_init_schema.sql         # Skema tabel, enums, triggers & realtime
│       ├── 20261025000001_rls_policies.sql        # Row Level Security
│       └── 20261025000002_seed_purbowardayan.sql  # Seed Wilayah 1-7, Jadwal & Pengumuman
├── docs/design_reference/                         # Arsip Kode HTML & Gambar Screenshot Stitch Asli
└── vercel.json                                    # Konfigurasi deployment Vercel
```

---

## 4. Langkah Setup & Eksekusi Database Supabase

1. Buka SQL Editor di dasbor proyek Supabase Anda: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Jalankan secara berurutan ketiga file migrasi yang berada di folder `supabase/migrations/`:
   - `20261025000000_init_schema.sql` (Membuat enums, tabel, trigger anti-race condition `validate_booking_rules`, dan publikasi Realtime).
   - `20261025000001_rls_policies.sql` (Mengaktifkan RLS dan kebijakan hak akses).
   - `20261025000002_seed_purbowardayan.sql` (Mengisi master Wilayah 1-7 Paroki SPMR, jadwal misa harian & mingguan, serta pengumuman awal).

---

## 5. Menjalankan & Deploy Aplikasi Web (Next.js)

### Jalankan Secara Lokal:
```bash
cd web
npm install
npm run dev
```
Buka peramban di `http://localhost:3000`.

### Deploy ke Vercel (`sidinar-regina.vercel.app`):
1. Push repositori ini ke GitHub / GitLab.
2. Masuk ke dasbor [Vercel](https://vercel.com) dan buat New Project dengan memilih repositori ini.
3. Konfigurasikan:
   - **Root Directory:** `web`
   - **Framework Preset:** `Next.js`
4. Tambahkan Environment Variables di pengaturan Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL proyek Supabase Anda
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon Public Key Supabase Anda
   - `SUPABASE_SERVICE_ROLE_KEY` = Service Role Key Supabase Anda
   - `NEXT_PUBLIC_APP_URL` = `https://sidinar-regina.vercel.app`
5. Klik **Deploy**. Aplikasi akan otomatis di-build dan siap online 100%.

---

## 6. Kompilasi APK di Android Studio (Kotlin)

1. Buka **Android Studio** (Koala / Iguana / Jellyfish atau versi yang lebih baru).
2. Pilih **Open** lalu arahkan ke folder: `D:\.Project Misdinar\android`.
3. Tunggu proses *Gradle Sync* selesai mengunduh dependensi Jetpack Compose dan Supabase-kt.
4. Buka file `android/app/src/main/java/org/purbowardayan/sidinar/data/SupabaseClient.kt` dan masukkan URL serta Anon Key Supabase Anda.
5. Untuk mengompilasi APK:
   - Pilih menu **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Atau jalankan di terminal:
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
6. File APK siap dipasang langsung di smartphone Android pengurus maupun anggota misdinar.
