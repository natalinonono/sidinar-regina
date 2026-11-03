# 📖 PANDUAN PENGGUNAAN RESMI SIDINAR REGINA
### Sistem Informasi & Presensi Digital Putra-Putri Altar (Misdinar)
**Paroki Santa Perawan Maria Regina (SPMR) Purbowardayan, Surakarta**
*Versi Sistem: v1.2.6 (Web Next.js & Aplikasi Android Mobile)*

---

## 🌟 1. PENGENALAN SISTEM

**SiDinar Regina** adalah platform digital terintegrasi yang dirancang khusus untuk memfasilitasi penjadwalan, tata kelola kuota, dan pencatatan presensi sakristi bagi seluruh Putra-Putri Altar (Misdinar) Paroki Purbowardayan secara akurat, adil, dan *real-time*.

Ekosistem sistem terdiri dari 2 platform utama:
1. **Web Portal Next.js** (Dapat diakses melalui browser laptop/komputer dan smartphone di: `https://sidinar-regina.vercel.app`).
2. **Aplikasi Android SiDinar Regina** (Aplikasi native di smartphone dengan fitur scanner kamera dan *In-App Auto-Update*).

> [!NOTE]
> Seluruh data antara Web Portal dan Aplikasi Android terhubung ke server database yang sama secara *real-time*. Setiap perubahan jadwal, pemesanan kuota, maupun presensi akan langsung terbarui di semua perangkat tanpa perlu melakukan refresh manual.

---

## ⏱️ 2. ATURAN RESMI TUGAS, DURASI MISA & AUTO-ALPA

Sistem menerapkan aturan liturgi dan tata tertib sakristi Paroki SPMR Purbowardayan:

### A. Jatah Kuota Pelayanan per Pekan
* **Siklus Pekan Liturgi:** Dihitung dari **Senin pukul 00.00 WIB** s/d **Minggu pukul 23.59 WIB**.
* **Jatah Tugas per Anggota:** Maksimal **1x Misa Harian** dan **1x Misa Mingguan** per pekan liturgi berjalan.
* **Kategori Penugasan:** Seluruh anggota mendaftar langsung sebagai **Petugas Altar** (penataan posisi liturgi seperti Salib/Lilin/Dupa dikoordinasikan langsung bersama Tim Pendamping di sakristi).

### B. Rumus Durasi Misa, Batas Toleransi & Auto-Alpa
Batas toleransi kehadiran adalah **+45 menit setelah perkiraan misa selesai**. Jika melewati batas toleransi ini dan petugas belum melakukan presensi, status pendaftaran **otomatis terkunci menjadi ALPA**.

| Parameter | ⛪ Misa Harian (Senin - Sabtu) | 🕊️ Misa Mingguan (Sabtu Sore & Minggu) |
|---|---|---|
| **Waktu Mulai Standar** | **05.30 WIB** | **Sabtu 17.00 WIB**, **Minggu 06.00, 08.00, 16.00, 18.00 WIB** |
| **Durasi Maksimal Misa** | **30 Menit** (perkiraan selesai 06.00 WIB) | **75 Menit / 1 Jam 15 Menit** |
| **Presensi Mulai Dibuka** | Pukul **05.00 WIB** (H-30 menit) | **60 Menit** sebelum perayaan Ekaristi dimulai |
| **Batas Tepat Waktu (Hadir)** | Maksimal pukul **05.10 WIB** (H-20 menit) | Maksimal **30 Menit** sebelum misa dimulai |
| **Status Terlambat** | Check-in pukul **05.11 – 05.30 WIB** | Check-in antara **H-29 menit s/d Misa Dimulai** |
| **Batas Cut-Off (+45 Menit Toleransi)** | **06.45 WIB** *(75 menit dari jam mulai)* | **+120 Menit (2 Jam)** dari jam mulai *(misal 05.30 -> 07.30 WIB)* |
| **Konsekuensi Lewat Batas** | **OTOMATIS ALPA** (Presensi mandiri dikunci) | **OTOMATIS ALPA** (Presensi mandiri dikunci) |

---

## 👤 3. PANDUAN PENGGUNAAN WEB PORTAL (NEXT.JS)

Akses web melalui browser di: **`https://sidinar-regina.vercel.app`**

### A. Pendaftaran & Masuk Akun
1. **Pendaftaran Anggota Baru:**
   - Buka menu **Daftar Akun Baru**.
   - Masukkan Data Diri: Nama Lengkap, Nama Panggilan, Email, Nomor WhatsApp aktif (format `08xx`), Jenjang (SD, SMP, SMA, Kuliah/Kerja), serta Asal Wilayah & Lingkungan (Wilayah 1 s/d 7).
   - Tentukan kata sandi (*password*) minimal 6 karakter.
   - Klik **Daftar Sekarang**.
   > [!IMPORTANT]
   > Akun baru langsung aktif secara otomatis (**tanpa perlu menunggu persetujuan pengurus**). Setelah mendaftar, Anda dapat langsung login.
2. **Masuk Akun (Login):**
   - Masukkan alamat Email dan Kata Sandi.
   - Sistem secara otomatis mengarahkan ke dasbor yang sesuai: **Dasbor Anggota** atau **Dasbor Pengurus**.

---

### B. Dasbor Anggota (Misdinar)
1. **Melihat Status Tugas Mendatang:**
   - Di bagian atas beranda terdapat kartu **Tugas Altar Anda Mendatang**.
   - Kartu ini menampilkan judul misa, tanggal, jam, warna liturgi, dan status kehadiran (`TERDAFTAR`, `HADIR`, `TERLAMBAT`, atau `ALPA`).
2. **Pendaftaran Jadwal Tugas Misa:**
   - Gulir ke bagian **Pilih Jadwal Misa Tersedia**.
   - Gunakan filter: **Semua**, **Misa Harian**, atau **Misa Mingguan**.
   - Perhatikan indikator kuota (misal: `5 / 8 Terisi`). Jika kuota masih ada, klik tombol **Daftar Misa**.
   - Centang persetujuan komitmen hadir tepat waktu dan berseragam rapi, lalu klik **Konfirmasi Pendaftaran**.
3. **Ubah Jadwal atau Batalkan Tugas:**
   - Pada kartu jadwal yang sudah Anda daftarkan, klik tombol **Ubah / Batal**.
   - **Pindah Jadwal:** Pilih jadwal alternatif lain pada kategori yang sama yang masih memiliki kuota, lalu klik **Simpan Perubahan**.
   - **Batalkan Tugas:** Klik opsi **Batalkan Penugasan Ini** jika berhalangan hadir.
4. **Presensi Sakristi (Mandiri):**
   - Saat tiba di sakristi gereja pada waktu jendela presensi dibuka, klik tombol **Presensi Sakristi**.
   - Layar akan menampilkan **QR Code Tugas Resmi** Anda. Tunjukkan QR Code ini kepada pengurus sakristi untuk dipindai, atau klik tombol verifikasi di layar.
5. **Melihat Riwayat & Rekap Kehadiran:**
   - Buka menu samping **Riwayat Tugas**.
   - Anda dapat melihat seluruh sejarah tugas altar masa lalu beserta persentase kedisiplinan kehadiran Anda.

---

### C. Dasbor Pengurus Sakristi
Akun dengan hak akses pengurus memiliki menu kendali lengkap:
1. **Ringkasan Sakristi (`/pengurus`):**
   - Menampilkan total anggota aktif, total jadwal pekan berjalan, persentase kehadiran, dan grafik keaktifan tiap wilayah.
2. **Manajemen Jadwal Misa (`/pengurus/jadwal`):**
   - **Pilih Jadwal:** Klik salah satu kartu misa di sisi kiri untuk melihat daftar nama petugas yang terdaftar di sisi kanan.
   - **Tambah Jadwal Baru:** Klik tombol **+ Tambah Jadwal Baru**, isi nama perayaan, kategori (Harian/Mingguan), warna liturgi, tanggal, jam, dan kapasitas kuota.
   - **Penugasan Manual:** Klik tombol **Tambah Petugas** untuk menugaskan anggota yang belum mendaftar secara langsung ke jadwal tersebut.
   - **Ingatkan Semua Petugas:** Kirim notifikasi pengingat secara serentak ke HP dan akun seluruh petugas yang terdaftar pada misa tersebut.
   - **Pengingat WhatsApp:** Klik ikon **Kirim Pengingat WA** di samping nama petugas untuk membuka chat WhatsApp resmi yang otomatis terisi pesan pengingat jadwal tugas.
   - **Cetak Lembar Tugas:** Klik tombol **Cetak Lembar Tugas** untuk mencetak daftar hadir fisik sakristi dalam format rapi siap pakai.
3. **Pusat Presensi Sakristi (`/pengurus/presensi`):**
   - Memantau rekap absensi seluruh misa yang sedang berlangsung atau sudah lampau.
   - Pengurus dapat mengubah status kehadiran secara manual jika diperlukan (misalnya mengubah status menjadi *Izin* jika anggota konfirmasi sakit).
4. **Warta & Pengumuman Sakristi (`/pengurus/pengumuman`):**
   - Tambahkan pengumuman atau instruksi tata laksana tugas sakristi.
   - Gunakan fitur **Sematkan (Pin)** agar pengumuman penting tampil di posisi paling atas pada beranda seluruh anggota.

---

## 📱 4. PANDUAN PENGGUNAAN APLIKASI ANDROID (APK)

Aplikasi Android **SiDinar Regina** dirancang agar misdinar dapat memantau jadwal dan melakukan absensi dengan cepat langsung dari saku mereka.

### A. Cara Mengunduh & Memasang Aplikasi
1. Buka Web SiDinar Regina di browser HP Anda.
2. Di beranda anggota, klik tombol **Unduh Aplikasi Android (APK)**.
3. Setelah file `app-release.apk` selesai diunduh, buka file tersebut.
4. Jika muncul peringatan keamanan instalasi dari sumber tidak dikenal (*Install Unknown Apps*), berikan izin (*Allow from this source*).
5. Klik **Install**, lalu buka aplikasi **SiDinar Regina**.

> [!TIP]
> **Pembaruan Otomatis (In-App OTA Update):**
> Anda tidak perlu meminta file APK baru di grup WhatsApp setiap kali ada pembaruan sistem! Aplikasi SiDinar Regina dilengkapi fitur pendeteksi pembaruan otomatis. Saat versi baru dirilis, aplikasi akan menampilkan jendela pop-up konfirmasi pembaruan dan mengunduhnya secara otomatis hanya dengan 1 sentuhan.

---

### B. Penggunaan Aplikasi oleh Anggota
1. **Masuk Akun:**
   - Gunakan Email dan Kata Sandi yang sama dengan akun Web Anda.
2. **Navigasi Utama (Bawah Layar):**
   - **Tab Beranda:** Menampilkan kartu tugas terdekat Anda lengkap dengan hitungan mundur waktu misa, batas kehadiran tepat waktu, dan pengumuman sakristi terbaru.
   - **Tab Jadwal:** Melihat kalender jadwal misa yang akan datang dan tombol mendaftar kuota tugas.
   - **Tab Presensi:** Menampilkan QR Code presensi digital Anda untuk di-scan oleh pengurus di sakristi gereja.
   - **Tab Riwayat:** Memeriksa catatan kehadiran (Hadir Tepat Waktu, Terlambat, Izin, atau Alpa).
   - **Tab Profil:** Melihat rincian profil gereja Anda, nomor WhatsApp, asal lingkungan, tombol **Cek Pembaruan Aplikasi**, dan tombol keluar akun (*logout*).

---

### C. Penggunaan Aplikasi oleh Pengurus (Scanner HP)
Jika akun Anda berstatus **Pengurus**, aplikasi Android menyediakan fitur sakristi tambahan:
1. **Beralih ke Mode Pengurus:**
   - Di tab profil atau tombol pintasan atas, masuk ke tampilan sakristi pengurus.
2. **Scanner Kamera QR Presensi:**
   - Buka menu **Pindai Presensi (Scanner)**.
   - Izinkan akses kamera HP.
   - Arahkan kamera ke layar HP anggota yang menampilkan QR Code tugas mereka.
   - Sistem akan langsung bergetar/berbunyi konfirmasi hijau dan mencatat presensi anggota tersebut secara seketika (*real-time*).
3. **Kirim WhatsApp Cepat:**
   - Pengurus dapat melihat daftar anggota yang belum hadir 30 menit sebelum misa dan menekan tombol WhatsApp untuk langsung menghubungi anggota tersebut.

---

## ❓ 5. TANYA JAWAB & PANDUAN KENDALA (FAQ)

**Q1: Mengapa tombol presensi mandiri saya terkunci dan statusnya berubah menjadi ALPA?**  
*Jawab:* Anda telah melewati batas waktu toleransi presensi (+45 menit setelah perkiraan misa selesai, yaitu 75 menit dari jam mulai untuk misa harian, atau 120 menit untuk misa mingguan). Jika Anda sebenarnya hadir namun lupa melakukan check-in, segera hubungi Pengurus Sakristi agar status Anda disesuaikan secara manual di Dasbor Pengurus.

**Q2: Mengapa saya tidak bisa mendaftar misa lagi di pekan ini?**  
*Jawab:* Setiap anggota memiliki batas jatah maksimal 1 kali Misa Harian dan 1 kali Misa Mingguan per pekan liturgi (Senin - Minggu). Kuota Anda akan ter-reset otomatis setiap hari Senin pukul 00.00 WIB.

**Q3: Saya berhalangan hadir pada jadwal misa yang sudah saya ambil, apa yang harus saya lakukan?**  
*Jawab:* Buka beranda Anda, klik tombol **Ubah / Batal** pada jadwal tersebut:
- Jika ingin mengganti hari, pilih opsi **Pindah Jadwal**.
- Jika ingin membatalkan, klik **Batalkan Penugasan** sesegera mungkin agar kuota terbuka kembali untuk teman misdinar lainnya.

**Q4: Apakah pendaftaran akun baru masih perlu konfirmasi pengurus?**  
*Jawab:* Tidak perlu. Sistem pendaftaran saat ini langsung aktif secara instan sehingga misdinar baru dapat langsung login dan memilih jadwal pelayanan tanpa menunggu verifikasi manual.

---

### 🌐 Tautan Portal
- **Portal Web Resmi:** [sidinar-regina.vercel.app](https://sidinar-regina.vercel.app)

