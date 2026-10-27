package org.purbowardayan.sidinar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.checkbox.MaterialCheckBox;
import com.google.android.material.textfield.TextInputEditText;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import okhttp3.ResponseBody;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.adapter.AnnouncementAdapter;
import org.purbowardayan.sidinar.adapter.AttendanceAdapter;
import org.purbowardayan.sidinar.adapter.MemberAdapter;
import org.purbowardayan.sidinar.adapter.RosterAdapter;
import org.purbowardayan.sidinar.adapter.ScheduleAdapter;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.databinding.ActivityPengurusMainBinding;
import org.purbowardayan.sidinar.model.Announcement;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;
import org.purbowardayan.sidinar.util.AppUpdateManager;
import org.purbowardayan.sidinar.util.LiturgicalUtil;
import org.purbowardayan.sidinar.util.ThemeManager;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PengurusMainActivity extends AppCompatActivity implements
        AnnouncementAdapter.OnAnnouncementActionListener,
        MemberAdapter.OnMemberActionListener,
        AttendanceAdapter.OnAttendanceActionListener {

    private ActivityPengurusMainBinding binding;
    private SessionManager sessionManager;

    private AnnouncementAdapter announcementAdapter;
    private MemberAdapter memberAdapter;
    private ScheduleAdapter scheduleAdapter;
    private AttendanceAdapter attendanceAdapter;

    private final List<Announcement> announcementList = new ArrayList<>();
    private final List<Profile> memberList = new ArrayList<>();
    private final List<MassSchedule> scheduleList = new ArrayList<>();
    private final List<Booking> bookingList = new ArrayList<>();

    // 0 = Announcements, 1 = Members, 2 = Schedules, 3 = Presensi
    private int currentTab = 0;
    private String memberFilter = "pending"; // "pending" | "aktif" | "semua"

    // Real-time auto-sync loop (every 5s while in foreground)
    private final Handler autoSyncHandler = new Handler(Looper.getMainLooper());
    private static final long AUTO_SYNC_INTERVAL_MS = 5000;
    private final Runnable autoSyncRunnable = new Runnable() {
        @Override
        public void run() {
            if (sessionManager.isLoggedIn() && sessionManager.isPengurus()) {
                loadBookings();
                loadMembers();
                loadAnnouncements();
            }
            autoSyncHandler.postDelayed(this, AUTO_SYNC_INTERVAL_MS);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityPengurusMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);
        if (!sessionManager.isLoggedIn() || !sessionManager.isPengurus()) {
            Toast.makeText(this, "Akses ditolak: Hanya untuk Tim Pengurus.", Toast.LENGTH_LONG).show();
            startActivity(new Intent(this, AnggotaMainActivity.class));
            finish();
            return;
        }

        setupUI();
        setupAdapters();
        setupListeners();

        loadAllData();

        // Aktifkan pemantau notifikasi latar belakang
        org.purbowardayan.sidinar.receiver.ReminderSyncReceiver.startBackgroundMonitoring(this);

        // Cek update aplikasi secara otomatis saat membuka aplikasi
        AppUpdateManager.checkForUpdate(this, false);
    }

    private void setupUI() {
        Profile p = sessionManager.getProfile();
        if (p != null) {
            String name = p.getNamaLengkap() != null ? p.getNamaLengkap() : "Pengurus";
            binding.tvPengurusGreeting.setText("Pengurus: " + name);
        }
    }

    private void setupAdapters() {
        announcementAdapter = new AnnouncementAdapter(true, this);
        memberAdapter = new MemberAdapter(this);
        attendanceAdapter = new AttendanceAdapter(this);

        scheduleAdapter = new ScheduleAdapter(new ScheduleAdapter.OnScheduleClickListener() {
            @Override
            public void onBookClick(MassSchedule schedule) {
                showScheduleRosterDialog(schedule);
            }

            @Override
            public void onEditMyBookingClick(MassSchedule schedule) {
                showScheduleRosterDialog(schedule);
            }
        }, null, true);

        binding.rvPengurusList.setLayoutManager(new LinearLayoutManager(this));
        displayCurrentTab();
    }

    private void setupListeners() {
        binding.swipeRefreshPengurus.setOnRefreshListener(this::loadAllData);

        binding.btnViewAsAnggota.setOnClickListener(v -> {
            startActivity(new Intent(PengurusMainActivity.this, AnggotaMainActivity.class));
        });

        binding.btnPengurusTheme.setIconResource(ThemeManager.getThemeIconRes(this));
        binding.btnPengurusTheme.setOnClickListener(v -> {
            ThemeManager.showThemeSelectionDialog(this, newMode -> {
                binding.btnPengurusTheme.setIconResource(ThemeManager.getThemeIconRes(this));
            });
        });

        binding.btnPengurusLogout.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle("Keluar Akun")
                    .setMessage("Yakin ingin keluar dari akun pengurus?")
                    .setPositiveButton("Keluar", (dialog, which) -> {
                        org.purbowardayan.sidinar.receiver.ReminderSyncReceiver.stopBackgroundMonitoring(this);
                        sessionManager.clearSession();
                        Intent intent = new Intent(PengurusMainActivity.this, LoginActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        startActivity(intent);
                        finish();
                    })
                    .setNegativeButton("Batal", null)
                    .show();
        });

        binding.btnAddAnnouncement.setOnClickListener(v -> showAnnouncementDialog(null));
        binding.btnAddSchedule.setOnClickListener(v -> showCreateScheduleDialog());
        binding.btnGenerate30Days.setOnClickListener(v -> handleGenerate30Days());

        // Tab selection
        binding.chipTabAnnouncements.setOnClickListener(v -> {
            currentTab = 0;
            displayCurrentTab();
        });
        binding.chipTabMembers.setOnClickListener(v -> {
            currentTab = 1;
            displayCurrentTab();
        });
        binding.chipTabSchedules.setOnClickListener(v -> {
            currentTab = 2;
            displayCurrentTab();
        });
        binding.chipTabPresensi.setOnClickListener(v -> {
            currentTab = 3;
            displayCurrentTab();
        });

        // Member subfilter
        binding.chipMemberFilterPending.setOnClickListener(v -> {
            memberFilter = "pending";
            displayCurrentTab();
        });
        binding.chipMemberFilterActive.setOnClickListener(v -> {
            memberFilter = "aktif";
            displayCurrentTab();
        });
        binding.chipMemberFilterAll.setOnClickListener(v -> {
            memberFilter = "semua";
            displayCurrentTab();
        });

        // App Version Footer & Check Update
        binding.tvPengurusAppVersion.setText("SiDinar Regina v" + AppUpdateManager.getCurrentVersionName(this) + " • Cek Pembaruan");
        binding.tvPengurusAppVersion.setOnClickListener(v -> {
            AppUpdateManager.checkForUpdate(this, true);
        });
    }

    private void displayCurrentTab() {
        // Toggle action bar visibility
        binding.layoutAnnouncementActions.setVisibility(currentTab == 0 ? View.VISIBLE : View.GONE);
        binding.layoutMemberFilter.setVisibility(currentTab == 1 ? View.VISIBLE : View.GONE);
        binding.layoutScheduleActions.setVisibility(currentTab == 2 ? View.VISIBLE : View.GONE);
        binding.layoutPresensiCounters.setVisibility(currentTab == 3 ? View.VISIBLE : View.GONE);

        if (currentTab == 0) {
            binding.rvPengurusList.setAdapter(announcementAdapter);
            announcementAdapter.updateList(announcementList);
            binding.tvPengurusEmpty.setVisibility(announcementList.isEmpty() ? View.VISIBLE : View.GONE);
            binding.tvPengurusEmpty.setText("Belum ada warta pengumuman sakristi.");
        } else if (currentTab == 1) {
            List<Profile> filtered = new ArrayList<>();
            for (Profile p : memberList) {
                if ("pending".equalsIgnoreCase(memberFilter) && !p.isAktif()) {
                    filtered.add(p);
                } else if ("aktif".equalsIgnoreCase(memberFilter) && p.isAktif()) {
                    filtered.add(p);
                } else if ("semua".equalsIgnoreCase(memberFilter)) {
                    filtered.add(p);
                }
            }
            binding.rvPengurusList.setAdapter(memberAdapter);
            memberAdapter.updateList(filtered);
            binding.tvPengurusEmpty.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
            binding.tvPengurusEmpty.setText("Tidak ada anggota pada kategori ini.");
        } else if (currentTab == 2) {
            binding.rvPengurusList.setAdapter(scheduleAdapter);
            scheduleAdapter.updateList(scheduleList);
            binding.tvPengurusEmpty.setVisibility(scheduleList.isEmpty() ? View.VISIBLE : View.GONE);
            binding.tvPengurusEmpty.setText("Belum ada jadwal misa aktif.");
        } else if (currentTab == 3) {
            binding.rvPengurusList.setAdapter(attendanceAdapter);
            attendanceAdapter.updateList(bookingList);
            binding.tvPengurusEmpty.setVisibility(bookingList.isEmpty() ? View.VISIBLE : View.GONE);
            binding.tvPengurusEmpty.setText("Belum ada data presensi sakristi pada pekan berjalan.");
            updateAttendanceCounters();
        }
    }

    private void updateAttendanceCounters() {
        int hadir = 0, terlambat = 0, izin = 0, alpa = 0;
        for (Booking b : bookingList) {
            String s = b.getStatusKehadiran();
            if ("hadir".equalsIgnoreCase(s)) hadir++;
            else if ("terlambat".equalsIgnoreCase(s)) terlambat++;
            else if ("izin".equalsIgnoreCase(s)) izin++;
            else if ("alpa".equalsIgnoreCase(s)) alpa++;
        }
        binding.tvCounterHadir.setText("Hadir: " + hadir);
        binding.tvCounterTerlambat.setText("Terlambat: " + terlambat);
        binding.tvCounterIzin.setText("Izin: " + izin);
        binding.tvCounterAlpa.setText("Alpa: " + alpa);
    }

    private void loadAllData() {
        binding.swipeRefreshPengurus.setRefreshing(true);
        loadAnnouncements();
        loadMembers();
        loadBookings();
        loadSchedules();
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadAllData();
        startAutoSync();
        org.purbowardayan.sidinar.receiver.ReminderSyncReceiver.startBackgroundMonitoring(this);
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopAutoSync();
    }

    private void startAutoSync() {
        stopAutoSync();
        autoSyncHandler.postDelayed(autoSyncRunnable, AUTO_SYNC_INTERVAL_MS);
    }

    private void stopAutoSync() {
        autoSyncHandler.removeCallbacks(autoSyncRunnable);
    }

    private void loadAnnouncements() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getAnnouncements(authHeader, "*", "is_pinned.desc,created_at.desc").enqueue(new Callback<List<Announcement>>() {
            @Override
            public void onResponse(@NonNull Call<List<Announcement>> call, @NonNull Response<List<Announcement>> response) {
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    announcementList.clear();
                    announcementList.addAll(response.body());
                    if (currentTab == 0) displayCurrentTab();
                } else {
                    fetchAnnouncementsFromBackend();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Announcement>> call, @NonNull Throwable t) {
                fetchAnnouncementsFromBackend();
            }
        });
    }

    private void fetchAnnouncementsFromBackend() {
        ApiClient.getBackendApi().getAnnouncements().enqueue(new Callback<List<Announcement>>() {
            @Override
            public void onResponse(@NonNull Call<List<Announcement>> call, @NonNull Response<List<Announcement>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    announcementList.clear();
                    announcementList.addAll(response.body());
                    if (currentTab == 0) displayCurrentTab();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Announcement>> call, @NonNull Throwable t) {}
        });
    }

    private void loadMembers() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getAllProfiles(authHeader, "*", "nama_lengkap.asc").enqueue(new Callback<List<Profile>>() {
            @Override
            public void onResponse(@NonNull Call<List<Profile>> call, @NonNull Response<List<Profile>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    memberList.clear();
                    memberList.addAll(response.body());

                    int pending = 0;
                    for (Profile p : memberList) {
                        if (!p.isAktif()) pending++;
                    }

                    binding.tvStatTotalAnggota.setText(String.valueOf(memberList.size()));
                    binding.tvStatPendingAnggota.setText(String.valueOf(pending));

                    if (currentTab == 1) displayCurrentTab();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Profile>> call, @NonNull Throwable t) {}
        });
    }

    private void loadBookings() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getAllBookings(authHeader, "*,schedule:mass_schedules(*),profile:profiles(*)", "created_at.desc").enqueue(new Callback<List<Booking>>() {
            @Override
            public void onResponse(@NonNull Call<List<Booking>> call, @NonNull Response<List<Booking>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    bookingList.clear();
                    bookingList.addAll(response.body());
                    recalculateSchedules();
                    if (currentTab == 3) displayCurrentTab();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Booking>> call, @NonNull Throwable t) {}
        });
    }

    private void loadSchedules() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getSchedules(authHeader, "*", "tanggal_misa.asc,jam_mulai.asc").enqueue(new Callback<List<MassSchedule>>() {
            @Override
            public void onResponse(@NonNull Call<List<MassSchedule>> call, @NonNull Response<List<MassSchedule>> response) {
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    binding.swipeRefreshPengurus.setRefreshing(false);
                    scheduleList.clear();
                    scheduleList.addAll(response.body());
                    binding.tvStatActiveSchedules.setText(String.valueOf(scheduleList.size()));
                    recalculateSchedules();
                } else {
                    fetchSchedulesFromBackend();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<MassSchedule>> call, @NonNull Throwable t) {
                fetchSchedulesFromBackend();
            }
        });
    }

    private void fetchSchedulesFromBackend() {
        ApiClient.getBackendApi().getSchedules().enqueue(new Callback<List<MassSchedule>>() {
            @Override
            public void onResponse(@NonNull Call<List<MassSchedule>> call, @NonNull Response<List<MassSchedule>> response) {
                binding.swipeRefreshPengurus.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    scheduleList.clear();
                    scheduleList.addAll(response.body());
                    binding.tvStatActiveSchedules.setText(String.valueOf(scheduleList.size()));
                    recalculateSchedules();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<MassSchedule>> call, @NonNull Throwable t) {
                binding.swipeRefreshPengurus.setRefreshing(false);
            }
        });
    }

    private void recalculateSchedules() {
        Map<String, Integer> countMap = new HashMap<>();
        for (Booking b : bookingList) {
            if (b.getScheduleId() != null) {
                int count = countMap.getOrDefault(b.getScheduleId(), 0);
                countMap.put(b.getScheduleId(), count + 1);
            }
        }

        for (MassSchedule s : scheduleList) {
            int booked = countMap.getOrDefault(s.getId(), 0);
            s.setBookedCount(booked);
        }

        if (currentTab == 2) displayCurrentTab();
    }

    // --- FEATURE 1: Generate Jadwal Otomatis 30 Hari matching Web ---
    private void handleGenerate30Days() {
        new AlertDialog.Builder(this)
                .setTitle("Generate Jadwal 30 Hari Otomatis")
                .setMessage("Generate jadwal misa harian (05.30 WIB) dan misa mingguan otomatis untuk 30 hari ke depan?")
                .setPositiveButton("Generate Sekarang", (dialog, which) -> {
                    String authHeader = "Bearer " + sessionManager.getToken();
                    Map<String, Object> body = new HashMap<>();
                    body.put("daysCount", 30);

                    Toast.makeText(this, "Memproses generate jadwal...", Toast.LENGTH_SHORT).show();

                    ApiClient.getBackendApi().generateSchedules(authHeader, body).enqueue(new Callback<ResponseBody>() {
                        @Override
                        public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(PengurusMainActivity.this, "Jadwal misa 30 hari berhasil digenerate!", Toast.LENGTH_LONG).show();
                                loadAllData();
                            } else {
                                Toast.makeText(PengurusMainActivity.this, "Gagal generate jadwal.", Toast.LENGTH_LONG).show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                            Toast.makeText(PengurusMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    // --- FEATURE 2: Tambah Jadwal Misa Manual matching Web ---
    private void showCreateScheduleDialog() {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_create_schedule, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create();

        TextInputEditText etJudul = dialogView.findViewById(R.id.etScheduleJudul);
        AutoCompleteTextView actvKategori = dialogView.findViewById(R.id.actvScheduleKategori);
        TextInputEditText etKuota = dialogView.findViewById(R.id.etScheduleKuota);
        TextInputEditText etTanggal = dialogView.findViewById(R.id.etScheduleTanggal);
        TextInputEditText etJam = dialogView.findViewById(R.id.etScheduleJam);
        TextInputEditText etSelebran = dialogView.findViewById(R.id.etScheduleSelebran);
        AutoCompleteTextView actvWarna = dialogView.findViewById(R.id.actvScheduleWarna);
        ProgressBar progress = dialogView.findViewById(R.id.progressCreateSchedule);
        MaterialButton btnCancel = dialogView.findViewById(R.id.btnCancelCreateSchedule);
        MaterialButton btnSave = dialogView.findViewById(R.id.btnSaveCreateSchedule);

        // Setup dropdown options
        actvKategori.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, new String[]{"mingguan", "harian"}));
        actvWarna.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, LiturgicalUtil.WARNA_LITURGI_OPTIONS));

        // Default today's date
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault());
        etTanggal.setText(sdf.format(new java.util.Date()));

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String judul = etJudul.getText() != null ? etJudul.getText().toString().trim() : "";
            String kategori = actvKategori.getText() != null ? actvKategori.getText().toString().trim() : "mingguan";
            String kuotaStr = etKuota.getText() != null ? etKuota.getText().toString().trim() : "12";
            String tanggal = etTanggal.getText() != null ? etTanggal.getText().toString().trim() : "";
            String jam = etJam.getText() != null ? etJam.getText().toString().trim() : "08:00";
            String selebran = etSelebran.getText() != null ? etSelebran.getText().toString().trim() : "Romo Paroki";
            String warna = actvWarna.getText() != null ? actvWarna.getText().toString().trim() : "Hijau";

            if (TextUtils.isEmpty(judul) || TextUtils.isEmpty(tanggal) || TextUtils.isEmpty(jam)) {
                Toast.makeText(this, "Judul, tanggal, dan jam misa wajib diisi.", Toast.LENGTH_SHORT).show();
                return;
            }

            int kuota = 12;
            try {
                kuota = Integer.parseInt(kuotaStr);
            } catch (Exception ignored) {}

            progress.setVisibility(View.VISIBLE);
            btnSave.setEnabled(false);
            btnCancel.setEnabled(false);

            MassSchedule newSchedule = new MassSchedule();
            newSchedule.setJudulMisa(judul);
            newSchedule.setKategori(kategori);
            newSchedule.setTanggalMisa(tanggal);
            newSchedule.setJamMulai(jam.length() == 5 ? jam + ":00" : jam);
            newSchedule.setKuotaMaksimal(kuota);
            newSchedule.setNamaSelebran(selebran);
            newSchedule.setWarnaLiturgi(warna);
            newSchedule.setTahunLiturgi("Tahun B / II");

            String authHeader = "Bearer " + sessionManager.getToken();
            ApiClient.getSupabaseApi().createSchedule(authHeader, newSchedule).enqueue(new Callback<Void>() {
                @Override
                public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();
                    if (response.isSuccessful()) {
                        Toast.makeText(PengurusMainActivity.this, "Jadwal misa berhasil dibuat!", Toast.LENGTH_SHORT).show();
                        loadSchedules();
                    } else {
                        Toast.makeText(PengurusMainActivity.this, "Gagal membuat jadwal misa.", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();
                    Toast.makeText(PengurusMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }

    // --- FEATURE 3: Roster Petugas & Alokasi Peran Liturgi matching Web ---
    private void showScheduleRosterDialog(MassSchedule schedule) {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_schedule_roster, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .create();

        TextView tvJudul = dialogView.findViewById(R.id.tvRosterJudulMisa);
        TextView tvWarna = dialogView.findViewById(R.id.tvRosterWarnaBadge);
        TextView tvWaktu = dialogView.findViewById(R.id.tvRosterWaktu);
        TextView tvSelebran = dialogView.findViewById(R.id.tvRosterSelebran);
        TextView tvCount = dialogView.findViewById(R.id.tvRosterCount);
        TextView tvEmpty = dialogView.findViewById(R.id.tvRosterEmpty);
        RecyclerView rvMembers = dialogView.findViewById(R.id.rvRosterMembers);
        MaterialButton btnClose = dialogView.findViewById(R.id.btnCloseRoster);

        tvJudul.setText(schedule.getJudulMisa());
        tvWaktu.setText(schedule.getTanggalMisa() + " • " + schedule.getFormattedTime());
        tvSelebran.setText("Selebran: " + (schedule.getNamaSelebran() != null ? schedule.getNamaSelebran() : "Romo Paroki"));
        tvWarna.setText(schedule.getWarnaLiturgi() != null ? schedule.getWarnaLiturgi() : "Hijau");

        List<Booking> membersForThisSchedule = new ArrayList<>();
        for (Booking b : bookingList) {
            if (schedule.getId().equals(b.getScheduleId())) {
                membersForThisSchedule.add(b);
            }
        }

        tvCount.setText("Petugas Altar Terdaftar (" + membersForThisSchedule.size() + "/" + schedule.getKuotaMaksimal() + ")");
        tvEmpty.setVisibility(membersForThisSchedule.isEmpty() ? View.VISIBLE : View.GONE);

        RosterAdapter rosterAdapter = new RosterAdapter(schedule, booking -> {
            // Show position chooser
            showPositionChooserDialog(booking, schedule, dialog);
        });

        rvMembers.setLayoutManager(new LinearLayoutManager(this));
        rvMembers.setAdapter(rosterAdapter);
        rosterAdapter.updateList(membersForThisSchedule);

        MaterialButton btnRemindAll = dialogView.findViewById(R.id.btnRosterRemindAll);
        if (membersForThisSchedule.isEmpty()) {
            btnRemindAll.setVisibility(View.GONE);
        } else {
            btnRemindAll.setVisibility(View.VISIBLE);
            btnRemindAll.setOnClickListener(v -> {
                new AlertDialog.Builder(this)
                        .setTitle("Ingatkan Semua Petugas")
                        .setMessage("Kirim notifikasi pengingat ke seluruh " + membersForThisSchedule.size() + " petugas misa ini?")
                        .setPositiveButton("Kirim Pengingat", (d, w) -> {
                            String token = sessionManager.getAuthHeader();
                            for (Booking b : membersForThisSchedule) {
                                ApiClient.getBackendApi().recordReminderSent(token, b.getId()).enqueue(new Callback<ResponseBody>() {
                                    @Override
                                    public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                                        b.setWaReminderSent(true);
                                        rosterAdapter.notifyDataSetChanged();
                                    }

                                    @Override
                                    public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                                    }
                                });
                            }
                            Toast.makeText(this, "Notifikasi pengingat dikirim ke seluruh HP petugas!", Toast.LENGTH_SHORT).show();
                        })
                        .setNegativeButton("Batal", null)
                        .show();
            });
        }

        btnClose.setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    private void showPositionChooserDialog(Booking booking, MassSchedule schedule, AlertDialog parentDialog) {
        CharSequence[] positions = LiturgicalUtil.LITURGICAL_POSITIONS;

        new AlertDialog.Builder(this)
                .setTitle("Tentukan Peran Liturgi")
                .setItems(positions, (dialog, which) -> {
                    String selectedPosition = positions[which].toString();
                    String authHeader = "Bearer " + sessionManager.getToken();

                    Map<String, Object> body = new HashMap<>();
                    body.put("posisi_tugas", selectedPosition);

                    ApiClient.getSupabaseApi().updateBookingPosition(authHeader, "eq." + booking.getId(), body).enqueue(new Callback<Void>() {
                        @Override
                        public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(PengurusMainActivity.this, "Peran diubah menjadi: " + selectedPosition, Toast.LENGTH_SHORT).show();
                                parentDialog.dismiss();
                                loadBookings();
                            } else {
                                Toast.makeText(PengurusMainActivity.this, "Gagal mengubah peran.", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                            Toast.makeText(PengurusMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    // --- FEATURE 4: Live Presensi Status Changer matching Web ---
    @Override
    public void onChangeStatus(Booking booking) {
        CharSequence[] statuses = LiturgicalUtil.ATTENDANCE_STATUS_OPTIONS;

        new AlertDialog.Builder(this)
                .setTitle("Ubah Status Presensi")
                .setItems(statuses, (dialog, which) -> {
                    String newStatus = statuses[which].toString();
                    String authHeader = "Bearer " + sessionManager.getToken();

                    Map<String, Object> body = new HashMap<>();
                    body.put("status_kehadiran", newStatus);
                    if ("hadir".equalsIgnoreCase(newStatus) || "terlambat".equalsIgnoreCase(newStatus)) {
                        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault());
                        body.put("waktu_checkin", sdf.format(new java.util.Date()));
                    }

                    ApiClient.getSupabaseApi().updateAttendanceStatus(authHeader, "eq." + booking.getId(), body).enqueue(new Callback<Void>() {
                        @Override
                        public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(PengurusMainActivity.this, "Status presensi diubah ke " + newStatus, Toast.LENGTH_SHORT).show();
                                loadBookings();
                            } else {
                                Toast.makeText(PengurusMainActivity.this, "Gagal mengubah presensi.", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                            Toast.makeText(PengurusMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    // --- FEATURE 5: Warta Sakristi CRUD ---
    private void showAnnouncementDialog(Announcement existing) {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_announcement, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create();

        TextView tvTitle = dialogView.findViewById(R.id.tvDialogAnnouncementTitle);
        TextInputEditText etJudul = dialogView.findViewById(R.id.etAnnouncementJudul);
        TextInputEditText etIsi = dialogView.findViewById(R.id.etAnnouncementIsi);
        MaterialCheckBox cbPinned = dialogView.findViewById(R.id.cbPinned);
        ProgressBar progress = dialogView.findViewById(R.id.progressAnnouncement);
        MaterialButton btnCancel = dialogView.findViewById(R.id.btnCancelAnnouncement);
        MaterialButton btnSave = dialogView.findViewById(R.id.btnSaveAnnouncement);

        if (existing != null) {
            tvTitle.setText("Edit Warta Sakristi");
            etJudul.setText(existing.getJudul());
            etIsi.setText(existing.getIsi());
            cbPinned.setChecked(existing.isPinned());
        } else {
            tvTitle.setText("Buat Warta Sakristi Baru");
        }

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String judul = etJudul.getText() != null ? etJudul.getText().toString().trim() : "";
            String isi = etIsi.getText() != null ? etIsi.getText().toString().trim() : "";
            boolean isPinned = cbPinned.isChecked();

            if (TextUtils.isEmpty(judul) || TextUtils.isEmpty(isi)) {
                Toast.makeText(this, "Judul dan isi warta wajib diisi.", Toast.LENGTH_SHORT).show();
                return;
            }

            progress.setVisibility(View.VISIBLE);
            btnSave.setEnabled(false);
            btnCancel.setEnabled(false);

            String authHeader = "Bearer " + sessionManager.getToken();
            Announcement announcement = new Announcement();
            announcement.setJudul(judul);
            announcement.setIsi(isi);
            announcement.setPinned(isPinned);

            Call<Void> call;
            if (existing != null) {
                call = ApiClient.getSupabaseApi().updateAnnouncement(authHeader, "eq." + existing.getId(), announcement);
            } else {
                call = ApiClient.getSupabaseApi().createAnnouncement(authHeader, announcement);
            }

            call.enqueue(new Callback<Void>() {
                @Override
                public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();
                    if (response.isSuccessful()) {
                        Toast.makeText(PengurusMainActivity.this, "Warta berhasil disimpan!", Toast.LENGTH_SHORT).show();
                        loadAnnouncements();
                    } else {
                        Toast.makeText(PengurusMainActivity.this, "Gagal menyimpan warta.", Toast.LENGTH_LONG).show();
                    }
                }

                @Override
                public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();
                    Toast.makeText(PengurusMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }

    @Override
    public void onEdit(Announcement announcement) {
        showAnnouncementDialog(announcement);
    }

    @Override
    public void onDelete(Announcement announcement) {
        new AlertDialog.Builder(this)
                .setTitle("Hapus Warta")
                .setMessage("Apakah Anda yakin ingin menghapus warta '" + announcement.getJudul() + "'?")
                .setPositiveButton("Hapus", (dialog, which) -> {
                    String authHeader = "Bearer " + sessionManager.getToken();
                    ApiClient.getSupabaseApi().deleteAnnouncement(authHeader, "eq." + announcement.getId()).enqueue(new Callback<Void>() {
                        @Override
                        public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(PengurusMainActivity.this, "Warta berhasil dihapus.", Toast.LENGTH_SHORT).show();
                                loadAnnouncements();
                            } else {
                                Toast.makeText(PengurusMainActivity.this, "Gagal menghapus warta.", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                            Toast.makeText(PengurusMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    // --- FEATURE 6: Persetujuan Anggota (Approve / Reject) ---
    @Override
    public void onApprove(Profile profile) {
        new AlertDialog.Builder(this)
                .setTitle("Setujui Anggota")
                .setMessage("Setujui pendaftaran anggota misdinar '" + profile.getNamaLengkap() + "'?")
                .setPositiveButton("Setujui (Approve)", (dialog, which) -> {
                    String authHeader = "Bearer " + sessionManager.getToken();
                    Profile update = new Profile();
                    update.setStatus("aktif");

                    ApiClient.getSupabaseApi().updateProfileStatus(authHeader, "eq." + profile.getId(), update).enqueue(new Callback<Void>() {
                        @Override
                        public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(PengurusMainActivity.this, "Anggota berhasil disetujui!", Toast.LENGTH_SHORT).show();
                                loadMembers();
                            } else {
                                Toast.makeText(PengurusMainActivity.this, "Gagal menyetujui anggota.", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                            Toast.makeText(PengurusMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    @Override
    public void onWhatsApp(Profile profile) {
        String phone = profile.getNoTelepon();
        if (phone != null && !phone.isEmpty()) {
            if (phone.startsWith("0")) {
                phone = "62" + phone.substring(1);
            }
            ApiClient.openWhatsApp(
                    this,
                    phone,
                    "Halo " + profile.getNamaPanggilan() + ", ini dari Pengurus Misdinar SPMR Purbowardayan."
            );
        } else {
            Toast.makeText(this, "Nomor WhatsApp anggota tidak tersedia.", Toast.LENGTH_SHORT).show();
        }
    }
}
