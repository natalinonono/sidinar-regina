package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Booking implements Serializable {
    @SerializedName("id")
    private String id;

    @SerializedName("schedule_id")
    private String scheduleId;

    @SerializedName("user_id")
    private String userId;

    @SerializedName("kategori_misa")
    private String kategoriMisa;

    @SerializedName("minggu_ke")
    private int mingguKe;

    @SerializedName("tahun")
    private int tahun;

    @SerializedName("posisi_tugas")
    private String posisiTugas;

    @SerializedName("status_kehadiran")
    private String statusKehadiran; // "terdaftar" | "hadir" | "terlambat" | "tidak_hadir"

    @SerializedName("waktu_checkin")
    private String waktuCheckin;

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("wa_reminder_sent")
    private boolean waReminderSent;

    @SerializedName("schedule")
    private MassSchedule schedule;

    @SerializedName("profile")
    private Profile profile;

    public Booking() {}

    public boolean isWaReminderSent() { return waReminderSent; }
    public void setWaReminderSent(boolean waReminderSent) { this.waReminderSent = waReminderSent; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getScheduleId() { return scheduleId; }
    public void setScheduleId(String scheduleId) { this.scheduleId = scheduleId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getKategoriMisa() { return kategoriMisa; }
    public void setKategoriMisa(String kategoriMisa) { this.kategoriMisa = kategoriMisa; }

    public int getMingguKe() { return mingguKe; }
    public void setMingguKe(int mingguKe) { this.mingguKe = mingguKe; }

    public int getTahun() { return tahun; }
    public void setTahun(int tahun) { this.tahun = tahun; }

    public String getPosisiTugas() { return posisiTugas != null ? posisiTugas : "Petugas Altar"; }
    public void setPosisiTugas(String posisiTugas) { this.posisiTugas = posisiTugas; }

    public String getStatusKehadiran() { return statusKehadiran != null ? statusKehadiran : "terdaftar"; }
    public void setStatusKehadiran(String statusKehadiran) { this.statusKehadiran = statusKehadiran; }

    /**
     * Mengecek apakah jadwal misa telah melewati batas toleransi presensi:
     * - Misa Harian: durasi maks 30 menit + 45 menit toleransi pasca misa = 75 menit dari jam mulai misa (misal 05:30 -> cutoff 06:45 WIB).
     * - Misa Mingguan: durasi maks 75 menit + 45 menit toleransi pasca misa = 120 menit dari jam mulai misa (misal 05:30 -> cutoff 07:30 WIB).
     */
    public boolean isToleranceExpired() {
        if (schedule == null || schedule.getTanggalMisa() == null || schedule.getJamMulai() == null) {
            return false;
        }
        try {
            String timePart = schedule.getJamMulai().trim();
            if (timePart.length() == 5) {
                timePart += ":00";
            }
            String dtStr = schedule.getTanggalMisa().trim() + " " + timePart;
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault());
            sdf.setTimeZone(java.util.TimeZone.getTimeZone("Asia/Jakarta"));
            java.util.Date massStart = sdf.parse(dtStr);
            if (massStart != null) {
                String kat = schedule.getKategori();
                if (kat == null || kat.trim().isEmpty()) {
                    kat = getKategoriMisa();
                }
                boolean isHarian = "harian".equalsIgnoreCase(kat);
                long toleranceMinutes = isHarian ? 75L : 120L;
                long cutoffMillis = massStart.getTime() + (toleranceMinutes * 60 * 1000);
                return System.currentTimeMillis() > cutoffMillis;
            }
        } catch (Exception ignored) {}
        return false;
    }

    /**
     * Mengembalikan status kehadiran efektif:
     * Jika status masih 'terdaftar' namun waktu telah melewati batas toleransi, otomatis mengembalikan 'alpa'.
     */
    public String getEffectiveStatusKehadiran() {
        String status = getStatusKehadiran();
        if ("terdaftar".equalsIgnoreCase(status) && isToleranceExpired()) {
            return "alpa";
        }
        return status;
    }

    public String getWaktuCheckin() { return waktuCheckin; }
    public void setWaktuCheckin(String waktuCheckin) { this.waktuCheckin = waktuCheckin; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public MassSchedule getSchedule() { return schedule; }
    public void setSchedule(MassSchedule schedule) { this.schedule = schedule; }

    public Profile getProfile() { return profile; }
    public void setProfile(Profile profile) { this.profile = profile; }
}
