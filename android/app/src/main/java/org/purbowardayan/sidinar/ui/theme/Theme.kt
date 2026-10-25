package org.purbowardayan.sidinar.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = MarianPrimary,
    onPrimary = OnMarianPrimary,
    primaryContainer = MarianPrimaryContainer,
    secondary = SacredGold,
    onSecondary = OnMarianPrimary,
    secondaryContainer = SacredGoldContainer,
    background = BackgroundLight,
    onBackground = OnSurface,
    surface = SurfaceLowest,
    onSurface = OnSurface,
    surfaceVariant = SurfaceContainer,
    onSurfaceVariant = OnSurfaceVariant,
    outline = OutlineColor,
    error = ErrorColor,
    errorContainer = ErrorContainer
)

@Composable
fun SiDinarReginaTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography,
        content = content
    )
}
