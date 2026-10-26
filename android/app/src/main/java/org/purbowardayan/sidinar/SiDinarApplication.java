package org.purbowardayan.sidinar;

import android.app.Application;
import org.purbowardayan.sidinar.util.ThemeManager;

public class SiDinarApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Langsung terapkan tema (otomatis menyesuaikan sistem HP sejak awal)
        ThemeManager.applySavedTheme(this);
    }
}
