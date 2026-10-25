package org.purbowardayan.sidinar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.PostgresAction
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.purbowardayan.sidinar.data.SupabaseClientProvider
import org.purbowardayan.sidinar.data.model.AttendanceStatus
import org.purbowardayan.sidinar.data.model.Booking
import org.purbowardayan.sidinar.data.model.MassSchedule
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class ScheduleUiState(
    val isLoading: Boolean = false,
    val schedules: List<MassSchedule> = emptyList(),
    val bookings: List<Booking> = emptyList(),
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class ScheduleViewModel : ViewModel() {
    private val supabase = SupabaseClientProvider.client

    private val _uiState = MutableStateFlow(ScheduleUiState(isLoading = true))
    val uiState: StateFlow<ScheduleUiState> = _uiState.asStateFlow()

    init {
        loadData()
        listenRealtime()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val scheduleList = supabase.postgrest["mass_schedules"]
                    .select()
                    .decodeList<MassSchedule>()

                val bookingList = supabase.postgrest["bookings"]
                    .select()
                    .decodeList<Booking>()

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    schedules = scheduleList,
                    bookings = bookingList
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: "Gagal memuat jadwal misa."
                )
            }
        }
    }

    private fun listenRealtime() {
        viewModelScope.launch {
            try {
                val myChannel = supabase.realtime.channel("mobile_schedules_feed")
                
                // Collect changes in realtime
                val bookingChanges = myChannel.postgresChangeFlow<PostgresAction>(schema = "public") {
                    table = "bookings"
                }

                launch {
                    bookingChanges.collect {
                        loadData()
                    }
                }

                myChannel.subscribe()
            } catch (_: Exception) {
                // Realtime fallback to polling
            }
        }
    }

    fun bookSchedule(scheduleId: String, posisiTugas: String) {
        viewModelScope.launch {
            try {
                val currentUserId = SupabaseClientProvider.currentProfile.value?.id ?: return@launch
                val newBooking = Booking(
                    id = java.util.UUID.randomUUID().toString(),
                    scheduleId = scheduleId,
                    userId = currentUserId,
                    kategoriMisa = _uiState.value.schedules.find { it.id == scheduleId }?.kategori
                        ?: org.purbowardayan.sidinar.data.model.MassCategory.MINGGUAN,
                    mingguKe = _uiState.value.schedules.find { it.id == scheduleId }?.mingguKe ?: 43,
                    tahun = 2026,
                    posisiTugas = posisiTugas
                )

                supabase.postgrest["bookings"].insert(newBooking)
                _uiState.value = _uiState.value.copy(successMessage = "Pendaftaran tugas altar berhasil!")
                loadData()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = e.localizedMessage ?: "Pendaftaran gagal.")
            }
        }
    }

    fun checkIn(bookingId: String) {
        viewModelScope.launch {
            try {
                val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date())

                supabase.postgrest["bookings"].update(
                    mapOf(
                        "status_kehadiran" to "hadir",
                        "waktu_checkin" to nowIso
                    )
                ) {
                    filter {
                        eq("id", bookingId)
                    }
                }
                _uiState.value = _uiState.value.copy(successMessage = "Presensi sakristi berhasil dicatat!")
                loadData()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = e.localizedMessage ?: "Presensi gagal.")
            }
        }
    }
}
