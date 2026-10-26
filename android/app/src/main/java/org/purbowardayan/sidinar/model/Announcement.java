package org.purbowardayan.sidinar.model;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Announcement implements Serializable {
    @SerializedName("id")
    private String id;

    @SerializedName("judul")
    private String judul;

    @SerializedName("isi")
    private String isi;

    @SerializedName("is_pinned")
    private boolean isPinned;

    @SerializedName("created_at")
    private String createdAt;

    public Announcement() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJudul() { return judul; }
    public void setJudul(String judul) { this.judul = judul; }

    public String getIsi() { return isi; }
    public void setIsi(String isi) { this.isi = isi; }

    public boolean isPinned() { return isPinned; }
    public void setPinned(boolean pinned) { isPinned = pinned; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
