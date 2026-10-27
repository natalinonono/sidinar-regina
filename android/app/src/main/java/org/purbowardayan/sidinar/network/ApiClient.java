package org.purbowardayan.sidinar.network;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
import java.util.concurrent.TimeUnit;
import okhttp3.Authenticator;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiClient {
    public static final String SUPABASE_URL = "https://tkclthikptiotudrtkty.supabase.co/";
    public static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrY2x0aGlrcHRpb3R1ZHJ0a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzkzNTAsImV4cCI6MjEwODUxNTM1MH0.HXH8eXnwMAPb_ParcZQoniGQUdag3Faurouv-p3qInA";
    public static final String BACKEND_URL = "https://sidinar-regina.vercel.app/";

    public static final String WA_ADMIN = "6281228788912";
    public static final String WA_ADMIN_DISPLAY = "081228788912";
    public static final String WA_PENGURUS = "6285643985341";
    public static final String WA_PENGURUS_DISPLAY = "085643985341";

    private static SupabaseApi supabaseApi;
    private static BackendApi backendApi;

    public static synchronized SupabaseApi getSupabaseApi() {
        if (supabaseApi == null) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);

            Interceptor headerInterceptor = chain -> {
                Request original = chain.request();
                Request request = original.newBuilder()
                        .header("apikey", SUPABASE_ANON_KEY)
                        .header("Content-Type", "application/json")
                        .header("Prefer", "return=representation")
                        .build();
                return chain.proceed(request);
            };

            Authenticator tokenAuthenticator = (route, response) -> {
                if (responseCount(response) >= 2) {
                    return null;
                }
                boolean refreshed = refreshSessionSynchronous();
                if (refreshed && org.purbowardayan.sidinar.SiDinarApplication.getInstance() != null) {
                    org.purbowardayan.sidinar.auth.SessionManager sm = new org.purbowardayan.sidinar.auth.SessionManager(org.purbowardayan.sidinar.SiDinarApplication.getInstance());
                    String newToken = sm.getToken();
                    if (newToken != null && !newToken.isEmpty()) {
                        return response.request().newBuilder()
                                .header("Authorization", "Bearer " + newToken)
                                .build();
                    }
                }
                return null;
            };

            OkHttpClient client = new OkHttpClient.Builder()
                    .addInterceptor(headerInterceptor)
                    .authenticator(tokenAuthenticator)
                    .addInterceptor(logging)
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build();

            Retrofit retrofit = new Retrofit.Builder()
                    .baseUrl(SUPABASE_URL)
                    .client(client)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();

            supabaseApi = retrofit.create(SupabaseApi.class);
        }
        return supabaseApi;
    }

    private static int responseCount(okhttp3.Response response) {
        int result = 1;
        while ((response = response.priorResponse()) != null) {
            result++;
        }
        return result;
    }

    public static synchronized boolean refreshSessionSynchronous() {
        if (org.purbowardayan.sidinar.SiDinarApplication.getInstance() == null) return false;
        try {
            org.purbowardayan.sidinar.auth.SessionManager sessionManager = new org.purbowardayan.sidinar.auth.SessionManager(org.purbowardayan.sidinar.SiDinarApplication.getInstance());
            String refreshToken = sessionManager.getRefreshToken();
            if (refreshToken == null || refreshToken.isEmpty()) return false;

            OkHttpClient directClient = new OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .build();

            org.json.JSONObject bodyJson = new org.json.JSONObject();
            bodyJson.put("refresh_token", refreshToken);

            okhttp3.RequestBody requestBody = okhttp3.RequestBody.create(
                    okhttp3.MediaType.parse("application/json"),
                    bodyJson.toString()
            );

            Request request = new Request.Builder()
                    .url(SUPABASE_URL + "auth/v1/token?grant_type=refresh_token")
                    .header("apikey", SUPABASE_ANON_KEY)
                    .header("Content-Type", "application/json")
                    .post(requestBody)
                    .build();

            okhttp3.Response response = directClient.newCall(request).execute();
            if (response.isSuccessful() && response.body() != null) {
                String respStr = response.body().string();
                org.json.JSONObject json = new org.json.JSONObject(respStr);
                String newAccess = json.optString("access_token", null);
                String newRefresh = json.optString("refresh_token", null);
                if (newAccess != null && !newAccess.isEmpty()) {
                    sessionManager.updateTokens(newAccess, newRefresh != null ? newRefresh : refreshToken);
                    return true;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public static synchronized BackendApi getBackendApi() {
        if (backendApi == null) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);

            Authenticator tokenAuthenticator = (route, response) -> {
                if (responseCount(response) >= 2) {
                    return null;
                }
                boolean refreshed = refreshSessionSynchronous();
                if (refreshed && org.purbowardayan.sidinar.SiDinarApplication.getInstance() != null) {
                    org.purbowardayan.sidinar.auth.SessionManager sm = new org.purbowardayan.sidinar.auth.SessionManager(org.purbowardayan.sidinar.SiDinarApplication.getInstance());
                    String newToken = sm.getToken();
                    if (newToken != null && !newToken.isEmpty()) {
                        return response.request().newBuilder()
                                .header("Authorization", "Bearer " + newToken)
                                .build();
                    }
                }
                return null;
            };

            OkHttpClient client = new OkHttpClient.Builder()
                    .authenticator(tokenAuthenticator)
                    .addInterceptor(logging)
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build();

            Retrofit retrofit = new Retrofit.Builder()
                    .baseUrl(BACKEND_URL)
                    .client(client)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();

            backendApi = retrofit.create(BackendApi.class);
        }
        return backendApi;
    }

    public static void openWhatsApp(Context context, String phoneInternational, String message) {
        try {
            String url = "https://api.whatsapp.com/send?phone=" + phoneInternational;
            if (message != null && !message.isEmpty()) {
                url += "&text=" + Uri.encode(message);
            }
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(url));
            context.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(context, "Tidak dapat membuka WhatsApp. Silakan hubungi nomor: " + phoneInternational, Toast.LENGTH_LONG).show();
        }
    }
}
