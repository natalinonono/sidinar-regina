package org.purbowardayan.sidinar.network;

import java.util.List;
import java.util.Map;
import okhttp3.ResponseBody;
import org.purbowardayan.sidinar.model.Announcement;
import org.purbowardayan.sidinar.model.AppVersionResponse;
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.model.MisaBesarResponse;
import org.purbowardayan.sidinar.model.RegisterRequest;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.HTTP;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface BackendApi {
    @GET("api/app/version")
    Call<AppVersionResponse> getAppVersion();

    @GET("api/schedules")
    Call<List<MassSchedule>> getSchedules();

    @GET("api/announcements")
    Call<List<Announcement>> getAnnouncements();

    @POST("api/auth/register")
    Call<ResponseBody> register(@Body RegisterRequest request);

    @POST("api/bookings")
    Call<ResponseBody> createBooking(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @PATCH("api/bookings")
    Call<ResponseBody> updateBooking(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @DELETE("api/bookings")
    Call<ResponseBody> cancelBooking(
            @Header("Authorization") String auth,
            @Query("id") String bookingId,
            @Query("user_id") String userId
    );

    @POST("api/checkin")
    Call<ResponseBody> checkIn(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @POST("api/schedules/generate")
    Call<ResponseBody> generateSchedules(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @POST("api/pengurus/approve")
    Call<ResponseBody> approveMember(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @POST("api/bookings/{id}/checkin")
    Call<ResponseBody> checkInBooking(
            @Header("Authorization") String auth,
            @retrofit2.http.Path("id") String bookingId
    );

    @POST("api/bookings/{id}/reminder")
    Call<ResponseBody> recordReminderSent(
            @Header("Authorization") String auth,
            @retrofit2.http.Path("id") String bookingId
    );

    @DELETE("api/schedules")
    Call<ResponseBody> deleteSchedule(
            @Header("Authorization") String auth,
            @Query("id") String scheduleId
    );

    @HTTP(method = "DELETE", path = "api/schedules", hasBody = true)
    Call<ResponseBody> deleteBulkSchedules(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @PATCH("api/profile")
    Call<ResponseBody> updateProfile(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    // --- FITUR LATIHAN PETUGAS MISA BESAR ---
    @GET("api/misa-besar")
    Call<MisaBesarResponse> getMisaBesarData(
            @Header("Authorization") String auth,
            @Query("tahun") int tahun
    );

    @POST("api/misa-besar/setup")
    Call<ResponseBody> setupMisaBesar(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @DELETE("api/misa-besar/setup")
    Call<ResponseBody> deleteMisaBesarEvent(
            @Header("Authorization") String auth,
            @Query("event_id") String eventId
    );

    @POST("api/misa-besar/petugas")
    Call<ResponseBody> addMisaBesarPetugas(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @PATCH("api/misa-besar/petugas")
    Call<ResponseBody> updateMisaBesarPetugas(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @DELETE("api/misa-besar/petugas")
    Call<ResponseBody> deleteMisaBesarPetugas(
            @Header("Authorization") String auth,
            @Query("id") String petugasId
    );

    @POST("api/misa-besar/latihan")
    Call<ResponseBody> createMisaBesarLatihan(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @DELETE("api/misa-besar/latihan")
    Call<ResponseBody> deleteMisaBesarLatihan(
            @Header("Authorization") String auth,
            @Query("id") String latihanId
    );

    @POST("api/misa-besar/absensi")
    Call<ResponseBody> submitMisaBesarAbsensi(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );
}
