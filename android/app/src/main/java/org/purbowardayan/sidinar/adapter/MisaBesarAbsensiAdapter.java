package org.purbowardayan.sidinar.adapter;

import android.graphics.Paint;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.purbowardayan.sidinar.R;
import org.purbowardayan.sidinar.model.MisaBesarResponse;
import org.purbowardayan.sidinar.model.Profile;

public class MisaBesarAbsensiAdapter extends RecyclerView.Adapter<MisaBesarAbsensiAdapter.ViewHolder> {

    public interface OnActionListener {
        void onMarkStatus(MisaBesarResponse.MisaBesarPetugas petugas, String status, String existingCatatan);
        void onDeletePetugas(MisaBesarResponse.MisaBesarPetugas petugas);
        void onRestorePetugas(MisaBesarResponse.MisaBesarPetugas petugas);
    }

    private final List<MisaBesarResponse.MisaBesarPetugas> items = new ArrayList<>();
    private final Map<String, MisaBesarResponse.MisaBesarAbsensi> absensiByPetugasId = new HashMap<>();
    private final Map<String, Integer> alpaCounts = new HashMap<>();
    private final OnActionListener listener;

    public MisaBesarAbsensiAdapter(OnActionListener listener) {
        this.listener = listener;
    }

    public void updateData(
            List<MisaBesarResponse.MisaBesarPetugas> petugasList,
            Map<String, MisaBesarResponse.MisaBesarAbsensi> absensiMap,
            Map<String, Integer> alpaMap
    ) {
        items.clear();
        if (petugasList != null) {
            items.addAll(petugasList);
        }
        absensiByPetugasId.clear();
        if (absensiMap != null) {
            absensiByPetugasId.putAll(absensiMap);
        }
        alpaCounts.clear();
        if (alpaMap != null) {
            alpaCounts.putAll(alpaMap);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_misa_besar_petugas, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        MisaBesarResponse.MisaBesarPetugas p = items.get(position);
        MisaBesarResponse.MisaBesarAbsensi abs = absensiByPetugasId.get(p.getId());
        Integer alpaCnt = alpaCounts.get(p.getId());
        holder.bind(p, abs, alpaCnt != null ? alpaCnt : 0, listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvName, tvMeta, tvWilayah, tvBadge, tvCatatan;
        private final LinearLayout layoutActions, layoutDicoretActions;
        private final MaterialButton btnHadir, btnTerlambat, btnIzin, btnAlpa, btnDelete;
        private final MaterialButton btnRestore, btnDeleteDicoret;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvName = itemView.findViewById(R.id.tvMbPetugasName);
            tvMeta = itemView.findViewById(R.id.tvMbPetugasMeta);
            tvWilayah = itemView.findViewById(R.id.tvMbPetugasWilayah);
            tvBadge = itemView.findViewById(R.id.tvMbAbsensiBadge);
            tvCatatan = itemView.findViewById(R.id.tvMbCatatan);
            layoutActions = itemView.findViewById(R.id.layoutMbPengurusActions);
            layoutDicoretActions = itemView.findViewById(R.id.layoutMbDicoretActions);
            btnHadir = itemView.findViewById(R.id.btnMbHadir);
            btnTerlambat = itemView.findViewById(R.id.btnMbTerlambat);
            btnIzin = itemView.findViewById(R.id.btnMbIzin);
            btnAlpa = itemView.findViewById(R.id.btnMbAlpa);
            btnDelete = itemView.findViewById(R.id.btnMbDeletePetugas);
            btnRestore = itemView.findViewById(R.id.btnMbRestorePetugas);
            btnDeleteDicoret = itemView.findViewById(R.id.btnMbDeleteDicoret);
        }

        public void bind(
                MisaBesarResponse.MisaBesarPetugas p,
                MisaBesarResponse.MisaBesarAbsensi abs,
                int alpaCount,
                OnActionListener listener
        ) {
            Profile prof = p.getProfile();
            String nama = prof != null && prof.getNamaLengkap() != null ? prof.getNamaLengkap() : "Petugas Misdinar";
            tvName.setText(nama);

            boolean isDicoret = p.isDicoret();
            if (isDicoret) {
                tvName.setPaintFlags(tvName.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
                tvName.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.error));
            } else {
                tvName.setPaintFlags(tvName.getPaintFlags() & (~Paint.STRIKE_THRU_TEXT_FLAG));
                tvName.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.primary));
            }

            String sesiName = p.getSession() != null ? p.getSession().getNamaSesi() : "Sesi Misa";
            String alpaText = alpaCount > 0 ? (" • Alpa " + alpaCount + "/3") : "";
            tvMeta.setText(sesiName + " • " + (p.getPosisiTugas() != null ? p.getPosisiTugas() : "Petugas Altar") + alpaText);

            String jenjang = prof != null && prof.getJenjang() != null ? prof.getJenjang() : "-";
            String wilayah = prof != null && prof.getAsalWilayahTeks() != null ? prof.getAsalWilayahTeks() : "Purbowardayan";
            tvWilayah.setText(jenjang + " • " + wilayah);

            if (isDicoret) {
                tvBadge.setText("DICORET");
                tvBadge.setBackgroundResource(R.drawable.bg_pill_warning);
                tvBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.error));
            } else {
                String status = abs != null && abs.getStatusKehadiran() != null ? abs.getStatusKehadiran() : "belum";
                tvBadge.setText(status.toUpperCase());

                if ("hadir".equalsIgnoreCase(status)) {
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_emerald);
                    tvBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.emerald_800));
                } else if ("terlambat".equalsIgnoreCase(status)) {
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_amber);
                    tvBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.amber_800));
                } else if ("izin".equalsIgnoreCase(status)) {
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_marian);
                    tvBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.on_primary_fixed));
                } else if ("alpa".equalsIgnoreCase(status)) {
                    tvBadge.setBackgroundResource(R.drawable.bg_pill_warning);
                    tvBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.error));
                } else {
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_gray);
                    tvBadge.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.on_surface_variant));
                }
            }

            if (isDicoret && p.getAlasanCoret() != null && !p.getAlasanCoret().isEmpty()) {
                tvCatatan.setVisibility(View.VISIBLE);
                tvCatatan.setText("Alasan: " + p.getAlasanCoret());
            } else if (abs != null && abs.getCatatan() != null && !abs.getCatatan().trim().isEmpty()) {
                tvCatatan.setVisibility(View.VISIBLE);
                tvCatatan.setText("Catatan: " + abs.getCatatan());
            } else {
                tvCatatan.setVisibility(View.GONE);
            }

            layoutActions.setVisibility(isDicoret ? View.GONE : View.VISIBLE);
            layoutDicoretActions.setVisibility(isDicoret ? View.VISIBLE : View.GONE);

            if (listener != null) {
                String existingNote = abs != null && abs.getCatatan() != null ? abs.getCatatan() : "";
                btnHadir.setOnClickListener(v -> listener.onMarkStatus(p, "hadir", ""));
                btnTerlambat.setOnClickListener(v -> listener.onMarkStatus(p, "terlambat", ""));
                btnIzin.setOnClickListener(v -> listener.onMarkStatus(p, "izin", existingNote));
                btnAlpa.setOnClickListener(v -> listener.onMarkStatus(p, "alpa", ""));
                btnDelete.setOnClickListener(v -> listener.onDeletePetugas(p));
                btnRestore.setOnClickListener(v -> listener.onRestorePetugas(p));
                btnDeleteDicoret.setOnClickListener(v -> listener.onDeletePetugas(p));
            }
        }
    }
}
