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

public class NotificationHelper {

    public static final String CHANNEL_REMINDERS_ID = "sidinar_reminders_v2";
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
                channel.setDescription("Pemberitahuan jadwal tugas misdinar dan presensi sakristi SPMR Purbowardayan");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 400, 200, 400});
                channel.enableLights(true);
                channel.setLightColor(0xFF904D00); // Liturgical Accent Gold
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);

                Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                        .build();
                channel.setSound(defaultSoundUri, audioAttributes);

                manager.createNotificationChannel(channel);
            }
        }
    }

    public static void showReminderNotification(Context context, String title, String message, String bookingId) {
        createNotificationChannel(context);

        Intent intent = new Intent(context, AnggotaMainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("from_notification", true);
        intent.putExtra("booking_id", bookingId);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                bookingId != null ? bookingId.hashCode() : 1001,
                intent,
                flags
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_REMINDERS_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.drawable.logo_misdinar))
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 400, 200, 400})
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setFullScreenIntent(pendingIntent, false)
                .setContentIntent(pendingIntent);

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
