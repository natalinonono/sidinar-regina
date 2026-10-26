-- ==============================================================================
-- SIDINAR REGINA - SISTEM DIGITAL MISDINAR PAROKI SPMR PURBOWARDAYAN
-- File: 20261025000000_init_schema.sql
-- Deskripsi: Skema Database Utama, Enums, Tabel, Trigger Validasi, dan Realtime
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('anggota', 'pengurus');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('pending', 'aktif', 'nonaktif');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mass_category AS ENUM ('harian', 'mingguan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('terdaftar', 'hadir', 'terlambat', 'izin', 'alpa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE jenjang_pendidikan AS ENUM ('SD', 'SMP', 'SMA/K', 'Mahasiswa', 'Umum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE warna_liturgi AS ENUM ('Hijau', 'Putih', 'Merah', 'Ungu', 'Merah Muda');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL PROFILES (Terkoneksi ke Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    nama_panggilan TEXT NOT NULL,
    no_telepon TEXT NOT NULL,
    asal_wilayah_teks TEXT NOT NULL,
    jenjang jenjang_pendidikan NOT NULL,
    role user_role DEFAULT 'anggota' NOT NULL,
    status account_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL MASS SCHEDULES (Jadwal Misa dengan Detail Liturgi & Selebran)
CREATE TABLE IF NOT EXISTS public.mass_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    judul_misa TEXT NOT NULL,
    kategori mass_category NOT NULL,
    tanggal_misa DATE NOT NULL,
    jam_mulai TIME NOT NULL,
    kuota_maksimal INT NOT NULL,
    minggu_ke INT NOT NULL,
    tahun INT NOT NULL,
    tahun_liturgi TEXT NOT NULL,
    warna_liturgi warna_liturgi NOT NULL,
    nama_selebran TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL BOOKINGS & ATTENDANCE (Penugasan & Presensi)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES public.mass_schedules(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    kategori_misa mass_category NOT NULL,
    minggu_ke INT NOT NULL,
    tahun INT NOT NULL,
    posisi_tugas TEXT DEFAULT 'Petugas Altar / Umum',
    status_kehadiran attendance_status DEFAULT 'terdaftar' NOT NULL,
    waktu_checkin TIMESTAMPTZ,
    wa_reminder_sent BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(schedule_id, user_id),
    UNIQUE(user_id, kategori_misa, minggu_ke, tahun)
);

-- 6. TABEL ANNOUNCEMENTS (Pengumuman Paroki & Sakristi)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    judul TEXT NOT NULL,
    isi TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRIGGER ANTI-RACE CONDITION & VALIDASI KUOTA / LIMIT 1X SEMINGGU
CREATE OR REPLACE FUNCTION public.validate_booking_rules()
RETURNS TRIGGER AS $$
DECLARE
    v_status account_status;
    v_jumlah_terisi INT;
    v_kuota_maks INT;
    v_kategori mass_category;
    v_minggu INT;
    v_tahun INT;
    v_role user_role;
BEGIN
    -- Cek status akun anggota
    SELECT status, role INTO v_status, v_role FROM public.profiles WHERE id = NEW.user_id;
    IF v_role != 'pengurus' AND v_status != 'aktif' THEN
        RAISE EXCEPTION 'Akun Anda belum disetujui oleh Pengurus atau berstatus nonaktif.';
    END IF;

    -- Kunci baris jadwal secara atomik untuk mencegah Race Condition kuota
    SELECT kuota_maksimal, kategori, minggu_ke, tahun 
    INTO v_kuota_maks, v_kategori, v_minggu, v_tahun 
    FROM public.mass_schedules 
    WHERE id = NEW.schedule_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal misa tidak ditemukan.';
    END IF;

    -- Validasi kuota bila bukan pengurus
    IF v_role != 'pengurus' THEN
        SELECT COUNT(*) INTO v_jumlah_terisi FROM public.bookings WHERE schedule_id = NEW.schedule_id;
        IF v_jumlah_terisi >= v_kuota_maks THEN
            RAISE EXCEPTION 'Maaf, kuota jadwal misa ini sudah penuh (%/%)', v_jumlah_terisi, v_kuota_maks;
        END IF;
    END IF;

    -- Sinkronisasi metadata minggu dan kategori secara otomatis
    NEW.kategori_misa := v_kategori;
    NEW.minggu_ke := v_minggu;
    NEW.tahun := v_tahun;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_booking ON public.bookings;
CREATE TRIGGER trg_validate_booking
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_rules();

-- 8. AKTIFKAN REPLIKASI SUPABASE REALTIME (IDEMPOTENT)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mass_schedules;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
EXCEPTION WHEN duplicate_object THEN null; END $$;
