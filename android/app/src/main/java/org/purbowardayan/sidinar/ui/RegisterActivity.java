package org.purbowardayan.sidinar.ui;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import okhttp3.ResponseBody;
import org.purbowardayan.sidinar.databinding.ActivityRegisterBinding;
import org.purbowardayan.sidinar.model.RegisterRequest;
import org.purbowardayan.sidinar.network.ApiClient;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterActivity extends AppCompatActivity {

    private ActivityRegisterBinding binding;
    private static final String[] JENJANG_OPTIONS = new String[]{
            "SD (Kelas 4 - 6)",
            "SMP (Kelas 7 - 9)",
            "SMA / SMK",
            "Kuliah / Bekerja"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityRegisterBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // Setup Jenjang dropdown
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, JENJANG_OPTIONS);
        binding.actvJenjang.setAdapter(adapter);

        binding.btnBackToLogin.setOnClickListener(v -> finish());

        binding.btnRegister.setOnClickListener(v -> performRegistration());
    }

    private void performRegistration() {
        String namaLengkap = binding.etNamaLengkap.getText() != null ? binding.etNamaLengkap.getText().toString().trim() : "";
        String namaPanggilan = binding.etNamaPanggilan.getText() != null ? binding.etNamaPanggilan.getText().toString().trim() : "";
        String phone = binding.etPhone.getText() != null ? binding.etPhone.getText().toString().trim() : "";
        String email = binding.etEmail.getText() != null ? binding.etEmail.getText().toString().trim() : "";
        String password = binding.etPassword.getText() != null ? binding.etPassword.getText().toString().trim() : "";
        String wilayah = binding.etWilayah.getText() != null ? binding.etWilayah.getText().toString().trim() : "";
        String jenjang = binding.actvJenjang.getText() != null ? binding.actvJenjang.getText().toString().trim() : "";

        if (TextUtils.isEmpty(namaLengkap)) {
            binding.tilNamaLengkap.setError("Nama lengkap wajib diisi");
            return;
        } else {
            binding.tilNamaLengkap.setError(null);
        }

        if (TextUtils.isEmpty(namaPanggilan)) {
            binding.tilNamaPanggilan.setError("Nama panggilan wajib diisi");
            return;
        } else {
            binding.tilNamaPanggilan.setError(null);
        }

        if (TextUtils.isEmpty(phone)) {
            binding.tilPhone.setError("Nomor WhatsApp wajib diisi");
            return;
        } else {
            binding.tilPhone.setError(null);
        }

        if (TextUtils.isEmpty(email)) {
            binding.tilEmail.setError("Email wajib diisi");
            return;
        } else {
            binding.tilEmail.setError(null);
        }

        if (TextUtils.isEmpty(password) || password.length() < 6) {
            binding.tilPassword.setError("Kata sandi minimal 6 karakter");
            return;
        } else {
            binding.tilPassword.setError(null);
        }

        if (TextUtils.isEmpty(wilayah)) {
            binding.tilWilayah.setError("Asal wilayah & lingkungan wajib diisi");
            return;
        } else {
            binding.tilWilayah.setError(null);
        }

        if (TextUtils.isEmpty(jenjang)) {
            binding.tilJenjang.setError("Pilih jenjang pendidikan");
            return;
        } else {
            binding.tilJenjang.setError(null);
        }

        if (!binding.cbCommitment.isChecked()) {
            Toast.makeText(this, "Silakan centang komitmen kesediaan melayani tugas altar.", Toast.LENGTH_LONG).show();
            return;
        }

        setLoading(true);

        RegisterRequest request = new RegisterRequest(
                email,
                password,
                namaLengkap,
                namaPanggilan,
                phone,
                wilayah,
                jenjang
        );

        ApiClient.getBackendApi().register(request).enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                setLoading(false);
                if (response.isSuccessful()) {
                    showSuccessDialog();
                } else {
                    String errorMsg = "Pendaftaran gagal. Pastikan email belum pernah didaftarkan.";
                    try {
                        if (response.errorBody() != null) {
                            String errStr = response.errorBody().string();
                            if (errStr.contains("error")) {
                                errorMsg = errStr;
                            }
                        }
                    } catch (Exception ignored) {}
                    Toast.makeText(RegisterActivity.this, errorMsg, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                setLoading(false);
                Toast.makeText(RegisterActivity.this, "Gagal terhubung ke server: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void showSuccessDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Pendaftaran Berhasil!")
                .setMessage("Akun Misdinar Anda telah berhasil dibuat tanpa perlu konfirmasi email!\n\nSaat ini akun berstatus Menunggu Persetujuan dari Tim Pendamping / Pengurus sebelum Anda dapat memilih jadwal tugas.")
                .setPositiveButton("Masuk ke Akun", (dialog, which) -> finish())
                .setCancelable(false)
                .show();
    }

    private void setLoading(boolean isLoading) {
        binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        binding.btnRegister.setEnabled(!isLoading);
        binding.btnBackToLogin.setEnabled(!isLoading);
    }
}
