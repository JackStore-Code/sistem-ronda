"use client";

import { useEffect, useRef } from "react";
import { useDemo } from "@/components/providers/DemoProvider";

/**
 * Pemberitahuan langsung di pojok layar begitu ada notifikasi baru masuk
 * (lewat realtime Supabase). Tidak perlu memuat ulang halaman.
 */
export function NotifikasiLangsung() {
  const { state, penggunaAktif, tampilkanToast } = useDemo();
  const sudahTerlihat = useRef<Set<string>>(new Set());
  const awalSelesai = useRef(false);
  // Saat berganti akun, penanda harus diulang dari nol; kalau tidak, notifikasi
  // milik akun sebelumnya dianggap "sudah terlihat" dan pemberitahuan tidak muncul.
  const penggunaTerakhir = useRef<string>("");

  if (penggunaTerakhir.current !== penggunaAktif.id) {
    penggunaTerakhir.current = penggunaAktif.id;
    sudahTerlihat.current = new Set();
    awalSelesai.current = false;
  }

  useEffect(() => {
    if (!penggunaAktif.id) return;
    const milikSaya = state.notifikasi.filter(
      (n) => !n.penerimaId || n.penerimaId === penggunaAktif.id,
    );

    // Muatan pertama: tandai semua sebagai "sudah terlihat" tanpa memunculkan toast,
    // supaya notifikasi lama tidak menumpuk saat halaman dibuka.
    if (!awalSelesai.current) {
      milikSaya.forEach((n) => sudahTerlihat.current.add(n.id));
      awalSelesai.current = true;
      return;
    }

    const baru = milikSaya.filter((n) => !sudahTerlihat.current.has(n.id) && !n.dibaca);
    if (baru.length === 0) return;
    baru.forEach((n) => sudahTerlihat.current.add(n.id));
    baru
      .sort((a, b) => a.waktu.localeCompare(b.waktu))
      .forEach((n) => tampilkanToast(`${n.judul} — ${n.pesan}`, "sukses"));
  }, [state.notifikasi, penggunaAktif.id, tampilkanToast, state.jadwal]);

  return null;
}
