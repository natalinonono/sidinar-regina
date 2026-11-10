-- ==============================================================================
-- SIDINAR REGINA - UPGRADE ATURAN 3X ALPA OTOMATIS DICORET & PRIVASI PENGURUS
-- File: 20261110000001_misa_besar_dicoret.sql
-- ==============================================================================

ALTER TABLE public.misa_besar_petugas
    ADD COLUMN IF NOT EXISTS status_petugas TEXT NOT NULL DEFAULT 'aktif' CHECK (status_petugas IN ('aktif', 'dicoret')),
    ADD COLUMN IF NOT EXISTS alasan_coret TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS dicoret_at TIMESTAMPTZ;

-- Batasi akses tabel Misa Besar hanya untuk Pengurus aktif (tidak muncul di tempat Anggota)
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat daftar perayaan misa besar" ON public.misa_besar_events;
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat sesi misa besar" ON public.misa_besar_sessions;
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat jadwal latihan misa besar" ON public.misa_besar_latihan;
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat daftar petugas misa besar" ON public.misa_besar_petugas;
DROP POLICY IF EXISTS "Anggota dapat melihat absensi latihannya sendiri atau pengurus melihat semua" ON public.misa_besar_absensi;
