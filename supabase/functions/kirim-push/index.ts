// Edge Function: mengirim Web Push ke semua perangkat warga untuk satu notifikasi.
//
// Dipanggil otomatis oleh trigger database setiap ada baris baru di tabel
// "notifikasi". Bukan dipanggil dari aplikasi, jadi tidak perlu login pengguna;
// keamanannya memakai rahasia bersama (x-webhook-secret).
//
// Deploy: Supabase Dashboard > Edge Functions > New function > nama "kirim-push",
// lalu tempel isi file ini. Aktifkan "Verify JWT" = OFF.
//
// Secret yang diperlukan (Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   PUSH_WEBHOOK_SECRET   (sama dengan yang diisi di SQL)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const RAHASIA = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type Muatan = {
  judul: string;
  pesan: string;
  penerima?: string | null;
  tautan?: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, pesan: "Gunakan POST" }), { status: 405 });
  }
  // Rahasia bersama: mencegah orang luar memicu pengiriman push.
  if (!RAHASIA || req.headers.get("x-webhook-secret") !== RAHASIA) {
    return new Response(JSON.stringify({ ok: false, pesan: "Rahasia tidak cocok" }), { status: 401 });
  }

  let muatan: Muatan;
  try {
    muatan = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, pesan: "Body bukan JSON" }), { status: 400 });
  }
  if (!muatan?.judul) {
    return new Response(JSON.stringify({ ok: false, pesan: "Judul wajib ada" }), { status: 400 });
  }

  // Ambil perangkat tujuan: milik penerima tertentu, atau SEMUA warga bila
  // notifikasi ditujukan untuk semua (penerima null).
  let kueri = supabase.from("langganan_push").select("endpoint, p256dh, auth");
  if (muatan.penerima) {
    kueri = kueri.eq("pengguna_id", muatan.penerima);
  }
  const { data: langganan, error } = await kueri;
  if (error) {
    return new Response(JSON.stringify({ ok: false, pesan: error.message }), { status: 500 });
  }
  if (!langganan || langganan.length === 0) {
    return new Response(JSON.stringify({ ok: true, terkirim: 0, catatan: "Belum ada perangkat berlangganan" }));
  }

  const isi = JSON.stringify({
    judul: muatan.judul,
    pesan: muatan.pesan,
    tautan: muatan.tautan ?? "/",
  });

  let terkirim = 0;
  const kedaluwarsa: string[] = [];

  await Promise.all(
    langganan.map(async (l) => {
      try {
        await webpush.sendNotification(
          { endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } },
          isi,
          { TTL: 60 * 60 * 12 },
        );
        terkirim += 1;
      } catch (e) {
        // 404/410 berarti perangkat sudah tidak berlangganan (aplikasi dihapus,
        // izin dicabut). Hapus agar tidak dicoba terus.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) kedaluwarsa.push(l.endpoint);
      }
    }),
  );

  if (kedaluwarsa.length > 0) {
    await supabase.from("langganan_push").delete().in("endpoint", kedaluwarsa);
  }

  return new Response(
    JSON.stringify({ ok: true, total: langganan.length, terkirim, dibersihkan: kedaluwarsa.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
