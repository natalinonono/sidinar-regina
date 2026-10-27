package org.purbowardayan.sidinar;

import android.app.Application;
import org.purbowardayan.sidinar.util.ThemeManager;

public class SiDinarApplication extends Application {
    private static SiDinarApplication instance;

    public static SiDinarApplication getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        // Langsung terapkan tema (otomatis menyesuaikan sistem HP sejak awal)
        ThemeManager.applySavedTheme(this);
    }
}
