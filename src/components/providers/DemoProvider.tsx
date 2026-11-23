"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { supabase, pesanGalat } from "@/lib/supabase";
import { useDataSupabase } from "@/lib/useDataSupabase";
import type { Pengguna, State, StatusKehadiran } from "@/lib/types";

type Toast = { id: number; pesan: string; nada?: "sukses" | "galat" };

type BuatJadwalInput = {
  id?: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  lokasi?: string;
  petugasIds: string[];
  publikasikan: boolean;
};

type AjukanTukarInput = {
  pemohonId: string;
  wargaTujuanId: string;
  jadwalAsalId: string;
  jadwalTujuanId: string;
  alasan: string;
};

type Hasil = { ok: boolean; id?: string; pesan?: string };

type DemoContextValue = {
  state: State;
  siap: boolean;
  galatData: string | null;
  penggunaAktif: Pengguna;
  wargaAktif: Pengguna[];
  masuk: (namaLengkap: string, kataSandi: string) => Promise<{ ok: boolean; pesan?: string; role?: string }>;
  keluarSesi: () => void;
  /** Token sesi aktif (dipakai untuk mendaftarkan perangkat ke notifikasi HP). */
  sesiToken: string;
  pilihPengguna: (penggunaId: string) => void;
  simpanJadwal: (input: BuatJadwalInput) => Promise<Hasil>;
  publikasikanJadwal: (jadwalId: string) => Promise<void>;
  hapusJadwal: (jadwalId: string) => Promise<void>;
  catatKehadiran: (detailId: string, status: StatusKehadiran) => Promise<void>;
  ajukanPertukaran: (input: AjukanTukarInput) => Promise<Hasil>;
  tanggapiPertukaran: (kode: string, setuju: boolean, alasanPenolakan?: string) => Promise<Hasil>;
  batalkanPertukaran: (kode: string) => Promise<void>;
  validasiPertukaran: (kode: string, setuju: boolean, alasanPenolakan?: string) => Promise<Hasil>;
  simpanWarga: (input: Omit<Pengguna, "id" | "role"> & { id?: string }) => Promise<Hasil>;
  ubahStatusWarga: (wargaId: string, status: "aktif" | "nonaktif", sandiKonfirmasi: string) => Promise<Hasil>;
  tandaiDibaca: (id: string) => Promise<void>;
  tandaiSemuaDibaca: (penerimaId: string) => Promise<void>;
  kirimPengingat: (jadwalId: string) => Promise<void>;
  reset: () => void;
  toasts: Toast[];
  tampilkanToast: (pesan: string, nada?: "sukses" | "galat") => void;
  tutupToast: (id: number) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { data, sesi, siap, galat, penggunaAktif, wargaAktif, masuk, keluar, muat } = useDataSupabase();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const tampilkanToast = useCallback((pesan: string, nada: "sukses" | "galat" = "sukses") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, pesan, nada }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);

  const tutupToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const state: State = useMemo(
    () => ({ ...data, sesi: { penggunaId: sesi?.penggunaId ?? "" } }),
    [data, sesi],
  );

  const token = sesi?.token ?? "";

  const simpanJadwal = useCallback(
    async (input: BuatJadwalInput): Promise<Hasil> => {
      if (!token) return { ok: false, pesan: "Sesi sudah berakhir. Silakan masuk ulang." };
      const { data: id, error } = await supabase.rpc("simpan_jadwal", {
        token_sesi: token,
        id_jadwal: input.id ?? null,
        tgl: input.tanggal,
        mulai: input.waktuMulai,
        selesai: input.waktuSelesai,
        tempat: input.lokasi ?? "Pos ronda RT 05",
        petugas: input.petugasIds,
        publikasikan: input.publikasikan,
      });
      if (error) return { ok: false, pesan: pesanGalat(error.message) };
      await muat();
      return { ok: true, id: id ? String(id) : undefined };
    },
    [token, muat],
  );

  const publikasikanJadwal = useCallback(
    async (jadwalId: string) => {
      // Memakai fungsi database agar status berubah dan petugas menerima notifikasi.
      const { error } = await supabase.rpc("publikasi_jadwal", {
        token_sesi: token,
        jadwal_id: jadwalId,
      });
      if (error) tampilkanToast(pesanGalat(error.message), "galat");
      await muat();
    },
    [token, muat, tampilkanToast],
  );

  const hapusJadwal = useCallback(
    async (jadwalId: string) => {
      const { error } = await supabase.from("jadwal").delete().eq("id", jadwalId);
      if (error) tampilkanToast(pesanGalat(error.message), "galat");
      await muat();
    },
    [muat, tampilkanToast],
  );

  const catatKehadiran = useCallback(
    async (detailId: string, status: StatusKehadiran) => {
      const { error } = await supabase.rpc("catat_kehadiran", {
        token_sesi: token,
        detail: detailId,
        status_baru: status,
      });
      if (error) tampilkanToast(pesanGalat(error.message), "galat");
      await muat();
    },
    [token, muat, tampilkanToast],
  );

  const ajukanPertukaran = useCallback(
    async (input: AjukanTukarInput): Promise<Hasil> => {
      if (!token) return { ok: false, pesan: "Sesi sudah berakhir. Silakan masuk ulang." };
      if (!input.wargaTujuanId) return { ok: false, pesan: "Jadwal tujuan belum memiliki petugas lain." };
      const { data: kode, error } = await supabase.rpc("ajukan_pertukaran", {
        token_sesi: token,
        pemohon: input.pemohonId,
        jadwal_asal: input.jadwalAsalId,
        warga_tujuan: input.wargaTujuanId,
        jadwal_tujuan: input.jadwalTujuanId,
        alasan_tukar: input.alasan,
      });
      if (error) return { ok: false, pesan: pesanGalat(error.message) };
      await muat();
      return { ok: true, id: kode ? String(kode) : undefined };
    },
    [token, muat],
  );

  const tanggapiPertukaran = useCallback(
    async (kode: string, setuju: boolean, alasanPenolakan?: string): Promise<Hasil> => {
      const { error } = await supabase.rpc("tanggapi_pertukaran", {
        token_sesi: token,
        kode_tukar: kode,
        setuju,
        alasan_tolak: alasanPenolakan ?? null,
      });
      if (error) return { ok: false, pesan: pesanGalat(error.message) };
      await muat();
      return { ok: true };
    },
    [token, muat],
  );

  const batalkanPertukaran = useCallback(
    async (kode: string) => {
      const { error } = await supabase
        .from("pertukaran")
        .update({ status: "ditolak", ditolak_oleh: "warga", alasan_penolakan: "Dibatalkan oleh pemohon." })
        .eq("kode", kode);
      if (error) tampilkanToast(pesanGalat(error.message), "galat");
      await muat();
    },
    [muat, tampilkanToast],
  );

  const validasiPertukaran = useCallback(
    async (kode: string, setuju: boolean, alasanPenolakan?: string): Promise<Hasil> => {
      const { error } = await supabase.rpc("validasi_pertukaran", {
        token_sesi: token,
        kode_tukar: kode,
        setuju,
        alasan_tolak: alasanPenolakan ?? null,
      });
      if (error) return { ok: false, pesan: pesanGalat(error.message) };
      await muat();
      return { ok: true };
    },
    [token, muat],
  );

  const simpanWarga = useCallback(
    async (input: Omit<Pengguna, "id" | "role"> & { id?: string }): Promise<Hasil> => {
      if (input.id) {
        const { error } = await supabase.rpc("ubah_warga", {
          token_sesi: token,
          warga_id: input.id,
          nama_baru: input.nama,
          no_hp_baru: input.noHp,
          status_baru: input.statusAkun,
          // Kosong berarti kata sandi / username tidak diubah.
          sandi_baru: input.kataSandi.trim() ? input.kataSandi.trim().toLowerCase() : null,
        });
        await muat();
        if (error) {
          const pesan = pesanGalat(error.message);
          tampilkanToast(pesan, "galat");
          return { ok: false, pesan };
        }
        return { ok: true };
      }

      const { error } = await supabase.rpc("tambah_warga", {
        token_sesi: token,
        nama_baru: input.nama,
        sandi_baru: input.kataSandi,
        no_hp: input.noHp,
      });
      await muat();
      if (error) {
        const pesan = pesanGalat(error.message);
        tampilkanToast(pesan, "galat");
        return { ok: false, pesan };
      }
      return { ok: true };
    },
    [token, muat, tampilkanToast],
  );

  /**
   * Mengaktifkan / menonaktifkan akun warga. Wajib disertai kata sandi Ketua RT
   * yang diperiksa ulang di server sebelum perubahan disimpan.
   */
  const ubahStatusWarga = useCallback(
    async (
      wargaId: string,
      status: "aktif" | "nonaktif",
      sandiKonfirmasi: string,
    ): Promise<Hasil> => {
      if (!sesi?.penggunaId) return { ok: false, pesan: "Sesi sudah berakhir. Silakan masuk ulang." };

      // 1) Pastikan kata sandi yang diketik memang milik Ketua RT yang sedang masuk.
      const cek = await supabase.rpc("login", {
        nama_lengkap: penggunaAktif.nama,
        kata_sandi: sandiKonfirmasi,
      });
      if (cek.error) return { ok: false, pesan: "Kata sandi Anda tidak cocok." };
      const baris = (cek.data as { pengguna_id: string; role: string }[])?.[0];
      if (!baris || baris.pengguna_id !== sesi.penggunaId || baris.role !== "ketua") {
        return { ok: false, pesan: "Kata sandi Anda tidak cocok." };
      }

      // 2) Simpan perubahan status lewat fungsi database.
      const { error } = await supabase.rpc("ubah_warga", {
        token_sesi: sesi.token,
        warga_id: wargaId,
        nama_baru: null,
        no_hp_baru: null,
        status_baru: status,
        sandi_baru: null,
      });
      await muat();
      if (error) return { ok: false, pesan: pesanGalat(error.message) };
      return { ok: true };
    },
    [sesi, penggunaAktif.nama, muat],
  );

  const tandaiDibaca = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc("tandai_dibaca", {
        token_sesi: token,
        notif_id: id,
      });
      if (error) tampilkanToast(pesanGalat(error.message), "galat");
      await muat();
    },
    [token, muat, tampilkanToast],
  );

  const tandaiSemuaDibaca = useCallback(
    async (penerimaId: string) => {
      const { error } = await supabase.rpc("tandai_semua_dibaca", {
        token_sesi: token,
        penerima: penerimaId,
      });
      if (error) tampilkanToast(pesanGalat(error.message), "galat");
      await muat();
    },
    [token, muat, tampilkanToast],
  );

  const kirimPengingat = useCallback(
    async (jadwalId: string) => {
      const { error } = await supabase.rpc("kirim_pengingat", {
        token_sesi: token,
        jadwal_id: jadwalId,
      });
      if (error) tampilkanToast(pesanGalat(error.message), "galat");
      await muat();
    },
    [token, muat, tampilkanToast],
  );

  const reset = useCallback(() => {
    tampilkanToast("Data tersimpan di server, tidak bisa direset dari aplikasi.", "galat");
  }, [tampilkanToast]);

  // Halaman lama masih memanggil pilihPengguna; sesi sekarang hanya lewat masuk().
  const pilihPengguna = useCallback(
    (penggunaId: string) => {
      const p = data.pengguna.find((x) => x.id === penggunaId);
      if (p) void masuk(p.nama, "");
    },
    [data.pengguna, masuk],
  );

  const value: DemoContextValue = {
    state,
    siap,
    galatData: galat,
    penggunaAktif,
    wargaAktif,
    masuk,
    keluarSesi: keluar,
    sesiToken: token,
    pilihPengguna,
    simpanJadwal,
    publikasikanJadwal,
    hapusJadwal,
    catatKehadiran,
    ajukanPertukaran,
    tanggapiPertukaran,
    batalkanPertukaran,
    validasiPertukaran,
    simpanWarga,
    ubahStatusWarga,
    tandaiDibaca,
    tandaiSemuaDibaca,
    kirimPengingat,
    reset,
    toasts,
    tampilkanToast,
    tutupToast,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo harus dipakai di dalam DemoProvider");
  return ctx;
}
