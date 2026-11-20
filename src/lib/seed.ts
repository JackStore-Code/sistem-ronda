import { JAM_MULAI, JAM_SELESAI, LOKASI_RONDA } from "./format";
import type { State } from "./types";

/** "Hari ini" untuk data demo — seluruh cerita demo berpatokan pada tanggal ini. */
export const TODAY = "2026-11-19";

const userRows: [string, string, string, string, "aktif" | "nonaktif"][] = [
  ["ketua", "Budi Santoso", "budi.rt05", "0812-0000-0100", "aktif"],
  ["andi", "Andi Pratama", "andi.p", "0812-0000-0101", "aktif"],
  ["dedi", "Dedi Kurniawan", "dedi.k", "0812-0000-0102", "aktif"],
  ["eko", "Eko Saputra", "eko.s", "0812-0000-0103", "aktif"],
  ["fajar", "Fajar Hidayat", "fajar.h", "0812-0000-0104", "aktif"],
  ["rizky", "Rizky Ramadhan", "rizky.r", "0812-0000-0105", "aktif"],
  ["hendra", "Hendra Wijaya", "hendra.w", "0812-0000-0106", "aktif"],
  ["agus", "Agus Setiawan", "agus.s", "0812-0000-0107", "aktif"],
  ["yudi", "Yudi Prasetyo", "yudi.p", "0812-0000-0108", "aktif"],
  ["joko", "Joko Susilo", "joko.s", "0812-0000-0109", "aktif"],
  ["rudi", "Rudy Hartono", "rudi.h", "0812-0000-0110", "aktif"],
  ["bambang", "Bambang Setiawan", "bambang.s", "0812-0000-0111", "aktif"],
  ["slamet", "Slamet Riyadi", "slamet.r", "0812-0000-0112", "nonaktif"],
  ["wahyu", "Wahyu Setiawan", "wahyu.s", "0812-0000-0113", "aktif"],
];

const jadwalRows: [string, string, "draft" | "dipublikasikan", string?][] = [
  ["j-19", "2026-11-19", "dipublikasikan", "2026-11-18T17:30"],
  ["j-20", "2026-11-20", "dipublikasikan", "2026-11-19T17:30"],
  ["j-21", "2026-11-21", "draft"],
  ["j-22", "2026-11-22", "dipublikasikan", "2026-11-19T17:30"],
  ["j-23", "2026-11-23", "dipublikasikan", "2026-11-19T17:30"],
  ["j-24", "2026-11-24", "dipublikasikan", "2026-11-19T17:30"],
];

const petugasRows: Record<string, string[]> = {
  "j-19": ["andi", "dedi", "eko", "fajar"],
  "j-20": ["rizky", "hendra", "agus", "yudi"],
  "j-21": ["joko", "rudi", "bambang", "wahyu"],
  "j-22": ["agus", "yudi", "bambang", "wahyu"],
  "j-23": ["fajar", "eko", "andi", "dedi"],
  "j-24": ["andi", "hendra", "rizky", "joko"],
};

const kehadiranRows: Record<string, ["hadir" | "tidak-hadir" | "belum-dicatat", string?]> = {
  andi: ["hadir", "22.02"],
  dedi: ["hadir", "22.05"],
  eko: ["belum-dicatat"],
  fajar: ["tidak-hadir", "22.12"],
};

export function buildInitialState(): State {
  const pengguna = userRows.map(([id, nama, username, noHp, statusAkun]) => ({
    id,
    nama,
    username: `@${username}`,
    noHp,
    role: (id === "ketua" ? "ketua" : "warga") as "ketua" | "warga",
    statusAkun,
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
        pemohonId: "hendra",
        jadwalAsalId: "j-20",
        wargaTujuanId: "andi",
        jadwalTujuanId: "j-19",
        alasan: "Mengantar orang tua kontrol ke rumah sakit. Mohon bertukar jadwal.",
        status: "menunggu-warga",
        diajukanPada: "2026-11-19T20:15",
      },
      {
        id: "PT-026",
        pemohonId: "dedi",
        jadwalAsalId: "j-19",
        wargaTujuanId: "rizky",
        jadwalTujuanId: "j-20",
        alasan: "Dinas malam mendadak. Saya mengajukan pertukaran dengan Pak Rizky untuk jadwal besok.",
        status: "menunggu-validasi",
        diajukanPada: "2026-11-19T19:40",
        ditanggapiPada: "2026-11-19T21:05",
      },
      {
        id: "PT-025",
        pemohonId: "eko",
        jadwalAsalId: "j-19",
        wargaTujuanId: "joko",
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
        pesan: "Dedi dan Rizky telah menyetujui pertukaran 19 ↔ 20 November.",
        kategori: "pertukaran",
        waktu: "2026-11-19T21:05",
        dibaca: false,
        penerimaId: "ketua",
        tautan: "pertukaran/PT-026",
      },
      {
        id: "n-2",
        judul: "Hendra meminta pertukaran",
        pesan: "Tanggapi permintaan jadwal 20 ↔ 19 November.",
        kategori: "pertukaran",
        waktu: "2026-11-19T20:15",
        dibaca: false,
        penerimaId: "andi",
        tautan: "pertukaran/PT-027",
      },
      {
        id: "n-3",
        judul: "Ronda malam ini dimulai pukul 22.00",
        pesan: "Empat petugas dijadwalkan berjaga di pos ronda RT 05.",
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
      { id: "a-1", waktu: "21.05", teks: "Rizky menyetujui pertukaran Dedi. Menunggu validasi Ketua RT.", tanggal: TODAY },
      { id: "a-2", waktu: "20.15", teks: "Hendra mengirim permintaan pertukaran kepada Andi.", tanggal: TODAY },
      { id: "a-3", waktu: "17.30", teks: "Jadwal Jumat, 20 November telah dipublikasikan.", tanggal: TODAY },
    ],
    sesi: { penggunaId: "ketua" },
  };
}
