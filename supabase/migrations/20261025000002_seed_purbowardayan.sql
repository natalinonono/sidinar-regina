-- ==============================================================================
-- SIDINAR REGINA - SISTEM DIGITAL MISDINAR PAROKI SPMR PURBOWARDAYAN
-- File: 20261025000002_seed_purbowardayan.sql
-- Deskripsi: Data Awal (Seed Data) Jadwal Misa dan Pengumuman
-- ==============================================================================

-- 1. SEED JADWAL MISA MINGGU INI (MINGGU KE-43 & 44 TAHUN 2026)
-- Catatan: Misa Harian (Kuota 8, jam 05:30), Misa Mingguan (Kuota 12, jam 17:00, 06:00, 08:00, 16:00, 18:00)
INSERT INTO public.mass_schedules (
    judul_misa, kategori, tanggal_misa, jam_mulai, kuota_maksimal, minggu_ke, tahun, tahun_liturgi, warna_liturgi, nama_selebran
)
SELECT 
    judul_misa, kategori, tgl, jam_mulai, kuota, EXTRACT(WEEK FROM tgl)::INT, EXTRACT(ISOYEAR FROM tgl)::INT, 'Tahun B / II', warna, selebran
FROM (VALUES
    ('Misa Pagi Harian Senin', 'harian', '2026-10-26'::DATE, '05:30:00'::TIME, 8, 'Hijau', 'Romo Robertus Budi Prastowo, Pr'),
    ('Misa Pagi Harian Selasa', 'harian', '2026-10-27'::DATE, '05:30:00'::TIME, 8, 'Hijau', 'Romo Yohanes Rasul Edy Purwanto, Pr'),
    ('Misa Pagi Harian Rabu', 'harian', '2026-10-28'::DATE, '05:30:00'::TIME, 8, 'Hijau', 'Romo Robertus Budi Prastowo, Pr'),
    ('Misa Pagi Harian Kamis', 'harian', '2026-10-29'::DATE, '05:30:00'::TIME, 8, 'Putih', 'Romo Yohanes Rasul Edy Purwanto, Pr'),
    ('Misa Pagi Harian Jumat', 'harian', '2026-10-30'::DATE, '05:30:00'::TIME, 8, 'Hijau', 'Romo Robertus Budi Prastowo, Pr'),
    ('Misa Pagi Harian Sabtu', 'harian', '2026-10-31'::DATE, '05:30:00'::TIME, 8, 'Putih', 'Romo Yohanes Rasul Edy Purwanto, Pr'),
    ('Misa Mingguan Sabtu Sore', 'mingguan', '2026-10-31'::DATE, '17:00:00'::TIME, 12, 'Hijau', '-'),
    ('Misa Mingguan Pagi', 'mingguan', '2026-11-01'::DATE, '06:00:00'::TIME, 12, 'Hijau', '-'),
    ('Misa Mingguan Pagi', 'mingguan', '2026-11-01'::DATE, '08:00:00'::TIME, 12, 'Hijau', '-'),
    ('Misa Mingguan Sore', 'mingguan', '2026-11-01'::DATE, '16:00:00'::TIME, 12, 'Hijau', '-'),
    ('Misa Mingguan Sore', 'mingguan', '2026-11-01'::DATE, '18:00:00'::TIME, 12, 'Hijau', '-')
) AS s(judul_misa, kategori, tgl, jam_mulai, kuota, warna, selebran);

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
