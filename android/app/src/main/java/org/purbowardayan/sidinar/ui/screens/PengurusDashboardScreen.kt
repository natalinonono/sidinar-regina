package org.purbowardayan.sidinar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.purbowardayan.sidinar.data.SupabaseClientProvider
import org.purbowardayan.sidinar.ui.theme.*
import org.purbowardayan.sidinar.ui.viewmodel.ScheduleViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PengurusDashboardScreen(
    scheduleViewModel: ScheduleViewModel,
    onLogout: () -> Unit
) {
    val currentProfile by SupabaseClientProvider.currentProfile.collectAsState()
    val uiState by scheduleViewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "SiDinar Regina (Pengurus)",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MarianPrimary
                        )
                        Text(
                            text = "Pusat Kendali Sakristi SPMR",
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
            // KPI Counters Row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceLowest)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Total Terdaftar", fontSize = 10.sp, color = OnSurfaceVariant)
                            Text(
                                text = "${uiState.bookings.size}",
                                style = MaterialTheme.typography.headlineMedium,
                                color = MarianPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceLowest)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Presensi Hadir", fontSize = 10.sp, color = LiturgiHijau)
                            val hadirCount = uiState.bookings.count { it.statusKehadiran.name == "HADIR" }
                            Text(
                                text = "$hadirCount",
                                style = MaterialTheme.typography.headlineMedium,
                                color = LiturgiHijau,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Daftar Sesi Misa & Keterisian Kuota",
                    style = MaterialTheme.typography.titleLarge,
                    color = MarianPrimary,
                    fontWeight = FontWeight.Bold
                )
            }

            items(uiState.schedules) { schedule ->
                val booked = uiState.bookings.filter { it.scheduleId == schedule.id }
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceLowest),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = schedule.kategori.name,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = SacredGold
                            )
                            Text(
                                text = "${booked.size}/${schedule.kuotaMaksimal} Terisi",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (booked.size >= schedule.kuotaMaksimal) ErrorColor else LiturgiHijau
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

                        Text(
                            text = "Selebran: ${schedule.namaSelebran}",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )

                        if (booked.isNotEmpty()) {
                            Text(
                                text = "Petugas: " + booked.joinToString { it.posisiTugas },
                                fontSize = 11.sp,
                                color = SacredGold,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }
    }
}
