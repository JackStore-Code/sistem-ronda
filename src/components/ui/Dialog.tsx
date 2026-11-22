"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({
  buka,
  onTutup,
  judul,
  deskripsi,
  children,
  aksi,
  lebar = "md",
}: {
  buka: boolean;
  onTutup: () => void;
  judul: string;
  deskripsi?: ReactNode;
  children?: ReactNode;
  aksi?: ReactNode;
  lebar?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Fokus hanya dipindahkan SEKALI saat dialog dibuka. Sebelumnya efek ini
  // bergantung pada onTutup yang berubah setiap render, sehingga setiap huruf
  // yang diketik menarik kursor kembali ke kolom pertama (tidak bisa mengetik
  // di kolom lain).
  const onTutupRef = useRef(onTutup);
  onTutupRef.current = onTutup;

  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutupRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = ref.current?.querySelector<HTMLElement>(
      "input:not([type='hidden']), select, textarea, button, [href], [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [buka]);

  if (!buka) return null;

  const maxW = lebar === "sm" ? "max-w-sm" : lebar === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        aria-label="Tutup dialog"
        onClick={onTutup}
        className="absolute inset-0 bg-[#0f1d16]/45"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-judul"
        className={`relative w-full ${maxW} rounded-t-2xl border border-line bg-surface shadow-[0_18px_50px_rgba(15,29,22,0.22)] sm:rounded-2xl`}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 id="dialog-judul" className="text-[16px] font-semibold leading-6 text-ink">
            {judul}
          </h2>
          {deskripsi ? (
            <div className="mt-1 text-[13px] leading-5 text-muted">{deskripsi}</div>
          ) : null}
        </div>
        {children ? <div className="max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div> : null}
        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 sm:flex-row sm:justify-end">
          {aksi}
        </div>
      </div>
    </div>
  );
}
