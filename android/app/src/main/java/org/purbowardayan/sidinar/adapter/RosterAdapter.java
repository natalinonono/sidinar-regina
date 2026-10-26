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
import org.purbowardayan.sidinar.model.MassSchedule;
import org.purbowardayan.sidinar.util.LiturgicalUtil;

public class RosterAdapter extends RecyclerView.Adapter<RosterAdapter.ViewHolder> {

    public interface OnRosterActionListener {
        void onChangePosition(Booking booking);
    }

    private final List<Booking> items = new ArrayList<>();
    private final MassSchedule schedule;
    private final OnRosterActionListener listener;

    public RosterAdapter(MassSchedule schedule, OnRosterActionListener listener) {
        this.schedule = schedule;
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
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_roster_member, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(items.get(position), schedule, listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvRosterMemberName;
        private final TextView tvRosterMemberPhone;
        private final TextView tvRosterAttendanceStatus;
        private final TextView tvRosterPosition;
        private final MaterialButton btnChangePosition;
        private final MaterialButton btnSendWaReminder;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvRosterMemberName = itemView.findViewById(R.id.tvRosterMemberName);
            tvRosterMemberPhone = itemView.findViewById(R.id.tvRosterMemberPhone);
            tvRosterAttendanceStatus = itemView.findViewById(R.id.tvRosterAttendanceStatus);
            tvRosterPosition = itemView.findViewById(R.id.tvRosterPosition);
            btnChangePosition = itemView.findViewById(R.id.btnChangePosition);
            btnSendWaReminder = itemView.findViewById(R.id.btnSendWaReminder);
        }

        public void bind(Booking booking, MassSchedule schedule, OnRosterActionListener listener) {
            String name = "Misdinar";
            String phone = "-";
            if (booking.getProfile() != null) {
                name = booking.getProfile().getNamaLengkap() != null
                        ? booking.getProfile().getNamaLengkap()
                        : (booking.getProfile().getNamaPanggilan() != null ? booking.getProfile().getNamaPanggilan() : "Misdinar");
                phone = booking.getProfile().getNoTelepon() != null ? booking.getProfile().getNoTelepon() : "-";
            }

            tvRosterMemberName.setText(name);
            tvRosterMemberPhone.setText("WA: " + phone);
            tvRosterPosition.setText("Peran: " + booking.getPosisiTugas());

            String status = booking.getStatusKehadiran();
            tvRosterAttendanceStatus.setText(status);

            if ("hadir".equalsIgnoreCase(status)) {
                tvRosterAttendanceStatus.setBackgroundResource(R.drawable.bg_badge_emerald);
                tvRosterAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.emerald_800));
            } else if ("terlambat".equalsIgnoreCase(status)) {
                tvRosterAttendanceStatus.setBackgroundResource(R.drawable.bg_badge_amber);
                tvRosterAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.amber_800));
            } else {
                tvRosterAttendanceStatus.setBackgroundResource(R.drawable.bg_segmented_selected);
                tvRosterAttendanceStatus.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.on_surface_variant));
            }

            btnChangePosition.setOnClickListener(v -> {
                if (listener != null) listener.onChangePosition(booking);
            });

            btnSendWaReminder.setOnClickListener(v -> {
                if (booking.getProfile() != null) {
                    LiturgicalUtil.sendWhatsAppReminder(itemView.getContext(), schedule, booking.getProfile());
                }
            });
        }
    }
}
