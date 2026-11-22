"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { StatusPertukaranBadge } from "@/components/ui/Badges";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Textarea } from "@/components/ui/Field";
import { formatTanggalPendek, formatWaktuLengkap, namaWarga } from "@/lib/format";

export function DetailPertukaranKetua({ id }: { id: string }) {
  const { state, validasiPertukaran, tampilkanToast } = useDemo();
  const [aksi, setAksi] = useState<null | "setuju" | "tolak">(null);
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState("");

  const p = state.pertukaran.find((x) => x.id === id);
  if (!p) {
    return (
      <div className="space-y-4">
        <Link href="/admin/pertukaran" className="text-[12.5px] text-muted hover:text-ink">← Pertukaran Jadwal</Link>
        <h1 className="text-[22px] font-semibold text-ink">Permohonan tidak ditemukan</h1>
        <p className="text-[13px] text-muted">Permohonan {id} tidak ditemukan.</p>
        <ButtonLink href="/admin/pertukaran" varian="utama">Kembali ke daftar</ButtonLink>
      </div>
    );
  }

  const asal = state.jadwal.find((j) => j.id === p.jadwalAsalId);
  const tujuan = state.jadwal.find((j) => j.id === p.jadwalTujuanId);
  const bisaValidasi = p.status === "menunggu-validasi";

  const langkah = [
    {
      nomor: 1,
      judul: "Pengajuan dikirim pemohon",
      keterangan: `${namaWarga(state, p.pemohonId)} · ${formatWaktuLengkap(p.diajukanPada)}`,
      status: "selesai" as const,
    },
    {
      nomor: 2,
      judul: "Tanggapan warga tujuan",
      keterangan:
        p.ditanggapiPada
          ? p.ditolakOleh === "warga"
            ? `${namaWarga(state, p.wargaTujuanId)} menolak · ${formatWaktuLengkap(p.ditanggapiPada)}`
            : `${namaWarga(state, p.wargaTujuanId)} menyetujui · ${formatWaktuLengkap(p.ditanggapiPada)}`
          : `Menunggu tanggapan ${namaWarga(state, p.wargaTujuanId)}`,
      status: p.ditanggapiPada ? ("selesai" as const) : ("menunggu" as const),
    },
    {
      nomor: 3,
      judul: "Validasi Ketua RT",
      keterangan: p.divalidasiPada
        ? `${p.status === "disetujui" ? "Disetujui" : "Ditolak"} · ${formatWaktuLengkap(p.divalidasiPada)}`
        : bisaValidasi
          ? "Menunggu keputusan Anda"
          : "Belum sampai tahap ini",
      status: p.divalidasiPada ? ("selesai" as const) : bisaValidasi ? ("aktif" as const) : ("menunggu" as const),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/pertukaran" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5">
            <path d="M11 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Pertukaran Jadwal
        </Link>
        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Permohonan {p.id}</h1>
              <StatusPertukaranBadge status={p.status} />
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {namaWarga(state, p.pemohonId)} ↔ {namaWarga(state, p.wargaTujuanId)} · diajukan{" "}
              {formatWaktuLengkap(p.diajukanPada)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader judul="Rincian pertukaran" keterangan="Jadwal yang dipertukarkan kedua warga." />
            <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <KotakJadwal
                judul="Jadwal asal"
                nama={namaWarga(state, p.pemohonId)}
                tanggal={asal ? formatTanggalPendek(asal.tanggal) : "—"}
                keterangan={asal ? `${asal.waktuMulai} – ${asal.waktuSelesai} WIB` : ""}
                peran="Pemohon"
              />
              <div className="flex items-center justify-center text-muted">
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 rotate-90 sm:rotate-0">
                  <path d="M4 12h14l-4-4M20 12H6l4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <KotakJadwal
                judul="Jadwal tujuan"
                nama={namaWarga(state, p.wargaTujuanId)}
                tanggal={tujuan ? formatTanggalPendek(tujuan.tanggal) : "—"}
                keterangan={tujuan ? `${tujuan.waktuMulai} – ${tujuan.waktuSelesai} WIB` : ""}
                peran="Warga tujuan"
              />
            </div>
            <div className="mt-4 rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted">Alasan pemohon</p>
              <p className="mt-1 text-[13px] leading-5 text-ink">“{p.alasan}”</p>
            </div>
          </Card>

          <Card padding={false}>
            <div className="p-5 pb-2">
              <CardHeader judul="Alur persetujuan" keterangan="Persetujuan berurutan, tidak bisa dilompati." />
            </div>
            <ol className="px-5 pb-5">
              {langkah.map((l, i) => (
                <li key={l.nomor} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < langkah.length - 1 ? (
                    <span className={`absolute left-[11px] top-6 h-full w-px ${l.status === "selesai" ? "bg-brand-line" : "bg-line"}`} />
                  ) : null}
                  <span
                    className={`relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      l.status === "selesai"
                        ? "border-brand bg-brand text-white"
                        : l.status === "aktif"
                          ? "border-attention bg-attention-soft text-attention"
                          : "border-line bg-surface text-muted"
                    }`}
                  >
                    {l.status === "selesai" ? (
                      <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3">
                        <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    ) : (
                      l.nomor
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className={`text-[13.5px] font-medium ${l.status === "menunggu" ? "text-muted" : "text-ink"}`}>{l.judul}</p>
                    <p className="text-[12px] leading-4 text-muted">{l.keterangan}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {p.status === "ditolak" && p.alasanPenolakan ? (
            <Card className="border-[#f2cfcc] bg-danger-soft/50">
              <p className="text-[13px] font-semibold text-danger">
                Ditolak oleh {p.ditolakOleh === "ketua" ? "Ketua RT" : "warga tujuan"}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[#6d2a2a]">{p.alasanPenolakan}</p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              judul={bisaValidasi ? "Validasi permohonan" : "Keputusan"}
              keterangan={
                bisaValidasi
                  ? "Kedua warga sudah setuju. Memvalidasi akan menukar petugas pada kedua jadwal."
                  : p.status === "menunggu-warga"
                    ? "Belum bisa divalidasi. Warga tujuan belum menanggapi."
                    : "Permohonan ini sudah selesai diproses."
              }
            />
            {bisaValidasi ? (
              <div className="mt-3 space-y-2">
                <Button varian="utama" className="w-full" onClick={() => setAksi("setuju")}>
                  Setujui & perbarui jadwal
                </Button>
                <Button varian="bahaya" className="w-full" onClick={() => setAksi("tolak")}>
                  Tolak permohonan
                </Button>
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-line px-3.5 py-3 text-[12.5px] leading-5 text-muted">
                {p.status === "menunggu-warga"
                  ? `Menunggu ${namaWarga(state, p.wargaTujuanId)} menanggapi. Anda dapat memantau lewat daftar pertukaran.`
                  : p.status === "disetujui"
                    ? "Jadwal sudah diperbarui otomatis setelah validasi Anda."
                    : "Tidak ada tindakan lanjutan yang diperlukan."}
              </p>
            )}
          </Card>

          <Card className="bg-[#fbfcfa]">
            <p className="text-[12.5px] font-medium text-ink">Yang terjadi setelah disetujui</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-4 text-muted">
              <li>• Petugas pada kedua jadwal bertukar otomatis.</li>
              <li>• Kedua warga menerima notifikasi keputusan.</li>
              <li>• Perubahan tercatat pada aktivitas terbaru.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Dialog
        buka={aksi === "setuju"}
        onTutup={() => setAksi(null)}
        judul="Setujui pertukaran ini?"
        deskripsi={`${namaWarga(state, p.pemohonId)} akan bertugas pada jadwal ${tujuan ? formatTanggalPendek(tujuan.tanggal, false) : ""}, dan ${namaWarga(state, p.wargaTujuanId)} pada jadwal ${asal ? formatTanggalPendek(asal.tanggal, false) : ""}.`}
        aksi={
          <>
            <Button onClick={() => setAksi(null)}>Batal</Button>
            <Button
              varian="utama"
              onClick={() => {
                const hasil = validasiPertukaran(p.id, true);
                setAksi(null);
                if (hasil.ok) {
                  tampilkanToast("Pertukaran disetujui. Jadwal kedua warga diperbarui.");
                } else {
                  tampilkanToast(hasil.pesan ?? "Permohonan belum dapat diproses.", "galat");
                }
              }}
            >
              Ya, setujui
            </Button>
          </>
        }
      >
        <ul className="space-y-1.5 text-[13px] text-ink">
          <li>• Jadwal diperbarui otomatis.</li>
          <li>• Kedua warga menerima notifikasi.</li>
        </ul>
      </Dialog>

      <Dialog
        buka={aksi === "tolak"}
        onTutup={() => {
          setAksi(null);
          setGalat("");
        }}
        judul="Tolak permohonan pertukaran?"
        deskripsi="Alasan penolakan wajib diisi agar pemohon memahami keputusan Anda."
        aksi={
          <>
            <Button
              onClick={() => {
                setAksi(null);
                setGalat("");
              }}
            >
              Batal
            </Button>
            <Button
              varian="bahaya"
              onClick={() => {
                if (alasan.trim().length < 10) {
                  setGalat("Alasan penolakan wajib diisi (minimal 10 karakter).");
                  return;
                }
                validasiPertukaran(p.id, false, alasan);
                setAksi(null);
                setAlasan("");
                setGalat("");
                tampilkanToast("Permohonan ditolak. Alasan dikirim ke pemohon.");
              }}
            >
              Ya, tolak
            </Button>
          </>
        }
      >
        <Field id="alasan-tolak" label="Alasan penolakan" wajib galat={galat}>
          <Textarea
            id="alasan-tolak"
            galat={galat}
            value={alasan}
            onChange={(e) => {
              setAlasan(e.target.value);
              setGalat("");
            }}
            placeholder="Contoh: jadwal pengganti bentrok dengan tugas ronda lain."
          />
        </Field>
      </Dialog>
    </div>
  );
}

function KotakJadwal({
  judul,
  nama,
  tanggal,
  keterangan,
  peran,
}: {
  judul: string;
  nama: string;
  tanggal: string;
  keterangan: string;
  peran: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{judul}</p>
      <p className="mt-1 text-[13.5px] font-semibold text-ink">{tanggal}</p>
      <p className="text-[12px] text-muted">{keterangan}</p>
      <div className="mt-2 border-t border-line pt-2">
        <p className="text-[12.5px] text-ink">{nama}</p>
        <p className="text-[11.5px] text-muted">{peran}</p>
      </div>
    </div>
  );
}
