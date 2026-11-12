package org.purbowardayan.sidinar.util;

import android.content.Context;
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;

public class LiturgicalUtil {

    public static final String[] LITURGICAL_POSITIONS = new String[]{
            "Pembawa Salib Prosesi (Crucifer)",
            "Pembawa Lilin I (Ceroferarius I)",
            "Pembawa Lilin II (Ceroferarius II)",
            "Petugas Altar & Meja Kredens (Acolyte)",
            "Petugas Lavabo & Bel / Genta",
            "Pembawa Pedupaan / Wiruk (Thurifer)",
            "Pembawa Wadah Dupa / Navis",
            "Pemimpin Barisan & Sakristan",
            "Petugas Altar"
    };

    public static final String[] ATTENDANCE_STATUS_OPTIONS = new String[]{
            "hadir",
            "terlambat",
            "izin",
            "alpa",
            "terdaftar"
    };

    public static final String[] WARNA_LITURGI_OPTIONS = new String[]{
            "Hijau",
            "Putih",
            "Merah",
            "Ungu"
    };

    public static String generateWhatsAppReminder(MassSchedule schedule, Profile profile) {
        String nama = profile.getNamaPanggilan() != null && !profile.getNamaPanggilan().isEmpty()
                ? profile.getNamaPanggilan()
                : (profile.getNamaLengkap() != null ? profile.getNamaLengkap() : "Misdinar");

        return "*PENGINGAT TUGAS MISDINAR SPMR PURBOWARDAYAN* 🔔\n\n" +
                "Halo *" + nama + "*,\n" +
                "Mengingatkan jadwal pelayanan altar Anda:\n\n" +
                "⛪ *Misa*: " + schedule.getJudulMisa() + "\n" +
                "📅 *Tanggal*: " + schedule.getTanggalMisa() + "\n" +
                "⏰ *Pukul*: " + schedule.getFormattedTime() + "\n\n" +
                "⚠️ *Ketentuan Sakristi*:\n" +
                "1. Harap hadir paling lambat *30 menit sebelum misa* untuk doa bersama dan persiapan vestimentum.\n" +
                "2. Mengenakan pakaian rapi, bawahan hitam sopan, dan sepatu hitam.\n" +
                "3. Melakukan presensi sakristi sebelum misa dimulai.\n\n" +
                "Mohon konfirmasi kehadirannya ya. Terima kasih atas kesetiaan melayani altar Tuhan. Berkah Dalem! 🙏✨";
    }

    public static void sendWhatsAppReminder(Context context, MassSchedule schedule, Profile profile) {
        if (profile == null || profile.getNoTelepon() == null || profile.getNoTelepon().isEmpty()) {
            return;
        }
        String cleanPhone = profile.getNoTelepon().replaceAll("[^0-9]", "");
        if (cleanPhone.startsWith("0")) {
            cleanPhone = "62" + cleanPhone.substring(1);
        }
        String message = generateWhatsAppReminder(schedule, profile);
        ApiClient.openWhatsApp(context, cleanPhone, message);
    }

    /**
     * Menghitung minggu ISO (minggu_ke) dan tahun minggu ISO (tahun) dari string tanggal YYYY-MM-DD (zona WIB).
     */
    public static int[] computeIsoWeekAndYear(String dateStr) {
        java.util.TimeZone wibTz = java.util.TimeZone.getTimeZone("Asia/Jakarta");
        java.util.Calendar cal = java.util.Calendar.getInstance(wibTz);
        cal.setFirstDayOfWeek(java.util.Calendar.MONDAY);
        cal.setMinimalDaysInFirstWeek(4);
        if (dateStr != null && dateStr.length() >= 10) {
            try {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
                sdf.setTimeZone(wibTz);
                java.util.Date parsed = sdf.parse(dateStr.trim().substring(0, 10));
                if (parsed != null) {
                    cal.setTime(parsed);
                }
            } catch (Exception ignored) {}
        }
        int week = cal.get(java.util.Calendar.WEEK_OF_YEAR);
        int year = cal.get(java.util.Calendar.YEAR);
        int month = cal.get(java.util.Calendar.MONTH); // 0 = Jan, 11 = Dec
        if (month == java.util.Calendar.DECEMBER && week == 1) {
            year += 1;
        } else if (month == java.util.Calendar.JANUARY && week >= 52) {
            year -= 1;
        }
        return new int[]{week, year};
    }

    /**
     * Memformat timestamp ISO-8601 (UTC/offset) ke jam lokal Asia/Jakarta (HH:mm WIB).
     */
    public static String formatCheckinWib(String rawIso) {
        if (rawIso == null || rawIso.trim().isEmpty()) return "";
        String normalized = rawIso.trim().replaceFirst("\\.\\d+", "");
        java.util.TimeZone wibTz = java.util.TimeZone.getTimeZone("Asia/Jakarta");
        String[] patterns = new String[]{
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                "yyyy-MM-dd'T'HH:mm:ssXX",
                "yyyy-MM-dd'T'HH:mm:ssX",
                "yyyy-MM-dd'T'HH:mm:ss"
        };
        for (String pattern : patterns) {
            try {
                java.text.SimpleDateFormat parser = new java.text.SimpleDateFormat(pattern, java.util.Locale.US);
                parser.setLenient(false);
                if (!pattern.contains("X")) {
                    parser.setTimeZone(wibTz);
                }
                java.util.Date dt = parser.parse(normalized);
                if (dt != null) {
                    java.text.SimpleDateFormat out = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.US);
                    out.setTimeZone(wibTz);
                    return out.format(dt) + " WIB";
                }
            } catch (Exception ignored) {}
        }
        if (normalized.contains("T") && normalized.length() >= 16) {
            return normalized.substring(11, 16) + " WIB";
        }
        return rawIso.trim();
    }
}
