"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";

/** Username untuk akun baru: nama depan, huruf kecil, tanpa tanda @. */
export function usernameDariNama(nama: string) {
  return nama.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9._]/g, "");
}

export function DataWargaKetua() {
  const { state, simpanWarga, ubahStatusWarga, tampilkanToast } = useDemo();
  const [cari, setCari] = useState("");
  const [status, setStatus] = useState<"semua" | "aktif" | "nonaktif">("semua");
  const [form, setForm] = useState<null | { id?: string; nama: string; kataSandi: string; noHp: string; statusAkun: "aktif" | "nonaktif" }>(null);
  const [galat, setGalat] = useState<Record<string, string>>({});
  // Status akun hanya boleh diubah setelah Ketua RT mengonfirmasi dengan sandinya.
  const [sandiKonfirmasi, setSandiKonfirmasi] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return state.pengguna
      .filter((p) => p.role === "warga")
      .filter((p) => (status === "semua" ? true : p.statusAkun === status))
      .filter((p) => {
        if (!q) return true;
        return (
          p.nama.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q) ||
          p.noHp.includes(q)
        );
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [state.pengguna, cari, status]);

  const totalAktif = state.pengguna.filter((p) => p.role === "warga" && p.statusAkun === "aktif").length;

  function bukaForm(p?: (typeof state.pengguna)[number]) {
    setForm({
      id: p?.id,
      nama: p?.nama ?? "",
      kataSandi: p?.kataSandi ?? "",
      noHp: p?.noHp ?? "",
      statusAkun: p?.statusAkun ?? "aktif",
    });
    setGalat({});
    setSandiKonfirmasi("");
  }

  async function kirim() {
    if (!form || menyimpan) return;
    const g: Record<string, string> = {};
    if (form.nama.trim().split(/\s+/).filter(Boolean).length < 2)
      g.nama = "Tulis nama lengkap (minimal nama depan dan belakang).";
    if (form.noHp.replace(/\D/g, "").length < 9) g.noHp = "Nomor HP tidak valid. Contoh: 0812-0000-0101.";

    const rapikan = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
    const dup = state.pengguna.find((p) => rapikan(p.nama) === rapikan(form.nama) && p.id !== form.id);
    if (dup) g.nama = "Nama lengkap ini sudah dipakai akun lain.";

    // Akun baru wajib punya kata sandi; saat mengedit boleh dikosongkan (tidak diubah).
    if (!form.id) {
      if (form.kataSandi.trim().length < 6) g.kataSandi = "Kata sandi minimal 6 karakter.";
      else if (!/^[a-z0-9]+$/.test(form.kataSandi.trim()))
        g.kataSandi = "Kata sandi hanya huruf kecil dan angka, tanpa spasi.";
    } else if (form.kataSandi.trim()) {
      if (form.kataSandi.trim().length < 6) g.kataSandi = "Kata sandi minimal 6 karakter.";
      else if (!/^[a-z0-9]+$/.test(form.kataSandi.trim()))
        g.kataSandi = "Kata sandi hanya huruf kecil dan angka, tanpa spasi.";
    }

    // Ganti status aktif/nonaktif butuh konfirmasi sandi Ketua RT.
    const statusBerubah =
      Boolean(form.id) && state.pengguna.find((p) => p.id === form.id)?.statusAkun !== form.statusAkun;
    if (statusBerubah && sandiKonfirmasi.trim().length < 6)
      g.konfirmasi = "Masukkan kata sandi Anda untuk mengonfirmasi perubahan status akun.";

    setGalat(g);
    if (Object.keys(g).length > 0) return;

    setMenyimpan(true);
    if (statusBerubah) {
      const res = await ubahStatusWarga(form.id!, form.statusAkun, sandiKonfirmasi);
      if (!res.ok) {
        setMenyimpan(false);
        setGalat({ konfirmasi: res.pesan ?? "Kata sandi Anda tidak cocok." });
        tampilkanToast(res.pesan ?? "Kata sandi Anda tidak cocok.", "galat");
        return;
      }
      // Perubahan lain (nama, HP, sandi baru) ikut disimpan bila diisi.
      const namaBaruStatus = form.nama.trim().replace(/\s+/g, " ");
      const adaPerubahanLain =
        namaBaruStatus !== state.pengguna.find((p) => p.id === form.id)?.nama ||
        form.noHp.trim() !== state.pengguna.find((p) => p.id === form.id)?.noHp ||
        form.kataSandi.trim().length > 0;
      if (adaPerubahanLain) {
        await simpanWarga({
          id: form.id,
          nama: namaBaruStatus,
          username: usernameDariNama(namaBaruStatus),
          kataSandi: form.kataSandi.trim(),
          noHp: form.noHp.trim(),
          statusAkun: form.statusAkun,
        });
      }
      setMenyimpan(false);
      tampilkanToast(`Akun ${namaBaruStatus} sekarang ${form.statusAkun}.`);
      setForm(null);
      return;
    }

    const namaBaru = form.nama.trim().replace(/\s+/g, " ");
    const hasil = await simpanWarga({
      id: form.id,
      nama: namaBaru,
      username: usernameDariNama(namaBaru),
      kataSandi: form.kataSandi.trim(),
      noHp: form.noHp.trim(),
      statusAkun: form.statusAkun,
    });
    setMenyimpan(false);
    if (!hasil.ok) {
      setGalat({ umum: hasil.pesan ?? "Perubahan gagal disimpan." });
      return;
    }
    tampilkanToast(form.id ? `Data ${namaBaru} diperbarui.` : `${namaBaru} ditambahkan sebagai warga.`);
    setForm(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Data Warga</p>
            <Badge nada="brand" dot={false}>Khusus Ketua RT</Badge>
          </div>
          <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">Data warga RT 05</h1>
          <p className="mt-1 text-[13px] text-muted">
            {totalAktif} warga aktif · {state.pengguna.filter((p) => p.role === "warga").length} warga terdaftar
          </p>
        </div>
        <Button varian="utama" onClick={() => bukaForm()}>
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          Tambah warga
        </Button>
      </div>


      <Card padding={false}>
        <div className="flex flex-col gap-2.5 border-b border-line p-4 sm:flex-row sm:items-center">
          <Input
            id="cari-warga"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau nomor HP"
            aria-label="Cari warga"
            className="flex-1"
          />
          <Select
            id="status-warga"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            aria-label="Filter status akun"
            className="sm:w-auto sm:min-w-[160px]"
          >
            <option value="semua">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </Select>
        </div>

        {daftar.length === 0 ? (
          <div className="p-4">
            <EmptyState
              ikon="people"
              judul="Warga tidak ditemukan"
              deskripsi="Ubah kata kunci pencarian, atau tambahkan warga baru ke lingkungan RT."
              aksi={<Button varian="utama" ukuran="sm" onClick={() => bukaForm()}>Tambah warga</Button>}
            />
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-[#fbfcfa] text-[11.5px] uppercase tracking-[0.04em] text-muted">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Nama</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Kata sandi</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Nomor HP</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Status akun</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((w) => (
                    <tr key={w.id} className="border-b border-line last:border-0 hover:bg-[#fbfcfa]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-brand">
                            {w.nama.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                          </span>
                          <span className="min-w-0"><span className="block text-[13.5px] font-medium text-ink">{w.nama}</span><span className="block font-mono text-[12px] text-muted">{w.username}</span></span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-[#41504a]">{w.kataSandi}</td>
                      <td className="px-4 py-3 text-[13px] text-[#41504a]">{w.noHp}</td>
                      <td className="px-4 py-3">
                        {w.statusAkun === "aktif" ? (
                          <Badge nada="brand">Aktif</Badge>
                        ) : (
                          <Badge nada="neutral">Nonaktif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button ukuran="sm" onClick={() => bukaForm(w)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line lg:hidden">
              {daftar.map((w) => (
                <li key={w.id} className="flex items-center gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">
                    {w.nama.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{w.nama}</p>
                    <p className="text-[12px] text-muted">
                      <span className="font-mono">{w.username}</span> · Sandi <span className="font-mono">{w.kataSandi}</span> · {w.noHp}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {w.statusAkun === "aktif" ? <Badge nada="brand">Aktif</Badge> : <Badge nada="neutral">Nonaktif</Badge>}
                    <Button ukuran="sm" onClick={() => bukaForm(w)} aria-label={`Edit ${w.nama}`}>Edit</Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <p className="px-1 text-[12px] leading-4 text-muted">
        Warga nonaktif tidak muncul pada pilihan petugas ronda, tetapi riwayat kehadirannya tetap tersimpan.
      </p>

      <Dialog
        buka={form !== null}
        onTutup={() => setForm(null)}
        judul={form?.id ? "Edit data warga" : "Tambah warga baru"}
        deskripsi="Data ini hanya terlihat oleh Ketua RT. Warga tidak dapat menambah anggota sendiri."
        aksi={
          <>
            <Button onClick={() => setForm(null)} disabled={menyimpan}>
              Batal
            </Button>
            <Button varian="utama" onClick={kirim} disabled={menyimpan}>
              {menyimpan ? "Menyimpan…" : form?.id ? "Simpan perubahan" : "Simpan warga"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-3">
            {galat.umum ? (
              <p role="alert" className="rounded-lg border border-[#f2cfcc] bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger">
                {galat.umum}
              </p>
            ) : null}
            <Field id="nama-warga" label="Nama lengkap" wajib galat={galat.nama}>
              <Input
                id="nama-warga"
                value={form.nama}
                galat={galat.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Contoh: Ahmad Fauzi"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="sandi-warga"
                label={form.id ? "Kata sandi baru" : "Kata sandi"}
                wajib={!form.id}
                galat={galat.kataSandi}
                petunjuk={
                  form.id
                    ? "kosongkan bila tidak ingin mengganti sandi"
                    : "huruf kecil & angka, dipakai bersama username akun"
                }
              >
                <Input
                  id="sandi-warga"
                  value={form.kataSandi}
                  galat={galat.kataSandi}
                  onChange={(e) => setForm({ ...form, kataSandi: e.target.value })}
                  placeholder={form.id ? "Kosongkan bila tidak diganti" : "contoh: 2510631250055"}
                  autoComplete="new-password"
                />
              </Field>
              <Field id="hp-warga" label="Nomor HP" wajib galat={galat.noHp} petunjuk="untuk notifikasi">
                <Input
                  id="hp-warga"
                  value={form.noHp}
                  galat={galat.noHp}
                  onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                  placeholder="0812-0000-0199"
                  inputMode="tel"
                />
              </Field>
            </div>
            <Field id="status-akun" label="Status akun" petunjuk="nonaktif = tidak bisa login & tidak muncul di pilihan petugas">
              <Select
                id="status-akun"
                value={form.statusAkun}
                onChange={(e) => setForm({ ...form, statusAkun: e.target.value as "aktif" | "nonaktif" })}
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>

            {form.id &&
            state.pengguna.find((p) => p.id === form.id)?.statusAkun !== form.statusAkun ? (
              <Field
                id="sandi-konfirmasi"
                label="Konfirmasi kata sandi Anda"
                wajib
                galat={galat.konfirmasi}
                petunjuk={`untuk ${form.statusAkun === "nonaktif" ? "menonaktifkan" : "mengaktifkan kembali"} akun ${form.nama}`}
              >
                <Input
                  id="sandi-konfirmasi"
                  type="password"
                  value={sandiKonfirmasi}
                  galat={galat.konfirmasi}
                  onChange={(e) => setSandiKonfirmasi(e.target.value)}
                  placeholder="Kata sandi akun Ketua RT"
                  autoComplete="current-password"
                />
              </Field>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
