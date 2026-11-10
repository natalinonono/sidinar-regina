import { KodePerayaanMisaBesar, JenisSesiMisaBesar } from '@/types/misaBesar'

export interface MisaBesarPresetSession {
  urutan: number
  nama_sesi: string
  jam_mulai: string
  kuota_petugas: number
}

export interface MisaBesarPreset {
  kode_perayaan: KodePerayaanMisaBesar
  nama_perayaan: string
  jumlah_sesi: number
  opsi_jumlah_sesi?: number[] // misal Paskah bisa 2 atau 3 Misa
  jenis_sesi: JenisSesiMisaBesar
  warna_liturgi: string
  urutan_tampil: number
  keterangan: string
  default_sessions: (jumlah?: number) => MisaBesarPresetSession[]
}

export const MISA_BESAR_PRESETS: MisaBesarPreset[] = [
  {
    kode_perayaan: 'malam_natal',
    nama_perayaan: 'Malam Natal',
    jumlah_sesi: 2,
    jenis_sesi: 'Misa',
    warna_liturgi: 'Putih',
    urutan_tampil: 1,
    keterangan: 'Perayaan Ekaristi Malam Natal (2 Misa)',
    default_sessions: () => [
      { urutan: 1, nama_sesi: 'Misa 1 (Sore)', jam_mulai: '17:00', kuota_petugas: 16 },
      { urutan: 2, nama_sesi: 'Misa 2 (Malam)', jam_mulai: '20:00', kuota_petugas: 16 },
    ],
  },
  {
    kode_perayaan: 'natal',
    nama_perayaan: 'Natal',
    jumlah_sesi: 2,
    jenis_sesi: 'Misa',
    warna_liturgi: 'Putih',
    urutan_tampil: 2,
    keterangan: 'Hari Raya Natal (2 Misa)',
    default_sessions: () => [
      { urutan: 1, nama_sesi: 'Misa 1 (Pagi)', jam_mulai: '07:00', kuota_petugas: 16 },
      { urutan: 2, nama_sesi: 'Misa 2 (Sore)', jam_mulai: '17:00', kuota_petugas: 16 },
    ],
  },
  {
    kode_perayaan: 'minggu_palma',
    nama_perayaan: 'Minggu Palma',
    jumlah_sesi: 3,
    jenis_sesi: 'Misa',
    warna_liturgi: 'Merah',
    urutan_tampil: 3,
    keterangan: 'Minggu Palma Mengenangkan Sengsara Tuhan (3 Misa)',
    default_sessions: () => [
      { urutan: 1, nama_sesi: 'Misa 1 (Pagi)', jam_mulai: '06:00', kuota_petugas: 16 },
      { urutan: 2, nama_sesi: 'Misa 2 (Siang)', jam_mulai: '08:30', kuota_petugas: 16 },
      { urutan: 3, nama_sesi: 'Misa 3 (Sore)', jam_mulai: '17:00', kuota_petugas: 16 },
    ],
  },
  {
    kode_perayaan: 'kamis_putih',
    nama_perayaan: 'Kamis Putih',
    jumlah_sesi: 2,
    jenis_sesi: 'Misa',
    warna_liturgi: 'Putih',
    urutan_tampil: 4,
    keterangan: 'Perayaan Ekaristi Mengenangkan Perjamuan Malam Terakhir (2 Misa)',
    default_sessions: () => [
      { urutan: 1, nama_sesi: 'Misa 1 (Sore)', jam_mulai: '17:00', kuota_petugas: 18 },
      { urutan: 2, nama_sesi: 'Misa 2 (Malam)', jam_mulai: '20:00', kuota_petugas: 18 },
    ],
  },
  {
    kode_perayaan: 'jumat_agung',
    nama_perayaan: 'Jumat Agung',
    jumlah_sesi: 3,
    jenis_sesi: 'Ibadat',
    warna_liturgi: 'Merah',
    urutan_tampil: 5,
    keterangan: 'Ibadat Mengenangkan Sengsara dan Wafat Tuhan (3 Ibadat)',
    default_sessions: () => [
      { urutan: 1, nama_sesi: 'Ibadat 1 (Siang)', jam_mulai: '12:00', kuota_petugas: 16 },
      { urutan: 2, nama_sesi: 'Ibadat 2 (Sore)', jam_mulai: '15:00', kuota_petugas: 16 },
      { urutan: 3, nama_sesi: 'Ibadat 3 (Malam)', jam_mulai: '18:00', kuota_petugas: 16 },
    ],
  },
  {
    kode_perayaan: 'malam_paskah',
    nama_perayaan: 'Malam Paskah',
    jumlah_sesi: 2,
    jenis_sesi: 'Misa',
    warna_liturgi: 'Putih',
    urutan_tampil: 6,
    keterangan: 'Vigili Paskah - Malam Paskah (2 Misa)',
    default_sessions: () => [
      { urutan: 1, nama_sesi: 'Misa 1 (Sore)', jam_mulai: '17:30', kuota_petugas: 20 },
      { urutan: 2, nama_sesi: 'Misa 2 (Malam)', jam_mulai: '21:00', kuota_petugas: 20 },
    ],
  },
  {
    kode_perayaan: 'paskah',
    nama_perayaan: 'Paskah',
    jumlah_sesi: 3,
    opsi_jumlah_sesi: [2, 3],
    jenis_sesi: 'Misa',
    warna_liturgi: 'Putih',
    urutan_tampil: 7,
    keterangan: 'Hari Raya Kebangkitan Tuhan - Paskah (2 atau 3 Misa)',
    default_sessions: (jumlah = 3) => {
      if (jumlah === 2) {
        return [
          { urutan: 1, nama_sesi: 'Misa 1 (Pagi)', jam_mulai: '07:00', kuota_petugas: 16 },
          { urutan: 2, nama_sesi: 'Misa 2 (Sore)', jam_mulai: '17:00', kuota_petugas: 16 },
        ]
      }
      return [
        { urutan: 1, nama_sesi: 'Misa 1 (Pagi)', jam_mulai: '06:00', kuota_petugas: 16 },
        { urutan: 2, nama_sesi: 'Misa 2 (Siang)', jam_mulai: '08:30', kuota_petugas: 16 },
        { urutan: 3, nama_sesi: 'Misa 3 (Sore)', jam_mulai: '17:00', kuota_petugas: 16 },
      ]
    },
  },
]

export function getPresetByKode(kode: string): MisaBesarPreset | undefined {
  return MISA_BESAR_PRESETS.find((p) => p.kode_perayaan === kode)
}

export function isTableMissingError(error: any): boolean {
  if (!error) return false
  const msg = String(error.message || error.details || '').toLowerCase()
  const code = String(error.code || '').toUpperCase()
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  )
}

export function buildLatihanSessionsList(
  jenis: JenisSesiMisaBesar,
  count: number
): MisaBesarPresetSession[] {
  const safeCount = Math.max(1, Math.min(5, count))
  const defaultTimes = ['07:00', '15:00', '18:00', '20:00', '21:00']
  const list: MisaBesarPresetSession[] = []
  for (let i = 1; i <= safeCount; i++) {
    list.push({
      urutan: i,
      nama_sesi: `${jenis} ${i}`,
      jam_mulai: defaultTimes[i - 1] || '17:00',
      kuota_petugas: 16,
    })
  }
  return list
}

export const MISA_BESAR_MIGRATION_SQL = `-- Jalankan SQL ini di Supabase Dashboard -> SQL Editor
CREATE TABLE IF NOT EXISTS public.misa_besar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_perayaan TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.misa_besar_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.misa_besar_events(id) ON DELETE CASCADE NOT NULL,
    urutan INT NOT NULL CHECK (urutan >= 1),
    nama_sesi TEXT NOT NULL,
    tanggal_misa DATE,
    jam_mulai TEXT NOT NULL DEFAULT '17:00',
    kuota_petugas INT NOT NULL DEFAULT 16,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, urutan)
);

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

CREATE TABLE IF NOT EXISTS public.misa_besar_latihan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.misa_besar_events(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.misa_besar_sessions(id) ON DELETE SET NULL,
    judul_latihan TEXT NOT NULL,
    tanggal_latihan DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_mulai TEXT NOT NULL DEFAULT '16:00',
    lokasi TEXT NOT NULL DEFAULT 'Gereja & Sakristi SPMR Purbowardayan',
    catatan TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE public.misa_besar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_petugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_latihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misa_besar_absensi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat daftar perayaan misa besar" ON public.misa_besar_events;
CREATE POLICY "Pengguna terautentikasi dapat melihat daftar perayaan misa besar" ON public.misa_besar_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat sesi misa besar" ON public.misa_besar_sessions;
CREATE POLICY "Pengguna terautentikasi dapat melihat sesi misa besar" ON public.misa_besar_sessions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat jadwal latihan misa besar" ON public.misa_besar_latihan;
CREATE POLICY "Pengguna terautentikasi dapat melihat jadwal latihan misa besar" ON public.misa_besar_latihan FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Pengguna terautentikasi dapat melihat daftar petugas misa besar" ON public.misa_besar_petugas;
CREATE POLICY "Pengguna terautentikasi dapat melihat daftar petugas misa besar" ON public.misa_besar_petugas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anggota dapat melihat absensi latihannya sendiri atau pengurus melihat semua" ON public.misa_besar_absensi;
CREATE POLICY "Anggota dapat melihat absensi latihannya sendiri atau pengurus melihat semua" ON public.misa_besar_absensi FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_pengurus());

DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola perayaan misa besar" ON public.misa_besar_events;
CREATE POLICY "Hanya pengurus yang dapat mengelola perayaan misa besar" ON public.misa_besar_events FOR ALL TO authenticated USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());
DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola sesi misa besar" ON public.misa_besar_sessions;
CREATE POLICY "Hanya pengurus yang dapat mengelola sesi misa besar" ON public.misa_besar_sessions FOR ALL TO authenticated USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());
DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola petugas misa besar" ON public.misa_besar_petugas;
CREATE POLICY "Hanya pengurus yang dapat mengelola petugas misa besar" ON public.misa_besar_petugas FOR ALL TO authenticated USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());
DROP POLICY IF EXISTS "Hanya pengurus yang dapat mengelola jadwal latihan misa besar" ON public.misa_besar_latihan;
CREATE POLICY "Hanya pengurus yang dapat mengelola jadwal latihan misa besar" ON public.misa_besar_latihan FOR ALL TO authenticated USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());
DROP POLICY IF EXISTS "Hanya pengurus yang dapat mencatat dan mengubah absensi latihan" ON public.misa_besar_absensi;
CREATE POLICY "Hanya pengurus yang dapat mencatat dan mengubah absensi latihan" ON public.misa_besar_absensi FOR ALL TO authenticated USING (public.is_pengurus()) WITH CHECK (public.is_pengurus());

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_events; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_sessions; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_petugas; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_latihan; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.misa_besar_absensi; EXCEPTION WHEN duplicate_object THEN null; END $$;`
