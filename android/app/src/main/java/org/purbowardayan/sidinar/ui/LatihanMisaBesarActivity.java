package org.purbowardayan.sidinar.ui;

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
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import okhttp3.ResponseBody;
import org.json.JSONObject;
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

    private final List<MisaBesarResponse.MisaBesarEvent> events = new ArrayList<>();
    private final List<MisaBesarResponse.MisaBesarAbsensi> absensiList = new ArrayList<>();
    private final List<Profile> activeMembers = new ArrayList<>();

    private String selectedEventId = null;
    private String selectedLatihanId = null;
    private String selectedSessionId = null;
    private boolean showingDicoretList = false;

    private static final String[] POSITIONS = new String[]{
            "Petugas Altar / Cadangan",
            "Pembawa Salib Prosesi",
            "Pembawa Lilin I (Kanan)",
            "Pembawa Lilin II (Kiri)",
            "Petugas Altar & Meja Kredens",
            "Petugas Lavabo & Bel / Genta",
            "Pembawa Pedupaan / Wiruk",
            "Pembawa Wadah Dupa (Navikula)",
            "Pemimpin Barisan & Sakristan"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLatihanMisaBesarBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);
        if (!sessionManager.isLoggedIn() || !sessionManager.isPengurus()) {
            Toast.makeText(this, "Akses ditolak: Menu ini khusus untuk Pengurus.", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        setupUI();
        setupListeners();
        loadMisaBesarData();
    }

    private void setupUI() {
        adapter = new MisaBesarAbsensiAdapter(this);
        binding.rvMbPetugas.setLayoutManager(new LinearLayoutManager(this));
        binding.rvMbPetugas.setAdapter(adapter);
        binding.layoutMbPengurusControls.setVisibility(View.VISIBLE);
    }

    private void setupListeners() {
        binding.btnMbBack.setOnClickListener(v -> finish());
        binding.swipeRefreshMb.setOnRefreshListener(this::loadMisaBesarData);

        binding.btnMbInitPresets.setOnClickListener(v -> showSetupPresetsDialog());
        binding.btnMbDeleteEvent.setOnClickListener(v -> confirmDeleteActiveEvent());
        binding.btnMbSelectLatihan.setOnClickListener(v -> showSelectLatihanDialog());
        binding.btnMbAddLatihan.setOnClickListener(v -> showCreateLatihanDialog());
        binding.btnMbAddPetugas.setOnClickListener(v -> showAddPetugasDialog());
        binding.btnMbAllHadir.setOnClickListener(v -> performBulkAbsensi("all_hadir"));
        binding.btnMbRemainingAlpa.setOnClickListener(v -> performBulkAbsensi("remaining_alpa"));
        binding.btnMbTogglePaskahCount.setOnClickListener(v -> togglePaskahCount());
        binding.btnMbToggleDicoretView.setOnClickListener(v -> {
            showingDicoretList = !showingDicoretList;
            renderSelectedEvent();
        });
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
                        return;
                    }
                    binding.cardMbMigrationNotice.setVisibility(View.GONE);

                    events.clear();
                    if (data.getEvents() != null) events.addAll(data.getEvents());

                    absensiList.clear();
                    if (data.getAbsensi() != null) absensiList.addAll(data.getAbsensi());

                    activeMembers.clear();
                    if (data.getActiveMembers() != null) activeMembers.addAll(data.getActiveMembers());

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
                            List<MisaBesarResponse.MisaBesarSession> firstSess = events.get(0).getSessions();
                            selectedSessionId = (firstSess != null && !firstSess.isEmpty()) ? firstSess.get(0).getId() : null;
                            showingDicoretList = false;
                        }
                    } else {
                        selectedEventId = null;
                        selectedSessionId = null;
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

    private MisaBesarResponse.MisaBesarSession getSelectedSession(MisaBesarResponse.MisaBesarEvent ev) {
        if (ev == null || ev.getSessions() == null || ev.getSessions().isEmpty()) return null;
        for (MisaBesarResponse.MisaBesarSession s : ev.getSessions()) {
            if (s.getId().equals(selectedSessionId)) return s;
        }
        return ev.getSessions().get(0);
    }

    private List<MisaBesarResponse.MisaBesarLatihan> getRelevantLatihan(
            MisaBesarResponse.MisaBesarEvent ev,
            MisaBesarResponse.MisaBesarSession sess
    ) {
        List<MisaBesarResponse.MisaBesarLatihan> list = new ArrayList<>();
        if (ev == null || ev.getLatihan() == null) return list;
        for (MisaBesarResponse.MisaBesarLatihan l : ev.getLatihan()) {
            if (l.getSessionId() == null || (sess != null && l.getSessionId().equals(sess.getId()))) {
                list.add(l);
            }
        }
        return list;
    }

    private MisaBesarResponse.MisaBesarLatihan getSelectedLatihan(
            MisaBesarResponse.MisaBesarEvent ev,
            MisaBesarResponse.MisaBesarSession sess
    ) {
        List<MisaBesarResponse.MisaBesarLatihan> rel = getRelevantLatihan(ev, sess);
        if (rel.isEmpty()) return null;
        for (MisaBesarResponse.MisaBesarLatihan l : rel) {
            if (l.getId().equals(selectedLatihanId)) return l;
        }
        return rel.get(0);
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
                List<MisaBesarResponse.MisaBesarSession> sList = ev.getSessions();
                selectedSessionId = (sList != null && !sList.isEmpty()) ? sList.get(0).getId() : null;
                showingDicoretList = false;
                renderSelectedEvent();
            });
            binding.chipGroupMbEvents.addView(chip);
        }
    }

    private void renderSelectedEvent() {
        MisaBesarResponse.MisaBesarEvent ev = getSelectedEvent();
        if (ev == null) {
            binding.layoutMbPengurusControls.setVisibility(View.GONE);
            binding.btnMbToggleDicoretView.setVisibility(View.GONE);
            adapter.updateData(new ArrayList<>(), new HashMap<>(), new HashMap<>());
            binding.tvMbEmpty.setVisibility(View.VISIBLE);
            binding.tvMbEmpty.setText("Belum ada tugas Misa Besar. Tekan '+ Tugas Misa' di kanan atas untuk memilih Natal / Paskah.");
            return;
        }

        binding.layoutMbPengurusControls.setVisibility(View.VISIBLE);
        MisaBesarResponse.MisaBesarSession activeSess = getSelectedSession(ev);
        if (activeSess != null) {
            selectedSessionId = activeSess.getId();
        }

        MisaBesarResponse.MisaBesarLatihan lat = getSelectedLatihan(ev, activeSess);
        selectedLatihanId = lat != null ? lat.getId() : null;

        String sessTitle = activeSess != null ? (" — " + activeSess.getNamaSesi()) : "";
        binding.tvMbActiveEventInfo.setText(ev.getNamaPerayaan() + " " + ev.getTahun() + sessTitle);

        if (lat != null) {
            binding.tvMbActiveLatihanInfo.setText("Latihan: " + lat.getJudulLatihan()
                    + " • " + lat.getTanggalLatihan() + " (" + lat.getJamMulai() + " WIB)");
        } else {
            binding.tvMbActiveLatihanInfo.setText("Belum ada latihan untuk sesi ini. Tekan '+ Latihan'.");
        }

        binding.btnMbTogglePaskahCount.setVisibility("paskah".equals(ev.getKodePerayaan()) ? View.VISIBLE : View.GONE);
        binding.btnMbTogglePaskahCount.setText(ev.getJumlahSesi() == 2 ? "Ubah 3 Misa" : "Ubah 2 Misa");

        // Separated Per-Misa / Per-Ibadat tabs
        binding.chipGroupMbSessions.removeAllViews();
        if (ev.getSessions() != null) {
            for (MisaBesarResponse.MisaBesarSession sess : ev.getSessions()) {
                Chip sc = new Chip(this);
                sc.setText(sess.getNamaSesi());
                sc.setCheckable(true);
                sc.setChecked(activeSess != null && sess.getId().equals(activeSess.getId()));
                sc.setOnClickListener(v -> {
                    selectedSessionId = sess.getId();
                    selectedLatihanId = null;
                    showingDicoretList = false;
                    renderSelectedEvent();
                });
                binding.chipGroupMbSessions.addView(sc);
            }
        }

        // Hitung Alpa total per petugas_id
        Map<String, Integer> alpaCounts = new HashMap<>();
        for (MisaBesarResponse.MisaBesarAbsensi a : absensiList) {
            if ("alpa".equalsIgnoreCase(a.getStatusKehadiran())) {
                Integer cur = alpaCounts.get(a.getPetugasId());
                alpaCounts.put(a.getPetugasId(), (cur != null ? cur : 0) + 1);
            }
        }

        // Map absensi untuk latihan aktif
        Map<String, MisaBesarResponse.MisaBesarAbsensi> absMap = new HashMap<>();
        if (lat != null) {
            for (MisaBesarResponse.MisaBesarAbsensi a : absensiList) {
                if (lat.getId().equals(a.getLatihanId())) {
                    absMap.put(a.getPetugasId(), a);
                }
            }
        }

        List<MisaBesarResponse.MisaBesarPetugas> activeList = new ArrayList<>();
        List<MisaBesarResponse.MisaBesarPetugas> dicoretList = new ArrayList<>();

        if (ev.getPetugas() != null) {
            for (MisaBesarResponse.MisaBesarPetugas p : ev.getPetugas()) {
                if (activeSess != null && !activeSess.getId().equals(p.getSessionId())) {
                    continue;
                }
                if (p.isDicoret()) {
                    dicoretList.add(p);
                } else {
                    activeList.add(p);
                }
            }
        }

        int hadir = 0, telat = 0, izin = 0, alpa = 0;
        for (MisaBesarResponse.MisaBesarPetugas p : activeList) {
            MisaBesarResponse.MisaBesarAbsensi rec = absMap.get(p.getId());
            if (rec != null) {
                if ("hadir".equalsIgnoreCase(rec.getStatusKehadiran())) hadir++;
                else if ("terlambat".equalsIgnoreCase(rec.getStatusKehadiran())) telat++;
                else if ("izin".equalsIgnoreCase(rec.getStatusKehadiran())) izin++;
                else if ("alpa".equalsIgnoreCase(rec.getStatusKehadiran())) alpa++;
            }
        }

        binding.tvMbStatsStrip.setText("Aktif: " + activeList.size()
                + " | Hadir: " + hadir
                + " | Telat: " + telat
                + " | Izin: " + izin
                + " | Alpa: " + alpa
                + " | Dicoret: " + dicoretList.size());

        if (dicoretList.isEmpty()) {
            showingDicoretList = false;
            binding.btnMbToggleDicoretView.setVisibility(View.GONE);
        } else {
            binding.btnMbToggleDicoretView.setVisibility(View.VISIBLE);
            binding.btnMbToggleDicoretView.setText(showingDicoretList
                    ? "Lihat Aktif (" + activeList.size() + ")"
                    : "Dicoret (" + dicoretList.size() + ")");
        }

        List<MisaBesarResponse.MisaBesarPetugas> listToDisplay = showingDicoretList ? dicoretList : activeList;
        binding.tvMbListTitle.setText(showingDicoretList
                ? "Daftar Petugas Dicoret (3x Alpa)"
                : "Daftar Petugas & Presensi (" + activeList.size() + ")");

        adapter.updateData(listToDisplay, absMap, alpaCounts);
        binding.tvMbEmpty.setVisibility(listToDisplay.isEmpty() ? View.VISIBLE : View.GONE);
        if (listToDisplay.isEmpty()) {
            binding.tvMbEmpty.setText("Belum ada petugas terpilih di sesi ini. Tekan '+ Pilih Nama' untuk memilih anggota.");
        }
    }

    private void showSetupPresetsDialog() {
        String[] options = new String[]{
                "Paket Natal (Malam Natal 2 & Natal 2 Misa)",
                "Paket Paskah - 3 Misa (Palma s/d Paskah)",
                "Paket Paskah - 2 Misa (Palma s/d Paskah)",
                "Semua 7 Perayaan Misa Besar (Natal & Paskah)"
        };
        new AlertDialog.Builder(this)
                .setTitle("Pilih / Tambah Tugas Misa Besar")
                .setItems(options, (dialog, which) -> {
                    Map<String, Object> body = new HashMap<>();
                    body.put("action", "init_all_presets");
                    body.put("tahun", Calendar.getInstance().get(Calendar.YEAR));
                    if (which == 0) {
                        body.put("paket", "natal");
                    } else if (which == 1) {
                        body.put("paket", "paskah");
                        body.put("paskah_jumlah_sesi", 3);
                    } else if (which == 2) {
                        body.put("paket", "paskah");
                        body.put("paskah_jumlah_sesi", 2);
                    } else {
                        body.put("paket", "semua");
                        body.put("paskah_jumlah_sesi", 3);
                    }

                    ApiClient.getBackendApi().setupMisaBesar(sessionManager.getAuthHeader(), body)
                            .enqueue(simpleReloadCallback("Tugas Misa Besar berhasil ditambahkan!"));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private void confirmDeleteActiveEvent() {
        MisaBesarResponse.MisaBesarEvent ev = getSelectedEvent();
        if (ev == null) return;
        new AlertDialog.Builder(this)
                .setTitle("Hapus Tugas " + ev.getNamaPerayaan() + "?")
                .setMessage("Seluruh sesi misa, daftar petugas, dan catatan latihan pada perayaan ini akan dihapus.")
                .setPositiveButton("Hapus", (d, w) -> {
                    ApiClient.getBackendApi().deleteMisaBesarEvent(sessionManager.getAuthHeader(), ev.getId())
                            .enqueue(simpleReloadCallback("Perayaan " + ev.getNamaPerayaan() + " dihapus."));
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
        MisaBesarResponse.MisaBesarSession activeSess = getSelectedSession(ev);
        List<MisaBesarResponse.MisaBesarLatihan> rel = getRelevantLatihan(ev, activeSess);
        if (rel.isEmpty()) {
            Toast.makeText(this, "Belum ada sesi latihan untuk sesi ini. Tekan '+ Latihan' terlebih dahulu.", Toast.LENGTH_SHORT).show();
            return;
        }
        String[] labels = new String[rel.size()];
        for (int i = 0; i < rel.size(); i++) {
            MisaBesarResponse.MisaBesarLatihan l = rel.get(i);
            labels[i] = l.getJudulLatihan() + " (" + l.getTanggalLatihan() + " • " + l.getJamMulai() + ")";
        }

        new AlertDialog.Builder(this)
                .setTitle("Pilih Pertemuan Latihan")
                .setItems(labels, (d, idx) -> {
                    selectedLatihanId = rel.get(idx).getId();
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
        MisaBesarResponse.MisaBesarSession activeSess = getSelectedSession(ev);

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(48, 24, 48, 12);

        EditText etJudul = new EditText(this);
        etJudul.setHint("Judul (mis: Latihan 1 / Gladi Bersih)");
        etJudul.setText(activeSess != null
                ? "Latihan " + ev.getNamaPerayaan() + " - " + activeSess.getNamaSesi()
                : "Latihan " + ev.getNamaPerayaan());
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
        int defaultSelectionIdx = 0;
        scopeNames.add("Latihan Gabungan (Semua Sesi)");
        scopeIds.add("");
        if (ev.getSessions() != null) {
            for (MisaBesarResponse.MisaBesarSession s : ev.getSessions()) {
                scopeNames.add("Khusus " + s.getNamaSesi());
                scopeIds.add(s.getId());
                if (activeSess != null && s.getId().equals(activeSess.getId())) {
                    defaultSelectionIdx = scopeIds.size() - 1;
                }
            }
        }
        spScope.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, scopeNames));
        spScope.setSelection(defaultSelectionIdx);
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
        MisaBesarResponse.MisaBesarSession activeSess = getSelectedSession(ev);
        if (ev == null || activeSess == null) {
            Toast.makeText(this, "Pilih perayaan dan sesi terlebih dahulu.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (activeMembers.isEmpty()) {
            Toast.makeText(this, "Tidak ada daftar anggota aktif.", Toast.LENGTH_SHORT).show();
            return;
        }

        Set<String> alreadyAssignedIds = new HashSet<>();
        if (ev.getPetugas() != null) {
            for (MisaBesarResponse.MisaBesarPetugas p : ev.getPetugas()) {
                if (activeSess.getId().equals(p.getSessionId()) && !p.isDicoret()) {
                    alreadyAssignedIds.add(p.getUserId());
                }
            }
        }

        List<Profile> candidateMembers = new ArrayList<>();
        for (Profile m : activeMembers) {
            if (!alreadyAssignedIds.contains(m.getId())) {
                candidateMembers.add(m);
            }
        }

        if (candidateMembers.isEmpty()) {
            Toast.makeText(this, "Semua anggota aktif sudah masuk daftar petugas " + activeSess.getNamaSesi(), Toast.LENGTH_SHORT).show();
            return;
        }

        String[] labels = new String[candidateMembers.size()];
        boolean[] checked = new boolean[candidateMembers.size()];
        for (int i = 0; i < candidateMembers.size(); i++) {
            Profile m = candidateMembers.get(i);
            labels[i] = m.getNamaLengkap() + " (" + m.getJenjang() + " • " + m.getAsalWilayahTeks() + ")";
            checked[i] = false;
        }

        // Tinggal klik nama anggota langsung tercentang!
        new AlertDialog.Builder(this)
                .setTitle("Klik Nama Petugas • " + activeSess.getNamaSesi())
                .setMultiChoiceItems(labels, checked, (dialog, which, isChecked) -> checked[which] = isChecked)
                .setPositiveButton("Simpan Terpilih", (d, w) -> {
                    List<Map<String, Object>> membersPayload = new ArrayList<>();
                    for (int i = 0; i < candidateMembers.size(); i++) {
                        if (checked[i]) {
                            Map<String, Object> item = new HashMap<>();
                            item.put("user_id", candidateMembers.get(i).getId());
                            item.put("posisi_tugas", POSITIONS[0]);
                            membersPayload.add(item);
                        }
                    }

                    if (membersPayload.isEmpty()) {
                        Toast.makeText(this, "Tidak ada nama yang dipilih.", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    Map<String, Object> body = new HashMap<>();
                    body.put("session_id", activeSess.getId());
                    body.put("members", membersPayload);

                    ApiClient.getBackendApi().addMisaBesarPetugas(sessionManager.getAuthHeader(), body)
                            .enqueue(simpleReloadCallback(membersPayload.size() + " petugas ditambahkan ke " + activeSess.getNamaSesi()));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private void performBulkAbsensi(String bulkAction) {
        if (selectedLatihanId == null) {
            Toast.makeText(this, "Buat atau pilih sesi latihan terlebih dahulu.", Toast.LENGTH_SHORT).show();
            return;
        }
        MisaBesarResponse.MisaBesarSession activeSess = getSelectedSession(getSelectedEvent());
        String sessLabel = activeSess != null ? activeSess.getNamaSesi() : "sesi ini";
        String title = "all_hadir".equals(bulkAction) ? "Tandai Semua Hadir?" : "Tandai Sisanya Alpa?";
        String msg = "all_hadir".equals(bulkAction)
                ? "Semua petugas aktif di " + sessLabel + " akan dicatat sebagai HADIR."
                : "Petugas di " + sessLabel + " yang belum absen akan dicatat ALPA (3x Alpa otomatis dicoret).";

        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(msg)
                .setPositiveButton("Ya, Lanjutkan", (d, w) -> {
                    Map<String, Object> body = new HashMap<>();
                    body.put("latihan_id", selectedLatihanId);
                    body.put("bulk_action", bulkAction);
                    if (activeSess != null) {
                        body.put("session_id", activeSess.getId());
                    }
                    sendAbsensiRequest(body);
                })
                .setNegativeButton("Batal", null)
                .show();
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
        sendAbsensiRequest(body);
    }

    private void sendAbsensiRequest(Map<String, Object> body) {
        ApiClient.getBackendApi().submitMisaBesarAbsensi(sessionManager.getAuthHeader(), body)
                .enqueue(new Callback<ResponseBody>() {
                    @Override
                    public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            try {
                                JSONObject json = new JSONObject(response.body().string());
                                boolean autoDicoret = json.optBoolean("auto_dicoret", false);
                                String msg = json.optString("message", "Absensi disimpan.");
                                if (autoDicoret) {
                                    new AlertDialog.Builder(LatihanMisaBesarActivity.this)
                                            .setTitle("⚠️ Otomatis Dicoret (3x Alpa)")
                                            .setMessage(msg)
                                            .setPositiveButton("Mengerti", null)
                                            .show();
                                } else {
                                    Toast.makeText(LatihanMisaBesarActivity.this, msg, Toast.LENGTH_SHORT).show();
                                }
                            } catch (Exception ignored) {}
                            loadMisaBesarData();
                        } else {
                            Toast.makeText(LatihanMisaBesarActivity.this, "Gagal menyimpan absensi.", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                        Toast.makeText(LatihanMisaBesarActivity.this, "Gangguan koneksi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    @Override
    public void onDeletePetugas(MisaBesarResponse.MisaBesarPetugas petugas) {
        String nama = petugas.getProfile() != null ? petugas.getProfile().getNamaLengkap() : "petugas ini";
        new AlertDialog.Builder(this)
                .setTitle("Hapus Permanen Petugas")
                .setMessage("Hapus permanen " + nama + " dari daftar petugas sesi ini?")
                .setPositiveButton("Hapus", (d, w) -> {
                    ApiClient.getBackendApi().deleteMisaBesarPetugas(sessionManager.getAuthHeader(), petugas.getId())
                            .enqueue(simpleReloadCallback("Petugas berhasil dihapus."));
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    @Override
    public void onRestorePetugas(MisaBesarResponse.MisaBesarPetugas petugas) {
        String nama = petugas.getProfile() != null ? petugas.getProfile().getNamaLengkap() : "petugas ini";
        new AlertDialog.Builder(this)
                .setTitle("Pulihkan Petugas")
                .setMessage("Masukkan kembali " + nama + " ke daftar petugas aktif?")
                .setPositiveButton("Pulihkan", (d, w) -> {
                    Map<String, Object> body = new HashMap<>();
                    body.put("id", petugas.getId());
                    body.put("status_petugas", "aktif");
                    ApiClient.getBackendApi().updateMisaBesarPetugas(sessionManager.getAuthHeader(), body)
                            .enqueue(simpleReloadCallback(nama + " berhasil dipulihkan!"));
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
