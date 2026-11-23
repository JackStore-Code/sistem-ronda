"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { StatusPublikasiBadge } from "@/components/ui/Badges";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Field";
import {
  TODAY,
  formatTanggalPendek,
  formatJam,
  hariFromIso,
  petugasForSchedule,
} from "@/lib/format";
import type { StatusPublikasi } from "@/lib/types";

type Filter = "semua" | StatusPublikasi;

export function DaftarJadwalKetua() {
  const { state, publikasikanJadwal, hapusJadwal, tampilkanToast } = useDemo();
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const [bulan, setBulan] = useState<"semua" | "minggu-ini" | "bulan-ini">("semua");
  const [publishId, setPublishId] = useState<string | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return state.jadwal
      .filter((j) => (filter === "semua" ? true : j.status === filter))
      .filter((j) => {
        if (bulan === "semua") return true;
        if (bulan === "minggu-ini") return j.tanggal >= TODAY && j.tanggal <= addIso(TODAY, 6);
        return j.tanggal.startsWith(TODAY.slice(0, 7));
      })
      .filter((j) => {
        if (!q) return true;
        const tanggal = formatTanggalPendek(j.tanggal).toLowerCase();
        const petugas = petugasForSchedule(state, j.id)
          .map((p) => p.warga.nama.toLowerCase())
          .join(" ");
        return tanggal.includes(q) || petugas.includes(q) || j.lokasi.toLowerCase().includes(q);
      })
      // Urutan untuk Ketua RT: tanggal terdekat (hari-H) di paling atas,
      // tanggal terjauh turun ke bawah.
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [state, cari, filter, bulan]);

  const draft = state.jadwal.filter((j) => j.status === "draft").length;
  const publikasi = state.jadwal.filter((j) => j.status === "dipublikasikan").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Jadwal Ronda</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Daftar jadwal ronda</h1>
          <p className="mt-1 text-[13px] text-muted">
            {publikasi} jadwal dipublikasikan · {draft} masih draft
          </p>
        </div>
        <ButtonLink href="/admin/jadwal/baru" varian="utama">
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          Buat Jadwal
        </ButtonLink>
      </div>


      <Card padding={false}>
        <div className="flex flex-col gap-2.5 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13 13l4 4" strokeLinecap="round" />
            </svg>
            <Input
              id="cari-jadwal"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari tanggal, nama petugas, atau lokasi"
              className="pl-9"
              aria-label="Cari jadwal"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              id="filter-status"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              aria-label="Filter status publikasi"
              className="w-auto min-w-[150px]"
            >
              <option value="semua">Semua status</option>
              <option value="dipublikasikan">Dipublikasikan</option>
              <option value="draft">Draft</option>
            </Select>
            <Select
              id="filter-periode"
              value={bulan}
              onChange={(e) => setBulan(e.target.value as typeof bulan)}
              aria-label="Filter periode"
              className="w-auto min-w-[150px]"
            >
              <option value="semua">Semua periode</option>
              <option value="minggu-ini">7 hari ke depan</option>
              <option value="bulan-ini">Bulan ini</option>
            </Select>
          </div>
        </div>

        {daftar.length === 0 ? (
          <div className="p-4">
            <EmptyState
              ikon="calendar"
              judul="Tidak ada jadwal yang cocok"
              deskripsi="Ubah kata kunci atau filter status, atau buat jadwal ronda baru untuk tanggal berikutnya."
              aksi={
                <div className="flex gap-2">
                  <Button
                    varian="sekunder"
                    ukuran="sm"
                    onClick={() => {
                      setCari("");
                      setFilter("semua");
                      setBulan("semua");
                    }}
                  >
                    Reset filter
                  </Button>
                  <ButtonLink href="/admin/jadwal/baru" varian="utama" ukuran="sm">
                    Buat Jadwal
                  </ButtonLink>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* Tabel desktop */}
            <div className="hidden lg:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Daftar jadwal ronda RT 05</caption>
                <thead>
                  <tr className="border-b border-line bg-[#fbfcfa] text-[11.5px] uppercase tracking-[0.04em] text-muted">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Tanggal</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Waktu</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Petugas</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((j) => {
                    const petugas = petugasForSchedule(state, j.id);
                    return (
                      <tr key={j.id} className="border-b border-line last:border-0 align-top hover:bg-[#fbfcfa]">
                        <td className="px-4 py-3">
                          <p className="text-[13.5px] font-medium text-ink">
                            {formatTanggalPendek(j.tanggal)}
                            {j.tanggal === TODAY ? (
                              <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-brand">
                                Malam ini
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[12px] text-muted">{hariFromIso(j.tanggal)}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-ink">
                          {formatJam(j.waktuMulai)} – {formatJam(j.waktuSelesai)}
                          <p className="text-[12px] text-muted">{j.lokasi}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {petugas.slice(0, 2).map(({ warga }) => (
                              <span key={warga.id} className="rounded border border-line bg-surface px-1.5 py-0.5 text-[12px] text-[#41504a]">
                                {warga.nama.split(" ")[0]}
                              </span>
                            ))}
                            {petugas.length > 2 ? (
                              <span className="rounded border border-line bg-neutral-soft px-1.5 py-0.5 text-[12px] text-muted">
                                +{petugas.length - 2}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11.5px] text-muted">{petugas.length} petugas</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPublikasiBadge status={j.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <ButtonLink href={`/admin/jadwal/${j.id}`} ukuran="sm">
                              Detail
                            </ButtonLink>
                            <ButtonLink href={`/admin/jadwal/${j.id}/edit`} ukuran="sm" varian="sekunder">
                              Edit
                            </ButtonLink>
                            {j.status === "draft" ? (
                              <Button varian="utama" ukuran="sm" onClick={() => setPublishId(j.id)}>
                                Publikasikan
                              </Button>
                            ) : null}
                            <Button
                              varian="bahaya"
                              ukuran="sm"
                              onClick={() => setHapusId(j.id)}
                              aria-label={`Hapus jadwal ${formatTanggalPendek(j.tanggal)}`}
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Kartu mobile */}
            <ul className="divide-y divide-line lg:hidden">
              {daftar.map((j) => {
                const petugas = petugasForSchedule(state, j.id);
                return (
                  <li key={j.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink">{formatTanggalPendek(j.tanggal)}</p>
                        <p className="text-[12.5px] text-muted">
                          {formatJam(j.waktuMulai)} – {formatJam(j.waktuSelesai)} · {petugas.length} petugas
                        </p>
                      </div>
                      <StatusPublikasiBadge status={j.status} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-muted">
                      {petugas.map((p) => p.warga.nama.split(" ")[0]).join(", ") || "Belum ada petugas"}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <ButtonLink href={`/admin/jadwal/${j.id}`} ukuran="sm">
                        Detail
                      </ButtonLink>
                      <ButtonLink href={`/admin/jadwal/${j.id}/edit`} ukuran="sm">
                        Edit
                      </ButtonLink>
                      {j.status === "draft" ? (
                        <Button varian="utama" ukuran="sm" onClick={() => setPublishId(j.id)}>
                          Publikasikan
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <p className="px-1 text-[12px] leading-4 text-muted">
        Jadwal berstatus <Badge nada="neutral" dot={false}>Draft</Badge> tidak terlihat oleh warga dan belum
        mengirim pengingat.
      </p>

      <Dialog
        buka={publishId !== null}
        onTutup={() => setPublishId(null)}
        judul="Publikasikan jadwal ini?"
        deskripsi="Warga yang bertugas akan melihat jadwal ini dan menerima pengingat otomatis sebelum ronda dimulai."
        aksi={
          <>
            <Button onClick={() => setPublishId(null)}>Batal</Button>
            <Button
              varian="utama"
              onClick={() => {
                if (publishId) {
                  publikasikanJadwal(publishId);
                  tampilkanToast("Jadwal dipublikasikan dan pengingat dikirim.");
                }
                setPublishId(null);
              }}
            >
              Ya, publikasikan
            </Button>
          </>
        }
      />

      <Dialog
        buka={hapusId !== null}
        onTutup={() => setHapusId(null)}
        judul="Hapus jadwal ronda?"
        deskripsi="Jadwal dan catatan kehadirannya akan dihapus. Tindakan ini tidak dapat dibatalkan."
        aksi={
          <>
            <Button onClick={() => setHapusId(null)}>Batal</Button>
            <Button
              varian="bahaya"
              onClick={async () => {
                if (!hapusId) return;
                const hasil = await hapusJadwal(hapusId);
                setHapusId(null);
                if (hasil.ok) tampilkanToast("Jadwal dihapus.");
                else tampilkanToast(hasil.pesan ?? "Jadwal gagal dihapus.", "galat");
              }}
            >
              Ya, hapus
            </Button>
          </>
        }
      />
    </div>
  );
}

function addIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, "0")}-${`${dt.getDate()}`.padStart(2, "0")}`;
}
