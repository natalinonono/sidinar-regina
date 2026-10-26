package org.purbowardayan.sidinar.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.progressindicator.LinearProgressIndicator;
import java.util.ArrayList;
import java.util.List;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.model.MassSchedule;

public class ScheduleAdapter extends RecyclerView.Adapter<ScheduleAdapter.ViewHolder> {

    public interface OnScheduleClickListener {
        void onBookClick(MassSchedule schedule);
    }

    private final List<MassSchedule> schedules = new ArrayList<>();
    private final OnScheduleClickListener listener;
    private final String bookedScheduleId;
    private final boolean isMemberActive;

    public ScheduleAdapter(OnScheduleClickListener listener, String bookedScheduleId, boolean isMemberActive) {
        this.listener = listener;
        this.bookedScheduleId = bookedScheduleId;
        this.isMemberActive = isMemberActive;
    }

    public void updateList(List<MassSchedule> newList) {
        schedules.clear();
        if (newList != null) {
            schedules.addAll(newList);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_schedule, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        MassSchedule item = schedules.get(position);
        holder.bind(item, listener, bookedScheduleId, isMemberActive);
    }

    @Override
    public int getItemCount() {
        return schedules.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvJudulMisa;
        private final TextView tvTanggalMisa;
        private final TextView tvJamMisa;
        private final TextView tvKategoriBadge;
        private final TextView tvQuotaBadge;
        private final TextView tvQuotaDetail;
        private final LinearProgressIndicator progressQuota;
        private final MaterialButton btnBook;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvJudulMisa = itemView.findViewById(R.id.tvJudulMisa);
            tvTanggalMisa = itemView.findViewById(R.id.tvTanggalMisa);
            tvJamMisa = itemView.findViewById(R.id.tvJamMisa);
            tvKategoriBadge = itemView.findViewById(R.id.tvKategoriBadge);
            tvQuotaBadge = itemView.findViewById(R.id.tvQuotaBadge);
            tvQuotaDetail = itemView.findViewById(R.id.tvQuotaDetail);
            progressQuota = itemView.findViewById(R.id.progressQuota);
            btnBook = itemView.findViewById(R.id.btnBook);
        }

        public void bind(MassSchedule item, OnScheduleClickListener listener, String bookedScheduleId, boolean isMemberActive) {
            tvJudulMisa.setText(item.getJudulMisa() != null ? item.getJudulMisa() : "Misa Kudus");
            tvTanggalMisa.setText(item.getTanggalMisa() != null ? item.getTanggalMisa() : "");
            tvJamMisa.setText(item.getFormattedTime());

            String kategori = item.getKategori() != null ? item.getKategori() : "mingguan";
            if ("harian".equalsIgnoreCase(kategori)) {
                tvKategoriBadge.setText("Harian");
            } else {
                tvKategoriBadge.setText("Mingguan");
            }

            int max = Math.max(1, item.getKuotaMaksimal());
            int booked = item.getBookedCount();
            int remaining = Math.max(0, max - booked);

            int progressPercent = (int) (((float) booked / max) * 100);
            progressQuota.setProgress(progressPercent);

            tvQuotaDetail.setText("Terisi " + booked + " dari " + max + " Petugas Altar");

            if (remaining > 0) {
                tvQuotaBadge.setText(remaining + " Kuota Tersedia");
            } else {
                tvQuotaBadge.setText("Kuota Penuh");
            }

            // Check booking button status
            boolean isThisBooked = bookedScheduleId != null && bookedScheduleId.equals(item.getId());

            if (isThisBooked) {
                btnBook.setText("Tugas Anda (Terdaftar)");
                btnBook.setEnabled(false);
                btnBook.setBackgroundTintList(androidx.core.content.ContextCompat.getColorStateList(itemView.getContext(), R.color.secondary));
            } else if (!isMemberActive) {
                btnBook.setText("Menunggu Persetujuan Pengurus");
                btnBook.setEnabled(false);
            } else if (remaining <= 0) {
                btnBook.setText("Kuota Penuh");
                btnBook.setEnabled(false);
            } else {
                btnBook.setText("Ambil Tugas Ini");
                btnBook.setEnabled(true);
                btnBook.setBackgroundTintList(androidx.core.content.ContextCompat.getColorStateList(itemView.getContext(), R.color.primary));
                btnBook.setOnClickListener(v -> {
                    if (listener != null) {
                        listener.onBookClick(item);
                    }
                });
            }
        }
    }
}
