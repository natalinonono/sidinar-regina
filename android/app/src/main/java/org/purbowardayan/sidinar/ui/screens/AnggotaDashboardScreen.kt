package org.purbowardayan.sidinar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.purbowardayan.sidinar.data.SupabaseClientProvider
import org.purbowardayan.sidinar.data.model.Booking
import org.purbowardayan.sidinar.data.model.MassSchedule
import org.purbowardayan.sidinar.ui.theme.*
import org.purbowardayan.sidinar.ui.viewmodel.ScheduleViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnggotaDashboardScreen(
    scheduleViewModel: ScheduleViewModel,
    onLogout: () -> Unit
) {
    val currentProfile by SupabaseClientProvider.currentProfile.collectAsState()
    val uiState by scheduleViewModel.uiState.collectAsState()

    var showBookingDialogFor by remember { mutableStateOf<MassSchedule?>(null) }

    val userBookings = uiState.bookings.filter { it.userId == currentProfile?.id }
    val nextDuty = userBookings.firstOrNull()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "SiDinar Regina",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MarianPrimary
                        )
                        Text(
                            text = "Berkah Dalem, ${currentProfile?.namaPanggilan ?: "Misdinar"}",
                            style = MaterialTheme.typography.labelSmall,
                            color = OnSurfaceVariant
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, contentDescription = "Keluar", tint = ErrorColor)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceLowest)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(BackgroundLight)
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Profile & Status Pill
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceLowest)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MarianPrimaryFixed),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = MarianPrimary)
                        }
                        Column {
                            Text(
                                text = currentProfile?.namaLengkap ?: "",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = MarianPrimary
                            )
                            Text(
                                text = currentProfile?.asalWilayahTeks ?: "",
                                fontSize = 11.sp,
                                color = OnSurfaceVariant
                            )
                            Text(
                                text = "Status: ${currentProfile?.status?.name ?: "AKTIF"}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = LiturgiHijau
                            )
                        }
                    }
                }
            }

            // 2. Upcoming Duty Card
            if (nextDuty != null) {
                item {
                    val mass = uiState.schedules.find { it.id == nextDuty.scheduleId }
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MarianPrimary)
                    ) {
                        Column(
                            modifier = Modifier.padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "TUGAS ALTA MENDATANG",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SacredGoldFixed
                                )
                                Text(
                                    text = nextDuty.statusKehadiran.name,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnMarianPrimary
                                )
                            }

                            Text(
                                text = mass?.judulMisa ?: "Misa Kudus",
                                style = MaterialTheme.typography.titleLarge,
                                color = OnMarianPrimary,
                                fontWeight = FontWeight.Bold
                            )

                            Text(
                                text = "${mass?.tanggalMisa ?: ""} • ${mass?.jamMulai?.take(5) ?: ""} WIB",
                                fontSize = 12.sp,
                                color = OnMarianPrimary.copy(alpha = 0.8f)
                            )

                            Text(
                                text = "Posisi: ${nextDuty.posisiTugas}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = SacredGoldFixed
                            )

                            Button(
                                onClick = { scheduleViewModel.checkIn(nextDuty.id) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SacredGoldContainer)
                            ) {
                                Icon(Icons.Default.QrCodeScanner, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Presensi Sakristi", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // 3. Section Title
            item {
                Text(
                    text = "Jadwal Misa Minggu Ini",
                    style = MaterialTheme.typography.titleLarge,
                    color = MarianPrimary,
                    fontWeight = FontWeight.Bold
                )
            }

            // 4. Schedules List
            items(uiState.schedules) { schedule ->
                val bookedCount = uiState.bookings.count { it.scheduleId == schedule.id }
                val isUserBooked = userBookings.any { it.scheduleId == schedule.id }
                val isFull = bookedCount >= schedule.kuotaMaksimal

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceLowest),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = schedule.kategori.name,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = SacredGold
                            )
                            Text(
                                text = "$bookedCount/${schedule.kuotaMaksimal} Terisi",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isFull) ErrorColor else LiturgiHijau
                            )
                        }

                        Text(
                            text = schedule.judulMisa,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MarianPrimary
                        )

                        Text(
                            text = "${schedule.tanggalMisa} • Pukul ${schedule.jamMulai.take(5)} WIB",
                            fontSize = 12.sp,
                            color = OnSurfaceVariant
                        )

                        if (isUserBooked) {
                            OutlinedButton(
                                onClick = {},
                                enabled = false,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Sudah Terdaftar", fontSize = 12.sp)
                            }
                        } else if (!isFull) {
                            Button(
                                onClick = { showBookingDialogFor = schedule },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MarianPrimary)
                            ) {
                                Text("Daftar Tugas Misa", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Text(
                                text = "Kuota Penuh",
                                color = ErrorColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }
                    }
                }
            }
        }
    }

    // Booking Dialog
    if (showBookingDialogFor != null) {
        val schedule = showBookingDialogFor!!
        AlertDialog(
            onDismissRequest = { showBookingDialogFor = null },
            title = { Text("Konfirmasi Tugas Altar", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(schedule.judulMisa, fontWeight = FontWeight.Bold, color = MarianPrimary)
                    Text("Pukul ${schedule.jamMulai.take(5)} WIB • ${schedule.tanggalMisa}", fontSize = 12.sp)
                    Text(
                        "Anda akan didaftarkan sebagai Petugas Altar untuk misa ini. Pastikan hadir 30 menit sebelum misa dimulai di ruang sakristi.",
                        fontSize = 12.sp,
                        color = OnSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scheduleViewModel.bookSchedule(schedule.id, "Petugas Altar")
                        showBookingDialogFor = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MarianPrimary)
                ) {
                    Text("Konfirmasi Pendaftaran")
                }
            },
            dismissButton = {
                TextButton(onClick = { showBookingDialogFor = null }) {
                    Text("Batal")
                }
            }
        )
    }
}
