package org.purbowardayan.sidinar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.text.TextUtils;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.checkbox.MaterialCheckBox;
import com.google.android.material.textfield.TextInputEditText;
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import okhttp3.ResponseBody;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.adapter.AnnouncementAdapter;
import org.purbowardayan.sidinar.adapter.ScheduleAdapter;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.databinding.ActivityAnggotaMainBinding;
import org.purbowardayan.sidinar.model.Announcement;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;
import org.purbowardayan.sidinar.util.NotificationHelper;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AnggotaMainActivity extends AppCompatActivity implements ScheduleAdapter.OnScheduleClickListener {

    private ActivityAnggotaMainBinding binding;
    private SessionManager sessionManager;
    private ScheduleAdapter scheduleAdapter;
    private AnnouncementAdapter announcementAdapter;

    private final List<MassSchedule> allSchedules = new ArrayList<>();
    private final List<Booking> allBookings = new ArrayList<>();
    private final List<Announcement> allAnnouncements = new ArrayList<>();
    private Booking myUpcomingBooking = null;
    private String selectedFilter = "all"; // "all" | "mingguan" | "harian"

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAnggotaMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);
        if (!sessionManager.isLoggedIn()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        // Request POST_NOTIFICATIONS permission on Android 13+ (API 33+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        setupUI();
        setupRecyclerViews();
        setupListeners();

        loadAllData();
    }

    private final android.os.Handler reminderHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable reminderCheckerRunnable = new Runnable() {
        @Override
        public void run() {
            loadBookings();
            reminderHandler.postDelayed(this, 12000);
        }
    };

    @Override
    protected void onResume() {
        super.onResume();
        loadAllData();
        reminderHandler.postDelayed(reminderCheckerRunnable, 12000);
    }

    @Override
    protected void onPause() {
        super.onPause();
        reminderHandler.removeCallbacks(reminderCheckerRunnable);
    }

    private void setupUI() {
        Profile profile = sessionManager.getProfile();
        if (profile != null) {
            String nama = profile.getNamaPanggilan() != null && !profile.getNamaPanggilan().isEmpty()
                    ? profile.getNamaPanggilan()
                    : (profile.getNamaLengkap() != null ? profile.getNamaLengkap() : "Misdinar");
            binding.tvGreeting.setText("Berkah Dalem, " + nama + "!");

            String wilayah = profile.getAsalWilayahTeks() != null && !profile.getAsalWilayahTeks().isEmpty()
                    ? profile.getAsalWilayahTeks()
                    : "Paroki Purbowardayan";
            binding.tvWilayahBadge.setText(wilayah);

            if (profile.getJenjang() != null && !profile.getJenjang().isEmpty()) {
                binding.tvJenjangBadge.setText("Jenjang " + profile.getJenjang());
                binding.tvJenjangBadge.setVisibility(View.VISIBLE);
            } else {
                binding.tvJenjangBadge.setVisibility(View.GONE);
            }

            binding.tvStatusBadge.setText("Anggota Aktif");
            binding.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_emerald);
            binding.tvStatusBadge.setTextColor(androidx.core.content.ContextCompat.getColor(this, R.color.emerald_800));
            binding.tvPendingNotice.setVisibility(View.GONE);

            if (profile.isPengurus()) {
                binding.btnSwitchToPengurus.setVisibility(View.VISIBLE);
                binding.btnSwitchToPengurus.setOnClickListener(v -> {
                    startActivity(new Intent(AnggotaMainActivity.this, PengurusMainActivity.class));
                });
            } else {
                binding.btnSwitchToPengurus.setVisibility(View.GONE);
            }
        }
    }

    private void setupRecyclerViews() {
        boolean isAktif = sessionManager.isAktif();
        scheduleAdapter = new ScheduleAdapter(this, null, isAktif);
        binding.rvSchedules.setLayoutManager(new LinearLayoutManager(this));
        binding.rvSchedules.setAdapter(scheduleAdapter);

        announcementAdapter = new AnnouncementAdapter(false, null);
        binding.rvAnnouncements.setLayoutManager(new LinearLayoutManager(this));
        binding.rvAnnouncements.setAdapter(announcementAdapter);
    }

    private void setupListeners() {
        binding.swipeRefresh.setOnRefreshListener(this::loadAllData);

        binding.btnLogout.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle("Keluar Akun")
                    .setMessage("Apakah Anda yakin ingin keluar dari akun ini?")
                    .setPositiveButton("Keluar", (dialog, which) -> {
                        sessionManager.clearSession();
                        Intent intent = new Intent(AnggotaMainActivity.this, LoginActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        startActivity(intent);
                        finish();
                    })
                    .setNegativeButton("Batal", null)
                    .show();
        });

        binding.btnEditProfile.setOnClickListener(v -> {
            showEditProfileDialog();
        });

        binding.btnNotifications.setOnClickListener(v -> {
            showNotificationsDialog();
        });

        binding.btnRiwayatTugas.setOnClickListener(v -> {
            startActivity(new Intent(AnggotaMainActivity.this, RiwayatTugasActivity.class));
        });

        binding.btnMyBookingCheckin.setOnClickListener(v -> {
            if (myUpcomingBooking != null) {
                showCheckinDialog(myUpcomingBooking);
            }
        });

        binding.btnScanQr.setOnClickListener(v -> {
            IntentIntegrator integrator = new IntentIntegrator(this);
            integrator.setPrompt("Arahkan kamera ke QR Code Presensi Misa");
            integrator.setBeepEnabled(true);
            integrator.setOrientationLocked(true);
            integrator.initiateScan();
        });

        binding.btnHomeContactAdmin.setOnClickListener(v -> {
            ApiClient.openWhatsApp(
                    this,
                    ApiClient.WA_ADMIN,
                    "Halo Admin SiDinar Regina, saya ingin bertanya terkait tugas misdinar."
            );
        });

        binding.btnHomeContactPengurus.setOnClickListener(v -> {
            ApiClient.openWhatsApp(
                    this,
                    ApiClient.WA_PENGURUS,
                    "Halo Pengurus Misdinar SPMR Purbowardayan, saya ingin menanyakan jadwal tugas."
            );
        });

        binding.btnMyBookingEdit.setOnClickListener(v -> {
            if (myUpcomingBooking != null) {
                showEditBookingDialog(myUpcomingBooking);
            }
        });

        binding.btnMyBookingCancel.setOnClickListener(v -> {
            if (myUpcomingBooking != null) {
                showCancelBookingDialog(myUpcomingBooking);
            }
        });

        binding.btnMyBookingCalendar.setOnClickListener(v -> {
            if (myUpcomingBooking != null && myUpcomingBooking.getSchedule() != null) {
                addToCalendar(myUpcomingBooking.getSchedule());
            }
        });

        // Filter chips
        binding.chipAll.setOnClickListener(v -> {
            selectedFilter = "all";
            applyScheduleFilter();
        });
        binding.chipMingguan.setOnClickListener(v -> {
            selectedFilter = "mingguan";
            applyScheduleFilter();
        });
        binding.chipHarian.setOnClickListener(v -> {
            selectedFilter = "harian";
            applyScheduleFilter();
        });
    }

    private void loadAllData() {
        binding.swipeRefresh.setRefreshing(true);
        loadLatestProfile();
        loadBookings();
        loadSchedules();
        loadAnnouncements();
    }

    private void loadLatestProfile() {
        String authHeader = "Bearer " + sessionManager.getToken();
        String userId = sessionManager.getUserId();
        if (userId == null) return;

        ApiClient.getSupabaseApi().getProfile(authHeader, "eq." + userId, "*").enqueue(new Callback<List<Profile>>() {
            @Override
            public void onResponse(@NonNull Call<List<Profile>> call, @NonNull Response<List<Profile>> response) {
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    Profile profile = response.body().get(0);
                    sessionManager.saveProfile(profile);
                    setupUI();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Profile>> call, @NonNull Throwable t) {}
        });
    }

    private void loadBookings() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getAllBookings(authHeader, "*,schedule:mass_schedules(*)", "created_at.desc").enqueue(new Callback<List<Booking>>() {
            @Override
            public void onResponse(@NonNull Call<List<Booking>> call, @NonNull Response<List<Booking>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    allBookings.clear();
                    allBookings.addAll(response.body());

                    // Find current user's active booking
                    String myId = sessionManager.getUserId();
                    myUpcomingBooking = null;
                    boolean hasHarian = false;
                    boolean hasMingguan = false;

                    int activeReminderCount = 0;
                    for (Booking b : allBookings) {
                        if (myId != null && myId.equals(b.getUserId())) {
                            if (myUpcomingBooking == null) {
                                myUpcomingBooking = b;
                            }
                            if (b.getSchedule() != null) {
                                String kat = b.getSchedule().getKategori();
                                if ("harian".equalsIgnoreCase(kat)) hasHarian = true;
                                if ("mingguan".equalsIgnoreCase(kat)) hasMingguan = true;
                            }
                            if (b.isWaReminderSent() && b.getSchedule() != null) {
                                activeReminderCount++;
                                checkAndTriggerReminderNotification(b);
                            }
                        }
                    }

                    // Update notification bell appearance if active reminders exist
                    if (activeReminderCount > 0) {
                        binding.btnNotifications.setIconTint(androidx.core.content.ContextCompat.getColorStateList(AnggotaMainActivity.this, R.color.secondary));
                    } else {
                        binding.btnNotifications.setIconTint(androidx.core.content.ContextCompat.getColorStateList(AnggotaMainActivity.this, R.color.primary));
                    }

                    // Update Misa Harian tracker badge
                    if (hasHarian) {
                        binding.tvQuotaHarianStatus.setText("1 / 1 (Terpakai)");
                        binding.tvQuotaHarianStatus.setBackgroundResource(R.drawable.bg_badge_amber);
                        binding.tvQuotaHarianStatus.setTextColor(androidx.core.content.ContextCompat.getColor(AnggotaMainActivity.this, R.color.amber_800));
                    } else {
                        binding.tvQuotaHarianStatus.setText("0 / 1 (Tersedia)");
                        binding.tvQuotaHarianStatus.setBackgroundResource(R.drawable.bg_badge_emerald);
                        binding.tvQuotaHarianStatus.setTextColor(androidx.core.content.ContextCompat.getColor(AnggotaMainActivity.this, R.color.emerald_800));
                    }

                    // Update Misa Mingguan tracker badge
                    if (hasMingguan) {
                        binding.tvQuotaMingguanStatus.setText("1 / 1 (Terpakai)");
                        binding.tvQuotaMingguanStatus.setBackgroundResource(R.drawable.bg_badge_amber);
                        binding.tvQuotaMingguanStatus.setTextColor(androidx.core.content.ContextCompat.getColor(AnggotaMainActivity.this, R.color.amber_800));
                    } else {
                        binding.tvQuotaMingguanStatus.setText("0 / 1 (Tersedia)");
                        binding.tvQuotaMingguanStatus.setBackgroundResource(R.drawable.bg_badge_emerald);
                        binding.tvQuotaMingguanStatus.setTextColor(androidx.core.content.ContextCompat.getColor(AnggotaMainActivity.this, R.color.emerald_800));
                    }

                    updateMyBookingCard();
                    recalculateSchedulesQuota();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Booking>> call, @NonNull Throwable t) {}
        });
    }

    private void updateMyBookingCard() {
        if (myUpcomingBooking != null && myUpcomingBooking.getSchedule() != null) {
            binding.cardMyBooking.setVisibility(View.VISIBLE);
            binding.tvMyBookingTitle.setText(myUpcomingBooking.getSchedule().getJudulMisa());
            binding.tvMyBookingTime.setText(myUpcomingBooking.getSchedule().getTanggalMisa() + " • " + myUpcomingBooking.getSchedule().getFormattedTime());
            String status = myUpcomingBooking.getStatusKehadiran() != null ? myUpcomingBooking.getStatusKehadiran() : "terdaftar";
            binding.tvMyBookingStatus.setText(status);

            if ("hadir".equalsIgnoreCase(status)) {
                binding.tvMyBookingStatus.setBackgroundResource(R.drawable.bg_badge_emerald);
                binding.tvMyBookingStatus.setTextColor(androidx.core.content.ContextCompat.getColor(this, R.color.emerald_800));
            } else if ("terlambat".equalsIgnoreCase(status)) {
                binding.tvMyBookingStatus.setBackgroundResource(R.drawable.bg_badge_amber);
                binding.tvMyBookingStatus.setTextColor(androidx.core.content.ContextCompat.getColor(this, R.color.amber_800));
            } else {
                binding.tvMyBookingStatus.setBackgroundResource(R.drawable.bg_badge_emerald);
                binding.tvMyBookingStatus.setTextColor(androidx.core.content.ContextCompat.getColor(this, R.color.emerald_800));
            }
        } else {
            binding.cardMyBooking.setVisibility(View.GONE);
        }
    }

    private void loadSchedules() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getSchedules(authHeader, "*", "tanggal_misa.asc,jam_mulai.asc").enqueue(new Callback<List<MassSchedule>>() {
            @Override
            public void onResponse(@NonNull Call<List<MassSchedule>> call, @NonNull Response<List<MassSchedule>> response) {
                binding.swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    allSchedules.clear();
                    allSchedules.addAll(response.body());
                    recalculateSchedulesQuota();
                } else {
                    binding.tvEmptySchedules.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<MassSchedule>> call, @NonNull Throwable t) {
                binding.swipeRefresh.setRefreshing(false);
                binding.tvEmptySchedules.setVisibility(View.VISIBLE);
                Toast.makeText(AnggotaMainActivity.this, "Gagal memuat jadwal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void recalculateSchedulesQuota() {
        Map<String, Integer> countMap = new HashMap<>();
        for (Booking b : allBookings) {
            if (b.getScheduleId() != null) {
                int count = countMap.getOrDefault(b.getScheduleId(), 0);
                countMap.put(b.getScheduleId(), count + 1);
            }
        }

        for (MassSchedule s : allSchedules) {
            int booked = countMap.getOrDefault(s.getId(), 0);
            s.setBookedCount(booked);
        }

        applyScheduleFilter();
    }

    private void applyScheduleFilter() {
        // Update segmented switcher button states
        int primaryColor = androidx.core.content.ContextCompat.getColor(this, R.color.primary);
        int variantColor = androidx.core.content.ContextCompat.getColor(this, R.color.on_surface_variant);

        if ("harian".equalsIgnoreCase(selectedFilter)) {
            binding.chipHarian.setBackgroundResource(R.drawable.bg_segmented_selected);
            binding.chipHarian.setTextColor(primaryColor);
            binding.chipHarian.setTypeface(null, android.graphics.Typeface.BOLD);

            binding.chipAll.setBackground(null);
            binding.chipAll.setTextColor(variantColor);
            binding.chipAll.setTypeface(null, android.graphics.Typeface.NORMAL);

            binding.chipMingguan.setBackground(null);
            binding.chipMingguan.setTextColor(variantColor);
            binding.chipMingguan.setTypeface(null, android.graphics.Typeface.NORMAL);
        } else if ("mingguan".equalsIgnoreCase(selectedFilter)) {
            binding.chipMingguan.setBackgroundResource(R.drawable.bg_segmented_selected);
            binding.chipMingguan.setTextColor(primaryColor);
            binding.chipMingguan.setTypeface(null, android.graphics.Typeface.BOLD);

            binding.chipAll.setBackground(null);
            binding.chipAll.setTextColor(variantColor);
            binding.chipAll.setTypeface(null, android.graphics.Typeface.NORMAL);

            binding.chipHarian.setBackground(null);
            binding.chipHarian.setTextColor(variantColor);
            binding.chipHarian.setTypeface(null, android.graphics.Typeface.NORMAL);
        } else {
            binding.chipAll.setBackgroundResource(R.drawable.bg_segmented_selected);
            binding.chipAll.setTextColor(primaryColor);
            binding.chipAll.setTypeface(null, android.graphics.Typeface.BOLD);

            binding.chipHarian.setBackground(null);
            binding.chipHarian.setTextColor(variantColor);
            binding.chipHarian.setTypeface(null, android.graphics.Typeface.NORMAL);

            binding.chipMingguan.setBackground(null);
            binding.chipMingguan.setTextColor(variantColor);
            binding.chipMingguan.setTypeface(null, android.graphics.Typeface.NORMAL);
        }

        List<MassSchedule> filtered = new ArrayList<>();
        for (MassSchedule s : allSchedules) {
            String kat = s.getKategori() != null ? s.getKategori() : "mingguan";
            if ("all".equalsIgnoreCase(selectedFilter)) {
                filtered.add(s);
            } else if ("mingguan".equalsIgnoreCase(selectedFilter) && "mingguan".equalsIgnoreCase(kat)) {
                filtered.add(s);
            } else if ("harian".equalsIgnoreCase(selectedFilter) && "harian".equalsIgnoreCase(kat)) {
                filtered.add(s);
            }
        }

        String bookedId = (myUpcomingBooking != null) ? myUpcomingBooking.getScheduleId() : null;
        scheduleAdapter = new ScheduleAdapter(this, bookedId, sessionManager.isAktif());
        binding.rvSchedules.setAdapter(scheduleAdapter);
        scheduleAdapter.updateList(filtered);

        binding.tvEmptySchedules.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void loadAnnouncements() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getAnnouncements(authHeader, "*", "is_pinned.desc,created_at.desc").enqueue(new Callback<List<Announcement>>() {
            @Override
            public void onResponse(@NonNull Call<List<Announcement>> call, @NonNull Response<List<Announcement>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    List<Announcement> list = response.body();
                    allAnnouncements.clear();
                    allAnnouncements.addAll(list);
                    announcementAdapter.updateList(list);
                    binding.tvEmptyAnnouncements.setVisibility(list.isEmpty() ? View.VISIBLE : View.GONE);
                } else {
                    binding.tvEmptyAnnouncements.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Announcement>> call, @NonNull Throwable t) {
                binding.tvEmptyAnnouncements.setVisibility(View.VISIBLE);
            }
        });
    }

    @Override
    public void onBookClick(MassSchedule schedule) {
        showBookingConfirmationDialog(schedule);
    }

    @Override
    public void onEditMyBookingClick(MassSchedule schedule) {
        if (myUpcomingBooking != null) {
            showEditBookingDialog(myUpcomingBooking);
        }
    }

    private void showCancelBookingDialog(Booking booking) {
        String scheduleTitle = booking.getSchedule() != null ? booking.getSchedule().getJudulMisa() : "Misa ini";
        new AlertDialog.Builder(this)
                .setTitle("Batalkan Jadwal Tugas")
                .setMessage("Apakah Anda yakin ingin membatalkan tugas di " + scheduleTitle + "?\n\nSlot kuota akan langsung dibuka kembali untuk anggota misdinar lain.")
                .setPositiveButton("Ya, Batalkan Tugas", (dialog, which) -> {
                    String authHeader = "Bearer " + sessionManager.getToken();
                    ApiClient.getBackendApi().cancelBooking(authHeader, booking.getId()).enqueue(new Callback<ResponseBody>() {
                        @Override
                        public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(AnggotaMainActivity.this, "Jadwal tugas berhasil dibatalkan.", Toast.LENGTH_LONG).show();
                                loadAllData();
                            } else {
                                String msg = "Gagal membatalkan tugas.";
                                try {
                                    if (response.errorBody() != null) {
                                        String errStr = response.errorBody().string();
                                        if (errStr.contains("error")) msg = errStr;
                                    }
                                } catch (Exception ignored) {}
                                Toast.makeText(AnggotaMainActivity.this, msg, Toast.LENGTH_LONG).show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                            Toast.makeText(AnggotaMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Kembali", null)
                .show();
    }

    private void showEditBookingDialog(Booking booking) {
        if (booking == null || booking.getSchedule() == null) return;
        String currentScheduleId = booking.getScheduleId();
        String currentKategori = booking.getSchedule().getKategori();

        List<MassSchedule> candidateList = new ArrayList<>();
        List<String> displayItems = new ArrayList<>();

        for (MassSchedule s : allSchedules) {
            if (s.getId().equals(currentScheduleId)) continue;
            if (currentKategori != null && !currentKategori.equalsIgnoreCase(s.getKategori())) continue;

            int remaining = s.getRemainingQuota();
            candidateList.add(s);
            String itemText = s.getJudulMisa() + " (" + s.getTanggalMisa() + " • " + s.getFormattedTime() + ")"
                    + (remaining > 0 ? " - Sisa " + remaining + " Kuota" : " - [KUOTA PENUH]");
            displayItems.add(itemText);
        }

        if (candidateList.isEmpty()) {
            new AlertDialog.Builder(this)
                    .setTitle("Pindah Jadwal Tugas")
                    .setMessage("Tidak ada jadwal misa alternatif lain yang tersedia pada kategori ini.\n\nJika berhalangan hadir, Anda dapat memilih 'Batalkan Tugas'.")
                    .setPositiveButton("Batalkan Tugas", (d, w) -> showCancelBookingDialog(booking))
                    .setNegativeButton("Tutup", null)
                    .show();
            return;
        }

        final int[] chosenIndex = {-1};
        CharSequence[] items = displayItems.toArray(new CharSequence[0]);

        new AlertDialog.Builder(this)
                .setTitle("Pilih Jadwal Misa Baru")
                .setSingleChoiceItems(items, -1, (dialog, which) -> {
                    chosenIndex[0] = which;
                })
                .setPositiveButton("Pindah Jadwal", (dialog, which) -> {
                    if (chosenIndex[0] < 0 || chosenIndex[0] >= candidateList.size()) {
                        Toast.makeText(AnggotaMainActivity.this, "Silakan pilih jadwal misa tujuan.", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    MassSchedule target = candidateList.get(chosenIndex[0]);
                    if (target.isFull()) {
                        Toast.makeText(AnggotaMainActivity.this, "Jadwal misa tujuan sudah penuh.", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    Map<String, Object> body = new HashMap<>();
                    body.put("booking_id", booking.getId());
                    body.put("new_schedule_id", target.getId());
                    body.put("posisi_tugas", "Petugas Altar");

                    String authHeader = "Bearer " + sessionManager.getToken();
                    ApiClient.getBackendApi().updateBooking(authHeader, body).enqueue(new Callback<ResponseBody>() {
                        @Override
                        public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(AnggotaMainActivity.this, "Jadwal tugas berhasil dipindahkan ke " + target.getJudulMisa() + "!", Toast.LENGTH_LONG).show();
                                loadAllData();
                            } else {
                                String msg = "Gagal memindahkan jadwal.";
                                try {
                                    if (response.errorBody() != null) {
                                        String errStr = response.errorBody().string();
                                        if (errStr.contains("error")) msg = errStr;
                                    }
                                } catch (Exception ignored) {}
                                Toast.makeText(AnggotaMainActivity.this, msg, Toast.LENGTH_LONG).show();
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                            Toast.makeText(AnggotaMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNeutralButton("Batalkan Tugas", (dialog, which) -> {
                    showCancelBookingDialog(booking);
                })
                .setNegativeButton("Tutup", null)
                .show();
    }

    private void showBookingConfirmationDialog(MassSchedule schedule) {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_booking, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create();

        TextView tvJudul = dialogView.findViewById(R.id.tvDialogJudulMisa);
        TextView tvWaktu = dialogView.findViewById(R.id.tvDialogWaktuMisa);
        MaterialCheckBox cbCommit = dialogView.findViewById(R.id.cbDialogCommitment);
        ProgressBar progress = dialogView.findViewById(R.id.progressDialog);
        MaterialButton btnCancel = dialogView.findViewById(R.id.btnCancelDialog);
        MaterialButton btnConfirm = dialogView.findViewById(R.id.btnConfirmDialog);

        tvJudul.setText(schedule.getJudulMisa());
        tvWaktu.setText(schedule.getTanggalMisa() + " • " + schedule.getFormattedTime());

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnConfirm.setOnClickListener(v -> {
            if (!cbCommit.isChecked()) {
                Toast.makeText(this, "Silakan centang komitmen hadir tepat waktu.", Toast.LENGTH_SHORT).show();
                return;
            }

            progress.setVisibility(View.VISIBLE);
            btnConfirm.setEnabled(false);
            btnCancel.setEnabled(false);

            Map<String, Object> body = new HashMap<>();
            body.put("schedule_id", schedule.getId());
            body.put("posisi_tugas", "Petugas Altar");

            String authHeader = "Bearer " + sessionManager.getToken();
            ApiClient.getBackendApi().createBooking(authHeader, body).enqueue(new Callback<ResponseBody>() {
                @Override
                public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();
                    if (response.isSuccessful()) {
                        Toast.makeText(AnggotaMainActivity.this, "Berhasil mendaftar tugas misa!", Toast.LENGTH_LONG).show();
                        loadAllData();
                    } else {
                        String errMsg = "Gagal mengambil tugas. Jadwal mungkin telah penuh atau kuota mingguan Anda sudah terpakai.";
                        try {
                            if (response.errorBody() != null) {
                                String errStr = response.errorBody().string();
                                if (errStr.contains("error")) errMsg = errStr;
                            }
                        } catch (Exception ignored) {}
                        Toast.makeText(AnggotaMainActivity.this, errMsg, Toast.LENGTH_LONG).show();
                    }
                }

                @Override
                public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();
                    Toast.makeText(AnggotaMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (result != null && result.getContents() != null) {
            String scannedContent = result.getContents();
            handleCheckInScan(scannedContent);
        }
    }

    private void handleCheckInScan(String qrData) {
        String authHeader = "Bearer " + sessionManager.getToken();
        Map<String, Object> body = new HashMap<>();
        body.put("qr_data", qrData);

        ApiClient.getBackendApi().checkIn(authHeader, body).enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(AnggotaMainActivity.this, "Presensi Check-in berhasil tercatat!", Toast.LENGTH_LONG).show();
                    loadAllData();
                } else {
                    Toast.makeText(AnggotaMainActivity.this, "QR Code tidak valid atau jadwal belum dimulai.", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                Toast.makeText(AnggotaMainActivity.this, "Gagal memproses presensi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void addToCalendar(MassSchedule schedule) {
        try {
            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_INSERT);
            intent.setData(android.provider.CalendarContract.Events.CONTENT_URI);
            intent.putExtra(android.provider.CalendarContract.Events.TITLE, "Tugas Misdinar: " + schedule.getJudulMisa());
            intent.putExtra(android.provider.CalendarContract.Events.EVENT_LOCATION, "Gereja Katolik SPMR Purbowardayan");
            intent.putExtra(android.provider.CalendarContract.Events.DESCRIPTION, "Jadwal Pelayanan Altar Misdinar SPMR Purbowardayan. Harap hadir di sakristi 30 menit sebelum misa.");

            String timePart = schedule.getJamMulai();
            if (timePart != null && timePart.length() >= 5) {
                timePart = timePart.substring(0, 5);
            }
            String dtStr = schedule.getTanggalMisa() + " " + timePart;
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault());
            java.util.Date date = sdf.parse(dtStr);
            if (date != null) {
                intent.putExtra(android.provider.CalendarContract.EXTRA_EVENT_BEGIN_TIME, date.getTime());
                intent.putExtra(android.provider.CalendarContract.EXTRA_EVENT_END_TIME, date.getTime() + (90 * 60 * 1000));
            }

            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Tidak dapat membuka aplikasi kalender: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void showCheckinDialog(Booking booking) {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_checkin, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .create();

        android.widget.ImageView ivQr = dialogView.findViewById(R.id.ivCheckinQrCode);
        TextView tvSubtitle = dialogView.findViewById(R.id.tvCheckinSubtitle);
        TextView tvKodeTugas = dialogView.findViewById(R.id.tvCheckinKodeTugas);
        TextView tvPeran = dialogView.findViewById(R.id.tvCheckinPeran);
        TextView tvStatus = dialogView.findViewById(R.id.tvCheckinStatus);
        ProgressBar progress = dialogView.findViewById(R.id.progressDirectCheckin);
        MaterialButton btnDirect = dialogView.findViewById(R.id.btnDoDirectCheckin);
        MaterialButton btnScan = dialogView.findViewById(R.id.btnScanFromDialog);
        MaterialButton btnClose = dialogView.findViewById(R.id.btnCloseCheckinDialog);

        MassSchedule s = booking.getSchedule();
        String title = s != null ? s.getJudulMisa() : "Misa Kudus";
        String time = s != null ? (s.getTanggalMisa() + " • " + s.getFormattedTime()) : "";
        tvSubtitle.setText(title + " • " + time);

        String idShort = booking.getId() != null && booking.getId().length() >= 8 ? booking.getId().substring(0, 8).toUpperCase() : "";
        tvKodeTugas.setText("KODE TUGAS: " + idShort);

        tvPeran.setText(booking.getPosisiTugas() != null ? booking.getPosisiTugas() : "Petugas Altar");
        tvStatus.setText(booking.getStatusKehadiran() != null ? booking.getStatusKehadiran() : "terdaftar");

        try {
            com.journeyapps.barcodescanner.BarcodeEncoder encoder = new com.journeyapps.barcodescanner.BarcodeEncoder();
            String qrPayload = "SIDINAR:" + booking.getId() + ":" + booking.getUserId() + ":" + (s != null ? s.getTanggalMisa() : "");
            android.graphics.Bitmap bitmap = encoder.encodeBitmap(qrPayload, com.google.zxing.BarcodeFormat.QR_CODE, 400, 400);
            ivQr.setImageBitmap(bitmap);
        } catch (Exception e) {
            ivQr.setImageResource(R.drawable.ic_qr_code);
        }

        boolean isAlreadyCheckedIn = "hadir".equalsIgnoreCase(booking.getStatusKehadiran()) || "terlambat".equalsIgnoreCase(booking.getStatusKehadiran());
        if (isAlreadyCheckedIn) {
            btnDirect.setEnabled(false);
            btnDirect.setText("Presensi Sudah Tercatat (" + booking.getStatusKehadiran() + ")");
        } else {
            btnDirect.setOnClickListener(v -> {
                progress.setVisibility(View.VISIBLE);
                btnDirect.setEnabled(false);
                String authHeader = "Bearer " + sessionManager.getToken();
                ApiClient.getBackendApi().checkInBooking(authHeader, booking.getId()).enqueue(new Callback<ResponseBody>() {
                    @Override
                    public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                        progress.setVisibility(View.GONE);
                        dialog.dismiss();
                        if (response.isSuccessful()) {
                            Toast.makeText(AnggotaMainActivity.this, "Presensi Sakristi berhasil tercatat!", Toast.LENGTH_LONG).show();
                            loadAllData();
                        } else {
                            String err = "Presensi belum dibuka atau di luar jam toleransi keterlambatan sakristi.";
                            try {
                                if (response.errorBody() != null) {
                                    String str = response.errorBody().string();
                                    if (str.contains("error")) err = str;
                                }
                            } catch (Exception ignored) {}
                            Toast.makeText(AnggotaMainActivity.this, err, Toast.LENGTH_LONG).show();
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                        progress.setVisibility(View.GONE);
                        Toast.makeText(AnggotaMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
            });
        }

        btnScan.setOnClickListener(v -> {
            dialog.dismiss();
            binding.btnScanQr.performClick();
        });

        btnClose.setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    private void showEditProfileDialog() {
        Profile currentProfile = sessionManager.getProfile();
        if (currentProfile == null) return;

        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_edit_profile, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        }

        TextInputEditText etNamaLengkap = dialogView.findViewById(R.id.etEditNamaLengkap);
        TextInputEditText etNamaPanggilan = dialogView.findViewById(R.id.etEditNamaPanggilan);
        TextInputEditText etPhone = dialogView.findViewById(R.id.etEditPhone);
        TextInputEditText etWilayah = dialogView.findViewById(R.id.etEditWilayah);
        AutoCompleteTextView actvJenjang = dialogView.findViewById(R.id.actvEditJenjang);
        ProgressBar progress = dialogView.findViewById(R.id.progressEditProfile);
        MaterialButton btnCancel = dialogView.findViewById(R.id.btnCancelEditProfile);
        MaterialButton btnSave = dialogView.findViewById(R.id.btnSaveEditProfile);

        etNamaLengkap.setText(currentProfile.getNamaLengkap());
        etNamaPanggilan.setText(currentProfile.getNamaPanggilan());
        etPhone.setText(currentProfile.getNoTelepon());
        etWilayah.setText(currentProfile.getAsalWilayahTeks());
        actvJenjang.setText(currentProfile.getJenjang() != null ? currentProfile.getJenjang() : "SMP", false);

        String[] jenjangOptions = new String[]{"SD", "SMP", "SMA/K", "Mahasiswa", "Umum"};
        ArrayAdapter<String> jenjangAdapter = new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, jenjangOptions);
        actvJenjang.setAdapter(jenjangAdapter);

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String newNamaLengkap = etNamaLengkap.getText() != null ? etNamaLengkap.getText().toString().trim() : "";
            String newNamaPanggilan = etNamaPanggilan.getText() != null ? etNamaPanggilan.getText().toString().trim() : "";
            String newPhone = etPhone.getText() != null ? etPhone.getText().toString().trim() : "";
            String newWilayah = etWilayah.getText() != null ? etWilayah.getText().toString().trim() : "";
            String newJenjang = actvJenjang.getText() != null ? actvJenjang.getText().toString().trim() : "";

            if (TextUtils.isEmpty(newNamaLengkap) || TextUtils.isEmpty(newNamaPanggilan) || TextUtils.isEmpty(newPhone) || TextUtils.isEmpty(newJenjang)) {
                Toast.makeText(this, "Nama lengkap, nama panggilan, nomor WhatsApp, dan jenjang wajib diisi.", Toast.LENGTH_SHORT).show();
                return;
            }

            progress.setVisibility(View.VISIBLE);
            btnSave.setEnabled(false);
            btnCancel.setEnabled(false);

            Map<String, Object> body = new HashMap<>();
            body.put("nama_lengkap", newNamaLengkap);
            body.put("nama_panggilan", newNamaPanggilan);
            body.put("no_telepon", newPhone);
            body.put("asal_wilayah_teks", newWilayah.isEmpty() ? "Paroki Purbowardayan" : newWilayah);
            body.put("jenjang", newJenjang);

            String authHeader = "Bearer " + sessionManager.getToken();
            ApiClient.getBackendApi().updateProfile(authHeader, body).enqueue(new Callback<ResponseBody>() {
                @Override
                public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();

                    if (response.isSuccessful()) {
                        currentProfile.setNamaLengkap(newNamaLengkap);
                        currentProfile.setNamaPanggilan(newNamaPanggilan);
                        currentProfile.setNoTelepon(newPhone);
                        currentProfile.setAsalWilayahTeks(newWilayah.isEmpty() ? "Paroki Purbowardayan" : newWilayah);
                        currentProfile.setJenjang(newJenjang);
                        sessionManager.saveProfile(currentProfile);

                        setupUI();
                        Toast.makeText(AnggotaMainActivity.this, "Data diri Anda berhasil diperbarui!", Toast.LENGTH_LONG).show();
                    } else {
                        Toast.makeText(AnggotaMainActivity.this, "Gagal menyimpan perubahan data profil.", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                    progress.setVisibility(View.GONE);
                    dialog.dismiss();
                    Toast.makeText(AnggotaMainActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }

    private void checkAndTriggerReminderNotification(Booking booking) {
        if (booking == null || booking.getSchedule() == null) return;
        android.content.SharedPreferences prefs = getSharedPreferences("sidinar_notifications", MODE_PRIVATE);
        String notifKey = "notified_reminder_" + booking.getId();
        if (!prefs.getBoolean(notifKey, false)) {
            String massTitle = booking.getSchedule().getKategori() != null ? booking.getSchedule().getKategori().toUpperCase() : "MISA";
            String massTime = (booking.getSchedule().getTanggalMisa() != null ? booking.getSchedule().getTanggalMisa() : "") +
                    " • " + (booking.getSchedule().getJamMulai() != null ? booking.getSchedule().getJamMulai() : "") + " WIB";
            Profile profile = sessionManager.getProfile();
            String nama = profile != null && profile.getNamaPanggilan() != null && !profile.getNamaPanggilan().isEmpty()
                    ? profile.getNamaPanggilan() : "Misdinar";

            String title = "🔔 Pengingat Tugas Misdinar: " + massTitle;
            String message = "Halo " + nama + ", pengurus sakristi mengingatkan jadwal tugas altar Anda pada " + massTime +
                    " (" + booking.getPosisiTugas() + "). Harap hadir di sakristi paling lambat H-30 menit!";

            // 1. Show Android system notification in notification tray with chime & vibration
            NotificationHelper.showReminderNotification(this, title, message, booking.getId());

            // 2. Mark as notified so we don't spam ringtones repeatedly
            prefs.edit().putBoolean(notifKey, true).apply();

            // 3. Show In-App Alert dialog if user is currently looking at the app
            showReminderInAppDialog(booking, title, message);
        }
    }

    private void showReminderInAppDialog(Booking booking, String title, String message) {
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setIcon(R.drawable.logo_misdinar)
                .setPositiveButton("Siap Bertugas", (dialog, which) -> {
                    dialog.dismiss();
                    Toast.makeText(this, "Terima kasih atas komitmen pelayanan Anda! Berkah Dalem.", Toast.LENGTH_SHORT).show();
                })
                .setNeutralButton("Jadwal Saya", (dialog, which) -> {
                    dialog.dismiss();
                    startActivity(new Intent(this, RiwayatTugasActivity.class));
                })
                .show();
    }

    private void showNotificationsDialog() {
        String myId = sessionManager.getUserId();
        List<String> notifList = new ArrayList<>();

        for (Booking b : allBookings) {
            if (myId != null && myId.equals(b.getUserId()) && b.isWaReminderSent() && b.getSchedule() != null) {
                String kat = b.getSchedule().getKategori() != null ? b.getSchedule().getKategori().toUpperCase() : "MISA";
                notifList.add("🔔 PENGINGAT TUGAS: " + kat +
                        "\nJadwal: " + (b.getSchedule().getTanggalMisa() != null ? b.getSchedule().getTanggalMisa() : "") + " • " + (b.getSchedule().getJamMulai() != null ? b.getSchedule().getJamMulai() : "") + " WIB" +
                        "\nPosisi: " + b.getPosisiTugas() +
                        "\nStatus: Pengurus Sakristi telah mengirimkan pengingat");
            }
        }

        if (allAnnouncements != null) {
            for (Announcement a : allAnnouncements) {
                notifList.add("📢 " + a.getJudul() + "\n" + a.getIsi());
            }
        }

        if (notifList.isEmpty()) {
            new AlertDialog.Builder(this)
                    .setTitle("Notifikasi & Pengingat")
                    .setMessage("Belum ada notifikasi atau pengingat tugas aktif saat ini.")
                    .setPositiveButton("Tutup", null)
                    .show();
            return;
        }

        CharSequence[] items = notifList.toArray(new CharSequence[0]);
        new AlertDialog.Builder(this)
                .setTitle("Notifikasi & Pengingat Tugas (" + notifList.size() + ")")
                .setItems(items, null)
                .setPositiveButton("Tutup", null)
                .show();
    }
}
