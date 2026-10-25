export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'anggota' | 'pengurus'
export type AccountStatus = 'pending' | 'aktif' | 'nonaktif'
export type MassCategory = 'harian' | 'mingguan'
export type AttendanceStatus = 'terdaftar' | 'hadir' | 'terlambat' | 'izin' | 'alpa'
export type JenjangPendidikan = 'SD' | 'SMP' | 'SMA/K' | 'Mahasiswa' | 'Umum'
export type WarnaLiturgi = 'Hijau' | 'Putih' | 'Merah' | 'Ungu' | 'Merah Muda'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          nama_lengkap: string
          nama_panggilan: string
          no_telepon: string
          asal_wilayah_teks: string
          jenjang: JenjangPendidikan
          role: UserRole
          status: AccountStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nama_lengkap: string
          nama_panggilan: string
          no_telepon: string
          asal_wilayah_teks: string
          jenjang: JenjangPendidikan
          role?: UserRole
          status?: AccountStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nama_lengkap?: string
          nama_panggilan?: string
          no_telepon?: string
          asal_wilayah_teks?: string
          jenjang?: JenjangPendidikan
          role?: UserRole
          status?: AccountStatus
          created_at?: string
          updated_at?: string
        }
      }
      mass_schedules: {
        Row: {
          id: string
          judul_misa: string
          kategori: MassCategory
          tanggal_misa: string
          jam_mulai: string
          kuota_maksimal: number
          minggu_ke: number
          tahun: number
          tahun_liturgi: string
          warna_liturgi: WarnaLiturgi
          nama_selebran: string
          created_at: string
        }
        Insert: {
          id?: string
          judul_misa: string
          kategori: MassCategory
          tanggal_misa: string
          jam_mulai: string
          kuota_maksimal: number
          minggu_ke: number
          tahun: number
          tahun_liturgi: string
          warna_liturgi: WarnaLiturgi
          nama_selebran: string
          created_at?: string
        }
        Update: {
          id?: string
          judul_misa?: string
          kategori?: MassCategory
          tanggal_misa?: string
          jam_mulai?: string
          kuota_maksimal?: number
          minggu_ke?: number
          tahun?: number
          tahun_liturgi?: string
          warna_liturgi?: WarnaLiturgi
          nama_selebran?: string
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          schedule_id: string
          user_id: string
          kategori_misa: MassCategory
          minggu_ke: number
          tahun: number
          posisi_tugas: string
          status_kehadiran: AttendanceStatus
          waktu_checkin: string | null
          wa_reminder_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          user_id: string
          kategori_misa?: MassCategory
          minggu_ke?: number
          tahun?: number
          posisi_tugas?: string
          status_kehadiran?: AttendanceStatus
          waktu_checkin?: string | null
          wa_reminder_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          user_id?: string
          kategori_misa?: MassCategory
          minggu_ke?: number
          tahun?: number
          posisi_tugas?: string
          status_kehadiran?: AttendanceStatus
          waktu_checkin?: string | null
          wa_reminder_sent?: boolean
          created_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          judul: string
          isi: string
          is_pinned: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          judul: string
          isi: string
          is_pinned?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          judul?: string
          isi?: string
          is_pinned?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      account_status: AccountStatus
      mass_category: MassCategory
      attendance_status: AttendanceStatus
      jenjang_pendidikan: JenjangPendidikan
      warna_liturgi: WarnaLiturgi
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type MassSchedule = Database['public']['Tables']['mass_schedules']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Announcement = Database['public']['Tables']['announcements']['Row']

export interface BookingWithDetails extends Booking {
  schedule?: MassSchedule
  profile?: Profile
}

export interface ScheduleWithBookings extends MassSchedule {
  bookings?: (Booking & { profile?: Profile })[]
  total_terisi?: number
  sisa_kuota?: number
}
