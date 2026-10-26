package org.purbowardayan.sidinar.util;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatDelegate;
import org.purbowardayan.sidinar.R;

public class ThemeManager {
    private static final String PREF_NAME = "sidinar_theme_preferences";
    private static final String KEY_THEME_MODE = "pref_theme_mode";

    public static final String MODE_SYSTEM = "system"; // Ikuti sistem HP (Default)
    public static final String MODE_LIGHT = "light";   // Mode Terang
    public static final String MODE_DARK = "dark";     // Mode Gelap

    public interface OnThemeChangedListener {
        void onThemeChanged(String newMode);
    }

    /**
     * Terapkan tema yang tersimpan di memori lokal saat aplikasi dimulai
     */
    public static void applySavedTheme(Context context) {
        String mode = getSavedTheme(context);
        applyTheme(mode);
    }

    /**
     * Terapkan dan simpan pilihan tema baru
     */
    public static void setAndApplyTheme(Context context, String mode) {
        saveTheme(context, mode);
        applyTheme(mode);
    }

    /**
     * Panggil AppCompatDelegate sesuai mode
     */
    public static void applyTheme(String mode) {
        switch (mode) {
            case MODE_LIGHT:
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
                break;
            case MODE_DARK:
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
                break;
            case MODE_SYSTEM:
            default:
                // Langsung menyesuaikan pengaturan sistem handphone secara otomatis
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
                break;
        }
    }

    /**
     * Ambil mode tema yang sedang tersimpan (default: "system")
     */
    public static String getSavedTheme(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_THEME_MODE, MODE_SYSTEM);
    }

    private static void saveTheme(Context context, String mode) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_THEME_MODE, mode).apply();
    }

    /**
     * Dapatkan ikon yang sesuai untuk mode saat ini
     */
    public static int getThemeIconRes(Context context) {
        String mode = getSavedTheme(context);
        switch (mode) {
            case MODE_LIGHT:
                return R.drawable.ic_sun;
            case MODE_DARK:
                return R.drawable.ic_moon;
            case MODE_SYSTEM:
            default:
                return R.drawable.ic_theme_auto;
        }
    }

    /**
     * Tampilkan dialog pemilihan tema yang elegan
     */
    public static void showThemeSelectionDialog(Context context, OnThemeChangedListener listener) {
        String currentMode = getSavedTheme(context);
        String[] options = new String[]{
                "📱 Ikuti Sistem HP (Otomatis)",
                "☀️ Mode Terang (Light Mode)",
                "🌙 Mode Gelap (Dark Mode)"
        };

        int checkedItem = 0;
        if (MODE_LIGHT.equals(currentMode)) {
            checkedItem = 1;
        } else if (MODE_DARK.equals(currentMode)) {
            checkedItem = 2;
        }

        new AlertDialog.Builder(context)
                .setTitle("Pilih Tema Tampilan")
                .setSingleChoiceItems(options, checkedItem, (dialog, which) -> {
                    String selectedMode;
                    if (which == 1) {
                        selectedMode = MODE_LIGHT;
                    } else if (which == 2) {
                        selectedMode = MODE_DARK;
                    } else {
                        selectedMode = MODE_SYSTEM;
                    }

                    dialog.dismiss();
                    setAndApplyTheme(context, selectedMode);
                    if (listener != null) {
                        listener.onThemeChanged(selectedMode);
                    }
                })
                .setNegativeButton("Batal", null)
                .show();
    }
}
