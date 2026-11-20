"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { StatusKehadiranBadge } from "@/components/ui/Badges";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Select } from "@/components/ui/Field";
import { TODAY, formatTanggalPendek, formatJam, countStatusKehadiran } from "@/lib/format";
import type { DetailJadwal, StatusKehadiran } from "@/lib/types";

type Periode = "minggu-ini" | "bulan-ini" | "semua";

export function KehadiranKetua() {
  const { state, catatKehadiran, tampilkanToast } = useDemo();
  const [periode, setPeriode] = useState<Periode>("minggu-ini");
  const [jadwalFilter, setJadwalFilter] = useState("semua");

  const jadwalTerpilih = useMemo(() => {
    return state.jadwal
      .filter((j) => {
        if (jadwalFilter !== "semua") return j.id === jadwalFilter;
        if (periode === "semua") return true;
        if (periode === "bulan-ini") return j.tanggal.startsWith(TODAY.slice(0, 7));
        return j.tanggal >= TODAY && j.tanggal <= addIso(TODAY, 6);
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [state.jadwal, periode, jadwalFilter]);

  const semuaDetail: DetailJadwal[] = jadwalTerpilih.flatMap((j) =>
    state.detailJadwal.filter((d) => d.jadwalId === j.id),
  );
  const rekap = countStatusKehadiran(semuaDetail.map((detail) => ({ detail })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Kehadiran</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Catat & rekap kehadiran</h1>
          <p className="mt-1 text-[13px] text-muted">
            Hanya Ketua RT yang dapat mengubah status kehadiran. Perubahan langsung tampil pada data demo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            id="periode"
            value={periode}
            onChange={(e) => {
              setPeriode(e.target.value as Periode);
              setJadwalFilter("semua");
            }}
            aria-label="Pilih periode rekap"
            className="w-auto min-w-[150px]"
          >
            <option value="minggu-ini">7 hari ke depan</option>
            <option value="bulan-ini">Bulan ini</option>
            <option value="semua">Semua jadwal</option>
          </Select>
          <Select
            id="jadwal-filter"
            value={jadwalFilter}
            onChange={(e) => setJadwalFilter(e.target.value)}
            aria-label="Filter jadwal"
            className="w-auto min-w-[190px]"
          >
            <option value="semua">Semua jadwal pada periode</option>
            {state.jadwal
              .slice()
              .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {formatTanggalPendek(j.tanggal, false)}
                </option>
              ))}
          </Select>
        </div>
      </div>

      <DemoNotice ringkas />

      <div className="grid gap-3 sm:grid-cols-3">
        <KotakRekap label="Hadir" nilai={rekap.hadir} nada="brand" />
        <KotakRekap label="Tidak hadir" nilai={rekap["tidak-hadir"]} nada="danger" />
        <KotakRekap label="Belum dicatat" nilai={rekap["belum-dicatat"]} nada="attention" />
      </div>

      <Card padding={false}>
        <div className="border-b border-line p-5 pb-3">
          <CardHeader
            judul="Daftar petugas per jadwal"
            keterangan="Ubah status langsung dari tabel. Waktu pencatatan mengikuti jam sistem saat perubahan disimpan."
          />
        </div>
        <div className="hidden lg:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-[#fbfcfa] text-[11.5px] uppercase tracking-[0.04em] text-muted">
                <th scope="col" className="px-4 py-2.5 font-semibold">Petugas</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Jadwal</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Waktu dicatat</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Ubah status</th>
              </tr>
            </thead>
            <tbody>
              {jadwalTerpilih.map((j) => {
                const detail = state.detailJadwal.filter((d) => d.jadwalId === j.id);
                if (detail.length === 0) {
                  return (
                    <tr key={`${j.id}-kosong`} className="border-b border-line">
                      <td colSpan={5} className="px-4 py-4 text-center text-[12.5px] text-muted">
                        {formatTanggalPendek(j.tanggal)} · belum ada petugas terdaftar
                      </td>
                    </tr>
                  );
                }
                return detail.map((d, idx) => {
                  const w = state.pengguna.find((p) => p.id === d.wargaId);
                  return (
                    <tr key={d.id} className={`border-b border-line last:border-0 ${idx === 0 ? "border-t-2 border-t-[#eef0ec]" : ""}`}>
                      <td className="px-4 py-2.5">
                        <p className="text-[13px] font-medium text-ink">{w?.nama}</p>
                        <p className="text-[11.5px] text-muted">{w?.noHp}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[12.5px] text-ink">
                        {formatTanggalPendek(j.tanggal, false)}
                        <p className="text-[11.5px] text-muted">{formatJam(j.waktuMulai)} – {formatJam(j.waktuSelesai)}</p>
                      </td>
                      <td className="px-4 py-2.5"><StatusKehadiranBadge status={d.statusKehadiran} /></td>
                      <td className="px-4 py-2.5 text-[12.5px] text-muted">{d.waktuDicatat ? `${d.waktuDicatat} WIB` : "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Select
                          id={`ubah-${d.id}`}
                          value={d.statusKehadiran}
                          onChange={(e) => {
                            catatKehadiran(d.id, e.target.value as StatusKehadiran);
                            tampilkanToast(`Status ${w?.nama} diperbarui.`);
                          }}
                          aria-label={`Ubah status kehadiran ${w?.nama}`}
                          className="ml-auto h-9 w-auto min-w-[140px]"
                        >
                          <option value="hadir">Hadir</option>
                          <option value="tidak-hadir">Tidak hadir</option>
                          <option value="belum-dicatat">Belum dicatat</option>
                        </Select>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-line lg:hidden">
          {jadwalTerpilih.map((j) => {
            const detail = state.detailJadwal.filter((d) => d.jadwalId === j.id);
            return (
              <li key={j.id} className="p-4">
                <p className="text-[13.5px] font-semibold text-ink">{formatTanggalPendek(j.tanggal)}</p>
                <p className="text-[12px] text-muted">
                  {formatJam(j.waktuMulai)} – {formatJam(j.waktuSelesai)} · {detail.length} petugas
                </p>
                <ul className="mt-2 space-y-2">
                  {detail.map((d) => {
                    const w = state.pengguna.find((p) => p.id === d.wargaId);
                    return (
                      <li key={d.id} className="rounded-lg border border-line px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] text-ink">{w?.nama}</p>
                          <StatusKehadiranBadge status={d.statusKehadiran} />
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          {(["hadir", "tidak-hadir"] as StatusKehadiran[]).map((s) => (
                            <Button
                              key={s}
                              ukuran="sm"
                              varian={d.statusKehadiran === s ? "utama" : "sekunder"}
                              onClick={() => catatKehadiran(d.id, s)}
                              className="flex-1"
                            >
                              {s === "hadir" ? "Hadir" : "Tidak hadir"}
                            </Button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>

        {jadwalTerpilih.length === 0 ? (
          <div className="p-4">
            <EmptyState
              ikon="people"
              judul="Tidak ada data kehadiran pada periode ini"
              deskripsi="Pilih periode lain, atau publikasikan jadwal baru agar petugas tercatat."
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function KotakRekap({ label, nilai, nada }: { label: string; nilai: number; nada: "brand" | "danger" | "attention" }) {
  const warna =
    nada === "brand" ? "text-brand border-brand-line bg-brand-soft" : nada === "danger" ? "text-danger border-[#f2cfcc] bg-danger-soft" : "text-attention border-[#f0dcbb] bg-attention-soft";
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${warna}`}>
      <p className="text-[12px] font-medium">{label}</p>
      <p className="mt-1 text-[22px] font-semibold leading-7">{nilai}</p>
      <p className="text-[11.5px] opacity-80">petugas</p>
    </div>
  );
}

function addIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, "0")}-${`${dt.getDate()}`.padStart(2, "0")}`;
}
