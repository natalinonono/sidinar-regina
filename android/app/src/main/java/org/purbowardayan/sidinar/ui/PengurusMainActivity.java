package org.purbowardayan.sidinar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.checkbox.MaterialCheckBox;
import com.google.android.material.textfield.TextInputEditText;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.adapter.AnnouncementAdapter;
import org.purbowardayan.sidinar.adapter.MemberAdapter;
import org.purbowardayan.sidinar.adapter.ScheduleAdapter;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.databinding.ActivityPengurusMainBinding;
import org.purbowardayan.sidinar.model.Announcement;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PengurusMainActivity extends AppCompatActivity implements
        AnnouncementAdapter.OnAnnouncementActionListener,
        MemberAdapter.OnMemberActionListener {

    private ActivityPengurusMainBinding binding;
    private SessionManager sessionManager;

    private AnnouncementAdapter announcementAdapter;
    private MemberAdapter memberAdapter;
    private ScheduleAdapter scheduleAdapter;

    private final List<Announcement> announcementList = new ArrayList<>();
    private final List<Profile> memberList = new ArrayList<>();
    private final List<MassSchedule> scheduleList = new ArrayList<>();
    private final List<Booking> bookingList = new ArrayList<>();

    private int currentTab = 0; // 0 = Announcements, 1 = Members, 2 = Schedules

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
    }

    private void setupUI() {
        Profile p = sessionManager.getProfile();
        if (p != null) {
            binding.tvPengurusGreeting.setText("Pengurus: " + (p.getNamaLengkap() != null ? p.getNamaLengkap() : "Admin"));
        }
    }

    private void setupAdapters() {
        announcementAdapter = new AnnouncementAdapter(true, this);
        memberAdapter = new MemberAdapter(this);
        scheduleAdapter = new ScheduleAdapter(new ScheduleAdapter.OnScheduleClickListener() {
            @Override
            public void onBookClick(MassSchedule schedule) {
                Toast.makeText(PengurusMainActivity.this, "Misa: " + schedule.getJudulMisa() + " (Terisi: " + schedule.getBookedCount() + "/" + schedule.getKuotaMaksimal() + ")", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onEditMyBookingClick(MassSchedule schedule) {}
        }, null, true);

        binding.rvPengurusList.setLayoutManager(new LinearLayoutManager(this));
        displayCurrentTab();
    }

    private void setupListeners() {
        binding.swipeRefreshPengurus.setOnRefreshListener(this::loadAllData);

        binding.btnViewAsAnggota.setOnClickListener(v -> {
            startActivity(new Intent(PengurusMainActivity.this, AnggotaMainActivity.class));
        });

        binding.btnPengurusLogout.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle("Keluar Akun")
                    .setMessage("Yakin ingin keluar dari akun pengurus?")
                    .setPositiveButton("Keluar", (dialog, which) -> {
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
    }

    private void displayCurrentTab() {
        if (currentTab == 0) {
            binding.layoutAnnouncementActions.setVisibility(View.VISIBLE);
            binding.rvPengurusList.setAdapter(announcementAdapter);
            announcementAdapter.updateList(announcementList);
            binding.tvPengurusEmpty.setVisibility(announcementList.isEmpty() ? View.VISIBLE : View.GONE);
            binding.tvPengurusEmpty.setText("Belum ada pengumuman. Klik '+ Buat Pengumuman' untuk menambahkan.");
        } else if (currentTab == 1) {
            binding.layoutAnnouncementActions.setVisibility(View.GONE);
            binding.rvPengurusList.setAdapter(memberAdapter);
            memberAdapter.updateList(memberList);
            binding.tvPengurusEmpty.setVisibility(memberList.isEmpty() ? View.VISIBLE : View.GONE);
            binding.tvPengurusEmpty.setText("Belum ada anggota misdinar terdaftar.");
        } else {
            binding.layoutAnnouncementActions.setVisibility(View.GONE);
            binding.rvPengurusList.setAdapter(scheduleAdapter);
            scheduleAdapter.updateList(scheduleList);
            binding.tvPengurusEmpty.setVisibility(scheduleList.isEmpty() ? View.VISIBLE : View.GONE);
            binding.tvPengurusEmpty.setText("Belum ada jadwal misa aktif.");
        }
    }

    private void loadAllData() {
        binding.swipeRefreshPengurus.setRefreshing(true);
        loadAnnouncements();
        loadMembers();
        loadBookings();
        loadSchedules();
    }

    private void loadAnnouncements() {
        String authHeader = "Bearer " + sessionManager.getToken();
        ApiClient.getSupabaseApi().getAnnouncements(authHeader, "*", "is_pinned.desc,created_at.desc").enqueue(new Callback<List<Announcement>>() {
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
        ApiClient.getSupabaseApi().getAllBookings(authHeader, "*", "created_at.desc").enqueue(new Callback<List<Booking>>() {
            @Override
            public void onResponse(@NonNull Call<List<Booking>> call, @NonNull Response<List<Booking>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    bookingList.clear();
                    bookingList.addAll(response.body());
                    recalculateSchedules();
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

    // Announcement Actions
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
            tvTitle.setText("Edit Pengumuman");
            etJudul.setText(existing.getJudul());
            etIsi.setText(existing.getIsi());
            cbPinned.setChecked(existing.isPinned());
        } else {
            tvTitle.setText("Buat Pengumuman Baru");
        }

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String judul = etJudul.getText() != null ? etJudul.getText().toString().trim() : "";
            String isi = etIsi.getText() != null ? etIsi.getText().toString().trim() : "";
            boolean isPinned = cbPinned.isChecked();

            if (TextUtils.isEmpty(judul) || TextUtils.isEmpty(isi)) {
                Toast.makeText(this, "Judul dan isi pengumuman wajib diisi.", Toast.LENGTH_SHORT).show();
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
                        Toast.makeText(PengurusMainActivity.this, "Pengumuman berhasil disimpan!", Toast.LENGTH_SHORT).show();
                        loadAnnouncements();
                    } else {
                        Toast.makeText(PengurusMainActivity.this, "Gagal menyimpan pengumuman.", Toast.LENGTH_LONG).show();
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
                .setTitle("Hapus Pengumuman")
                .setMessage("Apakah Anda yakin ingin menghapus pengumuman '" + announcement.getJudul() + "'?")
                .setPositiveButton("Hapus", (dialog, which) -> {
                    String authHeader = "Bearer " + sessionManager.getToken();
                    ApiClient.getSupabaseApi().deleteAnnouncement(authHeader, "eq." + announcement.getId()).enqueue(new Callback<Void>() {
                        @Override
                        public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(PengurusMainActivity.this, "Pengumuman dihapus.", Toast.LENGTH_SHORT).show();
                                loadAnnouncements();
                            } else {
                                Toast.makeText(PengurusMainActivity.this, "Gagal menghapus pengumuman.", Toast.LENGTH_SHORT).show();
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

    // Member Actions
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
