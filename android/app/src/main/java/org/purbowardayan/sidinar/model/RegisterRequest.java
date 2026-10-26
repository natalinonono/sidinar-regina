package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;

public class RegisterRequest {
    @SerializedName("email")
    private String email;

    @SerializedName("password")
    private String password;

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

    public RegisterRequest(String email, String password, String namaLengkap, String namaPanggilan, String noTelepon, String asalWilayahTeks, String jenjang) {
        this.email = email;
        this.password = password;
        this.namaLengkap = namaLengkap;
        this.namaPanggilan = namaPanggilan;
        this.noTelepon = noTelepon;
        this.asalWilayahTeks = asalWilayahTeks;
        this.jenjang = jenjang;
    }

    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getNamaLengkap() { return namaLengkap; }
    public String getNamaPanggilan() { return namaPanggilan; }
    public String getNoTelepon() { return noTelepon; }
    public String getAsalWilayahTeks() { return asalWilayahTeks; }
    public String getJenjang() { return jenjang; }
}
