package org.purbowardayan.sidinar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.purbowardayan.sidinar.data.SupabaseClientProvider
import org.purbowardayan.sidinar.data.model.AccountStatus
import org.purbowardayan.sidinar.data.model.Profile
import org.purbowardayan.sidinar.data.model.UserRole

sealed interface AuthState {
    data object Idle : AuthState
    data object Loading : AuthState
    data class Authenticated(val profile: Profile) : AuthState
    data class RegistrationSuccess(val message: String) : AuthState
    data class Error(val message: String) : AuthState
}

class AuthViewModel : ViewModel() {
    private val supabase = SupabaseClientProvider.client

    // Reactive StateFlow held purely in memory
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    fun login(emailInput: String, passwordInput: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                // Supabase Auth SignIn (in-memory token session)
                supabase.auth.signInWith(Email) {
                    email = emailInput
                    password = passwordInput
                }

                val currentUserId = supabase.auth.currentUserOrNull()?.id
                if (currentUserId == null) {
                    _authState.value = AuthState.Error("Gagal memverifikasi sesi login.")
                    return@launch
                }

                // Fetch Profile from profiles table
                val profile = supabase.postgrest["profiles"]
                    .select {
                        filter {
                            eq("id", currentUserId)
                        }
                    }
                    .decodeSingle<Profile>()

                SupabaseClientProvider.updateProfile(profile)
                _authState.value = AuthState.Authenticated(profile)
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.localizedMessage ?: "Terjadi kesalahan saat masuk.")
            }
        }
    }

    fun register(
        emailInput: String,
        passwordInput: String,
        namaLengkap: String,
        namaPanggilan: String,
        noTelepon: String,
        asalWilayahTeks: String,
        jenjang: String
    ) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                supabase.auth.signUpWith(Email) {
                    email = emailInput
                    password = passwordInput
                }

                val newUserId = supabase.auth.currentUserOrNull()?.id
                if (newUserId != null) {
                    val newProfile = Profile(
                        id = newUserId,
                        email = emailInput,
                        namaLengkap = namaLengkap,
                        namaPanggilan = namaPanggilan,
                        noTelepon = noTelepon,
                        asalWilayahTeks = asalWilayahTeks,
                        jenjang = jenjang,
                        role = UserRole.ANGGOTA,
                        status = AccountStatus.PENDING
                    )

                    supabase.postgrest["profiles"].insert(newProfile)
                }

                _authState.value = AuthState.RegistrationSuccess(
                    "Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan (Approve) dari Tim Pendamping Misdinar SPMR."
                )
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.localizedMessage ?: "Pendaftaran gagal diproses.")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                supabase.auth.signOut()
            } catch (_: Exception) {}
            SupabaseClientProvider.clearSession()
            _authState.value = AuthState.Idle
        }
    }
}
