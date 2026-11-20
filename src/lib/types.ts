export type Role = "ketua" | "warga";

export type StatusAkun = "aktif" | "nonaktif";

export type Pengguna = {
  id: string;
  nama: string;
  username: string;
  noHp: string;
  role: Role;
  statusAkun: StatusAkun;
};

export type StatusPublikasi = "draft" | "dipublikasikan";

export type StatusKehadiran = "hadir" | "tidak-hadir" | "belum-dicatat";

export type JadwalRonda = {
  id: string;
  tanggal: string; // YYYY-MM-DD (tanggal mulai)
  waktuMulai: string; // "22.00"
  waktuSelesai: string; // "02.00"
  lokasi: string;
  status: StatusPublikasi;
  dipublikasikanPada?: string;
};

export type DetailJadwal = {
  id: string;
  jadwalId: string;
  wargaId: string;
  statusKehadiran: StatusKehadiran;
  waktuDicatat?: string; // "22.02"
};

export type StatusTanggapan = "menunggu-warga" | "menunggu-validasi" | "disetujui" | "ditolak";

export type PertukaranJadwal = {
  id: string;
  pemohonId: string;
  jadwalAsalId: string;
  wargaTujuanId: string;
  jadwalTujuanId: string;
  alasan: string;
  status: StatusTanggapan;
  diajukanPada: string; // ISO
  ditanggapiPada?: string;
  divalidasiPada?: string;
  alasanPenolakan?: string;
  ditolakOleh?: "warga" | "ketua";
};

export type KategoriNotifikasi =
  | "pertukaran"
  | "pengingat"
  | "perubahan-jadwal";

export type Notifikasi = {
  id: string;
  judul: string;
  pesan: string;
  kategori: KategoriNotifikasi;
  waktu: string; // ISO
  dibaca: boolean;
  penerimaId?: string; // undefined = semua
  tautan?: string;
};

export type Aktivitas = {
  id: string;
  waktu: string; // "20.15"
  teks: string;
  tanggal: string;
};

export type State = {
  pengguna: Pengguna[];
  jadwal: JadwalRonda[];
  detailJadwal: DetailJadwal[];
  pertukaran: PertukaranJadwal[];
  notifikasi: Notifikasi[];
  aktivitas: Aktivitas[];
  sesi: { penggunaId: string };
};
