"use client";

import { useEffect } from "react";
import { useDemo } from "../providers/DemoProvider";

export function ToastHost() {
  const { toasts, tutupToast } = useDemo();

  useEffect(() => {
    if (toasts.length === 0) return;
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[76px] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] leading-5 shadow-[0_10px_30px_rgba(15,29,22,0.16)] ${
            t.nada === "galat"
              ? "border-[#f2cfcc] bg-surface text-danger"
              : "border-brand-line bg-surface text-ink"
          }`}
        >
          <span
            aria-hidden
            className={`mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
              t.nada === "galat" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-2.5 w-2.5">
              {t.nada === "galat" ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              ) : (
                <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              )}
            </svg>
          </span>
          <p className="flex-1">{t.pesan}</p>
          <button
            onClick={() => tutupToast(t.id)}
            className="-mr-1 -mt-1 shrink-0 rounded p-1 text-muted hover:text-ink"
            aria-label="Tutup pemberitahuan"
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
