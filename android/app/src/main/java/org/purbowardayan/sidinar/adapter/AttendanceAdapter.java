package org.purbowardayan.sidinar.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import java.util.ArrayList;
import java.util.List;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.model.Booking;

public class AttendanceAdapter extends RecyclerView.Adapter<AttendanceAdapter.ViewHolder> {

    public interface OnAttendanceActionListener {
        void onChangeStatus(Booking booking);
    }

    private final List<Booking> items = new ArrayList<>();
    private final OnAttendanceActionListener listener;

    public AttendanceAdapter(OnAttendanceActionListener listener) {
        this.listener = listener;
    }

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
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_attendance, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(items.get(position), listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvAttendanceNama;
        private final TextView tvAttendancePosisi;
        private final TextView tvAttendanceStatus;
        private final TextView tvAttendanceMisa;
        private final TextView tvAttendanceTime;
        private final MaterialButton btnAttendanceChangeStatus;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvAttendanceNama = itemView.findViewById(R.id.tvAttendanceNama);
            tvAttendancePosisi = itemView.findViewById(R.id.tvAttendancePosisi);
            tvAttendanceStatus = itemView.findViewById(R.id.tvAttendanceStatus);
            tvAttendanceMisa = itemView.findViewById(R.id.tvAttendanceMisa);
            tvAttendanceTime = itemView.findViewById(R.id.tvAttendanceTime);
            btnAttendanceChangeStatus = itemView.findViewById(R.id.btnAttendanceChangeStatus);
        }

        public void bind(Booking booking, OnAttendanceActionListener listener) {
            String nama = "Misdinar";
            if (booking.getProfile() != null) {
                nama = booking.getProfile().getNamaLengkap() != null
                        ? booking.getProfile().getNamaLengkap()
                        : (booking.getProfile().getNamaPanggilan() != null ? booking.getProfile().getNamaPanggilan() : "Misdinar");
            }
            tvAttendanceNama.setText(nama);
            tvAttendancePosisi.setText("Peran: " + booking.getPosisiTugas());

            String judulMisa = "-";
            if (booking.getSchedule() != null) {
                judulMisa = booking.getSchedule().getJudulMisa() + " (" + booking.getSchedule().getFormattedTime() + ")";
            }
            tvAttendanceMisa.setText("Misa: " + judulMisa);

            String checkin = booking.getWaktuCheckin();
            if (checkin != null && !checkin.isEmpty()) {
                tvAttendanceTime.setText("Check-in: " + checkin);
            } else {
                tvAttendanceTime.setText("Belum check-in sakristi");
            }

            String status = booking.getEffectiveStatusKehadiran();
            tvAttendanceStatus.setText(status);

            if ("hadir".equalsIgnoreCase(status)) {
                tvAttendanceStatus.setBackgroundResource(R.drawable.bg_badge_emerald);
                tvAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.emerald_800));
            } else if ("terlambat".equalsIgnoreCase(status)) {
                tvAttendanceStatus.setBackgroundResource(R.drawable.bg_badge_amber);
                tvAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.amber_800));
            } else if ("izin".equalsIgnoreCase(status)) {
                tvAttendanceStatus.setBackgroundResource(R.drawable.bg_badge_marian);
                tvAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.on_primary_fixed));
            } else if ("alpa".equalsIgnoreCase(status)) {
                tvAttendanceStatus.setBackgroundResource(R.drawable.bg_pill_warning);
                tvAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.error));
            } else {
                tvAttendanceStatus.setBackgroundResource(R.drawable.bg_segmented_selected);
                tvAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.on_surface_variant));
            }

            btnAttendanceChangeStatus.setOnClickListener(v -> {
                if (listener != null) listener.onChangeStatus(booking);
            });
        }
    }
}
