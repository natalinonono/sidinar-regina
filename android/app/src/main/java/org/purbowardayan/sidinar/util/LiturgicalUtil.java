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
}
