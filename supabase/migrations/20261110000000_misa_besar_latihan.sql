-- ==============================================================================
-- SIDINAR REGINA - FITUR ABSENSI LATIHAN PETUGAS MISA BESAR
-- File: 20261110000000_misa_besar_latihan.sql
-- Perayaan: Malam Natal (2 Misa), Natal (2 Misa), Minggu Palma (3 Misa),
--           Kamis Putih (2 Misa), Jumat Agung (3 Ibadat), Malam Paskah (2 Misa),
--           Paskah (2/3 Misa)
-- ==============================================================================

-- 1. TABEL MASTER PERAYAAN MISA BESAR
CREATE TABLE IF NOT EXISTS public.misa_besar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_perayaan TEXT NOT NULL, -- 'malam_natal' | 'natal' | 'minggu_palma' | 'kamis_putih' | 'jumat_agung' | 'malam_paskah' | 'paskah'
    nama_perayaan TEXT NOT NULL,
    tahun INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
    jumlah_sesi INT NOT NULL DEFAULT 2 CHECK (jumlah_sesi BETWEEN 1 AND 5),
    jenis_sesi TEXT NOT NULL DEFAULT 'Misa' CHECK (jenis_sesi IN ('Misa', 'Ibadat')),
    warna_liturgi TEXT NOT NULL DEFAULT 'Putih',
    keterangan TEXT DEFAULT '',
    urutan_tampil INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kode_perayaan, tahun)
);

-- 2. TABEL SESI MISA / IBADAT DALAM PERAYAAN
CREATE TABLE IF NOT EXISTS public.misa_besar_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.misa_besar_events(id) ON DELETE CASCADE NOT NULL,
    urutan INT NOT NULL CHECK (urutan >= 1),
    nama_sesi TEXT NOT NULL, -- Contoh: 'Misa 1 (Sore)', 'Ibadat 2 (Sore)'
    tanggal_misa DATE,
    jam_mulai TEXT NOT NULL DEFAULT '17:00',
    kuota_petugas INT NOT NULL DEFAULT 16,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, urutan)
);

-- 3. TABEL PENUGASAN PETUGAS MISA BESAR
CREATE TABLE IF NOT EXISTS public.misa_besar_petugas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.misa_besar_events(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.misa_besar_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    posisi_tugas TEXT NOT NULL DEFAULT 'Petugas Altar / Cadangan',
    catatan TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- 4. TABEL JADWAL SESI LATIHAN MISA BESAR
CREATE TABLE IF NOT EXISTS public.misa_besar_latihan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.misa_besar_events(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.misa_besar_sessions(id) ON DELETE SET NULL, -- NULL = Latihan Gabungan seluruh sesi perayaan
    judul_latihan TEXT NOT NULL,
    tanggal_latihan DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_mulai TEXT NOT NULL DEFAULT '16:00',
    lokasi TEXT NOT NULL DEFAULT 'Gereja & Sakristi SPMR Purbowardayan',
    catatan TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL ABSENSI KEHADIRAN LATIHAN PETUGAS MISA BESAR
CREATE TABLE IF NOT EXISTS public.misa_besar_absensi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    latihan_id UUID REFERENCES public.misa_besar_latihan(id) ON DELETE CASCADE NOT NULL,
    petugas_id UUID REFERENCES public.misa_besar_petugas(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status_kehadiran TEXT NOT NULL DEFAULT 'hadir' CHECK (status_kehadiran IN ('hadir', 'terlambat', 'izin', 'alpa')),
    waktu_absen TIMESTAMPTZ DEFAULT NOW(),
    catatan TEXT DEFAULT '',
    dicatat_oleh UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(latihan_id, petugas_id)
);

-- 6. INDEKS PERFORMA
CREATE INDEX IF NOT EXISTS idx_mb_sessions_event ON public.misa_besar_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_mb_petugas_event_session ON public.misa_besar_petugas(event_id, session_id);
CREATE INDEX IF NOT EXISTS idx_mb_petugas_user ON public.misa_besar_petugas(user_id);
CREATE INDEX IF NOT EXISTS idx_mb_latihan_event ON public.misa_besar_latihan(event_id);
CREATE INDEX IF NOT EXISTS idx_mb_absensi_latihan ON public.misa_besar_absensi(latihan_id);
CREATE INDEX IF NOT EXISTS idx_mb_absensi_user ON public.misa_besar_absensi(user_id);

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.misa_besar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_petugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_latihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_absensi ENABLE ROW LEVEL SECURITY;

-- Policy SELECT:
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat daftar perayaan misa besar" ON public.misa_besar_events;
CREATE POLICY "Pengguna terautentikasi dapat melihat daftar perayaan misa besar"
ON public.misa_besar_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat sesi misa besar" ON public.misa_besar_sessions;
CREATE POLICY "Pengguna terautentikasi dapat melihat sesi misa besar"
ON public.misa_besar_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat jadwal latihan misa besar" ON public.misa_besar_latihan;
CREATE POLICY "Pengguna terautentikasi dapat melihat jadwal latihan misa besar"
ON public.misa_besar_latihan FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat daftar petugas misa besar" ON public.misa_besar_petugas;
CREATE POLICY "Pengguna terautentikasi dapat melihat daftar petugas misa besar"
ON public.misa_besar_petugas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anggota dapat melihat absensi latihannya sendiri atau pengurus melihat semua" ON public.misa_besar_absensi;
CREATE POLICY "Anggota dapat melihat absensi latihannya sendiri atau pengurus melihat semua"
ON public.misa_besar_absensi FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_pengurus());

-- Policy INSERT / UPDATE / DELETE: HANYA PENGURUS AKTIF
DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola perayaan misa besar" ON public.misa_besar_events;
CREATE POLICY "Hanya pengurus yang dapat mengelola perayaan misa besar"
ON public.misa_besar_events FOR ALL TO authenticated
USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());

DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola sesi misa besar" ON public.misa_besar_sessions;
CREATE POLICY "Hanya pengurus yang dapat mengelola sesi misa besar"
ON public.misa_besar_sessions FOR ALL TO authenticated
USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());

DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola petugas misa besar" ON public.misa_besar_petugas;
CREATE POLICY "Hanya pengurus yang dapat mengelola petugas misa besar"
ON public.misa_besar_petugas FOR ALL TO authenticated
USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());

DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola jadwal latihan misa besar" ON public.misa_besar_latihan;
CREATE POLICY "Hanya pengurus yang dapat mengelola jadwal latihan misa besar"
ON public.misa_besar_latihan FOR ALL TO authenticated
USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());

DROP POLICY IF EXISTS "Hanya pengurus yang dapat mencatat dan mengubah absensi latihan" ON public.misa_besar_absensi;
CREATE POLICY "Hanya pengurus yang dapat mencatat dan mengubah absensi latihan"
ON public.misa_besar_absensi FOR ALL TO authenticated
USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());

-- 8. AKTIFKAN SUPABASE REALTIME (IDEMPOTENT)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_events;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_sessions;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_petugas;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_latihan;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_absensi;
EXCEPTION WHEN duplicate_object THEN null; END $$;

