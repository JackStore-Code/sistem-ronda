"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { KategoriBadge } from "@/components/ui/Badges";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { formatJamBerjalan, formatWaktuRelatif } from "@/lib/format";
import type { Notifikasi } from "@/lib/types";

export function NotifikasiPage() {
  const { state, penggunaAktif, tandaiDibaca, tandaiSemuaDibaca } = useDemo();
  const router = useRouter();

  // Jam berjalan: waktu notifikasi diperbarui tiap detik sehingga terlihat realtime.
  const [sekarang, setSekarang] = useState<Date | null>(null);
  useEffect(() => {
    setSekarang(new Date());
    const timer = window.setInterval(() => setSekarang(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const milikSaya = state.notifikasi
    .filter((n) => !n.penerimaId || n.penerimaId === penggunaAktif.id)
    .sort((a, b) => b.waktu.localeCompare(a.waktu));
  const belum = milikSaya.filter((n) => !n.dibaca).length;
  const awalan = penggunaAktif.role === "ketua" ? "/admin" : "/warga";

  function buka(n: Notifikasi) {
    // Hanya notifikasi yang diklik yang ditandai dibaca (bukan semua).
    void tandaiDibaca(n.id);
    if (!n.tautan) return;
    const [target, id] = n.tautan.split("/");
    if (target === "ketua") {
      router.push(`/admin/${id ?? ""}`.replace(/\/$/, ""));
      return;
    }
    if (target === "jadwal" && id) {
      router.push(`${awalan}/jadwal/${id}`);
      return;
    }
    if (target === "pertukaran" && id) {
      router.push(`${awalan}/pertukaran/${id}`);
      return;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Notifikasi</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
            Notifikasi {penggunaAktif.role === "ketua" ? "Ketua RT" : "warga"}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {belum > 0
              ? `${belum} notifikasi belum dibaca — klik satu notifikasi untuk menandainya dibaca`
              : "Semua notifikasi sudah dibaca"}
          </p>
        </div>
        {belum > 0 ? (
          <Button
            varian="sekunder"
            onClick={() => tandaiSemuaDibaca(penggunaAktif.id)}
            title="Menandai seluruh notifikasi sebagai sudah dibaca"
          >
            Tandai semua dibaca
          </Button>
        ) : null}
      </div>


      {milikSaya.length === 0 ? (
        <EmptyState
          ikon="bell"
          judul="Belum ada notifikasi"
          deskripsi="Pengingat ronda dan keputusan pertukaran akan muncul di sini."
        />
      ) : (
        <Card padding={false}>
          <ul className="divide-y divide-line">
            {milikSaya.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => buka(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#fbfcfa] md:px-5 ${
                    n.dibaca ? "" : "bg-brand-soft/40"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.dibaca ? "bg-transparent" : "bg-attention"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`text-[13.5px] ${n.dibaca ? "font-medium text-[#41504a]" : "font-semibold text-ink"}`}>
                        {n.judul}
                      </span>
                      {!n.dibaca ? <span className="text-[11px] font-semibold uppercase tracking-wide text-attention">Baru</span> : null}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-5 text-muted">{n.pesan}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <KategoriBadge kategori={n.kategori} />
                      <span className="text-[11.5px] text-muted" title={n.waktu}>
                        {sekarang ? (
                          <span className="tabular-nums">
                            {formatJamBerjalan(n.waktu, sekarang)} WIB
                            {" · "}
                            <span suppressHydrationWarning>{formatWaktuRelatif(n.waktu, sekarang)}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </span>
                      {sekarang && sekarang.getTime() - new Date(n.waktu).getTime() < 60000 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" aria-hidden />
                          langsung
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <svg aria-hidden viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0 text-muted">
                    <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="px-1 text-[12px] leading-4 text-muted">
        Notifikasi tampil langsung di aplikasi begitu ada kejadian baru (realtime). Pengiriman WhatsApp atau SMS belum aktif.
      </p>
    </div>
  );
}

export function PengaturanPage() {
  const { penggunaAktif, state } = useDemo();
  const router = useRouter();
  const isKetua = penggunaAktif.role === "ketua";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Pengaturan</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Pengaturan akun</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <h2 className="text-[15px] font-semibold text-ink">Profil</h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Nama</dt>
              <dd className="text-ink">{penggunaAktif.nama}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Nama lengkap (login)</dt>
              <dd className="text-right text-ink">{penggunaAktif.nama}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Nomor HP</dt>
              <dd className="text-ink">{penggunaAktif.noHp}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Peran</dt>
              <dd className="text-ink">{isKetua ? "Ketua RT" : "Warga"}</dd>
            </div>
          </dl>
        </Card>

        {isKetua ? (
          <Card>
            <h2 className="text-[15px] font-semibold text-ink">Ringkasan data</h2>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              Jumlah data yang tersimpan saat ini. Hanya terlihat oleh Ketua RT.
            </p>
            <div className="mt-3 rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-3 text-[12.5px] text-muted">
              {state.pengguna.length} pengguna · {state.jadwal.length} jadwal · {state.pertukaran.length} pertukaran ·{" "}
              {state.notifikasi.length} notifikasi
            </div>
          </Card>
        ) : null}
      </div>

      <Link href={isKetua ? "/admin/ringkasan" : "/warga/ringkasan"} className="inline-block text-[12.5px] font-medium text-brand hover:underline">
        ← Kembali ke ringkasan
      </Link>
    </div>
  );
}
