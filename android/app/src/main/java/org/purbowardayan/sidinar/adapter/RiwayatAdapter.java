package org.purbowardayan.sidinar.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.List;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.model.Booking;
import org.purbowardayan.sidinar.model.MassSchedule;

public class RiwayatAdapter extends RecyclerView.Adapter<RiwayatAdapter.ViewHolder> {

    private final List<Booking> items = new ArrayList<>();

    public void updateList(List<Booking> newList) {
        items.clear();
        if (newList != null) {
            items.addAll(newList);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_riwayat_tugas, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(items.get(position));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvRiwayatKategori;
        private final TextView tvRiwayatStatusBadge;
        private final TextView tvRiwayatJudulMisa;
        private final TextView tvRiwayatWaktuMisa;
        private final TextView tvRiwayatPosisi;
        private final TextView tvRiwayatCheckinTime;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvRiwayatKategori = itemView.findViewById(R.id.tvRiwayatKategori);
            tvRiwayatStatusBadge = itemView.findViewById(R.id.tvRiwayatStatusBadge);
            tvRiwayatJudulMisa = itemView.findViewById(R.id.tvRiwayatJudulMisa);
            tvRiwayatWaktuMisa = itemView.findViewById(R.id.tvRiwayatWaktuMisa);
            tvRiwayatPosisi = itemView.findViewById(R.id.tvRiwayatPosisi);
            tvRiwayatCheckinTime = itemView.findViewById(R.id.tvRiwayatCheckinTime);
        }

        public void bind(Booking item) {
            MassSchedule s = item.getSchedule();
            String judul = (s != null && s.getJudulMisa() != null) ? s.getJudulMisa() : "Misa Kudus";
            String tgl = (s != null && s.getTanggalMisa() != null) ? s.getTanggalMisa() : "-";
            String jam = (s != null) ? s.getFormattedTime() : "";
            String kat = (s != null && s.getKategori() != null) ? s.getKategori() : "mingguan";

            tvRiwayatJudulMisa.setText(judul);
            tvRiwayatWaktuMisa.setText(tgl + " • " + jam);
            tvRiwayatKategori.setText("harian".equalsIgnoreCase(kat) ? "Harian" : "Mingguan");

            String pos = item.getPosisiTugas() != null ? item.getPosisiTugas() : "Petugas Altar";
            tvRiwayatPosisi.setText("Peran: " + pos);

            String status = item.getEffectiveStatusKehadiran();
            tvRiwayatStatusBadge.setText(status.toUpperCase());

            if ("hadir".equalsIgnoreCase(status)) {
                tvRiwayatStatusBadge.setBackgroundResource(R.drawable.bg_badge_emerald);
                tvRiwayatStatusBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.emerald_800));
            } else if ("terlambat".equalsIgnoreCase(status)) {
                tvRiwayatStatusBadge.setBackgroundResource(R.drawable.bg_badge_amber);
                tvRiwayatStatusBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.amber_800));
            } else if ("alpa".equalsIgnoreCase(status)) {
                tvRiwayatStatusBadge.setBackgroundResource(R.drawable.bg_badge_marian);
                tvRiwayatStatusBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.error));
            } else {
                tvRiwayatStatusBadge.setBackgroundResource(R.drawable.bg_segmented_selected);
                tvRiwayatStatusBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.on_surface_variant));
            }

            if (item.getWaktuCheckin() != null && !item.getWaktuCheckin().isEmpty()) {
                String checkinStr = item.getWaktuCheckin();
                if (checkinStr.contains("T") && checkinStr.length() >= 16) {
                    try {
                        String timePart = checkinStr.substring(11, 16);
                        checkinStr = timePart + " WIB";
                    } catch (Exception ignored) {}
                }
                tvRiwayatCheckinTime.setText("Check-in: " + checkinStr);
            } else {
                tvRiwayatCheckinTime.setText(status.equalsIgnoreCase("hadir") ? "Hadir" : "Belum check-in");
            }
        }
    }
}
