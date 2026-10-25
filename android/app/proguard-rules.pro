# Proguard rules for SiDinar Regina
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.jetbrains.annotations.* <fields>;
    @org.jetbrains.annotations.* <methods>;
}

# Keep Kotlinx Serialization models
-keepclassmembers class * {
    companion object;
}
-keepclasseswithmembers class * {
    public static *** Companion;
}
-keepclassmembers class * {
    *** Companion;
}
-keep class * implements kotlinx.serialization.KSerializer {
    <init>(...);
}
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}

# Supabase and Ktor
-keep class io.github.jan.supabase.** { *; }
-keep class io.ktor.** { *; }
