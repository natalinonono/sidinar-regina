package org.purbowardayan.sidinar.network;

import java.util.Map;
import okhttp3.ResponseBody;
import org.purbowardayan.sidinar.model.RegisterRequest;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.Header;
import retrofit2.http.POST;

public interface BackendApi {
    @POST("api/auth/register")
    Call<ResponseBody> register(@Body RegisterRequest request);

    @POST("api/bookings")
    Call<ResponseBody> createBooking(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );

    @POST("api/checkin")
    Call<ResponseBody> checkIn(
            @Header("Authorization") String auth,
            @Body Map<String, Object> body
    );
}
