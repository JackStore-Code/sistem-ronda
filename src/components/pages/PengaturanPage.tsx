"use client";

import { useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Dialog } from "@/components/ui/Dialog";
import { formatJam } from "@/lib/format";

/** Halaman pengaturan bersama kedua peran: identitas, peran, dan reset data demo. */
export function PengaturanPage() {
  const { state, penggunaAktif, gantiPeran, pilihPengguna, reset, tampilkanToast } = useDemo();
  const [konfirmasiReset, setKonfirmasiReset] = useState(false);
  const isKetua = penggunaAktif.role === "ketua";
  const daftarWarga = state.pengguna.filter((p) => p.role === "warga" && p.statusAkun === "aktif");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Pengaturan</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Akun &amp; data demo</h1>
        <p className="mt-1 text-[13px] text-muted">
          Atur peran pratinjau dan kelola data yang tersimpan di peramban ini.
        </p>
      </div>

      <DemoNotice />

      <Card>
        <CardHeader judul="Identitas" keterangan="Data contoh — bukan data warga sungguhan." />
        <dl className="mt-3 divide-y divide-line text-[13px]">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Nama</dt>
            <dd className="text-right font-medium text-ink">{penggunaAktif.nama}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Nama pengguna</dt>
            <dd className="text-right font-medium text-ink">{penggunaAktif.username}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Nomor HP</dt>
            <dd className="text-right font-medium text-ink">{penggunaAktif.noHp}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Peran</dt>
            <dd className="text-right">
              <Badge nada={isKetua ? "brand" : "neutral"}>{isKetua ? "Ketua RT" : "Warga"}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader
          judul="Pratinjau peran"
          keterangan="Beralih peran untuk memeriksa tampilan Ketua RT dan warga. Tidak ada kata sandi pada mode demo."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button varian={isKetua ? "utama" : "sekunder"} onClick={() => gantiPeran("ketua")}>
            Masuk sebagai Ketua RT
          </Button>
          <Button varian={isKetua ? "sekunder" : "utama"} onClick={() => gantiPeran("warga")}>
            Masuk sebagai warga
          </Button>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <label htmlFor="pilih-warga" className="mb-1.5 block text-[13px] font-medium text-ink">
            Warga yang sedang dipakai
          </label>
          <select
            id="pilih-warga"
            value={penggunaAktif.id}
            onChange={(e) => pilihPengguna(e.target.value)}
            className="h-10 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          >
            <option value={state.pengguna.find((p) => p.role === "ketua")?.id ?? ""}>
              {state.pengguna.find((p) => p.role === "ketua")?.nama ?? "Ketua RT"} (Ketua RT)
            </option>
            {daftarWarga.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nama} (@{w.username})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] leading-4 text-muted">
            Berguna untuk memperagakan alur dua sisi: ajukan pertukaran sebagai satu warga, lalu tanggapi sebagai warga
            tujuan.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader judul="Data demo" keterangan="Ringkasan isi data yang tersimpan di peramban Anda." />
        <ul className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
          {[
            ["Jadwal", state.jadwal.length],
            ["Warga", state.pengguna.filter((p) => p.role === "warga").length],
            ["Pertukaran", state.pertukaran.length],
            ["Notifikasi", state.notifikasi.length],
          ].map(([label, jumlah]) => (
            <li key={String(label)} className="rounded-lg border border-line bg-[#fbfcfa] px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.05em] text-muted">{label}</p>
              <p className="text-[15px] font-semibold text-ink">{jumlah}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-4 text-muted">
          Ronda dimulai pukul {formatJam(state.jadwal[0]?.waktuMulai ?? "22:00")} WIB dan berakhir pukul{" "}
          {formatJam(state.jadwal[0]?.waktuSelesai ?? "02:00")} WIB, kecuali ditentukan lain oleh Ketua RT.
        </p>
      </Card>

      <Card className="border-[#f2cfcc]">
        <CardHeader
          judul="Kembalikan data contoh"
          keterangan="Menghapus semua perubahan pada peramban ini dan memuat ulang data demo awal."
        />
        <Button varian="bahaya" className="mt-3" onClick={() => setKonfirmasiReset(true)}>
          Reset data demo
        </Button>
      </Card>

      <Dialog
        buka={konfirmasiReset}
        onTutup={() => setKonfirmasiReset(false)}
        judul="Reset seluruh data demo?"
        deskripsi="Jadwal, kehadiran, pertukaran, dan notifikasi yang Anda ubah akan dikembalikan ke data contoh awal. Tindakan ini tidak dapat dibatalkan."
        aksi={
          <>
            <Button onClick={() => setKonfirmasiReset(false)}>Batal</Button>
            <Button
              varian="bahaya"
              onClick={() => {
                reset();
                setKonfirmasiReset(false);
                tampilkanToast("Data demo dikembalikan ke kondisi awal.");
              }}
            >
              Ya, reset
            </Button>
          </>
        }
      />
    </div>
  );
}
