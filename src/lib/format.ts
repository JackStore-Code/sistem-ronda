/** Tanggal "hari ini" versi lokal, dipakai untuk penanda jadwal dan filter periode. */
function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}
export const TODAY = hariIni();
import type {
  Aktivitas,
  DetailJadwal,
  JadwalRonda,
  Notifikasi,
  Pengguna,
  PertukaranJadwal,
  State,
  StatusKehadiran,
  StatusTanggapan,
} from "./types";

export const HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export const LOKASI_RONDA = "Pos ronda RT 05";
export const JAM_MULAI = "22.00";
export const JAM_SELESAI = "02.00";

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function hariFromIso(iso: string): string {
  return HARI[toDate(iso).getDay()];
}

export function hariSingkat(iso: string): string {
  return hariFromIso(iso).slice(0, 3);
}

/** "Kamis, 19 November 2026" */
export function formatTanggalPanjang(iso: string, withYear = true): string {
  const d = toDate(iso);
  const tahun = withYear ? ` ${d.getFullYear()}` : "";
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}${tahun}`;
}

/** "Kamis, 19 Nov 2026" */
export function formatTanggalPendek(iso: string, withYear = true): string {
  const d = toDate(iso);
  const tahun = withYear ? ` ${d.getFullYear()}` : "";
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}${tahun}`;
}

/** "19 Nov" */
export function formatTanggalRingkas(iso: string): string {
  const d = toDate(iso);
  return `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}`;
}

/** "November 2026" */
export function formatBulanTahun(iso: string): string {
  const d = toDate(iso);
  return `${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "19 Nov 2026 · 20.15 WIB" */
/**
 * Waktu lengkap dalam zona waktu perangkat (WIB untuk pengguna di Indonesia).
 * Menerima ISO dengan offset/zona (mis. dari database) maupun tanpa zona.
 */
export function formatWaktuLengkap(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return isoDateTime;
  const jam = `${`${d.getHours()}`.padStart(2, "0")}.${`${d.getMinutes()}`.padStart(2, "0")}`;
  return `${formatTanggalRingkas(ymd(d))} ${d.getFullYear()} · ${jam} WIB`;
}

/**
 * Waktu notifikasi yang berjalan sendiri: "baru saja", "3 menit lalu", dst.,
 * sebagai ganti jam statis. Perlu `sekarang` dari pemanggil agar bisa
 * diperbarui tiap detik.
 */
export function formatWaktuRelatif(isoDateTime: string, sekarang: Date): string {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return "-";
  const detik = Math.max(0, Math.floor((sekarang.getTime() - d.getTime()) / 1000));
  if (detik < 10) return "baru saja";
  if (detik < 60) return `${detik} detik lalu`;
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return formatWaktuLengkap(isoDateTime);
}

/** "14.30" atau "14.30.05" bila baru beberapa menit lalu, untuk penanda realtime. */
export function formatJamBerjalan(isoDateTime: string, sekarang: Date): string {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return "-";
  const jam = `${`${d.getHours()}`.padStart(2, "0")}.${`${d.getMinutes()}`.padStart(2, "0")}`;
  const detikBerlalu = Math.floor((sekarang.getTime() - d.getTime()) / 1000);
  if (detikBerlalu >= 0 && detikBerlalu < 60) {
    return `${jam}.${`${d.getSeconds()}`.padStart(2, "0")}`;
  }
  return jam;
}

export function formatJam(timePart: string): string {
  return timePart.slice(0, 5).replace(":", ".");
}

/** Tambah hari ke ISO date */
export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isSameMonth(a: string, b: string): boolean {
  return toDate(a).getMonth() === toDate(b).getMonth() && toDate(a).getFullYear() === toDate(b).getFullYear();
}

export function namaWarga(state: State, id: string): string {
  return state.pengguna.find((p) => p.id === id)?.nama ?? "Warga";
}

export function namaPanggilan(state: State, id: string): string {
  const n = namaWarga(state, id);
  return n.split(" ")[0];
}

export function petugasForSchedule(state: State, jadwalId: string): { detail: DetailJadwal; warga: Pengguna }[] {
  return state.detailJadwal
    .filter((d) => d.jadwalId === jadwalId)
    .map((detail) => {
      const warga = state.pengguna.find((p) => p.id === detail.wargaId);
      return warga ? { detail, warga } : null;
    })
    .filter((x): x is { detail: DetailJadwal; warga: Pengguna } => x !== null);
}

export function countStatusKehadiran(petugas: { detail: DetailJadwal }[]) {
  const out: Record<StatusKehadiran, number> = {
    hadir: 0,
    "tidak-hadir": 0,
    "belum-dicatat": 0,
  };
  for (const p of petugas) out[p.detail.statusKehadiran] += 1;
  return out;
}

export const LABEL_KEHADIRAN: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  "tidak-hadir": "Tidak hadir",
  "belum-dicatat": "Belum dicatat",
};

export const LABEL_PUBLIKASI = {
  draft: "Draft",
  dipublikasikan: "Dipublikasikan",
} as const;

export const LABEL_STATUS: Record<StatusTanggapan, string> = {
  "menunggu-warga": "Menunggu tanggapan warga tujuan",
  "menunggu-validasi": "Menunggu validasi Ketua RT",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const LABEL_KATEGORI = {
  pertukaran: "Pertukaran jadwal",
  pengingat: "Pengingat otomatis",
  "perubahan-jadwal": "Perubahan jadwal",
} as const;

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export function labelRelatif(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Malam ini";
  if (iso === addDays(todayIso, 1)) return "Besok";
  return "Mendatang";
}

export type { Aktivitas, Notifikasi, PertukaranJadwal, JadwalRonda };
