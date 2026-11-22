import { JAM_MULAI, JAM_SELESAI, LOKASI_RONDA } from "./format";
import type { State } from "./types";

/** "Hari ini" untuk data demo — seluruh cerita demo berpatokan pada tanggal ini. */
export const TODAY = "2026-11-19";

/**
 * Daftar akun: [id, nama lengkap, kata sandi, nomor HP].
 * Login memakai NAMA LENGKAP (tidak peka huruf besar/kecil) + kata sandi.
 * Kata sandi selalu huruf kecil.
 */
const akunRows: [string, string, string, string][] = [
  ["ketua", "Fajar Raihan Hanafi", "fajarhimsika99", "0812-0000-0100"],
  ["aditya", "Aditya Pratama", "aditya142", "0812-0000-0101"],
  ["bayu", "Bayu Saputra", "bayu857", "0812-0000-0102"],
  ["candra", "Candra Wijaya", "candra391", "0812-0000-0103"],
  ["dimas", "Dimas Anggara", "dimas604", "0812-0000-0104"],
  ["eka", "Eka Putra", "eka275", "0812-0000-0105"],
  ["fajar", "Fajar Ramadhan", "fajar938", "0812-0000-0106"],
  ["gilang", "Gilang Permana", "gilang419", "0812-0000-0107"],
  ["hadi", "Hadi Sucipto", "hadi582", "0812-0000-0108"],
  ["indra", "Indra Lesmana", "indra726", "0812-0000-0109"],
  ["joko", "Joko Susanto", "joko193", "0812-0000-0110"],
  ["kevin", "Kevin Sanjaya", "kevin840", "0812-0000-0111"],
  ["lukman", "Lukman Hakim", "lukman567", "0812-0000-0112"],
  ["muhamad", "Muhamad Rizki", "muhamad214", "0812-0000-0113"],
  ["naufal", "Naufal Akmal", "naufal905", "0812-0000-0114"],
  ["oki", "Oki Setiawan", "oki378", "0812-0000-0115"],
  ["putra", "Putra Mahardika", "putra651", "0812-0000-0116"],
  ["rizki", "Rizki Fauzi", "rizki429", "0812-0000-0117"],
  ["surya", "Surya Dharma", "surya813", "0812-0000-0118"],
  ["tri", "Tri Nugroho", "tri506", "0812-0000-0119"],
  ["wahyu", "Wahyu Hidayat", "wahyu972", "0812-0000-0120"],
  ["yudi", "Yudi Purnomo", "yudi185", "0812-0000-0121"],
  ["zainal", "Zainal Arifin", "zainal640", "0812-0000-0122"],
  ["akbar", "Akbar Maulana", "akbar357", "0812-0000-0123"],
  ["bagus", "Bagus Prasetyo", "bagus924", "0812-0000-0124"],
  ["cahyo", "Cahyo Wibowo", "cahyo731", "0812-0000-0125"],
  ["dwi", "Dwi Saputra", "dwi486", "0812-0000-0126"],
  ["erwin", "Erwin Syahputra", "erwin259", "0812-0000-0127"],
  ["firman", "Firman Maulana", "firman803", "0812-0000-0128"],
  ["galih", "Galih Kusuma", "galih174", "0812-0000-0129"],
  ["harianto", "Harianto Wijaya", "harianto692", "0812-0000-0130"],
  ["ilham", "Ilham Akbar", "ilham538", "0812-0000-0131"],
  ["jaka", "Jaka Kusuma", "jaka915", "0812-0000-0132"],
  ["kurniawan", "Kurniawan Dwi", "kurniawan247", "0812-0000-0133"],
  ["lutfi", "Lutfi Hasan", "lutfi860", "0812-0000-0134"],
  ["maulana", "Maulana Yusuf", "maulana329", "0812-0000-0135"],
  ["nugroho", "Nugroho Susilo", "nugroho714", "0812-0000-0136"],
  ["pandu", "Pandu Wibowo", "pandu495", "0812-0000-0137"],
  ["reza", "Reza Pahlevi", "reza608", "0812-0000-0138"],
  ["sandi", "Sandi Pratama", "sandi153", "0812-0000-0139"],
  ["teguh", "Teguh Santoso", "teguh826", "0812-0000-0140"],
];

const jadwalRows: [string, string, "draft" | "dipublikasikan", string?][] = [
  ["j-19", "2026-11-19", "dipublikasikan", "2026-11-18T17:30"],
  ["j-20", "2026-11-20", "dipublikasikan", "2026-11-19T17:30"],
  ["j-21", "2026-11-21", "draft"],
  ["j-22", "2026-11-22", "dipublikasikan", "2026-11-19T17:30"],
  ["j-23", "2026-11-23", "dipublikasikan", "2026-11-19T17:30"],
  ["j-24", "2026-11-24", "dipublikasikan", "2026-11-19T17:30"],
];

/** Petugas per jadwal diambil berurutan dari daftar warga supaya semua kebagian merata. */
const PETUGAS_PER_JADWAL = 6;
const wargaIds = akunRows.filter(([id]) => id !== "ketua").map(([id]) => id);

const petugasRows: Record<string, string[]> = Object.fromEntries(
  jadwalRows.map(([jadwalId], index) => [
    jadwalId,
    Array.from(
      { length: PETUGAS_PER_JADWAL },
      (_, ke) => wargaIds[(index * PETUGAS_PER_JADWAL + ke) % wargaIds.length],
    ),
  ]),
);

/** Contoh kehadiran pada ronda malam ini (j-19). */
const kehadiranRows: Record<string, ["hadir" | "tidak-hadir" | "belum-dicatat", string?]> = {
  aditya: ["hadir", "22.02"],
  bayu: ["hadir", "22.05"],
  candra: ["belum-dicatat"],
  dimas: ["tidak-hadir", "22.12"],
};

export function buildInitialState(): State {
  const pengguna = akunRows.map(([id, nama, kataSandi, noHp]) => ({
    id,
    nama,
    username: `@${nama.split(" ")[0].toLowerCase()}`,
    noHp,
    role: (id === "ketua" ? "ketua" : "warga") as "ketua" | "warga",
    statusAkun: "aktif" as const,
    kataSandi,
  }));

  const jadwal = jadwalRows.map(([id, tanggal, status, dipublikasikanPada]) => ({
    id,
    tanggal,
    waktuMulai: JAM_MULAI,
    waktuSelesai: JAM_SELESAI,
    lokasi: LOKASI_RONDA,
    status,
    dipublikasikanPada,
  }));

  const detailJadwal = jadwal.flatMap((j) =>
    (petugasRows[j.id] ?? []).map((wargaId, index) => {
      const record = j.id === "j-19" ? kehadiranRows[wargaId] : undefined;
      const [statusKehadiran, waktuDicatat] = record ?? (["belum-dicatat", undefined] as const);
      return {
        id: `d-${j.id}-${wargaId}-${index}`,
        jadwalId: j.id,
        wargaId,
        statusKehadiran,
        waktuDicatat,
      };
    }),
  );

  return {
    pengguna,
    jadwal,
    detailJadwal,
    pertukaran: [
      {
        id: "PT-027",
        pemohonId: "surya",
        jadwalAsalId: "j-20",
        wargaTujuanId: "wahyu",
        jadwalTujuanId: "j-19",
        alasan: "Ada kegiatan kampus sampai malam. Mohon bertukar jadwal ronda.",
        status: "menunggu-warga",
        diajukanPada: "2026-11-19T20:15",
      },
      {
        id: "PT-026",
        pemohonId: "yudi",
        jadwalAsalId: "j-19",
        wargaTujuanId: "zainal",
        jadwalTujuanId: "j-20",
        alasan: "Dinas malam mendadak. Saya mengajukan pertukaran dengan jadwal besok.",
        status: "menunggu-validasi",
        diajukanPada: "2026-11-19T19:40",
        ditanggapiPada: "2026-11-19T21:05",
      },
      {
        id: "PT-025",
        pemohonId: "akbar",
        jadwalAsalId: "j-19",
        wargaTujuanId: "gilang",
        jadwalTujuanId: "j-23",
        alasan: "Ada acara keluarga di luar kota, mohon bantuan tukar jadwal.",
        status: "ditolak",
        diajukanPada: "2026-11-18T18:10",
        ditanggapiPada: "2026-11-18T19:05",
        divalidasiPada: "2026-11-18T21:40",
        alasanPenolakan: "Pengajuan masuk setelah ronda dimulai. Mohon ajukan sebelum jadwal berikutnya.",
        ditolakOleh: "ketua",
      },
    ],
    notifikasi: [
      {
        id: "n-1",
        judul: "Pertukaran menunggu validasi Anda",
        pesan: "Yudi Purnomo dan Zainal Arifin telah menyetujui pertukaran 19 ↔ 20 November.",
        kategori: "pertukaran",
        waktu: "2026-11-19T21:05",
        dibaca: false,
        penerimaId: "ketua",
        tautan: "pertukaran/PT-026",
      },
      {
        id: "n-2",
        judul: "Surya Dharma meminta pertukaran",
        pesan: "Tanggapi permintaan jadwal 20 ↔ 19 November.",
        kategori: "pertukaran",
        waktu: "2026-11-19T20:15",
        dibaca: false,
        penerimaId: "wahyu",
        tautan: "pertukaran/PT-027",
      },
      {
        id: "n-3",
        judul: "Ronda malam ini dimulai pukul 22.00",
        pesan: "Enam petugas dijadwalkan berjaga di pos ronda.",
        kategori: "pengingat",
        waktu: "2026-11-19T20:00",
        dibaca: false,
        tautan: "jadwal/j-19",
      },
      {
        id: "n-4",
        judul: "Jadwal 20 November telah dipublikasikan",
        pesan: "Pengingat jadwal sudah dikirim kepada warga yang bertugas.",
        kategori: "perubahan-jadwal",
        waktu: "2026-11-19T17:30",
        dibaca: true,
        tautan: "jadwal/j-20",
      },
    ],
    aktivitas: [
      {
        id: "a-1",
        waktu: "21.05",
        teks: "Zainal Arifin menyetujui pertukaran Yudi Purnomo. Menunggu validasi Ketua RT.",
        tanggal: TODAY,
      },
      {
        id: "a-2",
        waktu: "20.15",
        teks: "Surya Dharma mengirim permintaan pertukaran kepada Wahyu Hidayat.",
        tanggal: TODAY,
      },
      { id: "a-3", waktu: "17.30", teks: "Jadwal Jumat, 20 November telah dipublikasikan.", tanggal: TODAY },
    ],
    sesi: { penggunaId: "" },
  };
}
