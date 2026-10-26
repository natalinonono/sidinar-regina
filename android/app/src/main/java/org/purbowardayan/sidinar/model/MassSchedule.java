package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class MassSchedule implements Serializable {
    @SerializedName("id")
    private String id;

    @SerializedName("judul_misa")
    private String judulMisa;

    @SerializedName("kategori")
    private String kategori; // "harian" | "mingguan"

    @SerializedName("tanggal_misa")
    private String tanggalMisa;

    @SerializedName("jam_mulai")
    private String jamMulai;

    @SerializedName("kuota_maksimal")
    private int kuotaMaksimal;

    @SerializedName("minggu_ke")
    private int mingguKe;

    @SerializedName("tahun")
    private int tahun;

    @SerializedName("tahun_liturgi")
    private String tahunLiturgi;

    @SerializedName("warna_liturgi")
    private String warnaLiturgi;

    @SerializedName("nama_selebran")
    private String namaSelebran;

    // Transient calculated field for active bookings count
    private int bookedCount = 0;

    public MassSchedule() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJudulMisa() { return judulMisa; }
    public void setJudulMisa(String judulMisa) { this.judulMisa = judulMisa; }

    public String getKategori() { return kategori; }
    public void setKategori(String kategori) { this.kategori = kategori; }

    public String getTanggalMisa() { return tanggalMisa; }
    public void setTanggalMisa(String tanggalMisa) { this.tanggalMisa = tanggalMisa; }

    public String getJamMulai() { return jamMulai; }
    public void setJamMulai(String jamMulai) { this.jamMulai = jamMulai; }

    public int getKuotaMaksimal() { return kuotaMaksimal; }
    public void setKuotaMaksimal(int kuotaMaksimal) { this.kuotaMaksimal = kuotaMaksimal; }

    public int getMingguKe() { return mingguKe; }
    public void setMingguKe(int mingguKe) { this.mingguKe = mingguKe; }

    public int getTahun() { return tahun; }
    public void setTahun(int tahun) { this.tahun = tahun; }

    public String getTahunLiturgi() { return tahunLiturgi; }
    public void setTahunLiturgi(String tahunLiturgi) { this.tahunLiturgi = tahunLiturgi; }

    public String getWarnaLiturgi() { return warnaLiturgi; }
    public void setWarnaLiturgi(String warnaLiturgi) { this.warnaLiturgi = warnaLiturgi; }

    public String getNamaSelebran() { return namaSelebran; }
    public void setNamaSelebran(String namaSelebran) { this.namaSelebran = namaSelebran; }

    public int getBookedCount() { return bookedCount; }
    public void setBookedCount(int bookedCount) { this.bookedCount = bookedCount; }

    public int getRemainingQuota() {
        return Math.max(0, kuotaMaksimal - bookedCount);
    }

    public boolean isFull() {
        return bookedCount >= kuotaMaksimal;
    }

    public String getFormattedTime() {
        if (jamMulai != null && jamMulai.length() >= 5) {
            return jamMulai.substring(0, 5) + " WIB";
        }
        return jamMulai != null ? jamMulai : "";
    }
}
