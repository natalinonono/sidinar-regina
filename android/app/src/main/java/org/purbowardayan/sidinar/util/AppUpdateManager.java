package org.purbowardayan.sidinar.util;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.FileProvider;
import java.io.File;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.model.AppVersionResponse;
import org.purbowardayan.sidinar.network.ApiClient;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AppUpdateManager {

    /**
     * Dapatkan kode versi aplikasi yang saat ini terpasang di HP
     */
    public static int getCurrentVersionCode(Context context) {
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return (int) pInfo.getLongVersionCode();
            } else {
                return pInfo.versionCode;
            }
        } catch (PackageManager.NameNotFoundException e) {
            return 1;
        }
    }

    /**
     * Dapatkan nama versi aplikasi saat ini (misal: "1.0.0")
     */
    public static String getCurrentVersionName(Context context) {
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return pInfo.versionName != null ? pInfo.versionName : "1.0.0";
        } catch (PackageManager.NameNotFoundException e) {
            return "1.0.0";
        }
    }

    /**
     * Cek apakah ada pembaruan versi baru dari server SiDinar
     * @param activity konteks activity
     * @param isManualCheck true jika dipicu dari tombol klik user, false jika otomatis saat buka app
     */
    public static void checkForUpdate(Activity activity, boolean isManualCheck) {
        if (activity == null || activity.isFinishing()) return;

        ApiClient.getBackendApi().getAppVersion().enqueue(new Callback<AppVersionResponse>() {
            @Override
            public void onResponse(@NonNull Call<AppVersionResponse> call, @NonNull Response<AppVersionResponse> response) {
                if (activity.isFinishing()) return;

                if (response.isSuccessful() && response.body() != null) {
                    AppVersionResponse updateInfo = response.body();
                    int currentCode = getCurrentVersionCode(activity);
                    String currentName = getCurrentVersionName(activity);

                    if (updateInfo.getLatestVersionCode() > currentCode) {
                        showUpdateDialog(activity, updateInfo, currentName);
                    } else if (isManualCheck) {
                        Toast.makeText(activity, "Aplikasi sudah menggunakan versi terbaru (v" + currentName + ") ✨", Toast.LENGTH_SHORT).show();
                    }
                } else if (isManualCheck) {
                    Toast.makeText(activity, "Belum dapat memeriksa pembaruan saat ini.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<AppVersionResponse> call, @NonNull Throwable t) {
                if (isManualCheck && !activity.isFinishing()) {
                    Toast.makeText(activity, "Gagal terhubung ke server pembaruan.", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    /**
     * Tampilkan pop-up dialog konfirmasi pembaruan
     */
    private static void showUpdateDialog(Activity activity, AppVersionResponse updateInfo, String currentName) {
        String title = "🚀 Pembaruan SiDinar Regina (v" + updateInfo.getLatestVersionName() + ")";
        String notes = updateInfo.getReleaseNotes() != null && !updateInfo.getReleaseNotes().isEmpty()
                ? updateInfo.getReleaseNotes()
                : "Pembaruan performa dan penyesuaian liturgi terbaru.";

        String message = "Versi terbaru SiDinar Regina telah tersedia:\n\n" +
                notes + "\n\n" +
                "Versi saat ini: v" + currentName + "\n" +
                "Versi baru: v" + updateInfo.getLatestVersionName();

        AlertDialog.Builder builder = new AlertDialog.Builder(activity)
                .setTitle(title)
                .setMessage(message)
                .setIcon(R.drawable.logo_misdinar)
                .setPositiveButton("Perbarui Sekarang", (dialog, which) -> {
                    dialog.dismiss();
                    startDownloadAndInstall(activity, updateInfo);
                });

        if (!updateInfo.isForceUpdate()) {
            builder.setNegativeButton("Nanti Saja", null);
        } else {
            builder.setCancelable(false);
        }

        builder.show();
    }

    /**
     * Download file APK di latar belakang via DownloadManager dan pasang otomatis
     */
    private static void startDownloadAndInstall(Activity activity, AppVersionResponse updateInfo) {
        String downloadUrl = updateInfo.getDownloadUrl();
        if (downloadUrl == null || downloadUrl.isEmpty()) {
            Toast.makeText(activity, "Tautan unduhan tidak tersedia.", Toast.LENGTH_SHORT).show();
            return;
        }

        // Cek izin instalasi aplikasi tidak dikenal di Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!activity.getPackageManager().canRequestPackageInstalls()) {
                new AlertDialog.Builder(activity)
                        .setTitle("Izin Pemasangan Pembaruan")
                        .setMessage("Untuk memperbarui aplikasi langsung dari handphone tanpa kirim file di grup, silakan aktifkan izin 'Izinkan dari sumber ini' untuk SiDinar Regina.")
                        .setPositiveButton("Buka Pengaturan", (dialog, which) -> {
                            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName()));
                            activity.startActivity(intent);
                        })
                        .setNegativeButton("Batal", null)
                        .show();
                return;
            }
        }

        try {
            DownloadManager downloadManager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                // Fallback buka via browser
                activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)));
                return;
            }

            File targetDir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (targetDir != null && !targetDir.exists()) {
                targetDir.mkdirs();
            }
            String fileName = "sidinar_v" + updateInfo.getLatestVersionName() + ".apk";
            File apkFile = new File(targetDir, fileName);

            if (apkFile.exists()) {
                apkFile.delete();
            }

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(downloadUrl));
            request.setTitle("SiDinar Regina v" + updateInfo.getLatestVersionName());
            request.setDescription("Mengunduh pembaruan aplikasi...");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, fileName);

            long downloadId = downloadManager.enqueue(request);

            Toast.makeText(activity, "Mengunduh pembaruan di latar belakang... Pantau status di bar notifikasi HP Anda.", Toast.LENGTH_LONG).show();

            // Pasang receiver untuk mendeteksi saat download selesai
            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        try {
                            activity.unregisterReceiver(this);
                        } catch (Exception ignored) {}

                        installApk(activity, apkFile);
                    }
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
            } else {
                activity.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }

        } catch (Exception e) {
            // Jika ada hambatan sistem download manager, fallback buka langsung di browser
            activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)));
        }
    }

    /**
     * Buka Package Installer Android dengan FileProvider resmi
     */
    public static void installApk(Activity activity, File apkFile) {
        if (!apkFile.exists()) {
            Toast.makeText(activity, "File pembaruan tidak ditemukan.", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(
                    activity,
                    activity.getPackageName() + ".fileprovider",
                    apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(installIntent);
        } catch (Exception e) {
            Toast.makeText(activity, "Gagal memulai pemasangan: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
