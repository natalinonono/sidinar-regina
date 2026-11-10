package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class MisaBesarResponse {
    @SerializedName("success")
    private boolean success;

    @SerializedName("needs_migration")
    private boolean needsMigration;

    @SerializedName("is_pengurus")
    private boolean isPengurus;

    @SerializedName("tahun")
    private int tahun;

    @SerializedName("events")
    private List<MisaBesarEvent> events;

    @SerializedName("absensi")
    private List<MisaBesarAbsensi> absensi;

    @SerializedName("active_members")
    private List<Profile> activeMembers;

    public boolean isSuccess() { return success; }
    public boolean isNeedsMigration() { return needsMigration; }
    public boolean isPengurus() { return isPengurus; }
    public int getTahun() { return tahun; }
    public List<MisaBesarEvent> getEvents() { return events; }
    public List<MisaBesarAbsensi> getAbsensi() { return absensi; }
    public List<Profile> getActiveMembers() { return activeMembers; }

    public static class MisaBesarEvent {
        @SerializedName("id")
        private String id;
        @SerializedName("kode_perayaan")
        private String kodePerayaan;
        @SerializedName("nama_perayaan")
        private String namaPerayaan;
        @SerializedName("tahun")
        private int tahun;
        @SerializedName("jumlah_sesi")
        private int jumlahSesi;
        @SerializedName("jenis_sesi")
        private String jenisSesi;
        @SerializedName("warna_liturgi")
        private String warnaLiturgi;
        @SerializedName("keterangan")
        private String keterangan;
        @SerializedName("sessions")
        private List<MisaBesarSession> sessions;
        @SerializedName("latihan")
        private List<MisaBesarLatihan> latihan;
        @SerializedName("petugas")
        private List<MisaBesarPetugas> petugas;

        public String getId() { return id; }
        public String getKodePerayaan() { return kodePerayaan; }
        public String getNamaPerayaan() { return namaPerayaan; }
        public int getTahun() { return tahun; }
        public int getJumlahSesi() { return jumlahSesi; }
        public String getJenisSesi() { return jenisSesi; }
        public String getWarnaLiturgi() { return warnaLiturgi; }
        public String getKeterangan() { return keterangan; }
        public List<MisaBesarSession> getSessions() { return sessions; }
        public List<MisaBesarLatihan> getLatihan() { return latihan; }
        public List<MisaBesarPetugas> getPetugas() { return petugas; }
    }

    public static class MisaBesarSession {
        @SerializedName("id")
        private String id;
        @SerializedName("event_id")
        private String eventId;
        @SerializedName("urutan")
        private int urutan;
        @SerializedName("nama_sesi")
        private String namaSesi;
        @SerializedName("tanggal_misa")
        private String tanggalMisa;
        @SerializedName("jam_mulai")
        private String jamMulai;
        @SerializedName("kuota_petugas")
        private int kuotaPetugas;

        public String getId() { return id; }
        public String getEventId() { return eventId; }
        public int getUrutan() { return urutan; }
        public String getNamaSesi() { return namaSesi; }
        public String getTanggalMisa() { return tanggalMisa; }
        public String getJamMulai() { return jamMulai; }
        public int getKuotaPetugas() { return kuotaPetugas; }
    }

    public static class MisaBesarPetugas {
        @SerializedName("id")
        private String id;
        @SerializedName("event_id")
        private String eventId;
        @SerializedName("session_id")
        private String sessionId;
        @SerializedName("user_id")
        private String userId;
        @SerializedName("posisi_tugas")
        private String posisiTugas;
        @SerializedName("catatan")
        private String catatan;
        @SerializedName("profile")
        private Profile profile;
        @SerializedName("session")
        private MisaBesarSession session;

        public String getId() { return id; }
        public String getEventId() { return eventId; }
        public String getSessionId() { return sessionId; }
        public String getUserId() { return userId; }
        public String getPosisiTugas() { return posisiTugas; }
        public String getCatatan() { return catatan; }
        public Profile getProfile() { return profile; }
        public MisaBesarSession getSession() { return session; }
    }

    public static class MisaBesarLatihan {
        @SerializedName("id")
        private String id;
        @SerializedName("event_id")
        private String eventId;
        @SerializedName("session_id")
        private String sessionId;
        @SerializedName("judul_latihan")
        private String judulLatihan;
        @SerializedName("tanggal_latihan")
        private String tanggalLatihan;
        @SerializedName("jam_mulai")
        private String jamMulai;
        @SerializedName("lokasi")
        private String lokasi;
        @SerializedName("catatan")
        private String catatan;

        public String getId() { return id; }
        public String getEventId() { return eventId; }
        public String getSessionId() { return sessionId; }
        public String getJudulLatihan() { return judulLatihan; }
        public String getTanggalLatihan() { return tanggalLatihan; }
        public String getJamMulai() { return jamMulai; }
        public String getLokasi() { return lokasi; }
        public String getCatatan() { return catatan; }
    }

    public static class MisaBesarAbsensi {
        @SerializedName("id")
        private String id;
        @SerializedName("latihan_id")
        private String latihanId;
        @SerializedName("petugas_id")
        private String petugasId;
        @SerializedName("user_id")
        private String userId;
        @SerializedName("status_kehadiran")
        private String statusKehadiran;
        @SerializedName("waktu_absen")
        private String waktuAbsen;
        @SerializedName("catatan")
        private String catatan;

        public String getId() { return id; }
        public String getLatihanId() { return latihanId; }
        public String getPetugasId() { return petugasId; }
        public String getUserId() { return userId; }
        public String getStatusKehadiran() { return statusKehadiran; }
        public String getWaktuAbsen() { return waktuAbsen; }
        public String getCatatan() { return catatan; }
    }
}

