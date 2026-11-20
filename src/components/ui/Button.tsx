"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Varian = "utama" | "sekunder" | "halus" | "bahaya" | "tautan";
type Ukuran = "sm" | "md";

const VARIAN: Record<Varian, string> = {
  utama:
    "bg-brand text-white border border-brand hover:bg-brand-hover active:bg-brand-hover disabled:bg-[#8aa596] disabled:border-[#8aa596]",
  sekunder:
    "bg-surface text-ink border border-line hover:bg-neutral-soft active:bg-neutral-soft disabled:text-muted",
  halus:
    "bg-brand-soft text-brand border border-brand-line hover:bg-[#dceae0] disabled:text-[#8aa596]",
  bahaya:
    "bg-surface text-danger border border-[#f2cfcc] hover:bg-danger-soft disabled:text-[#c98b8b]",
  tautan: "bg-transparent text-brand border border-transparent hover:underline px-0",
};

const UKURAN: Record<Ukuran, string> = {
  sm: "min-h-9 px-3 text-[13px] gap-1.5",
  md: "min-h-10 px-4 text-[14px] gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap disabled:cursor-not-allowed";

export function Button({
  children,
  varian = "sekunder",
  ukuran = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: Varian; ukuran?: Ukuran }) {
  return (
    <button
      className={`${BASE} ${VARIAN[varian]} ${ukuran === "sm" ? UKURAN.sm : UKURAN.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  varian = "sekunder",
  ukuran = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  varian?: Varian;
  ukuran?: Ukuran;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIAN[varian]} ${ukuran === "sm" ? UKURAN.sm : UKURAN.md} ${className}`}
    >
      {children}
    </Link>
  );
}
