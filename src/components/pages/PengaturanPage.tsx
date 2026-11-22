"use client";

import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatJam } from "@/lib/format";

/** Halaman pengaturan: identitas & sesi untuk semua; ringkasan data khusus Ketua RT. */
export function PengaturanPage() {
  const { state, penggunaAktif, keluarSesi } = useDemo();
  const isKetua = penggunaAktif.role === "ketua";

  function keluar() {
    keluarSesi();
    window.location.replace("/login");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Pengaturan</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Akun &amp; data</h1>
        <p className="mt-1 text-[13px] text-muted">
          Kelola identitas akun yang sedang masuk dan data yang tersimpan.
        </p>
      </div>


      <Card>
        <CardHeader judul="Identitas" />
        <dl className="mt-3 divide-y divide-line text-[13px]">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Nama</dt>
            <dd className="text-right font-medium text-ink">{penggunaAktif.nama}</dd>
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
          judul="Sesi"
          keterangan="Akun Ketua RT dan akun warga terpisah. Untuk memakai akun lain, keluar lalu masuk lewat halaman login."
        />
        <Button varian="sekunder" className="mt-3" onClick={keluar}>
          Keluar dari akun ini
        </Button>
      </Card>

      {isKetua ? (
      <Card>
        <CardHeader judul="Ringkasan data" keterangan="Jumlah data yang tersimpan saat ini. Hanya terlihat oleh Ketua RT." />
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
      ) : null}
    </div>
  );
}
