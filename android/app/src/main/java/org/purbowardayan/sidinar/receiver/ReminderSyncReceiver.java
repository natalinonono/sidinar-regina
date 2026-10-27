package org.purbowardayan.sidinar.receiver;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;
import org.purbowardayan.sidinar.util.NotificationHelper;
import retrofit2.Response;

public class ReminderSyncReceiver extends BroadcastReceiver {

    public static final String ACTION_CHECK_REMINDERS = "org.purbowardayan.sidinar.ACTION_CHECK_REMINDERS";
    public static final String ACTION_TEST_NOTIFICATION = "org.purbowardayan.sidinar.ACTION_TEST_NOTIFICATION";

    private static final int REQUEST_CODE_SYNC = 7771;
    private static final int REQUEST_CODE_TEST = 7772;
    private static final long INTERVAL_MILLIS = 60 * 1000L; // 1 menit

    public static void startBackgroundMonitoring(Context context) {
        if (context == null) return;
        scheduleNext(context, 10 * 1000L); // Cek pertama 10 detik setelah start
    }

    public static void scheduleNext(Context context, long delayMillis) {
        if (context == null) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, ReminderSyncReceiver.class);
        intent.setAction(ACTION_CHECK_REMINDERS);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, REQUEST_CODE_SYNC, intent, flags);
        long triggerAt = SystemClock.elapsedRealtime() + delayMillis;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } else {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            }
        } catch (SecurityException se) {
            try {
                am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } catch (Exception ignored) {}
        } catch (Exception ignored) {}
    }

    public static void scheduleTest(Context context, long delayMillis) {
        if (context == null) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, ReminderSyncReceiver.class);
        intent.setAction(ACTION_TEST_NOTIFICATION);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, REQUEST_CODE_TEST, intent, flags);
        long triggerAt = SystemClock.elapsedRealtime() + delayMillis;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } else {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            }
        } catch (Exception e) {
            try {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } catch (Exception ignored) {}
        }
    }

    public static void stopBackgroundMonitoring(Context context) {
        if (context == null) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, ReminderSyncReceiver.class);
        intent.setAction(ACTION_CHECK_REMINDERS);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, REQUEST_CODE_SYNC, intent, flags);
        am.cancel(pi);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

        String action = intent != null ? intent.getAction() : null;

        // 1. Uji coba notifikasi instan (5 detik)
        if (ACTION_TEST_NOTIFICATION.equals(action)) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wl = (pm != null) ? pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sidinar:testnotif") : null;
            if (wl != null) wl.acquire(10 * 1000L);
            try {
                NotificationHelper.showReminderNotification(
                        context,
                        "🔔 Tes Notifikasi SiDinar Berhasil!",
                        "Fitur notifikasi latar belakang aktif dan berdering normal saat aplikasi ditutup/layar terkunci.",
                        "test_notification_id"
                );
            } finally {
                if (wl != null && wl.isHeld()) {
                    try { wl.release(); } catch (Exception ignored) {}
                }
            }
            return;
        }

        // 2. Monitoring background rutin pengingat tugas
        SessionManager sessionManager = new SessionManager(context);
        if (!sessionManager.isLoggedIn()) {
            return;
        }

        String userId = sessionManager.getUserId();
        if (userId == null || userId.isEmpty()) {
            return;
        }

        // Jadwalkan siklus berikutnya setiap 1 menit
        scheduleNext(context, INTERVAL_MILLIS);

        final PendingResult pendingResult = goAsync();
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        final PowerManager.WakeLock wakeLock = (pm != null) ? pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sidinar:remindersync") : null;
        if (wakeLock != null) wakeLock.acquire(45 * 1000L);

        new Thread(() -> {
            try {
                performSync(context, sessionManager, userId);
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                if (wakeLock != null && wakeLock.isHeld()) {
                    try { wakeLock.release(); } catch (Exception ignored) {}
                }
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void performSync(Context context, SessionManager sessionManager, String userId) {
        String authHeader = sessionManager.getAuthHeader();
        List<Booking> bookings = null;

        try {
            Response<List<Booking>> response = ApiClient.getSupabaseApi()
                    .getAllBookings(authHeader, "*,schedule:mass_schedules(*)", "created_at.desc")
                    .execute();
            if (response.isSuccessful() && response.body() != null) {
                bookings = response.body();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (bookings == null || bookings.isEmpty()) return;

        SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        Calendar cal = Calendar.getInstance();
        String todayStr = sdfDate.format(cal.getTime());
        cal.add(Calendar.DAY_OF_YEAR, 1);
        String tomorrowStr = sdfDate.format(cal.getTime());

        SharedPreferences prefs = context.getSharedPreferences("sidinar_notifications", Context.MODE_PRIVATE);

        for (Booking b : bookings) {
            if (!userId.equals(b.getUserId()) || b.getSchedule() == null) continue;

            MassSchedule schedule = b.getSchedule();
            String tanggalMisa = schedule.getTanggalMisa();
            String id = b.getId();

            // 1. Pengingat manual dari pengurus (wa_reminder_sent == true)
            if (b.isWaReminderSent()) {
                long lastNotified = prefs.getLong("last_notified_" + id, 0);
                // Beritahukan jika belum pernah dinotifikasi atau sudah lewat 30 menit
                if (System.currentTimeMillis() - lastNotified > 30 * 60 * 1000L) {
                    prefs.edit().putLong("last_notified_" + id, System.currentTimeMillis()).apply();
                    triggerPengurusReminder(context, sessionManager, b);
                }
            }

            // 2. Pengingat otomatis Hari H (Misa hari ini)
            if (todayStr.equals(tanggalMisa)) {
                String keyHariH = "notified_hari_h_" + id + "_" + todayStr;
                if (!prefs.getBoolean(keyHariH, false)) {
                    prefs.edit().putBoolean(keyHariH, true).apply();
                    triggerAutoReminder(context, sessionManager, b, "HARI INI");
                }
            }

            // 3. Pengingat otomatis H-1 (Misa besok)
            if (tomorrowStr.equals(tanggalMisa)) {
                String keyH1 = "notified_h1_" + id + "_" + tomorrowStr;
                if (!prefs.getBoolean(keyH1, false)) {
                    prefs.edit().putBoolean(keyH1, true).apply();
                    triggerAutoReminder(context, sessionManager, b, "BESOK");
                }
            }
        }
    }

    private void triggerPengurusReminder(Context context, SessionManager sessionManager, Booking booking) {
        String massTitle = booking.getSchedule().getKategori() != null ? booking.getSchedule().getKategori().toUpperCase() : "MISA";
        String massTime = (booking.getSchedule().getTanggalMisa() != null ? booking.getSchedule().getTanggalMisa() : "") +
                " • " + (booking.getSchedule().getJamMulai() != null ? booking.getSchedule().getJamMulai() : "") + " WIB";
        Profile profile = sessionManager.getProfile();
        String nama = profile != null && profile.getNamaPanggilan() != null && !profile.getNamaPanggilan().isEmpty()
                ? profile.getNamaPanggilan() : "Misdinar";

        String title = "🔔 Pengingat Tugas Misdinar: " + massTitle;
        String message = "Halo " + nama + ", pengurus sakristi mengingatkan jadwal tugas altar Anda pada " + massTime +
                " (" + booking.getPosisiTugas() + "). Harap hadir di sakristi tepat waktu!";

        NotificationHelper.showReminderNotification(context, title, message, booking.getId());
    }

    private void triggerAutoReminder(Context context, SessionManager sessionManager, Booking booking, String labelWaktu) {
        String massTitle = booking.getSchedule().getJudulMisa() != null ? booking.getSchedule().getJudulMisa() : "Misa Kudus";
        String massTime = (booking.getSchedule().getTanggalMisa() != null ? booking.getSchedule().getTanggalMisa() : "") +
                " • " + (booking.getSchedule().getJamMulai() != null ? booking.getSchedule().getJamMulai() : "") + " WIB";
        Profile profile = sessionManager.getProfile();
        String nama = profile != null && profile.getNamaPanggilan() != null && !profile.getNamaPanggilan().isEmpty()
                ? profile.getNamaPanggilan() : "Misdinar";

        String title = "🔔 Tugas Altar " + labelWaktu + ": " + massTitle;
        String message = "Halo " + nama + ", Anda terjadwal melayani altar " + labelWaktu.toLowerCase() + " (" + massTime +
                "). Posisi: " + booking.getPosisiTugas() + ". Harap hadir di sakristi 30 menit sebelum misa!";

        NotificationHelper.showReminderNotification(context, title, message, booking.getId() + "_" + labelWaktu);
    }
}
