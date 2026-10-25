package org.purbowardayan.sidinar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import org.purbowardayan.sidinar.data.model.UserRole
import org.purbowardayan.sidinar.ui.screens.AnggotaDashboardScreen
import org.purbowardayan.sidinar.ui.screens.LoginScreen
import org.purbowardayan.sidinar.ui.screens.PengurusDashboardScreen
import org.purbowardayan.sidinar.ui.screens.RegisterScreen
import org.purbowardayan.sidinar.ui.theme.SiDinarReginaTheme
import org.purbowardayan.sidinar.ui.viewmodel.AuthState
import org.purbowardayan.sidinar.ui.viewmodel.AuthViewModel
import org.purbowardayan.sidinar.ui.viewmodel.ScheduleViewModel

class MainActivity : ComponentActivity() {
    private val authViewModel: AuthViewModel by viewModels()
    private val scheduleViewModel: ScheduleViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SiDinarReginaTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation(
                        authViewModel = authViewModel,
                        scheduleViewModel = scheduleViewModel
                    )
                }
            }
        }
    }
}

@Composable
fun AppNavigation(
    authViewModel: AuthViewModel,
    scheduleViewModel: ScheduleViewModel
) {
    val navController = rememberNavController()
    val authState by authViewModel.authState.collectAsState()

    // Automatic Navigation Listener based on in-memory AuthState
    LaunchedEffect(authState) {
        when (val state = authState) {
            is AuthState.Authenticated -> {
                if (state.profile.role == UserRole.PENGURUS) {
                    navController.navigate("pengurus_dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                } else {
                    navController.navigate("anggota_dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            }
            is AuthState.Idle -> {
                navController.navigate("login") {
                    popUpTo(0) { inclusive = true }
                }
            }
            else -> {}
        }
    }

    NavHost(navController = navController, startDestination = "login") {
        composable("login") {
            LoginScreen(
                authViewModel = authViewModel,
                onNavigateToRegister = { navController.navigate("register") }
            )
        }
        composable("register") {
            RegisterScreen(
                authViewModel = authViewModel,
                onNavigateToLogin = { navController.navigate("login") }
            )
        }
        composable("anggota_dashboard") {
            AnggotaDashboardScreen(
                scheduleViewModel = scheduleViewModel,
                onLogout = { authViewModel.logout() }
            )
        }
        composable("pengurus_dashboard") {
            PengurusDashboardScreen(
                scheduleViewModel = scheduleViewModel,
                onLogout = { authViewModel.logout() }
            )
        }
    }
}
