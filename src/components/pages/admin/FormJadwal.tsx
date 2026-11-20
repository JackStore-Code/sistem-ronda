"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { TODAY, formatTanggalPendek, hariFromIso, petugasForSchedule } from "@/lib/format";

export function FormJadwal({ jadwalId }: { jadwalId?: string }) {
  const { state, simpanJadwal, publikasikanJadwal, tampilkanToast, wargaAktif } = useDemo();
  const router = useRouter();
  const jadwal = jadwalId ? state.jadwal.find((j) => j.id === jadwalId) : undefined;
  const sudahAda = jadwalId ? Boolean(jadwal) : true;

  const [tanggal, setTanggal] = useState(jadwal?.tanggal ?? TODAY);
  const [mulai, setMulai] = useState(jadwal?.waktuMulai ?? "22.00");
  const [selesai, setSelesai] = useState(jadwal?.waktuSelesai ?? "02.00");
  const [lokasi, setLokasi] = useState(jadwal?.lokasi ?? "Pos ronda RT 05");
  const [petugas, setPetugas] = useState<string[]>(
    jadwal ? petugasForSchedule(state, jadwal.id).map((p) => p.warga.id) : [],
  );
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [konfirmasi, setKonfirmasi] = useState<null | "draf" | "publikasi">(null);

  if (!sudahAda) {
    return (
      <div className="space-y-4">
        <h1 className="text-[22px] font-semibold text-ink">Jadwal tidak ditemukan</h1>
        <p className="text-[13px] text-muted">Jadwal dengan ID {jadwalId} tidak ada pada data demo.</p>
        <ButtonLink href="/admin/jadwal" varian="utama">Kembali ke daftar jadwal</ButtonLink>
      </div>
    );
  }

  const jumlahMinimum = 2;

  function validasi(draf = false): boolean {
    const g: Record<string, string> = {};
    if (!tanggal) g.tanggal = "Tanggal ronda wajib diisi.";
    if (!mulai.trim()) g.mulai = "Waktu mulai wajib diisi.";
    if (!selesai.trim()) g.selesai = "Waktu selesai wajib diisi.";
    if (mulai && selesai && mulai === selesai) g.selesai = "Waktu selesai harus berbeda dari waktu mulai.";
    if (petugas.length < jumlahMinimum) g.petugas = `Pilih minimal ${jumlahMinimum} warga yang bertugas.`;
    const bentrok = state.jadwal.find((j) => j.tanggal === tanggal && j.id !== jadwalId);
    if (bentrok) g.tanggal = "Sudah ada jadwal pada tanggal ini. Pilih tanggal lain atau edit jadwal tersebut.";
    setGalat(g);
    // Checklist petugas berada di luar elemen <Field>, jadi pesannya perlu diumumkan
    // lewat toast agar pengguna tidak melewatkannya di layar kecil.
    if (g.petugas && !draf) tampilkanToast(g.petugas, "galat");
    return Object.keys(g).length === 0;
  }

  function simpan(mode: "draf" | "publikasi") {
    if (!validasi()) return;
    const res = simpanJadwal({
      id: jadwalId,
      tanggal,
      waktuMulai: mulai,
      waktuSelesai: selesai,
      petugasIds: petugas,
      publikasikan: mode === "publikasi",
    });
    if (!res.ok) {
      tampilkanToast(res.pesan ?? "Jadwal gagal disimpan.", "galat");
      return;
    }
    if (mode === "publikasi" && res.id) {
      // simpanJadwal sudah menandai publikasi; pengingat dikirim oleh publikasikanJadwal bila perlu
      tampilkanToast("Jadwal disimpan dan dipublikasikan ke petugas.");
    } else {
      tampilkanToast("Jadwal disimpan sebagai draft. Warga belum melihat jadwal ini.");
    }
    router.push("/admin/jadwal");
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/jadwal" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5">
            <path d="M11 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Jadwal Ronda
        </Link>
        <h1 className="mt-1.5 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
          {jadwalId ? "Edit jadwal ronda" : "Buat jadwal ronda"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Tentukan tanggal, waktu, dan warga yang bertugas. Simpan sebagai draft atau langsung publikasikan.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card>
          <CardHeader judul="Detail jadwal" keterangan="Waktu ronda menggunakan WIB." />
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (validasi()) setKonfirmasi("draf");
            }}
            noValidate
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="tanggal" label="Tanggal ronda" wajib galat={galat.tanggal}>
                <Input
                  id="tanggal"
                  type="date"
                  value={tanggal}
                  galat={galat.tanggal}
                  onChange={(e) => {
                    setTanggal(e.target.value);
                    setGalat((g) => ({ ...g, tanggal: "" }));
                  }}
                />
              </Field>
              <Field id="lokasi" label="Lokasi / keterangan">
                <Input id="lokasi" value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Pos ronda RT 05" />
              </Field>
              <Field id="mulai" label="Waktu mulai" wajib galat={galat.mulai}>
                <Input
                  id="mulai"
                  type="time"
                  value={mulai.replace(".", ":")}
                  galat={galat.mulai}
                  onChange={(e) => setMulai(e.target.value.replace(":", "."))}
                />
              </Field>
              <Field id="selesai" label="Waktu selesai" wajib galat={galat.selesai}>
                <Input
                  id="selesai"
                  type="time"
                  value={selesai.replace(".", ":")}
                  galat={galat.selesai}
                  onChange={(e) => setSelesai(e.target.value.replace(":", "."))}
                />
              </Field>
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-medium text-ink">
                  Warga bertugas <span className="text-danger" aria-hidden>*</span>
                </p>
                <p className="text-[12px] text-muted">
                  {petugas.length} dipilih · minimal {jumlahMinimum}
                </p>
              </div>
              {galat.petugas ? (
                <p className="mb-2 text-[12px] text-danger">{galat.petugas}</p>
              ) : null}
              <div className="grid gap-1.5 sm:grid-cols-2">
                {wargaAktif.map((w) => (
                  <Checkbox
                    key={w.id}
                    id={`petugas-${w.id}`}
                    label={w.nama}
                    deskripsi={`${w.username} · ${w.noHp}`}
                    checked={petugas.includes(w.id)}
                    onChange={(e) => {
                      setPetugas((prev) =>
                        e.target.checked ? [...prev, w.id] : prev.filter((id) => id !== w.id),
                      );
                      setGalat((g) => ({ ...g, petugas: "" }));
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <ButtonLink href="/admin/jadwal" varian="tautan">Batal</ButtonLink>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" varian="sekunder">Simpan sebagai draft</Button>
                <Button
                  type="button"
                  varian="utama"
                  onClick={() => {
                    if (validasi()) setKonfirmasi("publikasi");
                  }}
                >
                  Simpan & publikasikan
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          <Card>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Pratinjau</p>
            <p className="mt-2 text-[15px] font-semibold text-ink">{formatTanggalPendek(tanggal)}</p>
            <p className="text-[12.5px] text-muted">
              {hariFromIso(tanggal)} · {mulai} – {selesai} WIB
            </p>
            <p className="mt-1 text-[12.5px] text-muted">{lokasi || "Lokasi belum diisi"}</p>
            <div className="mt-3">
              <Badge nada={jadwal?.status === "dipublikasikan" ? "brand" : "neutral"}>
                {jadwal?.status === "dipublikasikan" ? "Saat ini dipublikasikan" : "Akan menjadi draft"}
              </Badge>
            </div>
            <ul className="mt-3 space-y-1">
              {petugas.length === 0 ? (
                <li className="text-[12.5px] text-muted">Belum ada petugas dipilih.</li>
              ) : (
                petugas.map((id) => (
                  <li key={id} className="flex items-center gap-1.5 text-[13px] text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {state.pengguna.find((p) => p.id === id)?.nama}
                  </li>
                ))
              )}
            </ul>
          </Card>
          <Card className="bg-[#fbfcfa]">
            <p className="text-[12.5px] font-medium text-ink">Apa bedanya draft dan dipublikasikan?</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-4 text-muted">
              <li>• Draft: hanya terlihat Ketua RT, tidak mengirim pengingat.</li>
              <li>• Dipublikasikan: terlihat warga yang bertugas dan pengingat otomatis terkirim.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Dialog
        buka={konfirmasi !== null}
        onTutup={() => setKonfirmasi(null)}
        judul={konfirmasi === "publikasi" ? "Publikasikan jadwal ini?" : "Simpan sebagai draft?"}
        deskripsi={
          konfirmasi === "publikasi"
            ? "Warga yang bertugas akan menerima notifikasi dan pengingat otomatis."
            : "Draft hanya dapat dilihat Ketua RT. Anda dapat mempublikasikannya nanti."
        }
        aksi={
          <>
            <Button onClick={() => setKonfirmasi(null)}>Batal</Button>
            <Button
              varian="utama"
              onClick={() => {
                const mode = konfirmasi ?? "draf";
                setKonfirmasi(null);
                simpan(mode);
              }}
            >
              {konfirmasi === "publikasi" ? "Ya, publikasikan" : "Ya, simpan draft"}
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3 text-[13px]">
          <p className="font-semibold text-ink">{formatTanggalPendek(tanggal)}</p>
          <p className="text-[12.5px] text-muted">
            {mulai} – {selesai} WIB · {petugas.length} petugas
          </p>
        </div>
      </Dialog>
    </div>
  );
}
