package org.purbowardayan.sidinar.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class UserRole {
    @SerialName("anggota") ANGGOTA,
    @SerialName("pengurus") PENGURUS
}

@Serializable
enum class AccountStatus {
    @SerialName("pending") PENDING,
    @SerialName("aktif") AKTIF,
    @SerialName("nonaktif") NONAKTIF
}

@Serializable
enum class MassCategory {
    @SerialName("harian") HARIAN,
    @SerialName("mingguan") MINGGUAN
}

@Serializable
enum class AttendanceStatus {
    @SerialName("terdaftar") TERDAFTAR,
    @SerialName("hadir") HADIR,
    @SerialName("terlambat") TERLAMBAT,
    @SerialName("izin") IZIN,
    @SerialName("alpa") ALPA
}

@Serializable
data class Profile(
    val id: String,
    val email: String,
    @SerialName("nama_lengkap") val namaLengkap: String,
    @SerialName("nama_panggilan") val namaPanggilan: String,
    @SerialName("no_telepon") val noTelepon: String,
    @SerialName("asal_wilayah_teks") val asalWilayahTeks: String,
    val jenjang: String,
    val role: UserRole = UserRole.ANGGOTA,
    val status: AccountStatus = AccountStatus.PENDING,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class MassSchedule(
    val id: String,
    @SerialName("judul_misa") val judulMisa: String,
    val kategori: MassCategory,
    @SerialName("tanggal_misa") val tanggalMisa: String,
    @SerialName("jam_mulai") val jamMulai: String,
    @SerialName("kuota_maksimal") val kuotaMaksimal: Int,
    @SerialName("minggu_ke") val mingguKe: Int,
    val tahun: Int,
    @SerialName("tahun_liturgi") val tahunLiturgi: String,
    @SerialName("warna_liturgi") val warnaLiturgi: String,
    @SerialName("nama_selebran") val namaSelebran: String,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class Booking(
    val id: String,
    @SerialName("schedule_id") val scheduleId: String,
    @SerialName("user_id") val userId: String,
    @SerialName("kategori_misa") val kategoriMisa: MassCategory,
    @SerialName("minggu_ke") val mingguKe: Int,
    val tahun: Int,
    @SerialName("posisi_tugas") val posisiTugas: String = "Petugas Altar / Umum",
    @SerialName("status_kehadiran") val statusKehadiran: AttendanceStatus = AttendanceStatus.TERDAFTAR,
    @SerialName("waktu_checkin") val waktuCheckin: String? = null,
    @SerialName("wa_reminder_sent") val waReminderSent: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class Announcement(
    val id: String,
    val judul: String,
    val isi: String,
    @SerialName("is_pinned") val isPinned: Boolean = false,
    @SerialName("created_by") val createdBy: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)
