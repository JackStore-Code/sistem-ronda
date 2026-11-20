"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useDemo } from "../providers/DemoProvider";

type Item = { href: string; label: string; ikon: React.ReactNode; ketuaOnly?: boolean };

const IKON = {
  ringkasan: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  jadwal: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  kehadiran: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M8 12l2.5 2.5L16 9" />
    </>
  ),
  tukar: (
    <>
      <path d="M4 8h12l-3-3M20 16H8l3 3" />
    </>
  ),
  notifikasi: (
    <>
      <path d="M6 17V11a6 6 0 1 1 12 0v6l2 2H4z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  warga: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.4 2.8-5.6 6-5.6s6 2.2 6 5.6" />
      <path d="M16 9a2.8 2.8 0 0 1 0 5M17.5 15c2.1.6 3.5 2.4 3.5 5" />
    </>
  ),
};

function Ikon({ name }: { name: keyof typeof IKON }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {IKON[name]}
    </svg>
  );
}

export function Shell({ children, peran }: { children: React.ReactNode; peran: "ketua" | "warga" }) {
  return (
    <Suspense fallback={<KerangkaMemuat />}>
      <Cangkang peran={peran}>{children}</Cangkang>
    </Suspense>
  );
}

function KerangkaMemuat() {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-[248px] shrink-0 border-r border-line bg-surface md:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-14 border-b border-line bg-canvas md:h-16 md:bg-surface" />
        <main className="flex-1 px-4 pt-4 md:px-8 md:pt-6">
          <div className="mx-auto w-full max-w-[1180px]">
            <Memuat />
          </div>
        </main>
      </div>
    </div>
  );
}

function Cangkang({ children, peran }: { children: React.ReactNode; peran: "ketua" | "warga" }) {
  const { penggunaAktif, state, gantiPeran, siap } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const [menuProfil, setMenuProfil] = useState(false);
  const isKetua = penggunaAktif.role === "ketua";

  // Area aktif mengikuti layout rute, bukan peran sesi: Ketua RT pun bisa
  // membuka area warga untuk memeriksa tampilan tanpa keluar dari rute.
  const awalan = peran === "ketua" ? "/admin" : "/warga";

  const menu: Item[] = [
    { href: `${awalan}/ringkasan`, label: "Ringkasan", ikon: <Ikon name="ringkasan" /> },
    { href: `${awalan}/jadwal`, label: "Jadwal Ronda", ikon: <Ikon name="jadwal" /> },
    { href: `${awalan}/kehadiran`, label: "Kehadiran", ikon: <Ikon name="kehadiran" /> },
    { href: `${awalan}/pertukaran`, label: "Pertukaran Jadwal", ikon: <Ikon name="tukar" /> },
    { href: `${awalan}/notifikasi`, label: "Notifikasi", ikon: <Ikon name="notifikasi" /> },
    { href: `${awalan}/warga`, label: "Data Warga", ikon: <Ikon name="warga" />, ketuaOnly: true },
  ];

  // Data Warga hanya untuk Ketua RT — pada area warga menu ini tidak dirender sama sekali.
  const menuTampil = menu.filter((m) => (m.ketuaOnly ? peran === "ketua" && isKetua : true));
  const menuMobile = menuTampil.slice(0, 5);
  const kolomTab = menuMobile.length > 0 ? menuMobile.length : 1;

  const penerima = penggunaAktif.id;
  const belumDibaca = state.notifikasi.filter(
    (n) => !n.dibaca && (!n.penerimaId || n.penerimaId === penerima || penggunaAktif.role === "ketua"),
  ).length;

  function ganti(role: "ketua" | "warga") {
    gantiPeran(role);
    setMenuProfil(false);
    router.push(role === "ketua" ? "/admin/ringkasan" : "/warga/ringkasan");
  }

  const wargaPertama = state.pengguna.find((p) => p.role === "warga")?.nama.split(" ")[0] ?? "warga";

  function aktif(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const inisial = penggunaAktif.nama
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke konten
      </a>

      {/* Sidebar desktop */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface md:sticky md:top-0 md:flex md:h-dvh">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20V10l8-6 8 6v10" />
              <path d="M9 20v-5h6v5" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-5 text-ink">Ronda Warga</p>
            <p className="truncate text-[12px] leading-4 text-muted">RT 05 / RW 03 Sukamaju</p>
          </div>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {menuTampil.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  aria-current={aktif(m.href) ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors ${
                    aktif(m.href)
                      ? "bg-brand-soft font-semibold text-brand"
                      : "text-[#41504a] hover:bg-neutral-soft"
                  }`}
                >
                  {m.ikon}
                  <span className="flex-1 truncate">{m.label}</span>
                  {m.label === "Notifikasi" && belumDibaca > 0 ? (
                    <span className="min-w-5 rounded-full bg-attention px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
                      {belumDibaca}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {awalan === "/admin" ? (
            <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-2 text-[11.5px] leading-4 text-muted">
              Menu <span className="font-medium text-ink">Data Warga</span> hanya tersedia untuk Ketua RT.
            </p>
          ) : null}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
              {inisial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-5 text-ink">{penggunaAktif.nama}</p>
              <p className="truncate text-[11.5px] leading-4 text-muted">
                {isKetua ? "Ketua RT" : `Warga · ${penggunaAktif.noHp}`}
              </p>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-line bg-[#fbfcfa] p-2">
            <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted">Pratinjau peran</p>
            <div className="flex gap-1">
              {(["ketua", "warga"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => ganti(r)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors ${
                    (r === "ketua") === isKetua
                      ? "bg-brand text-white"
                      : "bg-surface text-[#41504a] border border-line hover:bg-neutral-soft"
                  }`}
                >
                  {r === "ketua" ? "Ketua RT" : "Warga"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          isKetua={isKetua}
          wargaPertama={wargaPertama}
          belumDibaca={belumDibaca}
          inisial={inisial}
          penggunaAktif={penggunaAktif}
          menuProfil={menuProfil}
          setMenuProfil={setMenuProfil}
          ganti={ganti}
          awalan={awalan}
        />
        <main id="konten-utama" className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">
          <div className={`mx-auto w-full ${awalan === "/admin" ? "max-w-[1180px]" : "max-w-[1080px]"}`}>
            {siap ? children : <Memuat />}
          </div>
        </main>
      </div>

      <TabBar menu={menuMobile} belumDibaca={belumDibaca} siap={siap} kolom={kolomTab} />
    </div>
  );
}

function Header({
  isKetua,
  wargaPertama,
  belumDibaca,
  inisial,
  penggunaAktif,
  menuProfil,
  setMenuProfil,
  ganti,
  awalan,
}: {
  isKetua: boolean;
  wargaPertama: string;
  belumDibaca: number;
  inisial: string;
  penggunaAktif: { nama: string; role: string; noHp: string };
  menuProfil: boolean;
  setMenuProfil: (v: boolean) => void;
  ganti: (r: "ketua" | "warga") => void;
  awalan: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur md:bg-surface">
      <div className="flex h-14 items-center gap-3 px-4 md:h-16 md:px-8">
        <div className="flex items-center gap-2 md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20V10l8-6 8 6v10" />
              <path d="M9 20v-5h6v5" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold">Ronda Warga</span>
        </div>
        <div className="hidden min-w-0 md:block">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${isKetua ? "bg-brand" : "bg-attention"}`} />
            {isKetua ? "Sesi Ketua RT" : "Sesi Warga"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`${awalan}/notifikasi`}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-[#41504a] hover:bg-neutral-soft"
            aria-label={`Notifikasi${belumDibaca > 0 ? `, ${belumDibaca} belum dibaca` : ""}`}
          >
            <Ikon name="notifikasi" />
            {belumDibaca > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-attention px-1 text-center text-[10.5px] font-semibold leading-[18px] text-white">
                {belumDibaca}
              </span>
            ) : null}
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuProfil(!menuProfil)}
              aria-expanded={menuProfil}
              aria-haspopup="menu"
              className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface pl-1 pr-2.5 hover:bg-neutral-soft"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-[12px] font-semibold text-brand">
                {inisial}
              </span>
              <span className="hidden max-w-[120px] truncate text-[13px] font-medium md:block">
                {penggunaAktif.nama.split(" ")[0]}
              </span>
              <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3 text-muted">
                <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {menuProfil ? (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuProfil(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgba(15,29,22,0.14)]"
                >
                  <div className="border-b border-line px-3.5 py-3">
                    <p className="text-[13px] font-semibold text-ink">{penggunaAktif.nama}</p>
                    <p className="text-[12px] text-muted">
                      {penggunaAktif.role === "ketua" ? "Ketua RT 05" : `Warga · ${penggunaAktif.noHp}`}
                    </p>
                  </div>
                  <div className="px-1.5 py-1.5">
                    <Link
                      href={`${awalan}/pengaturan`}
                      role="menuitem"
                      onClick={() => setMenuProfil(false)}
                      className="flex min-h-9 items-center rounded-md px-2.5 text-[13px] text-ink hover:bg-neutral-soft"
                    >
                      Pengaturan akun
                    </Link>
                    <button
                      role="menuitem"
                      onClick={() => ganti(isKetua ? "warga" : "ketua")}
                      className="flex min-h-9 w-full items-center rounded-md px-2.5 text-[13px] text-ink hover:bg-neutral-soft"
                    >
                      Masuk sebagai {isKetua ? `warga (${wargaPertama})` : "Ketua RT"}
                    </button>
                  </div>
                  <p className="border-t border-line px-3.5 py-2 text-[11px] leading-4 text-muted">
                    Mode demo · data disimpan di peramban Anda
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function TabBar({
  menu,
  belumDibaca,
  siap,
  kolom,
}: {
  menu: Item[];
  belumDibaca: number;
  siap: boolean;
  kolom: number;
}) {
  const pathname = usePathname();
  if (!siap) return null;
  return (
    <nav
      aria-label="Navigasi utama ponsel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${kolom}, minmax(0, 1fr))` }}>
        {menu.map((m) => {
          const aktifkan = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                aria-current={aktifkan ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10.5px] leading-3 ${
                  aktifkan ? "text-brand font-semibold" : "text-muted"
                }`}
              >
                <span className="relative">
                  {m.ikon}
                  {m.label === "Notifikasi" && belumDibaca > 0 ? (
                    <span className="absolute -right-2 -top-1 min-w-[14px] rounded-full bg-attention px-0.5 text-center text-[9px] font-semibold leading-[14px] text-white">
                      {belumDibaca}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{m.label.replace(" Jadwal", "").replace(" Ronda", "")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Memuat() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="h-6 w-48 animate-pulse rounded bg-neutral-soft" />
      <div className="h-28 animate-pulse rounded-xl bg-neutral-soft" />
      <div className="h-40 animate-pulse rounded-xl bg-neutral-soft" />
      <span className="sr-only">Memuat data demo…</span>
    </div>
  );
}
