package org.purbowardayan.sidinar.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import java.util.ArrayList;
import java.util.List;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.model.Profile;

public class MemberAdapter extends RecyclerView.Adapter<MemberAdapter.ViewHolder> {

    public interface OnMemberActionListener {
        void onApprove(Profile profile);
        void onWhatsApp(Profile profile);
    }

    private final List<Profile> items = new ArrayList<>();
    private final OnMemberActionListener listener;

    public MemberAdapter(OnMemberActionListener listener) {
        this.listener = listener;
    }

    public void updateList(List<Profile> newList) {
        items.clear();
        if (newList != null) {
            items.addAll(newList);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_member, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Profile item = items.get(position);
        holder.bind(item, listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvMemberNama;
        private final TextView tvMemberPanggilan;
        private final TextView tvMemberStatus;
        private final TextView tvMemberWilayah;
        private final TextView tvMemberEmailPhone;
        private final MaterialButton btnWaMember;
        private final MaterialButton btnApproveMember;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvMemberNama = itemView.findViewById(R.id.tvMemberNama);
            tvMemberPanggilan = itemView.findViewById(R.id.tvMemberPanggilan);
            tvMemberStatus = itemView.findViewById(R.id.tvMemberStatus);
            tvMemberWilayah = itemView.findViewById(R.id.tvMemberWilayah);
            tvMemberEmailPhone = itemView.findViewById(R.id.tvMemberEmailPhone);
            btnWaMember = itemView.findViewById(R.id.btnWaMember);
            btnApproveMember = itemView.findViewById(R.id.btnApproveMember);
        }

        public void bind(Profile profile, OnMemberActionListener listener) {
            tvMemberNama.setText(profile.getNamaLengkap() != null ? profile.getNamaLengkap() : "-");
            String info = "Panggilan: " + (profile.getNamaPanggilan() != null ? profile.getNamaPanggilan() : "-") +
                    " • Jenjang: " + (profile.getJenjang() != null ? profile.getJenjang() : "-");
            tvMemberPanggilan.setText(info);

            tvMemberWilayah.setText("Wilayah: " + (profile.getAsalWilayahTeks() != null ? profile.getAsalWilayahTeks() : "Paroki Purbowardayan"));
            tvMemberEmailPhone.setText("Email: " + (profile.getEmail() != null ? profile.getEmail() : "-") +
                    " • WA: " + (profile.getNoTelepon() != null ? profile.getNoTelepon() : "-"));

            boolean isAktif = profile.isAktif();
            if (isAktif) {
                tvMemberStatus.setText("Aktif");
                tvMemberStatus.setBackgroundResource(R.drawable.bg_pill_success);
                tvMemberStatus.setTextColor(androidx.core.content.ContextCompat.getColor(itemView.getContext(), R.color.success));
                btnApproveMember.setVisibility(View.GONE);
            } else {
                tvMemberStatus.setText("Menunggu Persetujuan");
                tvMemberStatus.setBackgroundResource(R.drawable.bg_pill_warning);
                tvMemberStatus.setTextColor(androidx.core.content.ContextCompat.getColor(itemView.getContext(), R.color.warning));
                btnApproveMember.setVisibility(View.VISIBLE);
                btnApproveMember.setOnClickListener(v -> {
                    if (listener != null) listener.onApprove(profile);
                });
            }

            btnWaMember.setOnClickListener(v -> {
                if (listener != null) listener.onWhatsApp(profile);
            });
        }
    }
}
