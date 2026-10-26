package org.purbowardayan.sidinar.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import java.util.ArrayList;
import java.util.List;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.model.Announcement;

public class AnnouncementAdapter extends RecyclerView.Adapter<AnnouncementAdapter.ViewHolder> {

    public interface OnAnnouncementActionListener {
        void onEdit(Announcement announcement);
        void onDelete(Announcement announcement);
    }

    private final List<Announcement> items = new ArrayList<>();
    private final boolean isPengurus;
    private final OnAnnouncementActionListener actionListener;

    public AnnouncementAdapter(boolean isPengurus, OnAnnouncementActionListener actionListener) {
        this.isPengurus = isPengurus;
        this.actionListener = actionListener;
    }

    public void updateList(List<Announcement> newList) {
        items.clear();
        if (newList != null) {
            items.addAll(newList);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_announcement, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Announcement item = items.get(position);
        holder.bind(item, isPengurus, actionListener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvJudul;
        private final TextView tvIsi;
        private final TextView tvDate;
        private final TextView tvPinnedBadge;
        private final LinearLayout layoutAdminActions;
        private final MaterialButton btnEditAnnouncement;
        private final MaterialButton btnDeleteAnnouncement;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvJudul = itemView.findViewById(R.id.tvJudul);
            tvIsi = itemView.findViewById(R.id.tvIsi);
            tvDate = itemView.findViewById(R.id.tvDate);
            tvPinnedBadge = itemView.findViewById(R.id.tvPinnedBadge);
            layoutAdminActions = itemView.findViewById(R.id.layoutAdminActions);
            btnEditAnnouncement = itemView.findViewById(R.id.btnEditAnnouncement);
            btnDeleteAnnouncement = itemView.findViewById(R.id.btnDeleteAnnouncement);
        }

        public void bind(Announcement item, boolean isPengurus, OnAnnouncementActionListener listener) {
            tvJudul.setText(item.getJudul() != null ? item.getJudul() : "Pengumuman");
            tvIsi.setText(item.getIsi() != null ? item.getIsi() : "");

            String dateStr = item.getCreatedAt();
            if (dateStr != null && dateStr.length() >= 10) {
                tvDate.setText(dateStr.substring(0, 10));
            } else {
                tvDate.setText("");
            }

            if (item.isPinned()) {
                tvPinnedBadge.setVisibility(View.VISIBLE);
            } else {
                tvPinnedBadge.setVisibility(View.GONE);
            }

            if (isPengurus && listener != null) {
                layoutAdminActions.setVisibility(View.VISIBLE);
                btnEditAnnouncement.setOnClickListener(v -> listener.onEdit(item));
                btnDeleteAnnouncement.setOnClickListener(v -> listener.onDelete(item));
            } else {
                layoutAdminActions.setVisibility(View.GONE);
            }
        }
    }
}
