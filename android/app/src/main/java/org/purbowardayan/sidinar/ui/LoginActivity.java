package org.purbowardayan.sidinar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import java.util.List;
import org.purbowardayan.sidinar.auth.SessionManager;
import org.purbowardayan.sidinar.databinding.ActivityLoginBinding;
import org.purbowardayan.sidinar.model.AuthResponse;
import org.purbowardayan.sidinar.model.LoginRequest;
import org.purbowardayan.sidinar.model.Profile;
import org.purbowardayan.sidinar.network.ApiClient;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginActivity extends AppCompatActivity {

    private ActivityLoginBinding binding;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sessionManager = new SessionManager(this);

        // Check active session
        if (sessionManager.isLoggedIn()) {
            navigateAfterLogin();
            return;
        }

        binding.btnLogin.setOnClickListener(v -> performLogin());

        binding.btnGoToRegister.setOnClickListener(v -> {
            Intent intent = new Intent(LoginActivity.this, RegisterActivity.class);
            startActivity(intent);
        });

        binding.btnContactAdmin.setOnClickListener(v -> {
            ApiClient.openWhatsApp(
                    this,
                    ApiClient.WA_ADMIN,
                    "Halo Admin SiDinar Regina, saya butuh bantuan untuk akun Misdinar saya."
            );
        });

        binding.btnContactPengurus.setOnClickListener(v -> {
            ApiClient.openWhatsApp(
                    this,
                    ApiClient.WA_PENGURUS,
                    "Halo Pengurus Misdinar SPMR Purbowardayan, saya ingin menanyakan perihal akun saya."
            );
        });
    }

    private void performLogin() {
        String email = binding.etEmail.getText() != null ? binding.etEmail.getText().toString().trim() : "";
        String password = binding.etPassword.getText() != null ? binding.etPassword.getText().toString().trim() : "";

        if (TextUtils.isEmpty(email)) {
            binding.tilEmail.setError("Email wajib diisi");
            return;
        } else {
            binding.tilEmail.setError(null);
        }

        if (TextUtils.isEmpty(password)) {
            binding.tilPassword.setError("Kata sandi wajib diisi");
            return;
        } else {
            binding.tilPassword.setError(null);
        }

        setLoading(true);

        LoginRequest loginRequest = new LoginRequest(email, password);
        ApiClient.getSupabaseApi().login(loginRequest).enqueue(new Callback<AuthResponse>() {
            @Override
            public void onResponse(@NonNull Call<AuthResponse> call, @NonNull Response<AuthResponse> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getAccessToken() != null) {
                    AuthResponse auth = response.body();
                    String userId = auth.getUser() != null ? auth.getUser().getId() : null;
                    if (userId != null) {
                        fetchUserProfile(auth, userId);
                    } else {
                        setLoading(false);
                        Toast.makeText(LoginActivity.this, "Gagal membaca data pengguna.", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    setLoading(false);
                    Toast.makeText(LoginActivity.this, "Email atau kata sandi tidak sesuai.", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<AuthResponse> call, @NonNull Throwable t) {
                setLoading(false);
                Toast.makeText(LoginActivity.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void fetchUserProfile(AuthResponse auth, String userId) {
        String authHeader = "Bearer " + auth.getAccessToken();
        ApiClient.getSupabaseApi().getProfile(authHeader, "eq." + userId, "*").enqueue(new Callback<List<Profile>>() {
            @Override
            public void onResponse(@NonNull Call<List<Profile>> call, @NonNull Response<List<Profile>> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    Profile profile = response.body().get(0);
                    sessionManager.saveSession(auth, profile);
                    Toast.makeText(LoginActivity.this, "Selamat datang, " + profile.getNamaPanggilan() + "!", Toast.LENGTH_SHORT).show();
                    navigateAfterLogin();
                } else {
                    // Profile not created or permission error, save basic auth
                    sessionManager.saveSession(auth, null);
                    navigateAfterLogin();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Profile>> call, @NonNull Throwable t) {
                setLoading(false);
                sessionManager.saveSession(auth, null);
                navigateAfterLogin();
            }
        });
    }

    private void navigateAfterLogin() {
        Intent intent;
        if (sessionManager.isPengurus()) {
            intent = new Intent(LoginActivity.this, PengurusMainActivity.class);
        } else {
            intent = new Intent(LoginActivity.this, AnggotaMainActivity.class);
        }
        startActivity(intent);
        finish();
    }

    private void setLoading(boolean isLoading) {
        binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        binding.btnLogin.setEnabled(!isLoading);
        binding.btnGoToRegister.setEnabled(!isLoading);
    }
}
