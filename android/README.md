# SiDinar Regina - Android Studio Project (Java)

Aplikasi Android Native resmi untuk **Sistem Informasi Misdinar (SiDinar) Regina** Paroki Santa Perawan Maria Regina (SPMR) Purbowardayan Surakarta.

Dibangun murni menggunakan **Bahasa Java (Java 17)**, **ViewBinding**, **Material Design 3**, dan **Retrofit 2 + OkHttp + Gson**.

---

## 🛠️ Panduan Membuka di Android Studio

1. Buka **Android Studio** (Hedgehog / Iguana / Jellyfish / Koala atau versi terbaru).
2. Pilih menu **File > Open...**
3. Arahkan ke folder:
   ```
   D:\.Project Misdinar\android
   ```
4. Tunggu proses **Gradle Sync** selesai secara otomatis.
5. Jalankan aplikasi pada Emulator atau Perangkat Fisik Android (Min SDK: Android 7.0 / API 24).

---

## 🏛️ Arsitektur & Paket Kode (Java)

Semua kode sumber berada dalam paket `org.purbowardayan.sidinar`:

```
android/app/src/main/java/org/purbowardayan/sidinar/
├── adapter/
│   ├── AnnouncementAdapter.java   # Adapter daftar pengumuman & warta
│   ├── MemberAdapter.java         # Adapter persetujuan & daftar anggota misdinar
│   └── ScheduleAdapter.java       # Adapter kartu jadwal misa & kuota altar
├── auth/
│   └── SessionManager.java        # Pengelolaan sesi login & token via SharedPreferences
├── model/
│   ├── Announcement.java          # Model data pengumuman
│   ├── AuthResponse.java          # Model respons token & auth Supabase
│   ├── Booking.java               # Model pendaftaran tugas misa
│   ├── LoginRequest.java          # Payload login email & password
│   ├── MassSchedule.java          # Model jadwal misa & kalkulasi sisa kuota
│   ├── Profile.java               # Model profil anggota/pengurus misdinar
│   └── RegisterRequest.java       # Payload registrasi anggota baru
├── network/
│   ├── ApiClient.java             # Singleton Retrofit, OkHttpClient, & WhatsApp helper
│   ├── BackendApi.java            # Endpoint Next.js (Registrasi auto-confirm & Booking)
│   └── SupabaseApi.java           # Endpoint PostgREST & Supabase Auth
└── ui/
    ├── LoginActivity.java         # Halaman masuk & bantuan WhatsApp
    ├── RegisterActivity.java      # Halaman pendaftaran misdinar (Auto-confirm)
    ├── AnggotaMainActivity.java   # Beranda anggota, pilih misa, QR check-in
    └── PengurusMainActivity.java  # Panel kontrol pengurus (Approve, Warta, Kuota)
```

---

## 🌟 Fitur Utama Aplikasi

1. **100% Bahasa Java**:
   - Tidak menggunakan Kotlin.
   - Menggunakan Java 17 dan ViewBinding modern untuk keamanan tipe tampilan.
2. **Tanpa Kewajiban Konfirmasi Email**:
   - Pendaftaran anggota langsung berstatus auto-confirmed via server API.
   - Anggota langsung mendapatkan status *Pending Approval* dari Pengurus.
3. **Format Wilayah & Lingkungan Standar**:
   - Formulir pendaftaran dilengkapi placeholder contoh:  
     `Contoh: Jebres Barat, C2 Santa Rosa de Lima`
4. **Pendaftaran Tugas Misa Otomatis**:
   - Tidak ada pilihan peran yang membingungkan; peran otomatis ditetapkan sebagai **Petugas Altar**.
   - Dilengkapi proteksi kuota (maksimal 6 orang per misa) dan batas 1 tugas per pekan.
5. **Dua Kontak WhatsApp Resmi**:
   - **Kontak Admin**: `0812-2878-8912`
   - **Kontak Pengurus**: `0856-4398-5341`
   - Tersedia tombol sekali klik langsung membuka aplikasi WhatsApp.
6. **Panel Khusus Pengurus / Tim Pendamping**:
   - Persetujuan (*Approval*) anggota baru sekali klik.
   - Tambah, edit, dan hapus pengumuman warta paroki.
   - Pantauan kuota misa terisi secara real-time.
7. **Presensi Mandiri QR Code**:
   - Terintegrasi ZXing scanner untuk presensi tugas di sakristi gereja.
