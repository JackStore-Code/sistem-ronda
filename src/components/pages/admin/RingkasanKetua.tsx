"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { StatusKehadiranBadge, StatusPertukaranBadge } from "@/components/ui/Badges";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Dialog } from "@/components/ui/Dialog";
import {
  TODAY,
  addDays,
  formatBulanTahun,
  formatJam,
  formatTanggalPanjang,
  greeting,
  labelRelatif,
  namaPanggilan,
  petugasForSchedule,
} from "@/lib/format";

export function RingkasanKetua() {
  const { state, penggunaAktif, publikasikanJadwal, kirimPengingat, tampilkanToast, catatKehadiran } = useDemo();
  const [publishId, setPublishId] = useState<string | null>(null);
  const [reminderId, setReminderId] = useState<string | null>(null);

  const hariIni = TODAY;
  const jadwalHariIni = state.jadwal.find((j) => j.tanggal === hariIni);
  const petugasHariIni = jadwalHariIni ? petugasForSchedule(state, jadwalHariIni.id) : [];
  const hadir = petugasHariIni.filter((p) => p.detail.statusKehadiran === "hadir").length;
  const tidakHadir = petugasHariIni.filter((p) => p.detail.statusKehadiran === "tidak-hadir").length;
  const belum = petugasHariIni.filter((p) => p.detail.statusKehadiran === "belum-dicatat").length;

  const draftBerikut = state.jadwal
    .filter((j) => j.status === "draft" && j.tanggal > hariIni)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0];

  const draftCount = state.jadwal.filter((j) => j.status === "draft").length;
  const menungguValidasi = state.pertukaran.filter((p) => p.status === "menunggu-validasi");
  const belumDicatat = state.detailJadwal.filter(
    (d) => d.statusKehadiran === "belum-dicatat" && d.jadwalId === jadwalHariIni?.id,
  ).length;

  const aktivitas = state.aktivitas.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Ringkasan</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
            {greeting()}, {namaPanggilan(state, penggunaAktif.id)}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {formatTanggalPanjang(hariIni)} · {formatBulanTahun(hariIni)} · RT 05 / RW 03 Sukamaju
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/admin/jadwal/baru" varian="utama">
            <IkonTambah />
            Buat Jadwal
          </ButtonLink>
          <Button varian="sekunder" onClick={() => setReminderId(jadwalHariIni?.id ?? null)}>
            <IkonLonceng />
            Kirim Pengingat
          </Button>
        </div>
      </div>

      <DemoNotice />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {draftBerikut ? (
            <Card className="border-[#f0dcbb] bg-attention-soft/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge nada="attention">Draft belum dipublikasikan</Badge>
                  </div>
                  <p className="mt-2 text-[15px] font-semibold text-ink">
                    {formatTanggalPanjang(draftBerikut.tanggal)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {draftBerikut.waktuMulai} – {draftBerikut.waktuSelesai} WIB ·{" "}
                    {petugasForSchedule(state, draftBerikut.id).length} petugas terdaftar
                    {draftCount > 1 ? ` · ${draftCount} jadwal masih draft` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ButtonLink href={`/admin/jadwal/${draftBerikut.id}/edit`} ukuran="sm">
                    Edit
                  </ButtonLink>
                  <Button varian="utama" ukuran="sm" onClick={() => setPublishId(draftBerikut.id)}>
                    Publikasikan
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <Card padding={false}>
            <div className="p-5 pb-0">
              <CardHeader
                judul="Jadwal ronda malam ini"
                keterangan={jadwalHariIni ? `${jadwalHariIni.lokasi} · ${jadwalHariIni.waktuMulai} – ${jadwalHariIni.waktuSelesai} WIB` : undefined}
                aksi={
                  <ButtonLink href={`/admin/jadwal/${jadwalHariIni?.id ?? ""}`} ukuran="sm" varian="sekunder">
                    Lihat detail
                  </ButtonLink>
                }
              />
            </div>

            {jadwalHariIni ? (
              <>
                <div className="mt-4 flex items-center gap-3 border-y border-line bg-[#fbfcfa] px-5 py-3">
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-surface">
                    <span className="text-[10px] font-medium uppercase leading-3 text-muted">Nov</span>
                    <span className="text-[16px] font-semibold leading-5 text-ink">19</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink">{formatTanggalPanjang(hariIni)}</p>
                    <p className="text-[12.5px] text-muted">
                      {petugasHariIni.length} petugas · {hadir} hadir · {tidakHadir} tidak hadir · {belum} belum dicatat
                    </p>
                  </div>
                  <Badge nada="brand">Dipublikasikan</Badge>
                </div>

                <ul className="divide-y divide-line">
                  {petugasHariIni.map(({ detail, warga }) => (
                    <li key={detail.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-brand">
                        {warga.nama.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{warga.nama}</p>
                        <p className="text-[12px] text-muted">
                          {detail.statusKehadiran === "belum-dicatat"
                            ? "Kehadiran belum dicatat"
                            : `Dicatat pukul ${detail.waktuDicatat ?? "—"} WIB`}
                          {warga.statusAkun === "nonaktif" ? " · akun nonaktif" : ""}
                        </p>
                      </div>
                      <StatusKehadiranBadge status={detail.statusKehadiran} />
                      <div className="flex gap-1">
                        <Button
                          ukuran="sm"
                          varian={detail.statusKehadiran === "hadir" ? "utama" : "sekunder"}
                          aria-pressed={detail.statusKehadiran === "hadir"}
                          onClick={() => catatKehadiran(detail.id, "hadir")}
                        >
                          Hadir
                        </Button>
                        <Button
                          ukuran="sm"
                          varian="sekunder"
                          aria-pressed={detail.statusKehadiran === "tidak-hadir"}
                          onClick={() => catatKehadiran(detail.id, "tidak-hadir")}
                          className={detail.statusKehadiran === "tidak-hadir" ? "border-danger text-danger bg-danger-soft" : ""}
                        >
                          Tidak hadir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                {belumDicatat > 0 ? (
                  <div className="border-t border-line bg-attention-soft/50 px-5 py-2.5 text-[12.5px] text-attention">
                    {belumDicatat} petugas belum dicatat kehadirannya. Catat sebelum ronda berakhir.
                  </div>
                ) : null}
              </>
            ) : (
              <div className="p-5">
                <EmptyState
                  ikon="calendar"
                  judul="Belum ada jadwal ronda untuk malam ini"
                  deskripsi="Buat jadwal lalu publikasikan agar petugas menerima pengingat otomatis."
                  aksi={<ButtonLink href="/admin/jadwal/baru" varian="utama" ukuran="sm">Buat Jadwal</ButtonLink>}
                />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              judul="Perlu tindakan Anda"
              keterangan="Permohonan pertukaran yang menunggu keputusan Ketua RT."
            />
            <div className="mt-3 space-y-2.5">
              {menungguValidasi.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3.5 py-3 text-[13px] text-muted">
                  Tidak ada pertukaran yang menunggu validasi saat ini.
                </p>
              ) : (
                menungguValidasi.map((p) => {
                  const asal = state.jadwal.find((j) => j.id === p.jadwalAsalId);
                  const tujuan = state.jadwal.find((j) => j.id === p.jadwalTujuanId);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPertukaranBadge status={p.status} />
                          <span className="text-[11.5px] text-muted">{p.id}</span>
                        </div>
                        <p className="mt-1.5 text-[13.5px] font-medium text-ink">
                          {namaPanggilan(state, p.pemohonId)} ↔ {namaPanggilan(state, p.wargaTujuanId)}
                        </p>
                        <p className="text-[12.5px] text-muted">
                          {asal ? formatTanggalPanjang(asal.tanggal, false) : "—"} ↔{" "}
                          {tujuan ? formatTanggalPanjang(tujuan.tanggal, false) : "—"}
                        </p>
                      </div>
                      <ButtonLink href={`/admin/pertukaran/${p.id}`} varian="utama" ukuran="sm">
                        Tinjau
                      </ButtonLink>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              judul="Kehadiran malam ini"
              keterangan={`${hadir} dari ${petugasHariIni.length} petugas tercatat hadir`}
            />
            <dl className="mt-3 space-y-2">
              <BarisStatistik label="Hadir" nilai={hadir} total={petugasHariIni.length} nada="brand" />
              <BarisStatistik label="Tidak hadir" nilai={tidakHadir} total={petugasHariIni.length} nada="danger" />
              <BarisStatistik label="Belum dicatat" nilai={belum} total={petugasHariIni.length} nada="attention" />
            </dl>
            <div className="mt-4 flex gap-2">
              <ButtonLink href="/admin/kehadiran" varian="halus" ukuran="sm" className="flex-1">
                Catat kehadiran
              </ButtonLink>
            </div>
            <p className="mt-2 text-[11.5px] leading-4 text-muted">
              Pencatatan tetap bisa dilakukan sampai pukul 02.00 WIB.
            </p>
          </Card>

          <Card>
            <CardHeader judul="Aktivitas terbaru" keterangan="Seluruh perubahan tercatat pada data demo." />
            <ol className="mt-3 space-y-3">
              {aktivitas.length === 0 ? (
                <li className="text-[13px] text-muted">Belum ada aktivitas.</li>
              ) : (
                aktivitas.map((a) => (
                  <li key={a.id} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a8b5aa]" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] leading-5 text-ink">{a.teks}</p>
                      <p className="text-[11.5px] text-muted">
                        {labelRelatif(a.tanggal, TODAY) === "Malam ini"
                          ? `Hari ini · ${a.waktu}`
                          : `${labelRelatif(a.tanggal, TODAY)} · ${a.waktu}`}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </Card>

          <Card>
            <CardHeader judul="Jadwal berikutnya" keterangan="Malam-malam ronda yang sudah dipublikasikan." />
            <ul className="mt-3 space-y-1">
              {state.jadwal
                .filter((j) => j.tanggal > TODAY)
                .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
                .slice(0, 3)
                .map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/admin/jadwal/${j.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-neutral-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-ink">{formatTanggalPanjang(j.tanggal, false)}</span>
                        <span className="block text-[11.5px] text-muted">
                          {j.waktuMulai} – {j.waktuSelesai} · {petugasForSchedule(state, j.id).length} petugas
                        </span>
                      </span>
                      {j.status === "draft" ? <Badge nada="attention">Draft</Badge> : null}
                    </Link>
                  </li>
                ))}
              {state.jadwal.filter((j) => j.tanggal > TODAY).length === 0 ? (
                <li className="text-[13px] text-muted">Belum ada jadwal berikutnya.</li>
              ) : null}
            </ul>
            <Link href="/admin/jadwal" className="mt-2 inline-block text-[12.5px] font-medium text-brand hover:underline">
              Lihat semua jadwal
            </Link>
          </Card>
        </div>
      </div>

      <Dialog
        buka={publishId !== null}
        onTutup={() => setPublishId(null)}
        judul="Publikasikan jadwal ini?"
        deskripsi="Setelah dipublikasikan, warga yang bertugas dapat melihat jadwal dan menerima pengingat otomatis."
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
      >
        {publishId ? <RingkasanJadwal jadwalId={publishId} /> : null}
      </Dialog>

      <Dialog
        buka={reminderId !== null}
        onTutup={() => setReminderId(null)}
        judul="Kirim pengingat ronda?"
        deskripsi="Pengingat dikirim ke seluruh petugas yang tercatat pada jadwal ini."
        aksi={
          <>
            <Button onClick={() => setReminderId(null)}>Batal</Button>
            <Button
              varian="utama"
              onClick={() => {
                if (reminderId) {
                  kirimPengingat(reminderId);
                  tampilkanToast("Pengingat dikirim ke petugas yang bertugas.");
                }
                setReminderId(null);
              }}
            >
              Kirim pengingat
            </Button>
          </>
        }
      >
        {reminderId ? <RingkasanJadwal jadwalId={reminderId} /> : null}
      </Dialog>
    </div>
  );
}

function RingkasanJadwal({ jadwalId }: { jadwalId: string }) {
  const { state } = useDemo();
  const jadwal = state.jadwal.find((j) => j.id === jadwalId);
  if (!jadwal) return null;
  const petugas = petugasForSchedule(state, jadwalId);
  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3">
        <p className="text-[13.5px] font-semibold text-ink">{formatTanggalPanjang(jadwal.tanggal)}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {jadwal.waktuMulai} – {jadwal.waktuSelesai} WIB · {jadwal.lokasi}
        </p>
      </div>
      <p className="text-[12px] font-medium text-muted">Petugas bertugas</p>
      <ul className="flex flex-wrap gap-1.5">
        {petugas.map(({ warga }) => (
          <li key={warga.id} className="rounded-md border border-line bg-surface px-2 py-1 text-[12.5px] text-ink">
            {warga.nama}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarisStatistik({
  label,
  nilai,
  total,
  nada,
}: {
  label: string;
  nilai: number;
  total: number;
  nada: "brand" | "danger" | "attention";
}) {
  const warna = nada === "brand" ? "bg-brand" : nada === "danger" ? "bg-danger" : "bg-attention";
  const lebar = total === 0 ? 0 : Math.round((nilai / total) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-[12.5px] text-[#41504a]">{label}</dt>
        <dd className="text-[13px] font-semibold text-ink">
          {nilai}
          <span className="text-[11.5px] font-normal text-muted"> / {total}</span>
        </dd>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-soft">
        <div className={`h-full rounded-full ${warna}`} style={{ width: `${lebar}%` }} />
      </div>
    </div>
  );
}

function IkonTambah() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function IkonLonceng() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 17V11a6 6 0 1 1 12 0v6l2 2H4z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export const ringkasanMeta = { addDays, formatJam };
