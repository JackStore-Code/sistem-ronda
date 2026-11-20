import type { ReactNode } from "react";

type Nada = "brand" | "attention" | "danger" | "neutral";

const NADA: Record<Nada, string> = {
  brand: "bg-brand-soft text-brand border-brand-line",
  attention: "bg-attention-soft text-attention border-[#f0dcbb]",
  danger: "bg-danger-soft text-danger border-[#f2cfcc]",
  neutral: "bg-neutral-soft text-muted border-line",
};

/** Ikon kecil selalu mendampingi warna agar status tidak hanya dibedakan lewat warna. */
const IKON: Record<Nada, string> = {
  brand: "M2 10a8 8 0 0 1 16 0",
  attention: "M10 3v8m0 4h.01",
  danger: "M6 6l8 8M14 6l-8 8",
  neutral: "M10 4v12",
};

export function Badge({
  children,
  nada = "neutral",
  dot = true,
  title,
}: {
  children: ReactNode;
  nada?: Nada;
  dot?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[12px] font-medium leading-5 ${NADA[nada]}`}
    >
      {dot ? (
        nada === "danger" ? (
          <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3"><path d={IKON.danger} stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
        ) : nada === "attention" ? (
          <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3"><path d="M10 3v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="10" cy="15.5" r="1.4" fill="currentColor" /></svg>
        ) : nada === "brand" ? (
          <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        ) : (
          <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3"><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
        )
      ) : null}
      {children}
    </span>
  );
}
