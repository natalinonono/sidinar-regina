package org.purbowardayan.sidinar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.purbowardayan.sidinar.ui.theme.*
import org.purbowardayan.sidinar.ui.viewmodel.AuthState
import org.purbowardayan.sidinar.ui.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    onNavigateToRegister: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val authState by authViewModel.authState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundLight)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
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
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Paroki SPMR Emblem
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(SurfaceLow),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Church,
                        contentDescription = "Logo SPMR",
                        tint = MarianPrimary,
                        modifier = Modifier.size(36.dp)
                    )
                }

                // Church Brand Title
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "SiDinar Regina",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MarianPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Misdinar Paroki Purbowardayan",
                        style = MaterialTheme.typography.bodyMedium,
                        color = OnSurfaceVariant
                    )
                    Text(
                        text = "\"The Best Choice For Life\"",
                        style = MaterialTheme.typography.labelSmall,
                        color = SacredGold,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                // Segmented Tab Toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceContainer)
                        .padding(4.dp)
                ) {
                    Button(
                        onClick = { },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SurfaceLowest,
                            contentColor = MarianPrimary
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                    ) {
                        Text("Masuk", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }

                    TextButton(
                        onClick = onNavigateToRegister,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Daftar Baru", color = OnSurfaceVariant, fontSize = 12.sp)
                    }
                }

                if (authState is AuthState.Error) {
                    Text(
                        text = (authState as AuthState.Error).message,
                        color = ErrorColor,
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center
                    )
                }

                // Form Fields
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email Akun Misdinar", fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = OutlineColor) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Kata Sandi", fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = OutlineColor) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null,
                                tint = OutlineColor
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true
                )

                // Login Button
                Button(
                    onClick = { authViewModel.login(email, password) },
                    enabled = email.isNotBlank() && password.isNotBlank() && authState !is AuthState.Loading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MarianPrimary)
                ) {
                    if (authState is AuthState.Loading) {
                        CircularProgressIndicator(color = OnMarianPrimary, modifier = Modifier.size(20.dp))
                    } else {
                        Text("Masuk ke Akun Misdinar", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                Text(
                    text = "© 2026 Misdinar SPMR Purbowardayan",
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceVariant
                )
            }
        }
    }
}
