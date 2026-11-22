import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true bila variabel lingkungan Supabase sudah diisi. */
export const supabaseSiap = Boolean(url && anonKey);

if (!supabaseSiap && typeof window !== "undefined") {
  // Jangan hentikan halaman; cukup beri jejak di konsol agar mudah didiagnosis.
  console.warn("Supabase belum dikonfigurasi: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY kosong.");
}

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "public-anon-key", {
  auth: { persistSession: false },
});

/** Nama tabel di database. */
export const TABEL = {
  pengguna: "pengguna",
  jadwal: "jadwal",
  detailJadwal: "detail_jadwal",
  pertukaran: "pertukaran",
  notifikasi: "notifikasi",
  aktivitas: "aktivitas",
} as const;

const KUNCI_SESI = "ronda-sesi";

/** Token sesi dari fungsi login() di database, disimpan di peramban. */
export function simpanSesi(token: string, penggunaId: string, nama: string, role: string) {
  window.localStorage.setItem(KUNCI_SESI, JSON.stringify({ token, penggunaId, nama, role }));
}

export function bacaSesi(): { token: string; penggunaId: string; nama: string; role: string } | null {
  try {
    const raw = window.localStorage.getItem(KUNCI_SESI);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hapusSesi() {
  window.localStorage.removeItem(KUNCI_SESI);
}

/** Panggil fungsi database (RPC) dan lempar pesan galat yang ramah. */
export async function rpc<T = unknown>(nama: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nama, args);
  if (error) throw new Error(pesanGalat(error.message));
  return data as T;
}

/** Menerjemahkan pesan galat Postgres menjadi kalimat Indonesia yang jelas. */
export function pesanGalat(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("nama lengkap atau kata sandi")) return "Nama lengkap atau kata sandi tidak cocok.";
  if (p.includes("sesi tidak valid")) return "Sesi sudah berakhir. Silakan masuk ulang.";
  if (p.includes("hanya ketua rt")) return "Tindakan ini hanya bisa dilakukan Ketua RT.";
  if (p.includes("hanya warga tujuan")) return "Hanya warga tujuan yang dapat menanggapi permohonan ini.";
  if (p.includes("sudah ditanggapi")) return "Permohonan ini sudah ditanggapi.";
  if (p.includes("belum siap divalidasi")) return "Permohonan belum siap divalidasi.";
  if (p.includes("sudah berubah")) return "Petugas pada jadwal ini sudah berubah. Periksa kembali jadwal kedua warga.";
  if (p.includes("alasan pertukaran")) return "Alasan pertukaran wajib diisi (minimal 10 karakter).";
  if (p.includes("duplicate key") && p.includes("tanggal")) return "Sudah ada jadwal pada tanggal tersebut.";
  if (p.includes("invalid api key") || p.includes("permission denied"))
    return "Akses database belum diatur. Jalankan berkas SQL izin di Supabase.";
  if (p.includes("fetch failed") || p.includes("networkerror")) return "Tidak dapat menghubungi server. Periksa koneksi internet.";
  return pesan;
}
