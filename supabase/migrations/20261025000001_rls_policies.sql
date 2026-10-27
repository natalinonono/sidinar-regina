-- ==============================================================================
-- SIDINAR REGINA - SISTEM DIGITAL MISDINAR PAROKI SPMR PURBOWARDAYAN
-- File: 20261025000001_rls_policies.sql
-- Deskripsi: Kebijakan Keamanan Row Level Security (RLS) dan Helper Role (Idempotent)
-- ==============================================================================

-- 1. FUNGSI PEMBANTU CEK PENGURUS
CREATE OR REPLACE FUNCTION public.is_pengurus()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'pengurus' AND status = 'aktif'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. AKTIFKAN RLS PADA SELURUH TABEL
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mass_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3. RLS PROFILES
DROP POLICY IF EXISTS "Pengguna dapat membaca profil sendiri atau pengurus membaca semua" ON public.profiles;
CREATE POLICY "Pengguna dapat membaca profil sendiri atau pengurus membaca semua"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_pengurus());

DROP POLICY IF EXISTS "Pengguna dapat membuat profil saat registrasi" ON public.profiles;
CREATE POLICY "Pengguna dapat membuat profil saat registrasi"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Pengguna dapat mengubah data profilnya sendiri" ON public.profiles;
CREATE POLICY "Pengguna dapat mengubah data profilnya sendiri"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_pengurus())
WITH CHECK (
    -- Anggota biasa tidak boleh mengubah role atau statusnya sendiri
    CASE 
        WHEN public.is_pengurus() THEN true
        ELSE (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND status = (SELECT status FROM public.profiles WHERE id = auth.uid()))
    END
);

-- 4. RLS MASS SCHEDULES
DROP POLICY IF EXISTS "Semua pengguna dapat melihat jadwal misa" ON public.mass_schedules;
CREATE POLICY "Semua pengguna dapat melihat jadwal misa"
ON public.mass_schedules FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Pengurus dapat mengelola jadwal misa" ON public.mass_schedules;
CREATE POLICY "Pengurus dapat mengelola jadwal misa"
ON public.mass_schedules FOR ALL
TO authenticated
USING (public.is_pengurus())
WITH CHECK (public.is_pengurus());

-- 5. RLS BOOKINGS
DROP POLICY IF EXISTS "Semua pengguna dapat melihat data penugasan misa" ON public.bookings;
CREATE POLICY "Semua pengguna dapat melihat data penugasan misa"
ON public.bookings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anggota aktif dapat mendaftar jadwal misa" ON public.bookings;
CREATE POLICY "Anggota aktif dapat mendaftar jadwal misa"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_pengurus());

DROP POLICY IF EXISTS "Anggota dapat mengupdate booking sendiri atau pengurus" ON public.bookings;
CREATE POLICY "Anggota dapat mengupdate booking sendiri atau pengurus"
ON public.bookings FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_pengurus())
WITH CHECK (user_id = auth.uid() OR public.is_pengurus());

DROP POLICY IF EXISTS "Anggota dapat membatalkan booking sendiri atau pengurus" ON public.bookings;
CREATE POLICY "Anggota dapat membatalkan booking sendiri atau pengurus"
ON public.bookings FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_pengurus());

-- 6. RLS ANNOUNCEMENTS
DROP POLICY IF EXISTS "Semua pengguna dapat membaca pengumuman" ON public.announcements;
CREATE POLICY "Semua pengguna dapat membaca pengumuman"
ON public.announcements FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Hanya pengurus yang dapat membuat atau mengubah pengumuman" ON public.announcements;
CREATE POLICY "Hanya pengurus yang dapat membuat atau mengubah pengumuman"
ON public.announcements FOR ALL
TO authenticated
USING (public.is_pengurus())
WITH CHECK (public.is_pengurus());
