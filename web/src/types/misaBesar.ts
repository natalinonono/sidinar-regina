import { Profile, WarnaLiturgi } from '@/types/database'

export type KodePerayaanMisaBesar =
  | 'malam_natal'
  | 'natal'
  | 'minggu_palma'
  | 'kamis_putih'
  | 'jumat_agung'
  | 'malam_paskah'
  | 'paskah'

export type JenisSesiMisaBesar = 'Misa' | 'Ibadat'
export type LatihanAttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'alpa'

export interface MisaBesarEvent {
  id: string
  kode_perayaan: KodePerayaanMisaBesar | string
  nama_perayaan: string
  tahun: number
  jumlah_sesi: number
  jenis_sesi: JenisSesiMisaBesar
  warna_liturgi: WarnaLiturgi | string
  keterangan: string
  urutan_tampil: number
  is_active: boolean
  created_by: string | null
  created_at: string
  sessions?: MisaBesarSession[]
  latihan?: MisaBesarLatihan[]
  petugas?: MisaBesarPetugas[]
}

export interface MisaBesarSession {
  id: string
  event_id: string
  urutan: number
  nama_sesi: string
  tanggal_misa: string | null
  jam_mulai: string
  kuota_petugas: number
  created_at: string
}

export interface MisaBesarPetugas {
  id: string
  event_id: string
  session_id: string
  user_id: string
  posisi_tugas: string
  status_petugas?: 'aktif' | 'dicoret'
  alasan_coret?: string
  dicoret_at?: string | null
  catatan: string
  created_at: string
  profile?: Partial<Profile> | null
  session?: MisaBesarSession | null
}

export interface MisaBesarLatihan {
  id: string
  event_id: string
  session_id: string | null
  judul_latihan: string
  tanggal_latihan: string
  jam_mulai: string
  lokasi: string
  catatan: string
  created_by: string | null
  created_at: string
}

export interface MisaBesarAbsensi {
  id: string
  latihan_id: string
  petugas_id: string
  user_id: string
  status_kehadiran: LatihanAttendanceStatus
  waktu_absen: string
  catatan: string
  dicatat_oleh: string | null
  created_at: string
  updated_at: string
}

export interface MisaBesarApiPayload {
  success: boolean
  needs_migration?: boolean
  migration_sql?: string
  is_pengurus: boolean
  tahun: number
  events: MisaBesarEvent[]
  absensi: MisaBesarAbsensi[]
  active_members?: Array<{
    id: string
    nama_lengkap: string
    nama_panggilan: string
    jenjang: string
    asal_wilayah_teks: string
    no_telepon?: string
  }>
}

