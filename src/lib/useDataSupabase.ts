import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, bacaSesi, hapusSesi, simpanSesi } from "./supabase";
import type {
  Aktivitas,
  DetailJadwal,
  JadwalRonda,
  Notifikasi,
  Pengguna,
  PertukaranJadwal,
  State,
  StatusKehadiran,
} from "./types";

type BarisPengguna = {
  id: string;
  nama: string;
  username: string;
  no_hp: string;
  role: "ketua" | "warga";
  status_akun: "aktif" | "nonaktif";
};

type BarisJadwal = {
  id: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  lokasi: string;
  status: "draft" | "dipublikasikan";
  dipublikasikan_pada: string | null;
};

type BarisDetail = {
  id: string;
  jadwal_id: string;
  warga_id: string;
  status_kehadiran: StatusKehadiran;
  waktu_dicatat: string | null;
};

type BarisPertukaran = {
  id: string;
  kode: string;
  pemohon_id: string;
  jadwal_asal_id: string;
  warga_tujuan_id: string;
  jadwal_tujuan_id: string;
  alasan: string;
  status: PertukaranJadwal["status"];
  diajukan_pada: string;
  ditanggapi_pada: string | null;
  divalidasi_pada: string | null;
  alasan_penolakan: string | null;
  ditolak_oleh: "warga" | "ketua" | null;
};

type BarisNotifikasi = {
  id: string;
  judul: string;
  pesan: string;
  kategori: Notifikasi["kategori"];
  penerima_id: string | null;
  tautan: string | null;
  dibaca: boolean;
  waktu: string;
};

type BarisAktivitas = {
  id: string;
  teks: string;
  tanggal: string;
  waktu: string;
};

function potongJam(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${`${d.getHours()}`.padStart(2, "0")}.${`${d.getMinutes()}`.padStart(2, "0")}`;
}

export function petakan(rows: {
  pengguna: BarisPengguna[];
  jadwal: BarisJadwal[];
  detailJadwal: BarisDetail[];
  pertukaran: BarisPertukaran[];
  notifikasi: BarisNotifikasi[];
  aktivitas: BarisAktivitas[];
}): Omit<State, "sesi"> {
  const pengguna: Pengguna[] = rows.pengguna.map((p) => ({
    id: p.id,
    nama: p.nama,
    username: p.username,
    noHp: p.no_hp,
    role: p.role,
    statusAkun: p.status_akun,
    // Kata sandi tidak pernah dikirim ke klien; login diperiksa di server.
    kataSandi: "",
  }));

  const jadwal: JadwalRonda[] = rows.jadwal.map((j) => ({
    id: j.id,
    tanggal: j.tanggal,
    waktuMulai: j.waktu_mulai,
    waktuSelesai: j.waktu_selesai,
    lokasi: j.lokasi,
    status: j.status,
    dipublikasikanPada: j.dipublikasikan_pada ?? undefined,
  }));

  const detailJadwal: DetailJadwal[] = rows.detailJadwal.map((d) => ({
    id: d.id,
    jadwalId: d.jadwal_id,
    wargaId: d.warga_id,
    statusKehadiran: d.status_kehadiran,
    waktuDicatat: potongJam(d.waktu_dicatat),
  }));

  const pertukaran: PertukaranJadwal[] = rows.pertukaran.map((p) => ({
    id: p.kode,
    kode: p.kode,
    pemohonId: p.pemohon_id,
    jadwalAsalId: p.jadwal_asal_id,
    wargaTujuanId: p.warga_tujuan_id,
    jadwalTujuanId: p.jadwal_tujuan_id,
    alasan: p.alasan,
    status: p.status,
    diajukanPada: p.diajukan_pada,
    ditanggapiPada: p.ditanggapi_pada ?? undefined,
    divalidasiPada: p.divalidasi_pada ?? undefined,
    alasanPenolakan: p.alasan_penolakan ?? undefined,
    ditolakOleh: p.ditolak_oleh ?? undefined,
  }));

  const notifikasi: Notifikasi[] = rows.notifikasi.map((n) => ({
    id: n.id,
    judul: n.judul,
    pesan: n.pesan,
    kategori: n.kategori,
    penerimaId: n.penerima_id ?? undefined,
    tautan: n.tautan ?? undefined,
    dibaca: n.dibaca,
    waktu: n.waktu,
  }));

  const aktivitas: Aktivitas[] = rows.aktivitas.map((a) => ({
    id: a.id,
    waktu: a.waktu,
    teks: a.teks,
    tanggal: a.tanggal,
  }));

  return { pengguna, jadwal, detailJadwal, pertukaran, notifikasi, aktivitas };
}

export type SesiAktif = { token: string; penggunaId: string; nama: string; role: string };

/**
 * Sumber data utama aplikasi: Supabase (database online).
 * Semua perubahan langsung menulis ke database; perubahan dari perangkat lain
 * masuk lewat realtime sehingga notifikasi muncul tanpa memuat ulang halaman.
 */
export function useDataSupabase() {
  const [data, setData] = useState<Omit<State, "sesi">>({
    pengguna: [],
    jadwal: [],
    detailJadwal: [],
    pertukaran: [],
    notifikasi: [],
    aktivitas: [],
  });
  const [sesi, setSesi] = useState<SesiAktif | null>(null);
  const [siap, setSiap] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const muat = useCallback(async () => {
    const [pengguna, jadwal, detail, pertukaran, notifikasi, aktivitas] = await Promise.all([
      supabase.from("pengguna").select("id,nama,username,no_hp,role,status_akun").order("role").order("nama"),
      supabase.from("jadwal").select("*").order("tanggal"),
      supabase.from("detail_jadwal").select("*"),
      supabase.from("pertukaran").select("*").order("diajukan_pada", { ascending: false }),
      supabase.from("notifikasi").select("*").order("waktu", { ascending: false }).limit(200),
      supabase.from("aktivitas").select("*").order("created_at", { ascending: false }).limit(12),
    ]);

    const salah = [pengguna, jadwal, detail, pertukaran, notifikasi, aktivitas].find((r) => r.error);
    if (salah?.error) {
      setGalat(salah.error.message);
      return;
    }

    setData(
      petakan({
        pengguna: (pengguna.data ?? []) as BarisPengguna[],
        jadwal: (jadwal.data ?? []) as BarisJadwal[],
        detailJadwal: (detail.data ?? []) as BarisDetail[],
        pertukaran: (pertukaran.data ?? []) as BarisPertukaran[],
        notifikasi: (notifikasi.data ?? []) as BarisNotifikasi[],
        aktivitas: (aktivitas.data ?? []) as BarisAktivitas[],
      }),
    );
    setGalat(null);
  }, []);

  // Muat data awal + sesi tersimpan.
  useEffect(() => {
    const simpanan = bacaSesi();
    if (simpanan) setSesi(simpanan);
    muat().finally(() => setSiap(true));
  }, [muat]);

  // Realtime: setiap perubahan pada tabel penting memicu muat ulang data.
  useEffect(() => {
    if (!siap) return;
    const channel = supabase
      .channel("ronda-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifikasi" }, () => muat())
      .on("postgres_changes", { event: "*", schema: "public", table: "pertukaran" }, () => muat())
      .on("postgres_changes", { event: "*", schema: "public", table: "jadwal" }, () => muat())
      .on("postgres_changes", { event: "*", schema: "public", table: "detail_jadwal" }, () => muat())
      .subscribe();
    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [siap, muat]);

  // Pengaman: bila siaran realtime tidak sampai (mis. publication belum aktif),
  // data tetap disegarkan berkala dan saat jendela kembali aktif, sehingga
  // notifikasi baru tetap muncul tanpa pengguna memuat ulang halaman.
  useEffect(() => {
    if (!siap) return;
    const jeda = 4000;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void muat();
    }, jeda);
    const saatFokus = () => {
      if (document.visibilityState === "visible") void muat();
    };
    document.addEventListener("visibilitychange", saatFokus);
    window.addEventListener("focus", saatFokus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", saatFokus);
      window.removeEventListener("focus", saatFokus);
    };
  }, [siap, muat]);

  const penggunaAktif = useMemo(() => {
    const kosong: Pengguna = {
      id: "",
      nama: "",
      username: "",
      noHp: "",
      role: "warga",
      statusAkun: "aktif",
      kataSandi: "",
    };
    if (!sesi) return kosong;
    return data.pengguna.find((p) => p.id === sesi.penggunaId) ?? kosong;
  }, [data.pengguna, sesi]);

  const wargaAktif = useMemo(
    () => data.pengguna.filter((p) => p.role === "warga" && p.statusAkun === "aktif"),
    [data.pengguna],
  );

  const masuk = useCallback(
    async (namaLengkap: string, kataSandi: string) => {
      const { data: hasil, error } = await supabase.rpc("login", {
        nama_lengkap: namaLengkap,
        kata_sandi: kataSandi,
      });
      if (error) return { ok: false, pesan: error.message };
      const baris = (hasil as { token: string; pengguna_id: string; nama: string; role: string }[])?.[0];
      if (!baris) return { ok: false, pesan: "Username atau kata sandi tidak cocok" };
      const s: SesiAktif = {
        token: baris.token,
        penggunaId: baris.pengguna_id,
        nama: baris.nama,
        role: baris.role,
      };
      simpanSesi(s.token, s.penggunaId, s.nama, s.role);
      setSesi(s);
      await muat();
      return { ok: true, role: baris.role };
    },
    [muat],
  );

  const keluar = useCallback(() => {
    hapusSesi();
    setSesi(null);
  }, []);

  return { data, sesi, siap, galat, penggunaAktif, wargaAktif, masuk, keluar, muat };
}
