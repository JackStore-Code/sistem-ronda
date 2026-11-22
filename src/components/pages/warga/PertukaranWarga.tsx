"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { StatusPertukaranBadge } from "@/components/ui/Badges";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { formatTanggalPendek, namaWarga } from "@/lib/format";

export function DaftarPertukaranWarga() {
  const { state, penggunaAktif } = useDemo();
  const [tab, setTab] = useState<"semua" | "masuk" | "keluar">("semua");

  const daftar = state.pertukaran
    .filter((p) => p.pemohonId === penggunaAktif.id || p.wargaTujuanId === penggunaAktif.id)
    .filter((p) => {
      if (tab === "masuk") return p.wargaTujuanId === penggunaAktif.id;
      if (tab === "keluar") return p.pemohonId === penggunaAktif.id;
      return true;
    })
    .sort((a, b) => b.diajukanPada.localeCompare(a.diajukanPada));

  const perluTanggapan = state.pertukaran.filter(
    (p) => p.wargaTujuanId === penggunaAktif.id && p.status === "menunggu-warga",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Pertukaran Jadwal</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Pertukaran jadwal saya</h1>
          <p className="mt-1 text-[13px] text-muted">
            {perluTanggapan > 0
              ? `${perluTanggapan} permintaan menunggu tanggapan Anda`
              : "Tidak ada permintaan yang menunggu tanggapan Anda"}
          </p>
        </div>
        <ButtonLink href="/warga/pertukaran/baru" varian="utama">Ajukan pertukaran</ButtonLink>
      </div>


      <div className="flex gap-1 rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Jenis pertukaran">
        {([
          ["semua", "Semua"],
          ["masuk", "Masuk ke saya"],
          ["keluar", "Saya ajukan"],
        ] as const).map(([nilai, label]) => (
          <button
            key={nilai}
            role="tab"
            aria-selected={tab === nilai}
            onClick={() => setTab(nilai)}
            className={`flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              tab === nilai ? "bg-brand text-white" : "text-[#41504a] hover:bg-neutral-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {daftar.length === 0 ? (
        <EmptyState
          ikon="swap"
          judul="Belum ada pengajuan pertukaran"
          deskripsi="Bila berhalangan ronda, ajukan pertukaran ke warga lain pada jadwal berbeda."
          aksi={<ButtonLink href="/warga/pertukaran/baru" ukuran="sm" varian="utama">Ajukan pertukaran</ButtonLink>}
        />
      ) : (
        <Card padding={false}>
          <ul className="divide-y divide-line">
            {daftar.map((p) => {
              const asal = state.jadwal.find((j) => j.id === p.jadwalAsalId);
              const tujuan = state.jadwal.find((j) => j.id === p.jadwalTujuanId);
              const sayaPemohon = p.pemohonId === penggunaAktif.id;
              return (
                <li key={p.id} className="p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPertukaranBadge status={p.status} />
                        <span className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">
                          {sayaPemohon ? "Anda mengajukan" : "Untuk Anda"}
                        </span>
                        <span className="text-[11.5px] text-muted">{p.id}</span>
                      </div>
                      <p className="mt-2 text-[13.5px] font-medium text-ink">
                        {asal ? formatTanggalPendek(asal.tanggal, false) : "—"} ↔{" "}
                        {tujuan ? formatTanggalPendek(tujuan.tanggal, false) : "—"}
                      </p>
                      <p className="text-[12px] text-muted">
                        {namaWarga(state, p.pemohonId)} ↔ {namaWarga(state, p.wargaTujuanId)}
                      </p>
                      {p.status === "ditolak" && p.alasanPenolakan ? (
                        <p className="mt-1.5 text-[12px] text-danger">Alasan: {p.alasanPenolakan}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.wargaTujuanId === penggunaAktif.id && p.status === "menunggu-warga" ? (
                        <ButtonLink href={`/warga/pertukaran/${p.id}`} varian="utama" ukuran="sm">
                          Tanggapi
                        </ButtonLink>
                      ) : (
                        <ButtonLink href={`/warga/pertukaran/${p.id}`} ukuran="sm">Lihat detail</ButtonLink>
                      )}
                    </div>
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

export function FormPertukaranWarga() {
  const { state, penggunaAktif, ajukanPertukaran, tampilkanToast } = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const asalParam = params.get("asal");

  const jadwalSaya = useMemo(
    () =>
      state.detailJadwal
        .filter((d) => d.wargaId === penggunaAktif.id)
        .map((d) => ({ detail: d, jadwal: state.jadwal.find((j) => j.id === d.jadwalId) }))
        .filter((x): x is { detail: typeof x.detail; jadwal: NonNullable<typeof x.jadwal> } => Boolean(x.jadwal))
        // Jadwal draft tetap boleh ditukar: beberapa warga hanya kebagian jadwal draft,
        // dan tanpa ini mereka tidak bisa mengajukan pertukaran sama sekali.
        .sort((a, b) => a.jadwal.tanggal.localeCompare(b.jadwal.tanggal)),
    [state, penggunaAktif.id],
  );

  const [asalId, setAsalId] = useState(asalParam ?? jadwalSaya[0]?.jadwal.id ?? "");
  const [tujuanId, setTujuanId] = useState("");
  // Warga tujuan dipilih sendiri oleh pemohon (bukan ditentukan sistem).
  const [wargaTujuanId, setWargaTujuanId] = useState("");
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [konfirmasi, setKonfirmasi] = useState(false);
  // Pengunci: mencegah pengajuan terkirim dua kali bila tombol ditekan berulang.
  const [mengirim, setMengirim] = useState(false);

  const asal = state.jadwal.find((j) => j.id === asalId);
  const tujuan = state.jadwal.find((j) => j.id === tujuanId);

  const kandidatTujuan = state.jadwal
    .filter((j) => j.id !== asalId && j.status === "dipublikasikan")
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  // Daftar warga lain yang bertugas pada jadwal tujuan, lengkap dengan namanya.
  const petugasTujuan = tujuan
    ? state.detailJadwal
        .filter((d) => d.jadwalId === tujuan.id && d.wargaId !== penggunaAktif.id)
        .map((d) => state.pengguna.find((p) => p.id === d.wargaId))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.role === "warga")
    : [];
  // Pilihan warga tujuan harus tetap sah: masih bertugas pada jadwal tujuan
  // dan bukan dirinya sendiri. Bila tidak, anggap belum dipilih.
  const wargaTujuan =
    wargaTujuanId && petugasTujuan.some((p) => p.id === wargaTujuanId) ? wargaTujuanId : "";

  function validasi(): boolean {
    const g: Record<string, string> = {};
    if (!asalId) g.asal = "Pilih jadwal Anda yang ingin ditukar.";
    if (!tujuanId) g.tujuan = "Pilih jadwal tujuan pertukaran.";
    if (asalId && tujuanId && asalId === tujuanId) g.tujuan = "Jadwal tujuan harus berbeda dari jadwal asal.";
    if (tujuanId && petugasTujuan.length === 0)
      g.tujuan = "Jadwal tujuan tidak memiliki warga lain yang dapat menerima pertukaran.";
    if (tujuanId && petugasTujuan.length > 0 && !wargaTujuan)
      g.wargaTujuan = "Pilih dulu warga yang ingin diajak tukar jadwal.";
    if (alasan.trim().length < 10) g.alasan = "Alasan wajib diisi, minimal 10 karakter.";
    setGalat(g);
    return Object.keys(g).length === 0;
  }

  async function kirim() {
    // Klik kedua saat proses berjalan diabaikan, supaya tidak terbentuk dua permohonan.
    if (mengirim) return;
    if (!validasi()) {
      setKonfirmasi(false);
      return;
    }
    setMengirim(true);
    const res = await ajukanPertukaran({
      pemohonId: penggunaAktif.id,
      wargaTujuanId: wargaTujuan,
      jadwalAsalId: asalId,
      jadwalTujuanId: tujuanId,
      alasan,
    });
    if (!res.ok) {
      setMengirim(false);
      setKonfirmasi(false);
      setGalat({ umum: res.pesan ?? "Pengajuan gagal." });
      tampilkanToast(res.pesan ?? "Pengajuan gagal.", "galat");
      return;
    }
    tampilkanToast("Pengajuan pertukaran terkirim. Menunggu tanggapan warga tujuan.");
    // Langsung pindah ke daftar pertukaran agar tidak ada kesempatan mengirim ulang.
    router.push("/warga/pertukaran");
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/warga/pertukaran" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5">
            <path d="M11 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Pertukaran Jadwal
        </Link>
        <h1 className="mt-1.5 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Ajukan pertukaran jadwal</h1>
        <p className="mt-1 text-[13px] text-muted">
          Pilih jadwal Anda, lalu pilih jadwal tujuan. Nama warga yang bertugas pada jadwal itu akan tampil di bawahnya, dialah yang menerima permintaan Anda.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (validasi()) setKonfirmasi(true);
            }}
            noValidate
          >
            <Field id="jadwal-asal" label="Jadwal Anda yang ingin ditukar" wajib galat={galat.asal}>
              <Select
                id="jadwal-asal"
                value={asalId}
                onChange={(e) => {
                  setAsalId(e.target.value);
                  setTujuanId("");
                }}
              >
                <option value="">Pilih jadwal</option>
                {jadwalSaya.map(({ jadwal }) => (
                  <option key={jadwal.id} value={jadwal.id}>
                    {formatTanggalPendek(jadwal.tanggal, false)} · {jadwal.waktuMulai}–{jadwal.waktuSelesai}
                  </option>
                ))}
              </Select>
            </Field>
            {jadwalSaya.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3.5 py-3 text-[12.5px] text-muted">
                Anda belum punya jadwal ronda, jadi belum ada yang bisa ditukar.
              </p>
            ) : null}

            <Field id="jadwal-tujuan" label="Jadwal tujuan pertukaran" wajib galat={galat.tujuan} petunjuk="jadwal milik warga lain">
              <Select
                id="jadwal-tujuan"
                value={tujuanId}
                onChange={(e) => {
                  setTujuanId(e.target.value);
                  setWargaTujuanId("");
                  setGalat((g) => ({ ...g, tujuan: "", wargaTujuan: "" }));
                }}
                galat={galat.tujuan}
              >
                <option value="">Pilih jadwal tujuan</option>
                {kandidatTujuan.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatTanggalPendek(j.tanggal, false)} · {j.waktuMulai}–{j.waktuSelesai}
                    {j.status === "draft" ? " (draft)" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              id="warga-tujuan"
              label="Tukar dengan warga"
              wajib
              galat={galat.wargaTujuan}
              petunjuk={
                tujuan
                  ? `${petugasTujuan.length} warga bertugas pada jadwal ini — pilih salah satu`
                  : "pilih jadwal tujuan terlebih dahulu"
              }
            >
              <Select
                id="warga-tujuan"
                value={wargaTujuan}
                onChange={(e) => setWargaTujuanId(e.target.value)}
                galat={galat.wargaTujuan}
                disabled={!tujuan || petugasTujuan.length === 0}
              >
                <option value="">
                  {!tujuan
                    ? "Pilih jadwal tujuan dulu"
                    : petugasTujuan.length === 0
                      ? "Tidak ada warga yang bisa dipilih"
                      : "Pilih nama warga"}
                </option>
                {petugasTujuan.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} · {p.noHp}
                  </option>
                ))}
              </Select>
              {tujuan && petugasTujuan.length === 0 ? (
                <p className="mt-2 rounded-lg border border-[#f0dcbb] bg-attention-soft px-3.5 py-2.5 text-[12.5px] text-attention">
                  Tidak ada warga lain yang bertugas pada jadwal ini. Pilih jadwal tujuan lain.
                </p>
              ) : null}
              {wargaTujuan ? (
                <div className="mt-2 rounded-lg border border-brand-line bg-brand-soft px-3.5 py-2.5">
                  <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-brand">Permintaan akan dikirim ke</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-ink">
                    {petugasTujuan.find((p) => p.id === wargaTujuan)?.nama}
                  </p>
                  <p className="text-[12.5px] text-[#41504a]">
                    {petugasTujuan.find((p) => p.id === wargaTujuan)?.noHp}
                  </p>
                </div>
              ) : null}
            </Field>

            <Field
              id="alasan-tukar"
              label="Alasan pertukaran"
              wajib
              galat={galat.alasan}
              petunjuk="dilihat warga tujuan dan Ketua RT"
            >
              <Textarea
                id="alasan-tukar"
                value={alasan}
                galat={galat.alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Contoh: ada acara keluarga di luar kota pada tanggal tersebut."
              />
            </Field>
            <p className="text-[12px] text-muted">{alasan.trim().length}/10 karakter minimum</p>

            {galat.umum ? (
              <p role="alert" className="rounded-lg border border-[#f2cfcc] bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger">
                {galat.umum}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <ButtonLink href="/warga/pertukaran" varian="tautan">Batal</ButtonLink>
              <Button type="submit" varian="utama" disabled={mengirim}>
              {mengirim ? "Mengirim…" : "Kirim pengajuan"}
            </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="bg-[#fbfcfa]">
            <CardHeader judul="Ringkasan pengajuan" />
            <dl className="mt-2.5 space-y-2 text-[12.5px]">
              <div>
                <dt className="text-muted">Jadwal asal</dt>
                <dd className="text-ink">
                  {asal ? `${formatTanggalPendek(asal.tanggal)} · ${asal.waktuMulai}–${asal.waktuSelesai}` : "Belum dipilih"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Jadwal tujuan</dt>
                <dd className="text-ink">
                  {tujuan ? `${formatTanggalPendek(tujuan.tanggal)} · ${tujuan.waktuMulai}–${tujuan.waktuSelesai}` : "Belum dipilih"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Warga tujuan</dt>
                <dd className="text-ink">{wargaTujuan ? namaWarga(state, wargaTujuan) : "—"}</dd>
              </div>
            </dl>
          </Card>
          <Card className="bg-[#fbfcfa]">
            <p className="text-[12.5px] font-medium text-ink">Alur persetujuan</p>
            <ol className="mt-2 space-y-1.5 text-[12px] leading-4 text-muted">
              <li>1. Pengajuan dikirim ke warga tujuan.</li>
              <li>2. Warga tujuan menyetujui atau menolak.</li>
              <li>3. Ketua RT memvalidasi. Jadwal diperbarui setelah validasi.</li>
            </ol>
          </Card>
        </div>
      </div>

      <Dialog
        buka={konfirmasi}
        onTutup={() => setKonfirmasi(false)}
        judul="Kirim pengajuan pertukaran?"
        deskripsi={`Permintaan dikirim ke ${namaWarga(state, wargaTujuan) || "warga tujuan"}. Setelah disetujui, Ketua RT masih perlu memvalidasi.`}
        aksi={
          <>
            <Button onClick={() => setKonfirmasi(false)} disabled={mengirim}>
              Periksa lagi
            </Button>
            <Button varian="utama" onClick={kirim} disabled={mengirim}>
              {mengirim ? "Mengirim…" : "Ya, kirim"}
            </Button>
          </>
        }
      />
    </div>
  );
}

export function DetailPertukaranWarga({ id }: { id: string }) {
  const { state, penggunaAktif, tanggapiPertukaran, batalkanPertukaran, tampilkanToast } = useDemo();
  const [aksi, setAksi] = useState<null | "setuju" | "tolak" | "batal">(null);
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState("");

  const p = state.pertukaran.find((x) => x.id === id);
  if (!p) {
    return (
      <div className="space-y-4">
        <Link href="/warga/pertukaran" className="text-[12.5px] text-muted hover:text-ink">← Pertukaran Jadwal</Link>
        <EmptyState
          ikon="swap"
          judul="Pengajuan tidak ditemukan"
          deskripsi="Pengajuan ini tidak ditemukan atau sudah dihapus."
          aksi={<ButtonLink href="/warga/pertukaran" ukuran="sm" varian="utama">Kembali</ButtonLink>}
        />
      </div>
    );
  }

  const asal = state.jadwal.find((j) => j.id === p.jadwalAsalId);
  const tujuan = state.jadwal.find((j) => j.id === p.jadwalTujuanId);
  const sayaTujuan = p.wargaTujuanId === penggunaAktif.id;
  const bisaTanggapi = sayaTujuan && p.status === "menunggu-warga";
  const bisaBatal = p.pemohonId === penggunaAktif.id && p.status === "menunggu-warga";

  return (
    <div className="space-y-4">
      <Link href="/warga/pertukaran" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
        <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5">
          <path d="M11 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Pertukaran Jadwal
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Pengajuan {p.id}</h1>
          <StatusPertukaranBadge status={p.status} />
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {namaWarga(state, p.pemohonId)} ↔ {namaWarga(state, p.wargaTujuanId)} · diajukan{" "}
          {p.diajukanPada.replace("T", " ").replace(":", ".")} WIB
        </p>
      </div>

      <Card>
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Jadwal Anda</p>
            <p className="mt-1 text-[13.5px] font-semibold text-ink">{asal ? formatTanggalPendek(asal.tanggal) : "—"}</p>
            <p className="text-[12px] text-muted">{asal ? `${asal.waktuMulai} – ${asal.waktuSelesai} WIB` : ""}</p>
            <p className="mt-2 border-t border-line pt-2 text-[12.5px] text-ink">{namaWarga(state, p.pemohonId)}</p>
          </div>
          <div className="flex items-center justify-center text-muted">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 rotate-90 sm:rotate-0">
              <path d="M4 12h14l-4-4M20 12H6l4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Jadwal tujuan</p>
            <p className="mt-1 text-[13.5px] font-semibold text-ink">{tujuan ? formatTanggalPendek(tujuan.tanggal) : "—"}</p>
            <p className="text-[12px] text-muted">{tujuan ? `${tujuan.waktuMulai} – ${tujuan.waktuSelesai} WIB` : ""}</p>
            <p className="mt-2 border-t border-line pt-2 text-[12.5px] text-ink">{namaWarga(state, p.wargaTujuanId)}</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted">Alasan</p>
          <p className="mt-1 text-[13px] leading-5 text-ink">“{p.alasan}”</p>
        </div>
      </Card>

      {p.status === "ditolak" && p.alasanPenolakan ? (
        <Card className="border-[#f2cfcc] bg-danger-soft/50">
          <p className="text-[13px] font-semibold text-danger">
            Permohonan ditolak {p.ditolakOleh === "ketua" ? "Ketua RT" : "warga tujuan"}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#6d2a2a]">{p.alasanPenolakan}</p>
        </Card>
      ) : null}

      {bisaTanggapi ? (
        <Card>
          <CardHeader
            judul="Permintaan menunggu tanggapan Anda"
            keterangan="Bila Anda setuju, jadwal akan diteruskan ke Ketua RT untuk validasi. Bila menolak, sertakan alasan."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button varian="utama" onClick={() => setAksi("setuju")}>Setujui pertukaran</Button>
            <Button varian="bahaya" onClick={() => setAksi("tolak")}>Tolak permintaan</Button>
          </div>
        </Card>
      ) : (
        <Card className="bg-[#fbfcfa]">
          <p className="text-[12.5px] leading-5 text-muted">
            {p.status === "menunggu-warga"
              ? sayaTujuan
                ? "Anda perlu menanggapi permintaan ini."
                : `Menunggu tanggapan ${namaWarga(state, p.wargaTujuanId)}.`
              : p.status === "menunggu-validasi"
                ? "Kedua warga sudah setuju. Menunggu validasi Ketua RT."
                : p.status === "disetujui"
                  ? "Pertukaran disetujui. Jadwal sudah diperbarui."
                  : "Permohonan sudah selesai diproses."}
          </p>
          {bisaBatal ? (
            <Button varian="bahaya" className="mt-3" onClick={() => setAksi("batal")}>
              Batalkan pengajuan
            </Button>
          ) : null}
        </Card>
      )}

      <Dialog
        buka={aksi === "setuju"}
        onTutup={() => setAksi(null)}
        judul="Setujui pertukaran?"
        deskripsi={`Anda akan bertugas pada ${asal ? formatTanggalPendek(asal.tanggal, false) : "jadwal asal"}, dan ${namaWarga(state, p.pemohonId)} pada ${tujuan ? formatTanggalPendek(tujuan.tanggal, false) : "jadwal tujuan"}. Permohonan tetap menunggu validasi Ketua RT.`}
        aksi={
          <>
            <Button onClick={() => setAksi(null)}>Batal</Button>
            <Button
              varian="utama"
              onClick={() => {
                void tanggapiPertukaran(p.id, true);
                setAksi(null);
                tampilkanToast("Anda menyetujui pertukaran. Menunggu validasi Ketua RT.");
              }}
            >
              Ya, setujui
            </Button>
          </>
        }
      />

      <Dialog
        buka={aksi === "tolak"}
        onTutup={() => {
          setAksi(null);
          setGalat("");
        }}
        judul="Tolak permintaan pertukaran?"
        deskripsi="Alasan penolakan wajib diisi agar pemohon memahami keputusan Anda."
        aksi={
          <>
            <Button onClick={() => { setAksi(null); setGalat(""); }}>Batal</Button>
            <Button
              varian="bahaya"
              onClick={() => {
                if (alasan.trim().length < 10) {
                  setGalat("Alasan penolakan minimal 10 karakter.");
                  return;
                }
                void tanggapiPertukaran(p.id, false, alasan);
                setAksi(null);
                setAlasan("");
                setGalat("");
                tampilkanToast("Permintaan ditolak. Alasan dikirim ke pemohon.");
              }}
            >
              Ya, tolak
            </Button>
          </>
        }
      >
        <Field id="alasan-tolak-warga" label="Alasan penolakan" wajib galat={galat}>
          <Textarea
            id="alasan-tolak-warga"
            value={alasan}
            galat={galat}
            onChange={(e) => {
              setAlasan(e.target.value);
              setGalat("");
            }}
            placeholder="Contoh: saya juga berhalangan pada tanggal tersebut."
          />
        </Field>
      </Dialog>

      <Dialog
        buka={aksi === "batal"}
        onTutup={() => setAksi(null)}
        judul="Batalkan pengajuan?"
        deskripsi="Pengajuan akan ditarik dari warga tujuan. Anda dapat mengajukan ulang kapan saja."
        aksi={
          <>
            <Button onClick={() => setAksi(null)}>Tidak, kembali</Button>
            <Button
              varian="bahaya"
              onClick={() => {
                batalkanPertukaran(p.id);
                setAksi(null);
                tampilkanToast("Pengajuan dibatalkan.");
              }}
            >
              Ya, batalkan
            </Button>
          </>
        }
      />
    </div>
  );
}
