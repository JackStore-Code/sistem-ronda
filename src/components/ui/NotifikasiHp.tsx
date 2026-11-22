"use client";

import { useCallback, useEffect, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { supabase, pesanGalat } from "@/lib/supabase";
import { VAPID_PUBLIC_KEY as KONFIG_VAPID } from "@/lib/konfigurasi";

type Status =
  | "memuat"
  | "tidak-didukung"
  | "belum"
  | "aktif"
  | "diblokir"
  | "iphone-perlu-pasang";

/** VAPID public key (aman dipublikasikan; kunci rahasianya ada di server). */
const VAPID_PUBLIC = KONFIG_VAPID;

function urlBase64KeUint8(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const mentah = window.atob(b64);
  const buffer = new ArrayBuffer(mentah.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < mentah.length; i += 1) out[i] = mentah.charCodeAt(i);
  return out;
}

/**
 * Kartu "Notifikasi ke HP": mendaftarkan perangkat ini agar menerima notifikasi
 * push (muncul di layar atas HP walau aplikasi ditutup).
 */
export function NotifikasiHp() {
  const { sesiToken, tampilkanToast } = useDemo();
  const [status, setStatus] = useState<Status>("memuat");
  const [memproses, setMemproses] = useState(false);

  const cekStatus = useCallback(async () => {
    if (typeof window === "undefined") return;
    const didukung =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!didukung) {
      // iPhone hanya mendukung push bila aplikasi dipasang ke Layar Utama.
      const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const mandiri =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setStatus(iphone && !mandiri ? "iphone-perlu-pasang" : "tidak-didukung");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("diblokir");
      return;
    }
    const daftar = await navigator.serviceWorker.getRegistration();
    const langganan = await daftar?.pushManager.getSubscription();
    setStatus(langganan ? "aktif" : "belum");
  }, []);

  useEffect(() => {
    void cekStatus();
  }, [cekStatus]);

  async function aktifkan() {
    if (memproses) return;
    if (!VAPID_PUBLIC) {
      tampilkanToast("Kunci notifikasi belum diatur di server.", "galat");
      return;
    }
    setMemproses(true);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setStatus(izin === "denied" ? "diblokir" : "belum");
        tampilkanToast("Izin notifikasi tidak diberikan.", "galat");
        return;
      }

      const daftar = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const langganan =
        (await daftar.pushManager.getSubscription()) ??
        (await daftar.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64KeUint8(VAPID_PUBLIC),
        }));

      const kunci = langganan.toJSON().keys ?? {};
      const { error } = await supabase.rpc("simpan_langganan_push", {
        token_sesi: sesiToken,
        endpoint_baru: langganan.endpoint,
        p256dh_baru: kunci.p256dh ?? "",
        auth_baru: kunci.auth ?? "",
        agent: navigator.userAgent.slice(0, 180),
      });
      if (error) {
        tampilkanToast(pesanGalat(error.message), "galat");
        return;
      }
      setStatus("aktif");
      tampilkanToast("Notifikasi HP aktif. Pengingat ronda akan muncul di layar atas.");
    } catch (e) {
      tampilkanToast(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi.", "galat");
    } finally {
      setMemproses(false);
    }
  }

  async function matikan() {
    setMemproses(true);
    try {
      const daftar = await navigator.serviceWorker.getRegistration();
      const langganan = await daftar?.pushManager.getSubscription();
      if (langganan) {
        await supabase.rpc("hapus_langganan_push", {
          token_sesi: sesiToken,
          endpoint_hapus: langganan.endpoint,
        });
        await langganan.unsubscribe();
      }
      setStatus("belum");
      tampilkanToast("Notifikasi HP dimatikan untuk perangkat ini.");
    } finally {
      setMemproses(false);
    }
  }

  async function ujiKirim() {
    setMemproses(true);
    const { error } = await supabase.rpc("uji_notifikasi_hp", { token_sesi: sesiToken });
    setMemproses(false);
    if (error) {
      tampilkanToast(pesanGalat(error.message), "galat");
      return;
    }
    tampilkanToast("Notifikasi uji dikirim. Cek layar atas HP Anda.");
  }

  return (
    <Card>
      <CardHeader
        judul="Notifikasi ke HP"
        keterangan="Muncul di layar atas HP walau aplikasi sedang ditutup. Cukup diaktifkan sekali per perangkat."
      />

      <div className="mt-3 text-[13px]">
        {status === "memuat" ? (
          <p className="text-muted">Memeriksa dukungan perangkat…</p>
        ) : status === "aktif" ? (
          <p className="rounded-lg border border-brand-line bg-brand-soft px-3.5 py-2.5 font-medium text-brand">
            Aktif di perangkat ini
          </p>
        ) : status === "diblokir" ? (
          <p className="rounded-lg border border-[#f2cfcc] bg-danger-soft px-3.5 py-2.5 text-danger">
            Notifikasi diblokir untuk situs ini. Buka pengaturan situs di browser (ikon gembok di
            address bar) lalu izinkan Notifikasi.
          </p>
        ) : status === "iphone-perlu-pasang" ? (
          <p className="rounded-lg border border-[#f0dcbb] bg-attention-soft px-3.5 py-2.5 text-attention">
            Di iPhone, notifikasi hanya bisa aktif setelah aplikasi dipasang: buka menu Bagikan di
            Safari, pilih “Tambahkan ke Layar Utama”, lalu buka aplikasi dari ikon tersebut.
          </p>
        ) : status === "tidak-didukung" ? (
          <p className="rounded-lg border border-line bg-[#fbfcfa] px-3.5 py-2.5 text-muted">
            Perangkat atau browser ini belum mendukung notifikasi push. Coba Chrome di Android.
          </p>
        ) : (
          <p className="text-muted">
            Notifikasi HP belum aktif. Setelah diaktifkan, pengingat ronda dan keputusan pertukaran
            akan muncul di layar atas HP Anda.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {status === "aktif" ? (
          <>
            <Button varian="sekunder" onClick={ujiKirim} disabled={memproses}>
              Kirim notifikasi uji
            </Button>
            <Button varian="tautan" onClick={matikan} disabled={memproses}>
              Matikan di perangkat ini
            </Button>
          </>
        ) : (
          <Button
            varian="utama"
            onClick={aktifkan}
            disabled={memproses || status === "memuat" || status === "tidak-didukung" || status === "iphone-perlu-pasang"}
          >
            {memproses ? "Mengaktifkan…" : "Aktifkan notifikasi"}
          </Button>
        )}
      </div>
    </Card>
  );
}
