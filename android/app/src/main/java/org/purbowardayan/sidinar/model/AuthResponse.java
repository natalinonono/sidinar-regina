package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;

public class AuthResponse {
    @SerializedName("access_token")
    private String accessToken;

    @SerializedName("token_type")
    private String tokenType;

    @SerializedName("expires_in")
    private long expiresIn;

    @SerializedName("user")
    private AuthUser user;

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public AuthUser getUser() { return user; }
    public void setUser(AuthUser user) { this.user = user; }

    public static class AuthUser {
        @SerializedName("id")
        private String id;

        @SerializedName("email")
        private String email;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
