"use client";

import { useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { StatusPertukaranBadge } from "@/components/ui/Badges";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Select } from "@/components/ui/Field";
import { formatTanggalPendek, namaWarga } from "@/lib/format";
import type { StatusTanggapan } from "@/lib/types";

const ALUR: { status: StatusTanggapan; label: string; keterangan: string }[] = [
  { status: "menunggu-warga", label: "Menunggu warga tujuan", keterangan: "Warga tujuan menerima permintaan" },
  { status: "menunggu-validasi", label: "Menunggu validasi RT", keterangan: "Ketua RT memeriksa kesepakatan" },
  { status: "disetujui", label: "Disetujui", keterangan: "Jadwal diperbarui otomatis" },
];

export function DaftarPertukaranKetua() {
  const { state } = useDemo();
  const [filter, setFilter] = useState<"semua" | StatusTanggapan>("semua");

  const daftar = state.pertukaran
    .filter((p) => (filter === "semua" ? true : p.status === filter))
    .sort((a, b) => b.diajukanPada.localeCompare(a.diajukanPada));

  const hitung = (s: StatusTanggapan) => state.pertukaran.filter((p) => p.status === s).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Pertukaran Jadwal</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Permohonan pertukaran</h1>
          <p className="mt-1 text-[13px] text-muted">
            {hitung("menunggu-validasi")} menunggu validasi Anda · {hitung("menunggu-warga")} menunggu tanggapan warga
          </p>
        </div>
        <Select
          id="filter-pertukaran"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          aria-label="Filter status pertukaran"
          className="w-auto min-w-[200px]"
        >
          <option value="semua">Semua status</option>
          <option value="menunggu-warga">Menunggu warga tujuan</option>
          <option value="menunggu-validasi">Menunggu validasi RT</option>
          <option value="disetujui">Disetujui</option>
          <option value="ditolak">Ditolak</option>
        </Select>
      </div>

      <DemoNotice ringkas />

      <Card className="bg-[#fbfcfa]" padding={false}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-[12px] text-muted">
          <span className="font-medium text-ink">Alur persetujuan:</span>
          {ALUR.map((a, i) => (
            <span key={a.status} className="flex items-center gap-2">
              <span className="rounded border border-line bg-surface px-1.5 py-0.5">{a.label}</span>
              {i < ALUR.length - 1 ? <span aria-hidden>→</span> : null}
            </span>
          ))}
          <span className="flex items-center gap-2">
            <span aria-hidden>·</span>
            <span className="rounded border border-[#f2cfcc] bg-danger-soft px-1.5 py-0.5 text-danger">Ditolak (akhir)</span>
          </span>
        </div>
      </Card>

      {daftar.length === 0 ? (
        <EmptyState
          ikon="swap"
          judul="Tidak ada permohonan pertukaran"
          deskripsi="Permohonan dari warga akan muncul di sini bersamaan dengan notifikasi."
        />
      ) : (
        <Card padding={false}>
          <ul className="divide-y divide-line">
            {daftar.map((p) => {
              const asal = state.jadwal.find((j) => j.id === p.jadwalAsalId);
              const tujuan = state.jadwal.find((j) => j.id === p.jadwalTujuanId);
              return (
                <li key={p.id} className="p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPertukaranBadge status={p.status} />
                        <span className="text-[11.5px] text-muted">{p.id}</span>
                      </div>
                      <p className="mt-2 text-[14px] font-semibold text-ink">
                        {namaWarga(state, p.pemohonId)} meminta tukar dengan {namaWarga(state, p.wargaTujuanId)}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {asal ? formatTanggalPendek(asal.tanggal, false) : "—"}{" "}
                        <span aria-hidden>→</span>{" "}
                        {tujuan ? formatTanggalPendek(tujuan.tanggal, false) : "—"} · diajukan{" "}
                        {p.diajukanPada.replace("T", " ").replace(":", ".")} WIB
                      </p>
                      <p className="mt-2 line-clamp-2 rounded-lg bg-[#fbfcfa] px-3 py-2 text-[12.5px] leading-5 text-[#41504a]">
                        “{p.alasan}”
                      </p>
                      {p.status === "ditolak" && p.alasanPenolakan ? (
                        <p className="mt-2 text-[12px] text-danger">Alasan penolakan: {p.alasanPenolakan}</p>
                      ) : null}
                    </div>
                    <ButtonLink
                      href={`/admin/pertukaran/${p.id}`}
                      varian={p.status === "menunggu-validasi" ? "utama" : "sekunder"}
                      ukuran="sm"
                    >
                      {p.status === "menunggu-validasi" ? "Tinjau & validasi" : "Lihat detail"}
                    </ButtonLink>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
