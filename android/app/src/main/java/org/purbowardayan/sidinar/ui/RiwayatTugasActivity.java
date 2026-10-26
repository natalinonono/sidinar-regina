package org.purbowardayan.sidinar.ui;

import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import java.util.ArrayList;
import java.util.List;
import org.purbowardayan.sidinar.adapter.RiwayatAdapter;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.databinding.ActivityRiwayatTugasBinding;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.network.ApiClient;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RiwayatTugasActivity extends AppCompatActivity {

    private ActivityRiwayatTugasBinding binding;
    private SessionManager sessionManager;
    private RiwayatAdapter adapter;
    private final List<Booking> myHistoryList = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityRiwayatTugasBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);
        if (!sessionManager.isLoggedIn()) {
            finish();
            return;
        }

        setupUI();
        loadHistory();
    }

    private void setupUI() {
        binding.btnBackRiwayat.setOnClickListener(v -> finish());
        binding.swipeRefreshRiwayat.setOnRefreshListener(this::loadHistory);

        adapter = new RiwayatAdapter();
        binding.rvRiwayat.setLayoutManager(new LinearLayoutManager(this));
        binding.rvRiwayat.setAdapter(adapter);
    }

    private void loadHistory() {
        binding.swipeRefreshRiwayat.setRefreshing(true);
        binding.progressRiwayat.setVisibility(View.VISIBLE);

        String authHeader = "Bearer " + sessionManager.getToken();
        String myUserId = sessionManager.getUserId();

        ApiClient.getSupabaseApi().getAllBookings(authHeader, "*,schedule:mass_schedules(*)", "created_at.desc").enqueue(new Callback<List<Booking>>() {
            @Override
            public void onResponse(@NonNull Call<List<Booking>> call, @NonNull Response<List<Booking>> response) {
                binding.swipeRefreshRiwayat.setRefreshing(false);
                binding.progressRiwayat.setVisibility(View.GONE);

                if (response.isSuccessful() && response.body() != null) {
                    myHistoryList.clear();
                    int onTimeCount = 0;

                    for (Booking b : response.body()) {
                        if (myUserId != null && myUserId.equals(b.getUserId())) {
                            myHistoryList.add(b);
                            if ("hadir".equalsIgnoreCase(b.getStatusKehadiran())) {
                                onTimeCount++;
                            }
                        }
                    }

                    binding.tvStatTotalMisa.setText(String.valueOf(myHistoryList.size()));
                    binding.tvStatTotalHadir.setText(String.valueOf(onTimeCount));

                    adapter.updateList(myHistoryList);
                    binding.tvRiwayatEmpty.setVisibility(myHistoryList.isEmpty() ? View.VISIBLE : View.GONE);
                } else {
                    binding.tvRiwayatEmpty.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Booking>> call, @NonNull Throwable t) {
                binding.swipeRefreshRiwayat.setRefreshing(false);
                binding.progressRiwayat.setVisibility(View.GONE);
                Toast.makeText(RiwayatTugasActivity.this, "Gagal memuat riwayat: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
