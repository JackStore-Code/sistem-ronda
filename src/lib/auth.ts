import type { Pengguna } from "./types";

/**
 * Memotong spasi berlebih lalu menyamakan huruf. Dipakai untuk nama lengkap
 * supaya "aditya  pratama" dan "Aditya Pratama" dianggap sama.
 */
export function rapikanTeks(nilai: string): string {
  return nilai.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

/**
 * Mencari akun aktif berdasarkan NAMA LENGKAP + kata sandi.
 * Nama tidak peka kapitalisasi dan spasi, tetapi semua kata wajib ditulis.
 */
export function cariAkun(
  daftar: Pengguna[],
  namaLengkap: string,
  kataSandi: string,
): Pengguna | undefined {
  const namaDicari = rapikanTeks(namaLengkap);
  const sandiDicari = kataSandi.trim().toLocaleLowerCase("id-ID");
  if (!namaDicari || !sandiDicari) return undefined;
  return daftar.find(
    (p) =>
      p.statusAkun === "aktif" &&
      rapikanTeks(p.nama) === namaDicari &&
      rapikanTeks(p.kataSandi) === sandiDicari,
  );
}

/** Kata sandi awal untuk warga yang ditambahkan Ketua RT lewat form Data Warga. */
export const KATA_SANDI_AWAL = "ronda123";
