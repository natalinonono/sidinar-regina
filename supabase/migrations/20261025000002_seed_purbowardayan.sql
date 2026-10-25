-- ==============================================================================
-- SIDINAR REGINA - SISTEM DIGITAL MISDINAR PAROKI SPMR PURBOWARDAYAN
-- File: 20261025000002_seed_purbowardayan.sql
-- Deskripsi: Data Awal (Seed Data) Jadwal Misa dan Pengumuman
-- ==============================================================================

-- 1. SEED JADWAL MISA MINGGU INI (MINGGU KE-43 & 44 TAHUN 2026)
-- Catatan: Misa Harian (Kuota 8, jam 05:30), Misa Mingguan (Kuota 12, jam 17:00, 06:00, 08:00, 16:00, 18:00)
INSERT INTO public.mass_schedules (
    judul_misa, kategori, tanggal_misa, jam_mulai, kuota_maksimal, minggu_ke, tahun, tahun_liturgi, warna_liturgi, nama_selebran
) VALUES
-- Misa Harian
('Misa Pagi Harian Senin', 'harian', CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '05:30:00', 8, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', 'Romo Robertus Budi Prastowo, Pr'),
('Misa Pagi Harian Selasa', 'harian', CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '05:30:00', 8, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', 'Romo Yohanes Rasul Edy Purwanto, Pr'),
('Misa Pagi Harian Rabu', 'harian', CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '05:30:00', 8, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', 'Romo Robertus Budi Prastowo, Pr'),
('Misa Pagi Harian Kamis', 'harian', CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '05:30:00', 8, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Putih', 'Romo Yohanes Rasul Edy Purwanto, Pr'),
('Misa Pagi Harian Jumat', 'harian', CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '05:30:00', 8, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', 'Romo Robertus Budi Prastowo, Pr'),
('Misa Pagi Harian Sabtu', 'harian', CURRENT_DATE + (6 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '05:30:00', 8, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Putih', 'Romo Yohanes Rasul Edy Purwanto, Pr'),

-- Misa Mingguan (Sabtu Sore & Minggu)
('Misa Mingguan Sabtu Sore', 'mingguan', CURRENT_DATE + (6 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '17:00:00', 12, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', '-'),
('Misa Mingguan Pagi', 'mingguan', CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '06:00:00', 12, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', '-'),
('Misa Mingguan Pagi', 'mingguan', CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '08:00:00', 12, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', '-'),
('Misa Mingguan Sore', 'mingguan', CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '16:00:00', 12, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', '-'),
('Misa Mingguan Sore', 'mingguan', CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::INT)::INT, '18:00:00', 12, EXTRACT(WEEK FROM CURRENT_DATE)::INT, 2026, 'Tahun B / II', 'Hijau', '-');

-- 2. SEED PENGUMUMAN PAROKI
INSERT INTO public.announcements (judul, isi, is_pinned) VALUES
(
    'Tata Tertib Sakristi & Ketentuan Presensi Tepat Waktu',
    'Berkah Dalem seluruh Putra-Putri Altar SPMR Purbowardayan. Diingatkan kembali bahwa untuk Misa Harian presensi dibuka pukul 05.00 WIB (H-30) dan batas tepat waktu adalah pukul 05.10 WIB (H-20). Untuk Misa Mingguan, presensi wajib dilakukan paling lambat H-30 menit sebelum perayaan Ekaristi dimulai dalam kondisi sudah mengenakan jubah dan singel rapi.',
    true
),
(
    'Gladi Bersih & Persiapan Petugas Liturgi Hari Raya',
    'Kepada seluruh misdinar angkatan 2022-2025 yang bertugas pada pekan ini, dimohon hadir 45 menit sebelum misa untuk pembagian posisi (Crucifer, Ceroferarius, Acolyte, dan Thurifer) serta doa bersama romo selebran di ruang sakristi.',
    false
);
