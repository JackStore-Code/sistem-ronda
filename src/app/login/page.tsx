"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/providers/DemoProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ToastHost } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { state, siap, pilihPengguna, tampilkanToast } = useDemo();
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [pesanGalat, setPesanGalat] = useState("");

  // Sudah masuk: langsung ke area sesuai peran akun (tidak bisa lompat peran).
  const sesiAktif = state.pengguna.find((p) => p.id === state.sesi.penggunaId && p.statusAkun === "aktif");
  useEffect(() => {
    if (siap && sesiAktif) {
      router.replace(sesiAktif.role === "ketua" ? "/admin/ringkasan" : "/warga/ringkasan");
    }
  }, [siap, sesiAktif, router]);

  function masuk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const namaDicari = nama.trim().toLocaleLowerCase("id-ID");
    const pengguna = state.pengguna.find((p) =>
      p.statusAkun === "aktif" &&
      (p.nama.toLocaleLowerCase("id-ID") === namaDicari || p.username.replace(/^@/, "").toLocaleLowerCase("id-ID") === namaDicari)
    );
    if (!pengguna || password !== "ronda123") {
      setPesanGalat("Nama atau kata sandi demo tidak cocok.");
      tampilkanToast("Nama atau kata sandi demo tidak cocok.", "galat");
      return;
    }
    pilihPengguna(pengguna.id);
    router.push(pengguna.role === "ketua" ? "/admin/ringkasan" : "/warga/ringkasan");
  }

  return (
    <>
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-5h6v5"/></svg>
          </span>
          <div><p className="text-lg font-semibold text-ink">Ronda Warga</p><p className="text-sm text-muted">RT 05 / RW 03 Sukamaju</p></div>
        </div>
        <h1 className="text-2xl font-semibold text-ink">Masuk ke akun demo</h1>
        <p className="mt-1 text-sm text-muted">Gunakan nama warga atau username yang sudah tersedia.</p>
        <form onSubmit={masuk} className="mt-6 space-y-4" noValidate>
          <Field id="nama-login" label="Nama atau username" wajib>
            <Input id="nama-login" autoComplete="username" value={nama} onChange={(e) => { setNama(e.target.value); setPesanGalat(""); }} placeholder="Contoh: Budi Santoso atau budi.rt05" required />
          </Field>
          <Field id="password-login" label="Kata sandi" wajib>
            <Input id="password-login" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setPesanGalat(""); }} placeholder="Kata sandi demo" required />
          </Field>
          {pesanGalat ? (
            <p role="alert" aria-live="assertive" className="rounded-lg border border-[#f2cfcc] bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {pesanGalat}
            </p>
          ) : null}
          <Button type="submit" varian="utama" className="w-full">Masuk</Button>
        </form>
        <div className="mt-5 rounded-lg border border-line bg-[#fbfcfa] p-3 text-xs leading-5 text-muted">
          Mode demo: sandi untuk semua akun aktif adalah <strong className="text-ink">ronda123</strong>. Akun Ketua RT dan akun warga terpisah — masuk dengan akun yang ingin dipakai.
        </div>
      </section>
    </main>
    <ToastHost />
    </>
  );
}
