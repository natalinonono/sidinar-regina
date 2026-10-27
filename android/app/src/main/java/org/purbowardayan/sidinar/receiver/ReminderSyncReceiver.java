package org.purbowardayan.sidinar.receiver;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;
import androidx.annotation.NonNull;
import java.util.List;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;
import org.purbowardayan.sidinar.util.NotificationHelper;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ReminderSyncReceiver extends BroadcastReceiver {

    private static final int REQUEST_CODE = 7771;
    private static final long INTERVAL_MILLIS = 60 * 1000L; // 1 menit

    public static void startBackgroundMonitoring(Context context) {
        scheduleNext(context, 10 * 1000L); // Cek pertama 10 detik setelah start
    }

    public static void scheduleNext(Context context, long delayMillis) {
        if (context == null) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, ReminderSyncReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags);
        long triggerAt = SystemClock.elapsedRealtime() + delayMillis;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } else {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            }
        } catch (Exception ignored) {
            // Jika ada batasan izin alarm di versi tertentu, fallback ke set
            try {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } catch (Exception ignored2) {}
        }
    }

    public static void stopBackgroundMonitoring(Context context) {
        if (context == null) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, ReminderSyncReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags);
        am.cancel(pi);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

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

        // Periksa data booking di latar belakang
        String authHeader = sessionManager.getAuthHeader();
        ApiClient.getSupabaseApi().getAllBookings(authHeader, "*,schedule:mass_schedules(*)", "created_at.desc")
                .enqueue(new Callback<List<Booking>>() {
                    @Override
                    public void onResponse(@NonNull Call<List<Booking>> call, @NonNull Response<List<Booking>> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            for (Booking b : response.body()) {
                                if (userId.equals(b.getUserId()) && b.isWaReminderSent() && b.getSchedule() != null) {
                                    triggerNotificationIfNew(context, sessionManager, b);
                                }
                            }
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<List<Booking>> call, @NonNull Throwable t) {}
                });
    }

    private void triggerNotificationIfNew(Context context, SessionManager sessionManager, Booking booking) {
        SharedPreferences prefs = context.getSharedPreferences("sidinar_notifications", Context.MODE_PRIVATE);
        String notifKey = "notified_reminder_" + booking.getId();
        if (!prefs.getBoolean(notifKey, false)) {
            // Tandai sudah diberitahukan agar tidak membunyikan notif berkali-kali
            prefs.edit().putBoolean(notifKey, true).apply();

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
    }
}
