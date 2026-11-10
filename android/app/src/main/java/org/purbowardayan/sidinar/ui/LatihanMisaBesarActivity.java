package org.purbowardayan.sidinar.ui;

import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.google.android.material.chip.Chip;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import com.journeyapps.barcodescanner.BarcodeEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import okhttp3.ResponseBody;
import org.json.JSONObject;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.adapter.MisaBesarAbsensiAdapter;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.databinding.ActivityLatihanMisaBesarBinding;
import org.purbowardayan.sidinar.model.MisaBesarResponse;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LatihanMisaBesarActivity extends AppCompatActivity implements MisaBesarAbsensiAdapter.OnActionListener {

    private ActivityLatihanMisaBesarBinding binding;
    private SessionManager sessionManager;
    private MisaBesarAbsensiAdapter adapter;
    private boolean isPengurusMode = false;

    private final List<MisaBesarResponse.MisaBesarEvent> events = new ArrayList<>();
    private final List<MisaBesarResponse.MisaBesarAbsensi> absensiList = new ArrayList<>();
    private final List<Profile> activeMembers = new ArrayList<>();

    private String selectedEventId = null;
    private String selectedLatihanId = null;
    private String selectedSessionFilterId = "semua";

    private static final String[] POSITIONS = new String[]{
            "Pembawa Salib Prosesi",
            "Pembawa Lilin I (Kanan)",
            "Pembawa Lilin II (Kiri)",
            "Petugas Altar & Meja Kredens",
            "Petugas Lavabo & Bel / Genta",
            "Pembawa Pedupaan / Wiruk",
            "Pembawa Wadah Dupa (Navikula)",
            "Pemimpin Barisan & Sakristan",
            "Petugas Altar / Cadangan"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLatihanMisaBesarBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);
        if (!sessionManager.isLoggedIn()) {
            finish();
            return;
        }

        isPengurusMode = getIntent().getBooleanExtra("is_pengurus", sessionManager.isPengurus())
                && sessionManager.isPengurus();

        setupUI();
        setupListeners();
        loadMisaBesarData();
    }

    private void setupUI() {
        adapter = new MisaBesarAbsensiAdapter(isPengurusMode, this);
        binding.rvMbPetugas.setLayoutManager(new LinearLayoutManager(this));
        binding.rvMbPetugas.setAdapter(adapter);

        if (isPengurusMode) {
            binding.tvMbHeaderTitle.setText("Absensi Latihan Misa Besar");
            binding.tvMbHeaderSub.setText("Mode Pengurus • Malam Natal, Natal, Palma, Trihari Suci, Paskah");
            binding.cardMbAnggotaQr.setVisibility(View.GONE);
            binding.layoutMbPengurusControls.setVisibility(View.VISIBLE);
            binding.tvMbListTitle.setText("Daftar Petugas & Absensi Latihan");
        } else {
            binding.tvMbHeaderTitle.setText("Misa Besar & QR Latihan");
            binding.tvMbHeaderSub.setText("Jadwal Petugas Hari Raya & Kartu QR Anggota");
            binding.cardMbAnggotaQr.setVisibility(View.VISIBLE);
            binding.layoutMbPengurusControls.setVisibility(View.GONE);
            binding.tvMbListTitle.setText("Penugasan & Status Latihan Saya");
            renderAnggotaQr();
        }
    }

    private void renderAnggotaQr() {
        Profile p = sessionManager.getProfile();
        String uid = sessionManager.getUserId();
        if (p != null && p.getNamaLengkap() != null) {
            binding.tvMbMyName.setText(p.getNamaLengkap());
        }
        if (uid != null && uid.length() >= 8) {
            binding.tvMbMyShortId.setText("ID: " + uid.substring(0, 8).toUpperCase(Locale.ROOT));
            try {
                BarcodeEncoder encoder = new BarcodeEncoder();
                Bitmap bmp = encoder.encodeBitmap("SIDINAR:USER:" + uid, BarcodeFormat.QR_CODE, 420, 420);
                binding.ivMbMyQr.setImageBitmap(bmp);
            } catch (Exception e) {
                binding.ivMbMyQr.setImageResource(R.drawable.ic_qr_code);
            }
        }
    }

    private void setupListeners() {
        binding.btnMbBack.setOnClickListener(v -> finish());
        binding.swipeRefreshMb.setOnRefreshListener(this::loadMisaBesarData);

        binding.btnMbInitPresets.setOnClickListener(v -> showSetupPresetsDialog());
        binding.btnMbSelectLatihan.setOnClickListener(v -> showSelectLatihanDialog());
        binding.btnMbAddLatihan.setOnClickListener(v -> showCreateLatihanDialog());
        binding.btnMbAddPetugas.setOnClickListener(v -> showAddPetugasDialog());
        binding.btnMbAllHadir.setOnClickListener(v -> performAllHadir());
        binding.btnMbScanQr.setOnClickListener(v -> launchQrScanner());
        binding.btnMbTogglePaskahCount.setOnClickListener(v -> togglePaskahCount());
    }

    private void loadMisaBesarData() {
        binding.progressMb.setVisibility(View.VISIBLE);
        int year = Calendar.getInstance().get(Calendar.YEAR);
        String token = sessionManager.getAuthHeader();

        ApiClient.getBackendApi().getMisaBesarData(token, year).enqueue(new Callback<MisaBesarResponse>() {
            @Override
            public void onResponse(@NonNull Call<MisaBesarResponse> call, @NonNull Response<MisaBesarResponse> response) {
                binding.progressMb.setVisibility(View.GONE);
                binding.swipeRefreshMb.setRefreshing(false);

                if (response.isSuccessful() && response.body() != null) {
                    MisaBesarResponse data = response.body();
                    if (data.isNeedsMigration()) {
                        binding.cardMbMigrationNotice.setVisibility(View.VISIBLE);
                        binding.btnMbInitPresets.setVisibility(View.GONE);
                        return;
                    }
                    binding.cardMbMigrationNotice.setVisibility(View.GONE);

                    events.clear();
                    if (data.getEvents() != null) events.addAll(data.getEvents());

                    absensiList.clear();
                    if (data.getAbsensi() != null) absensiList.addAll(data.getAbsensi());

                    activeMembers.clear();
                    if (data.getActiveMembers() != null) activeMembers.addAll(data.getActiveMembers());

                    if (isPengurusMode) {
                        binding.btnMbInitPresets.setVisibility(events.size() < 7 ? View.VISIBLE : View.GONE);
                    }

                    if (!events.isEmpty()) {
                        boolean stillExists = false;
                        for (MisaBesarResponse.MisaBesarEvent ev : events) {
                            if (ev.getId().equals(selectedEventId)) {
                                stillExists = true;
                                break;
                            }
                        }
                        if (!stillExists) {
                            selectedEventId = events.get(0).getId();
                            selectedLatihanId = null;
                            selectedSessionFilterId = "semua";
                        }
                    } else {
                        selectedEventId = null;
                    }

                    renderEventChips();
                    renderSelectedEvent();
                } else {
                    Toast.makeText(LatihanMisaBesarActivity.this, "Gagal memuat data Misa Besar.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<MisaBesarResponse> call, @NonNull Throwable t) {
                binding.progressMb.setVisibility(View.GONE);
                binding.swipeRefreshMb.setRefreshing(false);
                Toast.makeText(LatihanMisaBesarActivity.this, "Gangguan koneksi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private MisaBesarResponse.MisaBesarEvent getSelectedEvent() {
        for (MisaBesarResponse.MisaBesarEvent ev : events) {
            if (ev.getId().equals(selectedEventId)) return ev;
        }
        return events.isEmpty() ? null : events.get(0);
    }

    private MisaBesarResponse.MisaBesarLatihan getSelectedLatihan(MisaBesarResponse.MisaBesarEvent ev) {
        if (ev == null || ev.getLatihan() == null || ev.getLatihan().isEmpty()) return null;
        for (MisaBesarResponse.MisaBesarLatihan l : ev.getLatihan()) {
            if (l.getId().equals(selectedLatihanId)) return l;
        }
        return ev.getLatihan().get(0);
    }

    private void renderEventChips() {
        binding.chipGroupMbEvents.removeAllViews();
        for (MisaBesarResponse.MisaBesarEvent ev : events) {
            Chip chip = new Chip(this);
            chip.setText(ev.getNamaPerayaan() + " (" + ev.getJumlahSesi() + " " + ev.getJenisSesi() + ")");
            chip.setCheckable(true);
            chip.setChecked(ev.getId().equals(selectedEventId));
            chip.setOnClickListener(v -> {
                selectedEventId = ev.getId();
                selectedLatihanId = null;
                selectedSessionFilterId = "semua";
                renderSelectedEvent();
            });
            binding.chipGroupMbEvents.addView(chip);
        }
    }

    private void renderSelectedEvent() {
        MisaBesarResponse.MisaBesarEvent ev = getSelectedEvent();
        if (ev == null) {
            adapter.updateData(new ArrayList<>(), new HashMap<>());
            binding.tvMbEmpty.setVisibility(View.VISIBLE);
            binding.tvMbEmpty.setText(isPengurusMode
                    ? "Belum ada paket Misa Besar. Tekan tombol 'Setup 7 Misa' di kanan atas."
                    : "Belum ada rangkaian Misa Besar yang dipublikasikan.");
            return;
        }

        MisaBesarResponse.MisaBesarLatihan lat = getSelectedLatihan(ev);
        if (lat != null) {
            selectedLatihanId = lat.getId();
        } else {
            selectedLatihanId = null;
        }

        if (isPengurusMode) {
            binding.tvMbActiveEventInfo.setText(ev.getNamaPerayaan() + " " + ev.getTahun()
                    + " (" + ev.getJumlahSesi() + " " + ev.getJenisSesi() + ")");

            if (lat != null) {
                binding.tvMbActiveLatihanInfo.setText("Latihan Aktif: " + lat.getJudulLatihan()
                        + " • " + lat.getTanggalLatihan() + " (" + lat.getJamMulai() + " WIB)");
            } else {
                binding.tvMbActiveLatihanInfo.setText("Belum ada sesi latihan. Tekan '+ Latihan' untuk membuat.");
            }

            binding.btnMbTogglePaskahCount.setVisibility("paskah".equals(ev.getKodePerayaan()) ? View.VISIBLE : View.GONE);
            binding.btnMbTogglePaskahCount.setText(ev.getJumlahSesi() == 2 ? "Ubah ke 3 Misa" : "Ubah ke 2 Misa");

            // Render session filter chips
            binding.chipGroupMbSessions.removeAllViews();
            Chip allChip = new Chip(this);
            allChip.setText("Semua " + ev.getJenisSesi());
            allChip.setCheckable(true);
            allChip.setChecked("semua".equals(selectedSessionFilterId));
            allChip.setOnClickListener(v -> {
                selectedSessionFilterId = "semua";
                renderSelectedEvent();
            });
            binding.chipGroupMbSessions.addView(allChip);

            if (ev.getSessions() != null) {
                for (MisaBesarResponse.MisaBesarSession sess : ev.getSessions()) {
                    Chip sc = new Chip(this);
                    sc.setText(sess.getNamaSesi());
                    sc.setCheckable(true);
                    sc.setChecked(sess.getId().equals(selectedSessionFilterId));
                    sc.setOnClickListener(v -> {
                        selectedSessionFilterId = sess.getId();
                        renderSelectedEvent();
                    });
                    binding.chipGroupMbSessions.addView(sc);
                }
            }
        }

        // Map absensi by petugas_id for the active latihan
        Map<String, MisaBesarResponse.MisaBesarAbsensi> absMap = new HashMap<>();
        if (lat != null) {
            for (MisaBesarResponse.MisaBesarAbsensi a : absensiList) {
                if (lat.getId().equals(a.getLatihanId())) {
                    absMap.put(a.getPetugasId(), a);
                }
            }
        }

        List<MisaBesarResponse.MisaBesarPetugas> filteredPetugas = new ArrayList<>();
        String myUid = sessionManager.getUserId();

        if (ev.getPetugas() != null) {
            for (MisaBesarResponse.MisaBesarPetugas p : ev.getPetugas()) {
                if (!isPengurusMode) {
                    if (myUid != null && myUid.equals(p.getUserId())) {
                        filteredPetugas.add(p);
                    }
                } else {
                    if (lat != null && lat.getSessionId() != null && !lat.getSessionId().equals(p.getSessionId())) {
                        continue;
                    }
                    if (!"semua".equals(selectedSessionFilterId) && !selectedSessionFilterId.equals(p.getSessionId())) {
                        continue;
                    }
                    filteredPetugas.add(p);
                }
            }
        }

        if (isPengurusMode) {
            int hadir = 0, telat = 0, izin = 0, alpa = 0, belum = 0;
            for (MisaBesarResponse.MisaBesarPetugas p : filteredPetugas) {
                MisaBesarResponse.MisaBesarAbsensi rec = absMap.get(p.getId());
                if (rec == null) belum++;
                else if ("hadir".equalsIgnoreCase(rec.getStatusKehadiran())) hadir++;
                else if ("terlambat".equalsIgnoreCase(rec.getStatusKehadiran())) telat++;
                else if ("izin".equalsIgnoreCase(rec.getStatusKehadiran())) izin++;
                else if ("alpa".equalsIgnoreCase(rec.getStatusKehadiran())) alpa++;
            }
            binding.tvMbStatsStrip.setText("Total: " + filteredPetugas.size()
                    + " | Hadir: " + hadir
                    + " | Telat: " + telat
                    + " | Izin: " + izin
                    + " | Alpa: " + alpa
                    + " | Belum: " + belum);
        }

        adapter.updateData(filteredPetugas, absMap);
        binding.tvMbEmpty.setVisibility(filteredPetugas.isEmpty() ? View.VISIBLE : View.GONE);
        if (filteredPetugas.isEmpty()) {
            binding.tvMbEmpty.setText(isPengurusMode
                    ? "Belum ada petugas di sesi ini. Tekan '+ Petugas' untuk menambahkan."
                    : "Anda tidak memiliki jadwal tugas pada perayaan " + ev.getNamaPerayaan() + ".");
        }
    }

    private void showSetupPresetsDialog() {
        String[] options = new String[]{"Paskah 3 Misa (Default)", "Paskah 2 Misa"};
        new AlertDialog.Builder(this)
                .setTitle("Buat Otomatis 7 Perayaan Misa Besar")
                .setItems(options, (dialog, which) -> {
                    int paskahCount = (which == 1) ? 2 : 3;
                    Map<String, Object> body = new HashMap<>();
                    body.put("action", "init_all_presets");
                    body.put("tahun", Calendar.getInstance().get(Calendar.YEAR));
                    body.put("paskah_jumlah_sesi", paskahCount);

                    ApiClient.getBackendApi().setupMisaBesar(sessionManager.getAuthHeader(), body)
                            .enqueue(simpleReloadCallback("7 Perayaan Misa Besar berhasil disiapkan!"));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private void togglePaskahCount() {
        MisaBesarResponse.MisaBesarEvent ev = getSelectedEvent();
        if (ev == null) return;
        int newCount = ev.getJumlahSesi() == 2 ? 3 : 2;
        Map<String, Object> body = new HashMap<>();
        body.put("action", "update_sessions_count");
        body.put("event_id", ev.getId());
        body.put("jumlah_sesi", newCount);

        ApiClient.getBackendApi().setupMisaBesar(sessionManager.getAuthHeader(), body)
                .enqueue(simpleReloadCallback("Jumlah Misa Paskah diubah menjadi " + newCount + " Misa."));
    }

    private void showSelectLatihanDialog() {
        MisaBesarResponse.MisaBesarEvent ev = getSelectedEvent();
        if (ev == null || ev.getLatihan() == null || ev.getLatihan().isEmpty()) {
            Toast.makeText(this, "Belum ada sesi latihan. Tekan '+ Latihan' terlebih dahulu.", Toast.LENGTH_SHORT).show();
            return;
        }
        String[] labels = new String[ev.getLatihan().size()];
        for (int i = 0; i < ev.getLatihan().size(); i++) {
            MisaBesarResponse.MisaBesarLatihan l = ev.getLatihan().get(i);
            labels[i] = l.getJudulLatihan() + " (" + l.getTanggalLatihan() + " • " + l.getJamMulai() + ")";
        }

        new AlertDialog.Builder(this)
                .setTitle("Pilih Pertemuan Latihan")
                .setItems(labels, (d, idx) -> {
                    selectedLatihanId = ev.getLatihan().get(idx).getId();
                    renderSelectedEvent();
                })
                .setNegativeButton("Tutup", null)
                .show();
    }

    private void showCreateLatihanDialog() {
        MisaBesarResponse.MisaBesarEvent ev = getSelectedEvent();
        if (ev == null) {
            Toast.makeText(this, "Siapkan perayaan terlebih dahulu.", Toast.LENGTH_SHORT).show();
            return;
        }

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(48, 24, 48, 12);

        EditText etJudul = new EditText(this);
        etJudul.setHint("Judul (mis: Latihan 1 / Gladi Bersih)");
        etJudul.setText("Latihan " + ev.getNamaPerayaan());
        container.addView(etJudul);

        EditText etTanggal = new EditText(this);
        etTanggal.setHint("Tanggal (YYYY-MM-DD)");
        etTanggal.setText(new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
        container.addView(etTanggal);

        EditText etJam = new EditText(this);
        etJam.setHint("Jam Mulai (mis: 16:00)");
        etJam.setText("16:00");
        container.addView(etJam);

        Spinner spScope = new Spinner(this);
        List<String> scopeNames = new ArrayList<>();
        final List<String> scopeIds = new ArrayList<>();
        scopeNames.add("Latihan Gabungan (Semua Sesi)");
        scopeIds.add("");
        if (ev.getSessions() != null) {
            for (MisaBesarResponse.MisaBesarSession s : ev.getSessions()) {
                scopeNames.add("Khusus " + s.getNamaSesi());
                scopeIds.add(s.getId());
            }
        }
        spScope.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, scopeNames));
        container.addView(spScope);

        new AlertDialog.Builder(this)
                .setTitle("Buat Jadwal Latihan")
                .setView(container)
                .setPositiveButton("Simpan", (d, w) -> {
                    String judul = etJudul.getText().toString().trim();
                    String tgl = etTanggal.getText().toString().trim();
                    String jam = etJam.getText().toString().trim();
                    if (judul.isEmpty() || tgl.isEmpty()) {
                        Toast.makeText(this, "Judul dan tanggal wajib diisi.", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    Map<String, Object> body = new HashMap<>();
                    body.put("event_id", ev.getId());
                    String scId = scopeIds.get(spScope.getSelectedItemPosition());
                    body.put("session_id", scId.isEmpty() ? null : scId);
                    body.put("judul_latihan", judul);
                    body.put("tanggal_latihan", tgl);
                    body.put("jam_mulai", jam.isEmpty() ? "16:00" : jam);

                    ApiClient.getBackendApi().createMisaBesarLatihan(sessionManager.getAuthHeader(), body)
                            .enqueue(simpleReloadCallback("Jadwal latihan berhasil dibuat!"));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private void showAddPetugasDialog() {
        MisaBesarResponse.MisaBesarEvent ev = getSelectedEvent();
        if (ev == null || ev.getSessions() == null || ev.getSessions().isEmpty()) {
            Toast.makeText(this, "Pilih perayaan terlebih dahulu.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (activeMembers.isEmpty()) {
            Toast.makeText(this, "Tidak ada daftar anggota aktif.", Toast.LENGTH_SHORT).show();
            return;
        }

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(48, 24, 48, 12);

        Spinner spSession = new Spinner(this);
        List<String> sessNames = new ArrayList<>();
        for (MisaBesarResponse.MisaBesarSession s : ev.getSessions()) {
            sessNames.add(s.getNamaSesi() + " (" + s.getJamMulai() + ")");
        }
        spSession.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, sessNames));
        container.addView(spSession);

        Spinner spMember = new Spinner(this);
        List<String> memberNames = new ArrayList<>();
        for (Profile m : activeMembers) {
            memberNames.add(m.getNamaLengkap() + " (" + m.getJenjang() + ")");
        }
        spMember.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, memberNames));
        container.addView(spMember);

        Spinner spPosisi = new Spinner(this);
        spPosisi.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, POSITIONS));
        container.addView(spPosisi);

        new AlertDialog.Builder(this)
                .setTitle("Tambah Petugas " + ev.getNamaPerayaan())
                .setView(container)
                .setPositiveButton("Tambahkan", (d, w) -> {
                    String sessionId = ev.getSessions().get(spSession.getSelectedItemPosition()).getId();
                    String userId = activeMembers.get(spMember.getSelectedItemPosition()).getId();
                    String posisi = POSITIONS[spPosisi.getSelectedItemPosition()];

                    Map<String, Object> body = new HashMap<>();
                    body.put("session_id", sessionId);
                    body.put("user_id", userId);
                    body.put("posisi_tugas", posisi);

                    ApiClient.getBackendApi().addMisaBesarPetugas(sessionManager.getAuthHeader(), body)
                            .enqueue(simpleReloadCallback("Petugas berhasil ditambahkan!"));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private void performAllHadir() {
        if (selectedLatihanId == null) {
            Toast.makeText(this, "Buat atau pilih sesi latihan terlebih dahulu.", Toast.LENGTH_SHORT).show();
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("Tandai Semua Hadir?")
                .setMessage("Semua petugas pada filter sesi ini akan dicatat sebagai HADIR.")
                .setPositiveButton("Ya, Tandai Hadir", (d, w) -> {
                    Map<String, Object> body = new HashMap<>();
                    body.put("latihan_id", selectedLatihanId);
                    body.put("bulk_action", "all_hadir");
                    if (!"semua".equals(selectedSessionFilterId)) {
                        body.put("session_id", selectedSessionFilterId);
                    }
                    ApiClient.getBackendApi().submitMisaBesarAbsensi(sessionManager.getAuthHeader(), body)
                            .enqueue(simpleReloadCallback("Semua petugas berhasil dicatat hadir!"));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private void launchQrScanner() {
        if (selectedLatihanId == null) {
            Toast.makeText(this, "Buat atau pilih sesi latihan terlebih dahulu sebelum scan QR.", Toast.LENGTH_LONG).show();
            return;
        }
        IntentIntegrator integrator = new IntentIntegrator(this);
        integrator.setPrompt("Sorot QR Kartu Latihan pada HP misdinar");
        integrator.setBeepEnabled(true);
        integrator.setOrientationLocked(false);
        integrator.initiateScan();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (result != null && result.getContents() != null && selectedLatihanId != null) {
            Map<String, Object> body = new HashMap<>();
            body.put("latihan_id", selectedLatihanId);
            body.put("qr_data", result.getContents().trim());

            Toast.makeText(this, "Memproses QR Latihan...", Toast.LENGTH_SHORT).show();
            ApiClient.getBackendApi().submitMisaBesarAbsensi(sessionManager.getAuthHeader(), body)
                    .enqueue(new Callback<ResponseBody>() {
                        @Override
                        public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                            if (response.isSuccessful() && response.body() != null) {
                                try {
                                    JSONObject json = new JSONObject(response.body().string());
                                    String msg = json.optString("message", "Absensi latihan tercatat!");
                                    new AlertDialog.Builder(LatihanMisaBesarActivity.this)
                                            .setTitle("✅ Absensi Latihan Berhasil")
                                            .setMessage(msg)
                                            .setPositiveButton("OK", null)
                                            .show();
                                    loadMisaBesarData();
                                } catch (Exception e) {
                                    loadMisaBesarData();
                                }
                            } else {
                                String err = "QR Code tidak terdaftar di sesi latihan ini.";
                                try {
                                    if (response.errorBody() != null) {
                                        err = new JSONObject(response.errorBody().string()).optString("error", err);
                                    }
                                } catch (Exception ignored) {}
                                new AlertDialog.Builder(LatihanMisaBesarActivity.this)
                                        .setTitle("⚠️ Verifikasi Gagal")
                                        .setMessage(err)
                                        .setPositiveButton("Tutup", null)
                                        .show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                            Toast.makeText(LatihanMisaBesarActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
        }
    }

    @Override
    public void onMarkStatus(MisaBesarResponse.MisaBesarPetugas petugas, String status, String existingCatatan) {
        if (selectedLatihanId == null) {
            Toast.makeText(this, "Buat atau pilih sesi latihan terlebih dahulu (+ Latihan).", Toast.LENGTH_LONG).show();
            return;
        }

        if ("izin".equalsIgnoreCase(status)) {
            EditText input = new EditText(this);
            input.setInputType(InputType.TYPE_CLASS_TEXT);
            input.setHint("Alasan izin (opsional)");
            input.setText(existingCatatan);
            new AlertDialog.Builder(this)
                    .setTitle("Catatan Izin Latihan")
                    .setView(input)
                    .setPositiveButton("Simpan Izin", (d, w) -> sendSingleAbsensi(petugas.getId(), status, input.getText().toString().trim()))
                    .setNegativeButton("Batal", null)
                    .show();
        } else {
            sendSingleAbsensi(petugas.getId(), status, "");
        }
    }

    private void sendSingleAbsensi(String petugasId, String status, String catatan) {
        Map<String, Object> body = new HashMap<>();
        body.put("latihan_id", selectedLatihanId);
        body.put("petugas_id", petugasId);
        body.put("status_kehadiran", status);
        body.put("catatan", catatan);

        ApiClient.getBackendApi().submitMisaBesarAbsensi(sessionManager.getAuthHeader(), body)
                .enqueue(simpleReloadCallback(null));
    }

    @Override
    public void onDeletePetugas(MisaBesarResponse.MisaBesarPetugas petugas) {
        String nama = petugas.getProfile() != null ? petugas.getProfile().getNamaLengkap() : "petugas ini";
        new AlertDialog.Builder(this)
                .setTitle("Hapus Petugas")
                .setMessage("Hapus " + nama + " dari daftar petugas Misa Besar sesi ini?")
                .setPositiveButton("Hapus", (d, w) -> {
                    ApiClient.getBackendApi().deleteMisaBesarPetugas(sessionManager.getAuthHeader(), petugas.getId())
                            .enqueue(simpleReloadCallback("Petugas berhasil dihapus."));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private Callback<ResponseBody> simpleReloadCallback(@Nullable String successToast) {
        return new Callback<ResponseBody>() {
            @Override
            public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                if (response.isSuccessful()) {
                    if (successToast != null) {
                        Toast.makeText(LatihanMisaBesarActivity.this, successToast, Toast.LENGTH_SHORT).show();
                    }
                    loadMisaBesarData();
                } else {
                    String err = "Gagal memproses permintaan.";
                    try {
                        if (response.errorBody() != null) {
                            err = new JSONObject(response.errorBody().string()).optString("error", err);
                        }
                    } catch (Exception ignored) {}
                    Toast.makeText(LatihanMisaBesarActivity.this, err, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                Toast.makeText(LatihanMisaBesarActivity.this, "Gangguan koneksi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        };
    }
}
