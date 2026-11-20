import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = true,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface ${padding ? "p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  judul,
  keterangan,
  aksi,
  className = "",
}: {
  judul: ReactNode;
  keterangan?: ReactNode;
  aksi?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-6 text-ink">{judul}</h2>
        {keterangan ? <p className="mt-0.5 text-[13px] leading-5 text-muted">{keterangan}</p> : null}
      </div>
      {aksi ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aksi}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, keterangan }: { children: ReactNode; keterangan?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{children}</h2>
      {keterangan ? <p className="mt-1 text-[13px] text-muted">{keterangan}</p> : null}
    </div>
  );
}

export function EmptyState({
  judul,
  deskripsi,
  aksi,
  ikon = "doc",
}: {
  judul: string;
  deskripsi: string;
  aksi?: ReactNode;
  ikon?: "doc" | "calendar" | "swap" | "bell" | "people";
}) {
  const path: Record<string, ReactNode> = {
    doc: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4" />
        <path d="M10 12h6M10 16h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
    swap: (
      <>
        <path d="M4 8h11l-3-3M20 16H9l3 3" />
      </>
    ),
    bell: (
      <>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
        <path d="M16 8.5a2.8 2.8 0 0 1 0 5.2M17 14.8c2.3.5 4 2.3 4 5.2" />
      </>
    ),
  };
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-[#fbfcfa] px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted">
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {path[ikon]}
        </svg>
      </span>
      <p className="text-[14px] font-semibold text-ink">{judul}</p>
      <p className="mt-1 max-w-md text-[13px] leading-5 text-muted">{deskripsi}</p>
      {aksi ? <div className="mt-4">{aksi}</div> : null}
    </div>
  );
}
