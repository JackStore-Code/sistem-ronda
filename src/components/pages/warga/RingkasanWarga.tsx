"use client";

import Link from "next/link";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { StatusKehadiranBadge, StatusPertukaranBadge } from "@/components/ui/Badges";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { DemoNotice } from "@/components/ui/DemoNotice";
import {
  TODAY,
  countStatusKehadiran,
  formatJam,
  formatTanggalPendek,
  greeting,
  labelRelatif,
  namaPanggilan,
  petugasForSchedule,
} from "@/lib/format";

export function RingkasanWarga() {
  const { state, penggunaAktif } = useDemo();
  const saya = penggunaAktif;

  const tugasSaya = state.detailJadwal
    .filter((d) => d.wargaId === saya.id)
    .map((d) => ({ detail: d, jadwal: state.jadwal.find((j) => j.id === d.jadwalId) }))
    .filter((x): x is { detail: typeof x.detail; jadwal: NonNullable<typeof x.jadwal> } => Boolean(x.jadwal))
    .sort((a, b) => a.jadwal.tanggal.localeCompare(b.jadwal.tanggal));

  const tugasHariIni = tugasSaya.find((t) => t.jadwal.tanggal === TODAY);
  const tugasBerikut = tugasSaya.find((t) => t.jadwal.tanggal > TODAY);
  const pertukaranSaya = state.pertukaran.filter(
    (p) => p.pemohonId === saya.id || p.wargaTujuanId === saya.id,
  );
  const perluTanggapan = pertukaranSaya.filter((p) => p.status === "menunggu-warga" && p.wargaTujuanId === saya.id);
  const menungguOrangLain = pertukaranSaya.filter(
    (p) => p.status === "menunggu-warga" && p.pemohonId === saya.id,
  );

  const jadwalMalamIni = state.jadwal.find((j) => j.tanggal === TODAY);
  const petugasMalamIni = jadwalMalamIni ? petugasForSchedule(state, jadwalMalamIni.id) : [];
  const rekap = countStatusKehadiran(petugasMalamIni);

  const notifikasiBaru = state.notifikasi
    .filter((n) => !n.dibaca && (!n.penerimaId || n.penerimaId === saya.id))
    .slice(0, 3);

  const aktivitas = state.aktivitas.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Ringkasan</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
            {greeting()}, {namaPanggilan(state, saya.id)}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {formatTanggalPendek(TODAY)} · {saya.nama} · {saya.noHp}
          </p>
        </div>
        <ButtonLink href="/warga/pertukaran/baru" varian="utama">
          <IkonTukar />
          Ajukan Pertukaran
        </ButtonLink>
      </div>

      <DemoNotice />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card padding={false}>
            <div className="p-5 pb-0">
              <CardHeader
                judul="Tugas ronda Anda"
                keterangan={
                  tugasHariIni
                    ? "Anda bertugas malam ini. Hadir pukul 22.00 WIB di pos ronda."
                    : "Tidak ada tugas malam ini. Berikut jadwal terdekat Anda."
                }
                aksi={tugasHariIni ? <Badge nada="attention">Malam ini</Badge> : undefined}
              />
            </div>
            {tugasHariIni ? (
              <>
                <div className="mt-4 flex items-center gap-3 border-y border-line bg-attention-soft/50 px-5 py-3">
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-[#f0dcbb] bg-surface">
                    <span className="text-[10px] font-medium uppercase leading-3 text-muted">Nov</span>
                    <span className="text-[16px] font-semibold leading-5 text-ink">19</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink">{formatTanggalPendek(tugasHariIni.jadwal.tanggal)}</p>
                    <p className="text-[12.5px] text-muted">
                      {tugasHariIni.jadwal.waktuMulai} – {tugasHariIni.jadwal.waktuSelesai} WIB · {tugasHariIni.jadwal.lokasi}
                    </p>
                  </div>
                  <StatusKehadiranBadge status={tugasHariIni.detail.statusKehadiran} />
                </div>
                <div className="px-5 py-4">
                  <p className="text-[12px] font-medium text-muted">Petugas malam ini</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {petugasMalamIni.map(({ warga, detail }) => (
                      <li
                        key={warga.id}
                        className={`rounded-md border px-2 py-1 text-[12.5px] ${
                          warga.id === saya.id
                            ? "border-brand-line bg-brand-soft font-medium text-brand"
                            : "border-line bg-surface text-ink"
                        }`}
                      >
                        {warga.id === saya.id ? "Anda" : warga.nama}
                        {detail.statusKehadiran === "hadir" ? " ✓" : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[12px] text-muted">
                    Kehadiran dicatat oleh Ketua RT. Hubungi Ketua RT bila status Anda keliru.
                  </p>
                </div>
              </>
            ) : tugasBerikut ? (
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{formatTanggalPendek(tugasBerikut.jadwal.tanggal)}</p>
                    <p className="text-[12.5px] text-muted">
                      {labelRelatif(tugasBerikut.jadwal.tanggal, TODAY)} · {tugasBerikut.jadwal.waktuMulai} –{" "}
                      {tugasBerikut.jadwal.waktuSelesai} WIB
                    </p>
                  </div>
                  <ButtonLink href={`/warga/jadwal/${tugasBerikut.jadwal.id}`} ukuran="sm">
                    Detail
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  ikon="calendar"
                  judul="Belum ada tugas ronda untuk Anda"
                  deskripsi="Ketua RT belum menjadwalkan Anda pada jadwal mendatang. Anda akan menerima notifikasi bila dijadwalkan."
                />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              judul="Pertukaran jadwal"
              keterangan={
                perluTanggapan.length > 0
                  ? `${perluTanggapan.length} permintaan menunggu tanggapan Anda`
                  : menungguOrangLain.length > 0
                    ? `${menungguOrangLain.length} pengajuan Anda menunggu tanggapan warga lain`
                    : "Tidak ada permintaan yang menunggu Anda"
              }
              aksi={<ButtonLink href="/warga/pertukaran" ukuran="sm" varian="sekunder">Lihat semua</ButtonLink>}
            />
            <div className="mt-3 space-y-2">
              {perluTanggapan.length === 0 && menungguOrangLain.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3.5 py-3 text-[13px] text-muted">
                  Butuh mengganti jadwal? Ajukan pertukaran kepada warga lain lewat tombol di atas.
                </p>
              ) : (
                [...perluTanggapan, ...menungguOrangLain].slice(0, 2).map((p) => {
                  const asal = state.jadwal.find((j) => j.id === p.jadwalAsalId);
                  const tujuan = state.jadwal.find((j) => j.id === p.jadwalTujuanId);
                  return (
                    <Link
                      key={p.id}
                      href={`/warga/pertukaran/${p.id}`}
                      className="block rounded-lg border border-line px-3.5 py-3 hover:bg-[#fbfcfa]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPertukaranBadge status={p.status} />
                        <span className="text-[11.5px] text-muted">{p.id}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] text-ink">
                        {namaPanggilan(state, p.pemohonId)} ↔ {namaPanggilan(state, p.wargaTujuanId)} ·{" "}
                        {asal ? formatTanggalPendek(asal.tanggal, false) : "—"} →{" "}
                        {tujuan ? formatTanggalPendek(tujuan.tanggal, false) : "—"}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader judul="Jadwal ronda RT 05" keterangan="Jadwal yang sudah dipublikasikan Ketua RT." />
            <ul className="mt-3 divide-y divide-line">
              {state.jadwal
                .filter((j) => j.status === "dipublikasikan")
                .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
                .slice(0, 4)
                .map((j) => {
                  const petugas = petugasForSchedule(state, j.id);
                  const sayaBertugas = petugas.some((p) => p.warga.id === saya.id);
                  return (
                    <li key={j.id}>
                      <Link href={`/warga/jadwal/${j.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#fbfcfa]">
                        <div className="min-w-0">
                          <p className="text-[13px] text-ink">
                            {formatTanggalPendek(j.tanggal, false)}
                            {sayaBertugas ? (
                              <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-brand">
                                Anda bertugas
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11.5px] text-muted">
                            {formatJam(j.waktuMulai)} – {formatJam(j.waktuSelesai)} · {petugas.length} petugas
                          </p>
                        </div>
                        <span className="text-[12px] text-muted">
                          {petugas.map((p) => (p.warga.id === saya.id ? "Anda" : p.warga.nama.split(" ")[0])).join(", ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader judul="Notifikasi baru" keterangan={notifikasiBaru.length > 0 ? `${notifikasiBaru.length} belum dibaca` : "Semua sudah dibaca"} aksi={<ButtonLink href="/warga/notifikasi" ukuran="sm" varian="tautan">Buka</ButtonLink>} />
            <ul className="mt-2 space-y-2">
              {notifikasiBaru.length === 0 ? (
                <li className="text-[13px] text-muted">Tidak ada notifikasi baru.</li>
              ) : (
                notifikasiBaru.map((n) => (
                  <li key={n.id} className="rounded-lg border border-line bg-brand-soft/30 px-3 py-2.5">
                    <p className="text-[12.5px] font-semibold text-ink">{n.judul}</p>
                    <p className="mt-0.5 text-[12px] leading-4 text-muted">{n.pesan}</p>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader judul="Kehadiran malam ini" keterangan={`${rekap.hadir} dari ${petugasMalamIni.length} petugas tercatat hadir`} />
            <ul className="mt-2.5 space-y-1.5">
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
            <ButtonLink href="/warga/kehadiran" varian="halus" ukuran="sm" className="mt-3 w-full">
              Lihat kehadiran saya
            </ButtonLink>
          </Card>

          <Card>
            <CardHeader judul="Aktivitas terbaru" />
            <ol className="mt-2.5 space-y-2.5">
              {aktivitas.map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a8b5aa]" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] leading-5 text-ink">{a.teks}</p>
                    <p className="text-[11.5px] text-muted">{a.waktu}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IkonTukar() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h12l-3-3M20 16H8l3 3" />
    </svg>
  );
}
