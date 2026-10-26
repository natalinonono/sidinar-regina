package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;

public class AppVersionResponse {
    @SerializedName("latest_version_code")
    private int latestVersionCode;

    @SerializedName("latest_version_name")
    private String latestVersionName;

    @SerializedName("min_required_version")
    private int minRequiredVersion;

    @SerializedName("download_url")
    private String downloadUrl;

    @SerializedName("release_notes")
    private String releaseNotes;

    @SerializedName("force_update")
    private boolean forceUpdate;

    public int getLatestVersionCode() {
        return latestVersionCode;
    }

    public void setLatestVersionCode(int latestVersionCode) {
        this.latestVersionCode = latestVersionCode;
    }

    public String getLatestVersionName() {
        return latestVersionName;
    }

    public void setLatestVersionName(String latestVersionName) {
        this.latestVersionName = latestVersionName;
    }

    public int getMinRequiredVersion() {
        return minRequiredVersion;
    }

    public void setMinRequiredVersion(int minRequiredVersion) {
        this.minRequiredVersion = minRequiredVersion;
    }

    public String getDownloadUrl() {
        return downloadUrl;
    }

    public void setDownloadUrl(String downloadUrl) {
        this.downloadUrl = downloadUrl;
    }

    public String getReleaseNotes() {
        return releaseNotes;
    }

    public void setReleaseNotes(String releaseNotes) {
        this.releaseNotes = releaseNotes;
    }

    public boolean isForceUpdate() {
        return forceUpdate;
    }

    public void setForceUpdate(boolean forceUpdate) {
        this.forceUpdate = forceUpdate;
    }
}
