"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";

export function DataWargaKetua() {
  const { state, simpanWarga, tampilkanToast } = useDemo();
  const [cari, setCari] = useState("");
  const [status, setStatus] = useState<"semua" | "aktif" | "nonaktif">("semua");
  const [form, setForm] = useState<null | { id?: string; nama: string; username: string; noHp: string; statusAkun: "aktif" | "nonaktif" }>(null);
  const [galat, setGalat] = useState<Record<string, string>>({});

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
      username: p?.username ?? "@",
      noHp: p?.noHp ?? "",
      statusAkun: p?.statusAkun ?? "aktif",
    });
    setGalat({});
  }

  function kirim() {
    if (!form) return;
    const g: Record<string, string> = {};
    if (form.nama.trim().length < 3) g.nama = "Nama lengkap wajib diisi (minimal 3 karakter).";
    if (!/^@[\w.]{3,}$/.test(form.username.trim())) g.username = "Username diawali @, minimal 4 karakter tanpa spasi.";
    if (form.noHp.replace(/\D/g, "").length < 9) g.noHp = "Nomor HP tidak valid. Contoh: 0812-0000-0101.";
    const dup = state.pengguna.find(
      (p) => p.username.toLowerCase() === form.username.trim().toLowerCase() && p.id !== form.id,
    );
    if (dup) g.username = "Username sudah dipakai warga lain.";
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    simpanWarga({
      id: form.id,
      nama: form.nama.trim(),
      username: form.username.trim(),
      noHp: form.noHp.trim(),
      statusAkun: form.statusAkun,
    });
    tampilkanToast(form.id ? `Data ${form.nama.trim()} diperbarui.` : `${form.nama.trim()} ditambahkan sebagai warga.`);
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

      <DemoNotice ringkas />

      <Card padding={false}>
        <div className="flex flex-col gap-2.5 border-b border-line p-4 sm:flex-row sm:items-center">
          <Input
            id="cari-warga"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama, username, atau nomor HP"
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
                    <th scope="col" className="px-4 py-2.5 font-semibold">Username</th>
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
                          <span className="text-[13.5px] font-medium text-ink">{w.nama}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#41504a]">{w.username}</td>
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
                      {w.username} · {w.noHp}
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
            <Button onClick={() => setForm(null)}>Batal</Button>
            <Button varian="utama" onClick={kirim}>
              {form?.id ? "Simpan perubahan" : "Simpan warga"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-3">
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
              <Field id="username-warga" label="Username" wajib galat={galat.username} petunjuk="dipakai untuk login">
                <Input
                  id="username-warga"
                  value={form.username}
                  galat={galat.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="@ahmad.f"
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
            <Field id="status-akun" label="Status akun">
              <Select
                id="status-akun"
                value={form.statusAkun}
                onChange={(e) => setForm({ ...form, statusAkun: e.target.value as "aktif" | "nonaktif" })}
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
