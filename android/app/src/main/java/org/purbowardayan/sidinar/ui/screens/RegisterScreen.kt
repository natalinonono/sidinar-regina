package org.purbowardayan.sidinar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.purbowardayan.sidinar.ui.theme.*
import org.purbowardayan.sidinar.ui.viewmodel.AuthState
import org.purbowardayan.sidinar.ui.viewmodel.AuthViewModel

@Composable
fun RegisterScreen(
    authViewModel: AuthViewModel,
    onNavigateToLogin: () -> Unit
) {
    var namaLengkap by remember { mutableStateOf("") }
    var namaPanggilan by remember { mutableStateOf("") }
    var noTelepon by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var asalWilayah by remember { mutableStateOf("") }
    var jenjang by remember { mutableStateOf("SMP") }
    var commitment by remember { mutableStateOf(true) }

    val authState by authViewModel.authState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundLight)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceLowest),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header
                Text(
                    text = "Daftar Akun Misdinar",
                    style = MaterialTheme.typography.titleLarge,
                    color = MarianPrimary,
                    fontWeight = FontWeight.Bold
                )

                // Warning Banner
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = SacredGoldFixed.copy(alpha = 0.4f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.VerifiedUser,
                            contentDescription = null,
                            tint = SacredGold,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "Persetujuan Diperlukan: Akun baru memerlukan persetujuan dari Pengurus Misdinar SPMR sebelum dapat memilih jadwal tugas.",
                            style = MaterialTheme.typography.labelSmall,
                            color = SacredGold
                        )
                    }
                }

                if (authState is AuthState.RegistrationSuccess) {
                    Text(
                        text = (authState as AuthState.RegistrationSuccess).message,
                        color = LiturgiHijau,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Button(
                        onClick = onNavigateToLogin,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MarianPrimary)
                    ) {
                        Text("Kembali ke Halaman Masuk")
                    }
                } else {
                    OutlinedTextField(
                        value = namaLengkap,
                        onValueChange = { namaLengkap = it },
                        label = { Text("Nama Lengkap", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = namaPanggilan,
                            onValueChange = { namaPanggilan = it },
                            label = { Text("Panggilan", fontSize = 12.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = noTelepon,
                            onValueChange = { noTelepon = it },
                            label = { Text("No WhatsApp", fontSize = 12.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true
                        )
                    }

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email Pribadi / Orang Tua", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = asalWilayah,
                        onValueChange = { asalWilayah = it },
                        label = { Text("Asal Wilayah & Lingkungan", fontSize = 12.sp) },
                        placeholder = { Text("Contoh: Wilayah 3 / Lingk. Tarsisius", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Kata Sandi Akun", fontSize = 12.sp) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true
                    )

                    // Commitment Row
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Checkbox(
                            checked = commitment,
                            onCheckedChange = { commitment = it },
                            colors = CheckboxDefaults.colors(checkedColor = MarianPrimary)
                        )
                        Text(
                            text = "Saya berkomitmen hadir 30 menit sebelum misa & tertib.",
                            style = MaterialTheme.typography.labelSmall,
                            color = OnSurfaceVariant
                        )
                    }

                    Button(
                        onClick = {
                            authViewModel.register(
                                emailInput = email,
                                passwordInput = password,
                                namaLengkap = namaLengkap,
                                namaPanggilan = namaPanggilan,
                                noTelepon = noTelepon,
                                asalWilayahTeks = if (asalWilayah.isNotBlank()) asalWilayah else "Paroki Purbowardayan",
                                jenjang = jenjang
                            )
                        },
                        enabled = namaLengkap.isNotBlank() && email.isNotBlank() && password.isNotBlank() && commitment,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MarianPrimary)
                    ) {
                        Text("Kirim Formulir Pendaftaran", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }

                    TextButton(
                        onClick = onNavigateToLogin,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Sudah Punya Akun? Masuk di sini", color = MarianPrimary, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
