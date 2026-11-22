"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { StatusKehadiranBadge } from "@/components/ui/Badges";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { TODAY, formatJam, formatTanggalPendek } from "@/lib/format";

export function KehadiranWarga() {
  const { state, penggunaAktif } = useDemo();
  const [filter, setFilter] = useState<"semua" | "mendatang" | "lalu">("semua");

  const riwayat = state.detailJadwal
    .filter((d) => d.wargaId === penggunaAktif.id)
    .map((d) => ({ detail: d, jadwal: state.jadwal.find((j) => j.id === d.jadwalId) }))
    .filter((x): x is { detail: typeof x.detail; jadwal: NonNullable<typeof x.jadwal> } => Boolean(x.jadwal))
    .filter((x) => x.jadwal.status === "dipublikasikan")
    .filter((x) => {
      if (filter === "mendatang") return x.jadwal.tanggal >= TODAY;
      if (filter === "lalu") return x.jadwal.tanggal < TODAY;
      return true;
    })
    .sort((a, b) => b.jadwal.tanggal.localeCompare(a.jadwal.tanggal));

  const hadir = state.detailJadwal.filter((d) => d.wargaId === penggunaAktif.id && d.statusKehadiran === "hadir").length;
  const total = state.detailJadwal.filter((d) => d.wargaId === penggunaAktif.id).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Kehadiran</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Kehadiran ronda saya</h1>
          <p className="mt-1 text-[13px] text-muted">
            {hadir} dari {total} tugas tercatat hadir. Status dicatat oleh Ketua RT.
          </p>
        </div>
        <Select
          id="filter-kehadiran"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          aria-label="Filter kehadiran"
          className="w-auto min-w-[170px]"
        >
          <option value="semua">Semua tugas</option>
          <option value="mendatang">Mendatang & malam ini</option>
          <option value="lalu">Sudah berlalu</option>
        </Select>
      </div>


      {riwayat.length === 0 ? (
        <EmptyState
          ikon="people"
          judul="Belum ada riwayat kehadiran"
          deskripsi="Riwayat muncul setelah Ketua RT mempublikasikan jadwal dan mencatat kehadiran Anda."
        />
      ) : (
        <Card padding={false}>
          <ul className="divide-y divide-line">
            {riwayat.map(({ detail, jadwal }) => (
              <li key={detail.id}>
                <Link href={`/warga/jadwal/${jadwal.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-[#fbfcfa] md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">
                      {formatTanggalPendek(jadwal.tanggal)}
                      {jadwal.tanggal === TODAY ? (
                        <span className="ml-1.5 rounded bg-attention-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-attention">
                          Malam ini
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[12px] text-muted">
                      {formatJam(jadwal.waktuMulai)} – {formatJam(jadwal.waktuSelesai)} WIB · {jadwal.lokasi}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusKehadiranBadge status={detail.statusKehadiran} />
                    <p className="mt-1 text-[11.5px] text-muted">
                      {detail.waktuDicatat ? `Dicatat ${detail.waktuDicatat} WIB` : "Belum ada catatan"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="bg-[#fbfcfa]">
        <CardHeader judul="Status kehadiran" keterangan="Arti setiap status pada aplikasi ini." />
        <ul className="mt-2.5 space-y-2 text-[12.5px] leading-5 text-[#41504a]">
          <li className="flex items-start gap-2">
            <StatusKehadiranBadge status="hadir" />
            <span>Petugas hadir dan sudah dicatat Ketua RT.</span>
          </li>
          <li className="flex items-start gap-2">
            <StatusKehadiranBadge status="tidak-hadir" />
            <span>Petugas tidak hadir tanpa pengganti yang disetujui.</span>
          </li>
          <li className="flex items-start gap-2">
            <StatusKehadiranBadge status="belum-dicatat" />
            <span>Belum ada pencatatan, biasanya karena jadwal belum berjalan.</span>
          </li>
        </ul>
        <ButtonLink href="/warga/pertukaran/baru" ukuran="sm" varian="sekunder" className="mt-3">
          Ajukan pertukaran jadwal
        </ButtonLink>
      </Card>
    </div>
  );
}
