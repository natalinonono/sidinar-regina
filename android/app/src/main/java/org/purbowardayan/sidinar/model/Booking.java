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

    public String getWaktuCheckin() { return waktuCheckin; }
    public void setWaktuCheckin(String waktuCheckin) { this.waktuCheckin = waktuCheckin; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public MassSchedule getSchedule() { return schedule; }
    public void setSchedule(MassSchedule schedule) { this.schedule = schedule; }

    public Profile getProfile() { return profile; }
    public void setProfile(Profile profile) { this.profile = profile; }
}
