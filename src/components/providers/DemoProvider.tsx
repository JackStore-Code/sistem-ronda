"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { buildInitialState } from "@/lib/seed";
import type {
  DetailJadwal,
  JadwalRonda,
  Notifikasi,
  Pengguna,
  PertukaranJadwal,
  State,
  StatusKehadiran,
} from "@/lib/types";

const STORAGE_KEY = "ronda-warga:v1";

type Toast = { id: number; pesan: string; nada?: "sukses" | "galat" };

type BuatJadwalInput = {
  id?: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
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

type DemoContextValue = {
  state: State;
  siap: boolean;
  penggunaAktif: Pengguna;
  wargaAktif: Pengguna[];
  // sesi (hanya diisi lewat halaman login)
  pilihPengguna: (penggunaId: string) => void;
  keluarSesi: () => void;
  // jadwal
  simpanJadwal: (input: BuatJadwalInput) => { ok: boolean; id?: string; pesan?: string };
  publikasikanJadwal: (jadwalId: string) => void;
  hapusJadwal: (jadwalId: string) => void;
  catatKehadiran: (detailId: string, status: StatusKehadiran) => void;
  // pertukaran
  ajukanPertukaran: (input: AjukanTukarInput) => { ok: boolean; id?: string; pesan?: string };
  tanggapiPertukaran: (id: string, setuju: boolean, alasanPenolakan?: string) => void;
  batalkanPertukaran: (id: string) => void;
  validasiPertukaran: (id: string, setuju: boolean, alasanPenolakan?: string) => void;
  // warga
  simpanWarga: (input: Omit<Pengguna, "id" | "role"> & { id?: string }) => void;
  // notifikasi
  tandaiDibaca: (id: string) => void;
  tandaiSemuaDibaca: (penerimaId: string) => void;
  kirimPengingat: (jadwalId: string) => void;
  // utilitas
  reset: () => void;
  toasts: Toast[];
  tampilkanToast: (pesan: string, nada?: "sukses" | "galat") => void;
  tutupToast: (id: number) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function jamSekarang(): string {
  const d = new Date();
  return `${`${d.getHours()}`.padStart(2, "0")}.${`${d.getMinutes()}`.padStart(2, "0")}`;
}

function isoTanggalSekarang(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // Saat render pertama, sesi harus dianggap belum login. Data localStorage baru
  // dibaca di effect; tanpa ini halaman sempat dirender sebagai Ketua RT
  // sehingga penjaga rute tidak bisa membedakan "belum login" dari "login".
  const [state, setState] = useState<State>(() => ({
    ...buildInitialState(),
    sesi: { penggunaId: "" },
  }));
  const [siap, setSiap] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed && Array.isArray(parsed.pengguna) && parsed.pengguna.length > 0) {
          setState(parsed);
        }
      }
    } catch {
      /* data lokal rusak: pakai data demo awal */
    }
    setSiap(true);
  }, []);

  useEffect(() => {
    if (!siap) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* penyimpanan penuh/tidak tersedia: tetap jalan di memori */
    }
  }, [state, siap]);

  const tampilkanToast = useCallback((pesan: string, nada: "sukses" | "galat" = "sukses") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, pesan, nada }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);

  const tutupToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const penggunaAktif = useMemo(
    () => state.pengguna.find((p) => p.id === state.sesi.penggunaId) ?? state.pengguna[0],
    [state.pengguna, state.sesi.penggunaId],
  );

  const wargaAktif = useMemo(
    () => state.pengguna.filter((p) => p.role === "warga" && p.statusAkun === "aktif"),
    [state.pengguna],
  );

  // Sesi hanya bisa diisi lewat halaman login. Tidak ada saklar peran atau
  // pemilih warga, sehingga akun Ketua RT dan warga benar-benar terpisah.
  const pilihPengguna = useCallback((penggunaId: string) => {
    setState((prev) =>
      prev.pengguna.some((p) => p.id === penggunaId) ? { ...prev, sesi: { ...prev.sesi, penggunaId } } : prev,
    );
  }, []);

  const keluarSesi = useCallback(() => {
    setState((prev) => ({ ...prev, sesi: { penggunaId: "" } }));
  }, []);

  const tambahAktivitas = (prev: State, teks: string): State["aktivitas"] => [
    {
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      waktu: jamSekarang(),
      teks,
      tanggal: isoTanggalSekarang(),
    },
    ...prev.aktivitas,
  ].slice(0, 12);

  let nomorNotifikasi = 0;
  const tambahNotifikasi = (
    prev: State,
    notif: Omit<Notifikasi, "id" | "waktu" | "dibaca">,
  ): Notifikasi[] => [
    {
      id: `n-${Date.now()}-${(nomorNotifikasi++).toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      waktu: new Date().toISOString().slice(0, 16),
      dibaca: false,
      ...notif,
    },
    ...prev.notifikasi,
  ];

  const simpanJadwal = useCallback(
    (input: BuatJadwalInput) => {
      if (!input.tanggal) return { ok: false, pesan: "Tanggal ronda wajib diisi." };
      if (!input.waktuMulai) return { ok: false, pesan: "Waktu mulai wajib diisi." };
      if (!input.waktuSelesai) return { ok: false, pesan: "Waktu selesai wajib diisi." };
      if (input.petugasIds.length === 0) return { ok: false, pesan: "Pilih minimal satu warga bertugas." };

      const bentrok = state.jadwal.find((j) => j.tanggal === input.tanggal && j.id !== input.id);
      if (bentrok) return { ok: false, pesan: "Sudah ada jadwal ronda pada tanggal tersebut." };

      const id = input.id ?? `j-${Date.now()}`;
      setState((prev) => {
        const status = input.publikasikan ? "dipublikasikan" : "draft";
        const baru: JadwalRonda = {
          id,
          tanggal: input.tanggal,
          waktuMulai: input.waktuMulai,
          waktuSelesai: input.waktuSelesai,
          lokasi: "Pos ronda RT 05",
          status,
          dipublikasikanPada: input.publikasikan ? new Date().toISOString().slice(0, 16) : undefined,
        };
        const jadwal = input.id
          ? prev.jadwal.map((j) => (j.id === input.id ? { ...j, ...baru, dipublikasikanPada: baru.dipublikasikanPada ?? j.dipublikasikanPada } : j))
          : [...prev.jadwal, baru];
        const detailLain = prev.detailJadwal.filter((d) => d.jadwalId !== id);
        const detailBaru: DetailJadwal[] = input.petugasIds.map((wargaId, i) => ({
          id: `d-${id}-${wargaId}-${i}`,
          jadwalId: id,
          wargaId,
          statusKehadiran: "belum-dicatat",
        }));
        const tanggalTeks = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long" }).format(
          new Date(`${input.tanggal}T00:00:00`),
        );
        return {
          ...prev,
          jadwal,
          detailJadwal: [...detailLain, ...detailBaru],
          aktivitas: tambahAktivitas(
            prev,
            input.id
              ? `Jadwal ${tanggalTeks} diperbarui (${input.petugasIds.length} petugas).`
              : `Jadwal ${tanggalTeks} dibuat untuk ${input.petugasIds.length} petugas.`,
          ),
        };
      });
      return { ok: true, id };
    },
    [state.jadwal],
  );

  const publikasikanJadwal = useCallback(
    (jadwalId: string) => {
      setState((prev) => {
        const jadwal = prev.jadwal.find((j) => j.id === jadwalId);
        if (!jadwal) return prev;
        const jumlah = prev.detailJadwal.filter((d) => d.jadwalId === jadwalId).length;
        const tanggalTeks = new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
        }).format(new Date(`${jadwal.tanggal}T00:00:00`));
        let next: State = {
          ...prev,
          jadwal: prev.jadwal.map((j) =>
            j.id === jadwalId
              ? { ...j, status: "dipublikasikan", dipublikasikanPada: new Date().toISOString().slice(0, 16) }
              : j,
          ),
          aktivitas: tambahAktivitas(prev, `Jadwal ${tanggalTeks} dipublikasikan untuk ${jumlah} petugas.`),
        };
        next = {
          ...next,
          notifikasi: tambahNotifikasi(next, {
            judul: `Jadwal ${tanggalTeks} telah dipublikasikan`,
            pesan: `Pengingat jadwal dikirim kepada ${jumlah} warga yang bertugas.`,
            kategori: "perubahan-jadwal",
            tautan: `jadwal/${jadwalId}`,
          }),
        };
        return next;
      });
    },
    [],
  );

  const hapusJadwal = useCallback((jadwalId: string) => {
    setState((prev) => ({
      ...prev,
      jadwal: prev.jadwal.filter((j) => j.id !== jadwalId),
      detailJadwal: prev.detailJadwal.filter((d) => d.jadwalId !== jadwalId),
    }));
  }, []);

  const catatKehadiran = useCallback((detailId: string, status: StatusKehadiran) => {
    setState((prev) => ({
      ...prev,
      detailJadwal: prev.detailJadwal.map((d) =>
        d.id === detailId
          ? {
              ...d,
              statusKehadiran: status,
              waktuDicatat: status === "belum-dicatat" ? undefined : jamSekarang(),
            }
          : d,
      ),
    }));
  }, []);

  const ajukanPertukaran = useCallback(
    (input: AjukanTukarInput) => {
      if (!input.jadwalAsalId) return { ok: false, pesan: "Pilih jadwal asal Anda." };
      if (!input.jadwalTujuanId) return { ok: false, pesan: "Pilih jadwal tujuan." };
      if (input.jadwalAsalId === input.jadwalTujuanId)
        return { ok: false, pesan: "Jadwal asal dan tujuan tidak boleh sama." };
      if (!input.wargaTujuanId) return { ok: false, pesan: "Pilih warga tujuan pertukaran." };
      if (input.alasan.trim().length < 10)
        return { ok: false, pesan: "Alasan pertukaran wajib diisi (minimal 10 karakter)." };

      const id = `PT-${Date.now().toString().slice(-6)}`;
      setState((prev) => {
        const baru: PertukaranJadwal = {
          id,
          pemohonId: input.pemohonId,
          jadwalAsalId: input.jadwalAsalId,
          wargaTujuanId: input.wargaTujuanId,
          jadwalTujuanId: input.jadwalTujuanId,
          alasan: input.alasan.trim(),
          status: "menunggu-warga",
          diajukanPada: new Date().toISOString().slice(0, 16),
        };
        const namaPemohon = prev.pengguna.find((p) => p.id === input.pemohonId)?.nama ?? "Seorang warga";
        const namaTujuan = prev.pengguna.find((p) => p.id === input.wargaTujuanId)?.nama ?? "warga tujuan";
        let next: State = {
          ...prev,
          pertukaran: [baru, ...prev.pertukaran],
          aktivitas: tambahAktivitas(
            prev,
            `Pengajuan pertukaran ${id} dikirim ke ${namaTujuan}. Menunggu tanggapan warga tujuan.`,
          ),
        };
        next = {
          ...next,
          notifikasi: tambahNotifikasi(next, {
            judul: "Permintaan pertukaran jadwal",
            pesan: `${namaPemohon} mengajukan pertukaran jadwal dengan Anda.`,
            kategori: "pertukaran",
            penerimaId: input.wargaTujuanId,
            tautan: `pertukaran/${id}`,
          }),
        };
        return next;
      });
      return { ok: true, id };
    },
    [],
  );

  const tanggapiPertukaran = useCallback((id: string, setuju: boolean, alasanPenolakan?: string) => {
    setState((prev) => {
      const item = prev.pertukaran.find((p) => p.id === id);
      if (!item) return prev;
      const namaPemohon = prev.pengguna.find((p) => p.id === item.pemohonId)?.nama ?? "warga";
      const namaTujuan = prev.pengguna.find((p) => p.id === item.wargaTujuanId)?.nama ?? "warga tujuan";
      const pertukaran = prev.pertukaran.map((p) =>
        p.id === id
          ? {
              ...p,
              status: (setuju ? "menunggu-validasi" : "ditolak") as PertukaranJadwal["status"],
              ditanggapiPada: new Date().toISOString().slice(0, 16),
              alasanPenolakan: setuju
                ? undefined
                : alasanPenolakan?.trim() || "Permintaan ditolak oleh warga tujuan.",
              ditolakOleh: setuju ? undefined : ("warga" as const),
            }
          : p,
      );
      let next: State = {
        ...prev,
        pertukaran,
        aktivitas: tambahAktivitas(
          prev,
          setuju
            ? `${namaTujuan} menyetujui pertukaran ${item.id}. Menunggu validasi Ketua RT.`
            : `${namaTujuan} menolak pertukaran ${item.id}. Jadwal tidak berubah.`,
        ),
      };
      next = {
        ...next,
        notifikasi: tambahNotifikasi(next, {
          judul: setuju ? "Pertukaran menunggu validasi Anda" : "Pertukaran ditolak warga tujuan",
          pesan: setuju
            ? `${namaPemohon} dan ${namaTujuan} telah menyetujui pertukaran. Tinjau sebelum jadwal diperbarui.`
            : `${namaTujuan} menolak permintaan ${namaPemohon}. Jadwal tetap seperti semula.`,
          kategori: "pertukaran",
          penerimaId: "budi",
          tautan: `pertukaran/${item.id}`,
        }),
      };
      if (!setuju) {
        next = {
          ...next,
          notifikasi: tambahNotifikasi(next, {
            judul: "Permintaan pertukaran ditolak",
            pesan: `${namaTujuan} menolak permintaan Anda. Jadwal Anda tidak berubah.`,
            kategori: "pertukaran",
            penerimaId: item.pemohonId,
            tautan: `pertukaran/${item.id}`,
          }),
        };
      }
      return next;
    });
  }, []);

  const batalkanPertukaran = useCallback((id: string) => {
    setState((prev) => {
      const item = prev.pertukaran.find((p) => p.id === id);
      if (!item) return prev;
      return {
        ...prev,
        pertukaran: prev.pertukaran.filter((p) => p.id !== id),
        aktivitas: tambahAktivitas(prev, `Pengajuan pertukaran ${id} dibatalkan oleh pemohon.`),
      };
    });
  }, []);

  const validasiPertukaran = useCallback((id: string, setuju: boolean, alasanPenolakan?: string) => {
    setState((prev) => {
      const item = prev.pertukaran.find((p) => p.id === id);
      if (!item) return prev;
      const namaPemohon = prev.pengguna.find((p) => p.id === item.pemohonId)?.nama ?? "warga";
      const namaTujuan = prev.pengguna.find((p) => p.id === item.wargaTujuanId)?.nama ?? "warga tujuan";
      let detailJadwal = prev.detailJadwal;

      if (setuju) {
        // tukar tempat kedua petugas pada jadwal masing-masing
        detailJadwal = prev.detailJadwal.map((d) => {
          if (d.jadwalId === item.jadwalAsalId && d.wargaId === item.pemohonId) {
            return { ...d, wargaId: item.wargaTujuanId };
          }
          if (d.jadwalId === item.jadwalTujuanId && d.wargaId === item.wargaTujuanId) {
            return { ...d, wargaId: item.pemohonId };
          }
          return d;
        });
      }

      const pertukaran = prev.pertukaran.map((p) =>
        p.id === id
          ? {
              ...p,
              status: (setuju ? "disetujui" : "ditolak") as PertukaranJadwal["status"],
              divalidasiPada: new Date().toISOString().slice(0, 16),
              alasanPenolakan: setuju ? undefined : alasanPenolakan?.trim() || "Ditolak Ketua RT.",
              ditolakOleh: setuju ? undefined : ("ketua" as const),
            }
          : p,
      );

      let next: State = {
        ...prev,
        pertukaran,
        detailJadwal,
        aktivitas: tambahAktivitas(
          prev,
          setuju
            ? `Pertukaran ${item.id} disetujui Ketua RT. ${namaTujuan} bertugas pada jadwal ${namaPemohon}.`
            : `Pertukaran ${item.id} ditolak Ketua RT. Jadwal tidak berubah.`,
        ),
      };

      const judul = setuju ? "Pertukaran disetujui" : "Pertukaran ditolak";
      const pesan = setuju
        ? `Jadwal Anda telah diperbarui otomatis setelah validasi Ketua RT.`
        : alasanPenolakan?.trim() || "Pengajuan ditolak Ketua RT. Jadwal tidak berubah.";
      next = {
        ...next,
        notifikasi: [
          ...tambahNotifikasi(next, {
            judul,
            pesan,
            kategori: "pertukaran",
            penerimaId: item.pemohonId,
            tautan: `pertukaran/${item.id}`,
          }),
          ...tambahNotifikasi(next, {
            judul,
            pesan,
            kategori: "pertukaran",
            penerimaId: item.wargaTujuanId,
            tautan: `pertukaran/${item.id}`,
          }),
        ],
      };
      return next;
    });
  }, []);

  const simpanWarga = useCallback(
    (input: Omit<Pengguna, "id" | "role"> & { id?: string }) => {
      setState((prev) => {
        if (input.id) {
          return {
            ...prev,
            pengguna: prev.pengguna.map((p) => (p.id === input.id ? { ...p, ...input } : p)),
            aktivitas: tambahAktivitas(prev, `Data ${input.nama} diperbarui.`),
          };
        }
        const baru: Pengguna = {
          id: `w-${Date.now()}`,
          role: "warga",
          nama: input.nama,
          username: input.username,
          noHp: input.noHp,
          statusAkun: input.statusAkun,
        };
        return {
          ...prev,
          pengguna: [...prev.pengguna, baru],
          aktivitas: tambahAktivitas(prev, `${input.nama} ditambahkan sebagai warga.`),
        };
      });
    },
    [],
  );

  const tandaiDibaca = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifikasi: prev.notifikasi.map((n) => (n.id === id ? { ...n, dibaca: true } : n)),
    }));
  }, []);

  const tandaiSemuaDibaca = useCallback((penerimaId: string) => {
    setState((prev) => ({
      ...prev,
      notifikasi: prev.notifikasi.map((n) =>
        !n.penerimaId || n.penerimaId === penerimaId ? { ...n, dibaca: true } : n,
      ),
    }));
  }, []);

  const kirimPengingat = useCallback((jadwalId: string) => {
    setState((prev) => {
      const jadwal = prev.jadwal.find((j) => j.id === jadwalId);
      if (!jadwal) return prev;
      const jumlah = prev.detailJadwal.filter((d) => d.jadwalId === jadwalId).length;
      const tanggalTeks = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long" }).format(
        new Date(`${jadwal.tanggal}T00:00:00`),
      );
      let next: State = {
        ...prev,
        aktivitas: tambahAktivitas(prev, `Pengingat ronda ${tanggalTeks} dikirim ke ${jumlah} petugas.`),
      };
      next = {
        ...next,
        notifikasi: tambahNotifikasi(next, {
          judul: `Pengingat ronda ${tanggalTeks}`,
          pesan: `Ronda dimulai pukul ${jadwal.waktuMulai} WIB di ${jadwal.lokasi}.`,
          kategori: "pengingat",
          tautan: `jadwal/${jadwalId}`,
        }),
      };
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(buildInitialState());
  }, []);

  const value: DemoContextValue = {
    state,
    siap,
    penggunaAktif,
    wargaAktif,
    pilihPengguna,
    keluarSesi,
    simpanJadwal,
    publikasikanJadwal,
    hapusJadwal,
    catatKehadiran,
    ajukanPertukaran,
    tanggapiPertukaran,
    batalkanPertukaran,
    validasiPertukaran,
    simpanWarga,
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
