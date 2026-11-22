"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { StatusKehadiranBadge } from "@/components/ui/Badges";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { TODAY, formatJam, formatTanggalPendek, petugasForSchedule } from "@/lib/format";

export function DaftarJadwalWarga() {
  const { state, penggunaAktif } = useDemo();
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<"semua" | "saya">("semua");

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return state.jadwal
      .filter((j) => j.status === "dipublikasikan")
      .filter((j) => (filter === "saya" ? petugasForSchedule(state, j.id).some((p) => p.warga.id === penggunaAktif.id) : true))
      .filter((j) => {
        if (!q) return true;
        return formatTanggalPendek(j.tanggal).toLowerCase().includes(q) || j.lokasi.toLowerCase().includes(q);
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [state, cari, filter, penggunaAktif.id]);

  const jumlahTugasSaya = state.jadwal.filter((j) =>
    petugasForSchedule(state, j.id).some((p) => p.warga.id === penggunaAktif.id),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Jadwal Ronda</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Jadwal ronda RT 05</h1>
          <p className="mt-1 text-[13px] text-muted">
            Jadwal yang dipublikasikan Ketua RT. Anda bertugas pada {jumlahTugasSaya} jadwal.
          </p>
        </div>
        <ButtonLink href="/warga/pertukaran/baru" varian="sekunder">Ajukan Pertukaran</ButtonLink>
      </div>


      <Card padding={false}>
        <div className="flex flex-col gap-2.5 border-b border-line p-4 sm:flex-row">
          <Input
            id="cari-jadwal-warga"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari tanggal atau lokasi"
            aria-label="Cari jadwal"
            className="flex-1"
          />
          <Select
            id="filter-jadwal-warga"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            aria-label="Filter jadwal"
            className="sm:w-auto sm:min-w-[170px]"
          >
            <option value="semua">Semua jadwal</option>
            <option value="saya">Hanya tugas saya</option>
          </Select>
        </div>

        {daftar.length === 0 ? (
          <div className="p-4">
            <EmptyState
              ikon="calendar"
              judul={filter === "saya" ? "Anda belum dijadwalkan" : "Belum ada jadwal dipublikasikan"}
              deskripsi={
                filter === "saya"
                  ? "Ketua RT belum menempatkan Anda pada jadwal mendatang. Anda akan menerima notifikasi bila dijadwalkan."
                  : "Jadwal baru akan tampil di sini setelah Ketua RT mempublikasikannya."
              }
              aksi={
                filter === "saya" ? (
                  <ButtonLink href="/warga/jadwal" ukuran="sm" varian="sekunder">Lihat semua jadwal</ButtonLink>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {daftar.map((j) => {
              const petugas = petugasForSchedule(state, j.id);
              const saya = petugas.find((p) => p.warga.id === penggunaAktif.id);
              const lewat = j.tanggal < TODAY;
              return (
                <li key={j.id}>
                  <Link href={`/warga/jadwal/${j.id}`} className="block p-4 hover:bg-[#fbfcfa] md:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[14px] font-semibold text-ink">{formatTanggalPendek(j.tanggal)}</p>
                          {j.tanggal === TODAY ? <Badge nada="attention" dot={false}>Malam ini</Badge> : null}
                          {saya ? <Badge nada="brand" dot={false}>Anda bertugas</Badge> : null}
                          {lewat ? <Badge nada="neutral" dot={false}>Sudah berlalu</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {formatJam(j.waktuMulai)} – {formatJam(j.waktuSelesai)} WIB · {j.lokasi}
                        </p>
                      </div>
                      {saya ? <StatusKehadiranBadge status={saya.detail.statusKehadiran} /> : null}
                    </div>
                    <p className="mt-2 text-[12.5px] text-[#41504a]">
                      {petugas.map((p) => (p.warga.id === penggunaAktif.id ? "Anda" : p.warga.nama)).join(" · ")}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function DetailJadwalWarga({ jadwalId }: { jadwalId: string }) {
  const { state, penggunaAktif } = useDemo();
  const jadwal = state.jadwal.find((j) => j.id === jadwalId);

  if (!jadwal || jadwal.status === "draft") {
    return (
      <div className="space-y-4">
        <Link href="/warga/jadwal" className="text-[12.5px] text-muted hover:text-ink">← Jadwal Ronda</Link>
        <Card>
          <EmptyState
            ikon="calendar"
            judul="Jadwal belum tersedia"
            deskripsi="Jadwal ini belum dipublikasikan Ketua RT atau sudah dihapus."
            aksi={<ButtonLink href="/warga/jadwal" ukuran="sm" varian="utama">Lihat jadwal lain</ButtonLink>}
          />
        </Card>
      </div>
    );
  }

  const petugas = petugasForSchedule(state, jadwal.id);
  const saya = petugas.find((p) => p.warga.id === penggunaAktif.id);

  return (
    <div className="space-y-4">
      <Link href="/warga/jadwal" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5">
          <path d="M11 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Jadwal Ronda
      </Link>

      <div>
        <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">{formatTanggalPendek(jadwal.tanggal)}</h1>
        <p className="mt-1 text-[13px] text-muted">
          {formatJam(jadwal.waktuMulai)} – {formatJam(jadwal.waktuSelesai)} WIB · {jadwal.lokasi}
        </p>
      </div>

      {saya ? (
        <Card className="border-brand-line bg-brand-soft/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold text-brand">Anda bertugas pada jadwal ini</p>
              <p className="mt-0.5 text-[12.5px] text-[#2f5a45]">
                Hadir di {jadwal.lokasi} pukul {jadwal.waktuMulai} WIB.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusKehadiranBadge status={saya.detail.statusKehadiran} />
              <ButtonLink href={`/warga/pertukaran/baru?asal=${jadwal.id}`} ukuran="sm">
                Ajukan pertukaran
              </ButtonLink>
            </div>
          </div>
        </Card>
      ) : null}

      <Card padding={false}>
        <div className="p-5 pb-2">
          <CardHeader judul={`Petugas (${petugas.length})`} keterangan="Status kehadiran dicatat oleh Ketua RT." />
        </div>
        <ul className="divide-y divide-line">
          {petugas.map(({ detail, warga }) => (
            <li key={detail.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-brand">
                {warga.nama.split(" ").slice(0, 2).map((s) => s[0]).join("")}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                {warga.id === penggunaAktif.id ? "Anda" : warga.nama}
              </p>
              <StatusKehadiranBadge status={detail.statusKehadiran} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="bg-[#fbfcfa]">
        <p className="text-[12.5px] font-medium text-ink">Catatan</p>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-4 text-muted">
          <li>• Kehadiran hanya dapat dicatat Ketua RT melalui dashboard.</li>
          <li>• Bila berhalangan, ajukan pertukaran sebelum ronda dimulai.</li>
          <li>• Jadwal bersifat tetap hingga Ketua RT mempublikasikan perubahan.</li>
        </ul>
      </Card>
    </div>
  );
}
