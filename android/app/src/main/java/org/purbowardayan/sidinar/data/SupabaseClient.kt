package org.purbowardayan.sidinar.data

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.MemorySessionManager
import io.github.jan.supabase.realtime.Realtime
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.purbowardayan.sidinar.data.model.Profile

object SupabaseClientProvider {
    const val SUPABASE_URL = "https://tkclthikptiotudrtkty.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrY2x0aGlrcHRpb3R1ZHJ0a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzkzNTAsImV4cCI6MjEwODUxNTM1MH0.HXH8eXnwMAPb_ParcZQoniGQUdag3Faurouv-p3qInA"

    // 100% In-Memory Session Management: NO SharedPreferences / LocalStorage for sensitive tokens
    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Auth) {
            // MemorySessionManager ensures session token lives strictly in RAM
            sessionManager = MemorySessionManager()
        }
        install(Postgrest)
        install(Realtime)
    }

    // In-memory reactive state for current profile
    private val _currentProfile = MutableStateFlow<Profile?>(null)
    val currentProfile: StateFlow<Profile?> = _currentProfile.asStateFlow()

    fun updateProfile(profile: Profile?) {
        _currentProfile.value = profile
    }

    fun clearSession() {
        _currentProfile.value = null
    }
}
