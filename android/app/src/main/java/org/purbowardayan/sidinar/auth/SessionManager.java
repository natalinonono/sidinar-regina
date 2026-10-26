package org.purbowardayan.sidinar.auth;

import android.content.Context;
import android.content.SharedPreferences;
import org.purbowardayan.sidinar.model.AuthResponse;
import org.purbowardayan.sidinar.model.Profile;

public class SessionManager {
    private static final String PREF_NAME = "sidinar_session";
    private static final String KEY_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_NAMA_LENGKAP = "nama_lengkap";
    private static final String KEY_NAMA_PANGGILAN = "nama_panggilan";
    private static final String KEY_ROLE = "role";
    private static final String KEY_STATUS = "status";
    private static final String KEY_JENJANG = "jenjang";
    private static final String KEY_ASAL_WILAYAH = "asal_wilayah";
    private static final String KEY_PHONE = "phone";

    private final SharedPreferences prefs;

    public SessionManager(Context context) {
        this.prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public void saveSession(AuthResponse auth, Profile profile) {
        SharedPreferences.Editor editor = prefs.edit();
        if (auth != null) {
            editor.putString(KEY_TOKEN, auth.getAccessToken());
            editor.putString(KEY_REFRESH_TOKEN, auth.getRefreshToken());
            if (auth.getUser() != null) {
                editor.putString(KEY_USER_ID, auth.getUser().getId());
                editor.putString(KEY_EMAIL, auth.getUser().getEmail());
            }
        }
        if (profile != null) {
            saveProfileInternal(editor, profile);
        }
        editor.apply();
    }

    public void saveProfile(Profile profile) {
        if (profile == null) return;
        SharedPreferences.Editor editor = prefs.edit();
        saveProfileInternal(editor, profile);
        editor.apply();
    }

    private void saveProfileInternal(SharedPreferences.Editor editor, Profile profile) {
        if (profile.getId() != null) editor.putString(KEY_USER_ID, profile.getId());
        if (profile.getEmail() != null) editor.putString(KEY_EMAIL, profile.getEmail());
        if (profile.getNamaLengkap() != null) editor.putString(KEY_NAMA_LENGKAP, profile.getNamaLengkap());
        if (profile.getNamaPanggilan() != null) editor.putString(KEY_NAMA_PANGGILAN, profile.getNamaPanggilan());
        if (profile.getRole() != null) editor.putString(KEY_ROLE, profile.getRole());
        if (profile.getStatus() != null) editor.putString(KEY_STATUS, profile.getStatus());
        if (profile.getJenjang() != null) editor.putString(KEY_JENJANG, profile.getJenjang());
        if (profile.getAsalWilayahTeks() != null) editor.putString(KEY_ASAL_WILAYAH, profile.getAsalWilayahTeks());
        if (profile.getNoTelepon() != null) editor.putString(KEY_PHONE, profile.getNoTelepon());
    }

    public String getToken() {
        return prefs.getString(KEY_TOKEN, null);
    }

    public String getUserId() {
        return prefs.getString(KEY_USER_ID, null);
    }

    public boolean isLoggedIn() {
        return getToken() != null && !getToken().isEmpty();
    }

    public boolean isPengurus() {
        return "pengurus".equalsIgnoreCase(prefs.getString(KEY_ROLE, "anggota"));
    }

    public boolean isAktif() {
        return "aktif".equalsIgnoreCase(prefs.getString(KEY_STATUS, "pending"));
    }

    public Profile getProfile() {
        if (!isLoggedIn()) return null;
        Profile profile = new Profile();
        profile.setId(prefs.getString(KEY_USER_ID, ""));
        profile.setEmail(prefs.getString(KEY_EMAIL, ""));
        profile.setNamaLengkap(prefs.getString(KEY_NAMA_LENGKAP, ""));
        profile.setNamaPanggilan(prefs.getString(KEY_NAMA_PANGGILAN, ""));
        profile.setRole(prefs.getString(KEY_ROLE, "anggota"));
        profile.setStatus(prefs.getString(KEY_STATUS, "pending"));
        profile.setJenjang(prefs.getString(KEY_JENJANG, ""));
        profile.setAsalWilayahTeks(prefs.getString(KEY_ASAL_WILAYAH, ""));
        profile.setNoTelepon(prefs.getString(KEY_PHONE, ""));
        return profile;
    }

    public void clearSession() {
        prefs.edit().clear().apply();
    }
}
