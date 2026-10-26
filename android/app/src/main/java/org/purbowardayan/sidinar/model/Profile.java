package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Profile implements Serializable {
    @SerializedName("id")
    private String id;

    @SerializedName("email")
    private String email;

    @SerializedName("nama_lengkap")
    private String namaLengkap;

    @SerializedName("nama_panggilan")
    private String namaPanggilan;

    @SerializedName("no_telepon")
    private String noTelepon;

    @SerializedName("asal_wilayah_teks")
    private String asalWilayahTeks;

    @SerializedName("jenjang")
    private String jenjang;

    @SerializedName("role")
    private String role; // "pengurus" | "anggota"

    @SerializedName("status")
    private String status; // "aktif" | "pending" | "nonaktif"

    public Profile() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getNamaLengkap() { return namaLengkap; }
    public void setNamaLengkap(String namaLengkap) { this.namaLengkap = namaLengkap; }

    public String getNamaPanggilan() { return namaPanggilan; }
    public void setNamaPanggilan(String namaPanggilan) { this.namaPanggilan = namaPanggilan; }

    public String getNoTelepon() { return noTelepon; }
    public void setNoTelepon(String noTelepon) { this.noTelepon = noTelepon; }

    public String getAsalWilayahTeks() { return asalWilayahTeks; }
    public void setAsalWilayahTeks(String asalWilayahTeks) { this.asalWilayahTeks = asalWilayahTeks; }

    public String getJenjang() { return jenjang; }
    public void setJenjang(String jenjang) { this.jenjang = jenjang; }

    public String getRole() { return role != null ? role : "anggota"; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status != null ? status : "aktif"; }
    public void setStatus(String status) { this.status = status; }

    public boolean isPengurus() {
        return "pengurus".equalsIgnoreCase(role);
    }

    public boolean isAktif() {
        return !"nonaktif".equalsIgnoreCase(status);
    }
}
