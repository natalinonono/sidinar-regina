-- ==============================================================================
-- SIDINAR REGINA - PENINGKATAN KEAMANAN DATABASE & PROTEKSI ROW LEVEL SECURITY
-- File: 20261106000000_security_hardening.sql
-- Deskripsi: Mencegah manipulasi data (Inspect Element / DevTools) pada tabel bookings & profiles
-- ==============================================================================

-- 1. Pastikan fungsi cek pengurus strictly SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_pengurus()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'pengurus' AND status = 'aktif'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Hardening RLS UPDATE pada tabel BOOKINGS:
-- Anggota biasa TIDAK BOLEH mengubah status_kehadiran, waktu_checkin, atau wa_reminder_sent secara langsung via client Supabase!
DROP POLICY IF EXISTS "Anggota dapat mengupdate booking sendiri atau pengurus" ON public.bookings;

-- Pengurus dapat mengubah data booking apa pun (status kehadiran, presensi sakristi, dll.)
DROP POLICY IF EXISTS "Pengurus dapat mengupdate seluruh data booking" ON public.bookings;
CREATE POLICY "Pengurus dapat mengupdate seluruh data booking"
ON public.bookings FOR UPDATE
TO authenticated
USING (public.is_pengurus())
WITH CHECK (public.is_pengurus());

-- Anggota hanya dapat mengubah posisi_tugas pada booking miliknya sendiri, dan DILARANG mengubah status_kehadiran
DROP POLICY IF EXISTS "Anggota hanya dapat mengubah posisi tugas miliknya sendiri" ON public.bookings;
CREATE POLICY "Anggota hanya dapat mengubah posisi tugas miliknya sendiri"
ON public.bookings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
    user_id = auth.uid()
    AND status_kehadiran = (SELECT b.status_kehadiran FROM public.bookings b WHERE b.id = id)
);

-- 3. Hardening RLS UPDATE pada tabel PROFILES:
-- Anggota DILARANG menaikkan role menjadi pengurus atau mengubah status menjadi aktif secara mandiri
DROP POLICY IF EXISTS "Pengguna dapat mengubah data profilnya sendiri" ON public.profiles;
CREATE POLICY "Pengguna dapat mengubah data profilnya sendiri"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_pengurus())
WITH CHECK (
    CASE 
        WHEN public.is_pengurus() THEN true
        ELSE (
            id = auth.uid() 
            AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) 
            AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
        )
    END
);

