"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/providers/DemoProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ToastHost } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { state, siap, masuk: masukAkun, tampilkanToast } = useDemo();
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [pesanGalat, setPesanGalat] = useState("");
  const [memproses, setMemproses] = useState(false);

  // Sudah masuk: langsung ke area sesuai peran akun (tidak bisa lompat peran).
  const sesiAktif = state.pengguna.find((p) => p.id === state.sesi.penggunaId && p.statusAkun === "aktif");
  useEffect(() => {
    if (siap && sesiAktif) {
      router.replace(sesiAktif.role === "ketua" ? "/admin/ringkasan" : "/warga/ringkasan");
    }
  }, [siap, sesiAktif, router]);

  async function masuk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemproses(true);
    const hasil = await masukAkun(nama, password);
    setMemproses(false);
    if (!hasil.ok) {
      const pesan = hasil.pesan ?? "Username atau kata sandi tidak cocok.";
      setPesanGalat(pesan);
      tampilkanToast(pesan, "galat");
      return;
    }
    router.push(hasil.role === "ketua" ? "/admin/ringkasan" : "/warga/ringkasan");
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
        <h1 className="text-2xl font-semibold text-ink">Masuk ke akun</h1>
        <p className="mt-1 text-sm text-muted">Tulis username akun Anda, lalu kata sandi.</p>
        <form onSubmit={masuk} className="mt-6 space-y-4" noValidate>
          <Field id="nama-login" label="Username" wajib>
            <Input id="nama-login" autoComplete="username" autoCapitalize="none" value={nama} onChange={(e) => { setNama(e.target.value); setPesanGalat(""); }} placeholder="contoh: fajar" required />
          </Field>
          <Field id="password-login" label="Kata sandi" wajib>
            <Input id="password-login" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setPesanGalat(""); }} placeholder="Kata sandi akun" required />
          </Field>
          {pesanGalat ? (
            <p role="alert" aria-live="assertive" className="rounded-lg border border-[#f2cfcc] bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {pesanGalat}
            </p>
          ) : null}
          <Button type="submit" varian="utama" className="w-full" disabled={memproses}>
            {memproses ? "Memeriksa…" : "Masuk"}
          </Button>
        </form>
        <div className="mt-5 rounded-lg border border-line bg-[#fbfcfa] p-3 text-xs leading-5 text-muted">
          Username tidak peka huruf besar/kecil (fajar = Fajar). Sandi hanya huruf kecil dan angka. Akun Ketua RT dan akun warga terpisah.
        </div>
      </section>
    </main>
    <ToastHost />
    </>
  );
}
