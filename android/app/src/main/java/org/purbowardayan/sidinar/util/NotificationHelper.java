package org.purbowardayan.sidinar.util;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.ui.AnggotaMainActivity;
import org.purbowardayan.sidinar.ui.RiwayatTugasActivity;

public class NotificationHelper {

    public static final String CHANNEL_REMINDERS_ID = "sidinar_heads_up_v4";
    public static final String CHANNEL_REMINDERS_NAME = "Pengingat Tugas Misdinar";

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_REMINDERS_ID,
                        CHANNEL_REMINDERS_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Pemberitahuan pop-up banner jadwal tugas misdinar dan presensi sakristi SPMR");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 250, 500});
                channel.enableLights(true);
                channel.setLightColor(0xFF904D00); // Liturgical Accent Gold
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);

                Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                        .build();
                channel.setSound(defaultSoundUri, audioAttributes);

                manager.createNotificationChannel(channel);
            }
        }
    }

    public static void showReminderNotification(Context context, String title, String message, String bookingId) {
        createNotificationChannel(context);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // 1. Intent utama saat banner notifikasi diklik
        Intent mainIntent = new Intent(context, AnggotaMainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        mainIntent.putExtra("from_notification", true);
        mainIntent.putExtra("booking_id", bookingId);

        PendingIntent mainPendingIntent = PendingIntent.getActivity(
                context,
                bookingId != null ? bookingId.hashCode() : 1001,
                mainIntent,
                flags
        );

        // 2. Action Button 1: "Lihat Jadwal" -> Buka RiwayatTugasActivity
        Intent scheduleIntent = new Intent(context, RiwayatTugasActivity.class);
        scheduleIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent schedulePendingIntent = PendingIntent.getActivity(
                context,
                bookingId != null ? (bookingId.hashCode() + 10) : 1002,
                scheduleIntent,
                flags
        );

        // 3. Action Button 2: "Siap Bertugas" -> Buka AnggotaMainActivity
        Intent readyIntent = new Intent(context, AnggotaMainActivity.class);
        readyIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        readyIntent.putExtra("from_notification", true);
        readyIntent.putExtra("action_ready", true);
        PendingIntent readyPendingIntent = PendingIntent.getActivity(
                context,
                bookingId != null ? (bookingId.hashCode() + 20) : 1003,
                readyIntent,
                flags
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // Konfigurasi Heads-up Floating Banner Notification (Pop-up di atas layar seperti WhatsApp)
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_REMINDERS_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.drawable.logo_misdinar))
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 500, 250, 500})
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setFullScreenIntent(mainPendingIntent, true) // Memicu Heads-Up floating banner pop-up di layar
                .setContentIntent(mainPendingIntent)
                .addAction(R.drawable.ic_calendar, "📅 Lihat Jadwal", schedulePendingIntent)
                .addAction(R.drawable.ic_check, "✅ Siap Bertugas", readyPendingIntent);

        try {
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            int notifId = bookingId != null ? Math.abs(bookingId.hashCode()) : 1001;
            notificationManager.notify(notifId, builder.build());
        } catch (SecurityException se) {
            // Permission denied on Android 13+ if not yet granted
        } catch (Exception ignored) {
        }
    }
}
