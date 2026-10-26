package org.purbowardayan.sidinar.network;

import java.util.List;
import java.util.Map;
import okhttp3.ResponseBody;
import org.purbowardayan.sidinar.model.Announcement;
import org.purbowardayan.sidinar.model.AuthResponse;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.model.LoginRequest;
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.model.Profile;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface SupabaseApi {
    @POST("auth/v1/token?grant_type=password")
    Call<AuthResponse> login(@Body LoginRequest request);

    @GET("rest/v1/profiles")
    Call<List<Profile>> getProfile(
            @Header("Authorization") String auth,
            @Query("id") String idFilter,
            @Query("select") String select
    );

    @GET("rest/v1/profiles")
    Call<List<Profile>> getAllProfiles(
            @Header("Authorization") String auth,
            @Query("select") String select,
            @Query("order") String order
    );

    @PATCH("rest/v1/profiles")
    Call<Void> updateProfileStatus(
            @Header("Authorization") String auth,
            @Query("id") String idFilter,
            @Body Profile profile
    );

    @GET("rest/v1/mass_schedules")
    Call<List<MassSchedule>> getSchedules(
            @Header("Authorization") String auth,
            @Query("select") String select,
            @Query("order") String order
    );

    @POST("rest/v1/mass_schedules")
    Call<Void> createSchedule(
            @Header("Authorization") String auth,
            @Body MassSchedule schedule
    );

    @PATCH("rest/v1/mass_schedules")
    Call<Void> updateSchedule(
            @Header("Authorization") String auth,
            @Query("id") String idFilter,
            @Body MassSchedule schedule
    );

    @DELETE("rest/v1/mass_schedules")
    Call<Void> deleteSchedule(
            @Header("Authorization") String auth,
            @Query("id") String idFilter
    );

    @GET("rest/v1/bookings")
    Call<List<Booking>> getAllBookings(
            @Header("Authorization") String auth,
            @Query("select") String select,
            @Query("order") String order
    );

    @GET("rest/v1/bookings")
    Call<List<Booking>> getUserBookings(
            @Header("Authorization") String auth,
            @Query("user_id") String userIdFilter,
            @Query("select") String select,
            @Query("order") String order
    );

    @PATCH("rest/v1/bookings")
    Call<Void> updateBookingPosition(
            @Header("Authorization") String auth,
            @Query("id") String idFilter,
            @Body Map<String, Object> body
    );

    @PATCH("rest/v1/bookings")
    Call<Void> updateAttendanceStatus(
            @Header("Authorization") String auth,
            @Query("id") String idFilter,
            @Body Map<String, Object> body
    );

    @GET("rest/v1/announcements")
    Call<List<Announcement>> getAnnouncements(
            @Header("Authorization") String auth,
            @Query("select") String select,
            @Query("order") String order
    );

    @POST("rest/v1/announcements")
    Call<Void> createAnnouncement(
            @Header("Authorization") String auth,
            @Body Announcement announcement
    );

    @PATCH("rest/v1/announcements")
    Call<Void> updateAnnouncement(
            @Header("Authorization") String auth,
            @Query("id") String idFilter,
            @Body Announcement announcement
    );

    @DELETE("rest/v1/announcements")
    Call<Void> deleteAnnouncement(
            @Header("Authorization") String auth,
            @Query("id") String idFilter
    );
}
