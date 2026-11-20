"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { StatusKehadiranBadge, StatusPublikasiBadge } from "@/components/ui/Badges";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import {
  TODAY,
  countStatusKehadiran,
  formatJam,
  formatTanggalPanjang,
  hariFromIso,
  petugasForSchedule,
} from "@/lib/format";

export function DetailJadwalKetua({ jadwalId }: { jadwalId: string }) {
  const { state, publikasikanJadwal, kirimPengingat, catatKehadiran, tampilkanToast } = useDemo();
  const [publish, setPublish] = useState(false);
  const [reminder, setReminder] = useState(false);

  const jadwal = state.jadwal.find((j) => j.id === jadwalId);
  if (!jadwal) {
    return (
      <div className="space-y-4">
        <Link href="/admin/jadwal" className="text-[12.5px] text-muted hover:text-ink">← Jadwal Ronda</Link>
        <h1 className="text-[22px] font-semibold text-ink">Jadwal tidak ditemukan</h1>
        <p className="text-[13px] text-muted">Jadwal dengan ID {jadwalId} tidak ada pada data demo.</p>
        <ButtonLink href="/admin/jadwal" varian="utama">Kembali ke daftar jadwal</ButtonLink>
      </div>
    );
  }

  const petugas = petugasForSchedule(state, jadwal.id);
  const rekap = countStatusKehadiran(petugas);
  const pertukaranTerkait = state.pertukaran.filter(
    (p) => p.jadwalAsalId === jadwal.id || p.jadwalTujuanId === jadwal.id,
  );

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/jadwal" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5">
            <path d="M11 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Jadwal Ronda
        </Link>
        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
              {formatTanggalPanjang(jadwal.tanggal)}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span>{formatJam(jadwal.waktuMulai)} – {formatJam(jadwal.waktuSelesai)} WIB</span>
              <span aria-hidden>·</span>
              <span>{jadwal.lokasi}</span>
              <StatusPublikasiBadge status={jadwal.status} />
              {jadwal.tanggal === TODAY ? <Badge nada="brand" dot={false}>Malam ini</Badge> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/admin/jadwal/${jadwal.id}/edit`} varian="sekunder">Edit jadwal</ButtonLink>
            {jadwal.status === "draft" ? (
              <Button varian="utama" onClick={() => setPublish(true)}>Publikasikan</Button>
            ) : (
              <Button varian="halus" onClick={() => setReminder(true)}>Kirim pengingat</Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card padding={false}>
            <div className="p-5 pb-3">
              <CardHeader
                judul={`Petugas bertugas (${petugas.length})`}
                keterangan="Ketua RT dapat mencatat kehadiran hingga pukul 02.00 WIB."
              />
            </div>
            <ul className="divide-y divide-line">
              {petugas.map(({ detail, warga }) => (
                <li key={detail.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-brand">
                    {warga.nama.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{warga.nama}</p>
                    <p className="text-[12px] text-muted">
                      {detail.waktuDicatat ? `Dicatat pukul ${detail.waktuDicatat} WIB` : "Belum ada catatan waktu"}
                    </p>
                  </div>
                  <StatusKehadiranBadge status={detail.statusKehadiran} />
                  <label className="sr-only" htmlFor={`status-${detail.id}`}>
                    Ubah status kehadiran {warga.nama}
                  </label>
                  <select
                    id={`status-${detail.id}`}
                    value={detail.statusKehadiran}
                    onChange={(e) =>
                      catatKehadiran(detail.id, e.target.value as typeof detail.statusKehadiran)
                    }
                    className="h-9 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink"
                  >
                    <option value="hadir">Hadir</option>
                    <option value="tidak-hadir">Tidak hadir</option>
                    <option value="belum-dicatat">Belum dicatat</option>
                  </select>
                </li>
              ))}
            </ul>
            {petugas.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted">
                Belum ada petugas terdaftar. <Link href={`/admin/jadwal/${jadwal.id}/edit`} className="font-medium text-brand hover:underline">Tambah petugas</Link>
              </p>
            ) : null}
          </Card>

          {pertukaranTerkait.length > 0 ? (
            <Card>
              <CardHeader judul="Pertukaran terkait jadwal ini" keterangan="Riwayat pengajuan pertukaran pada tanggal ini." />
              <ul className="mt-3 space-y-2">
                {pertukaranTerkait.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink">
                        {state.pengguna.find((u) => u.id === p.pemohonId)?.nama} ↔{" "}
                        {state.pengguna.find((u) => u.id === p.wargaTujuanId)?.nama}
                      </p>
                      <p className="text-[12px] text-muted">{p.id}</p>
                    </div>
                    <ButtonLink href={`/admin/pertukaran/${p.id}`} ukuran="sm">Lihat</ButtonLink>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader judul="Rekap kehadiran" keterangan={`${rekap.hadir} hadir · ${rekap["tidak-hadir"]} tidak hadir · ${rekap["belum-dicatat"]} belum dicatat`} />
            <ul className="mt-3 space-y-2">
              <li className="flex items-center justify-between text-[13px]">
                <span className="text-[#41504a]">Hadir</span>
                <span className="font-semibold text-ink">{rekap.hadir}</span>
              </li>
              <li className="flex items-center justify-between text-[13px]">
                <span className="text-[#41504a]">Tidak hadir</span>
                <span className="font-semibold text-ink">{rekap["tidak-hadir"]}</span>
              </li>
              <li className="flex items-center justify-between text-[13px]">
                <span className="text-[#41504a]">Belum dicatat</span>
                <span className="font-semibold text-ink">{rekap["belum-dicatat"]}</span>
              </li>
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[11.5px] leading-4 text-muted">
                {jadwal.status === "dipublikasikan" && jadwal.dipublikasikanPada
                  ? `Dipublikasikan pada ${jadwal.dipublikasikanPada.replace("T", " · ").replace(":", ".")} WIB.`
                  : "Jadwal ini masih draft dan belum terlihat warga."}
              </p>
            </div>
          </Card>

          <Card className="bg-[#fbfcfa]">
            <p className="text-[12.5px] font-medium text-ink">Informasi jadwal</p>
            <dl className="mt-2 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Hari</dt>
                <dd className="text-ink">{hariFromIso(jadwal.tanggal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Durasi</dt>
                <dd className="text-ink">4 jam</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Lokasi</dt>
                <dd className="text-ink">{jadwal.lokasi}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">ID jadwal</dt>
                <dd className="text-ink">{jadwal.id}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Dialog
        buka={publish}
        onTutup={() => setPublish(false)}
        judul="Publikasikan jadwal ini?"
        deskripsi="Setelah dipublikasikan, jadwal terlihat oleh warga yang bertugas dan pengingat otomatis terkirim."
        aksi={
          <>
            <Button onClick={() => setPublish(false)}>Batal</Button>
            <Button
              varian="utama"
              onClick={() => {
                publikasikanJadwal(jadwal.id);
                setPublish(false);
                tampilkanToast("Jadwal dipublikasikan dan pengingat dikirim.");
              }}
            >
              Ya, publikasikan
            </Button>
          </>
        }
      />
      <Dialog
        buka={reminder}
        onTutup={() => setReminder(false)}
        judul="Kirim pengingat ronda?"
        deskripsi={`Pengingat dikirim ke ${petugas.length} petugas yang tercatat pada jadwal ini.`}
        aksi={
          <>
            <Button onClick={() => setReminder(false)}>Batal</Button>
            <Button
              varian="utama"
              onClick={() => {
                kirimPengingat(jadwal.id);
                setReminder(false);
                tampilkanToast("Pengingat dikirim ke petugas yang bertugas.");
              }}
            >
              Kirim pengingat
            </Button>
          </>
        }
      />
    </div>
  );
}
