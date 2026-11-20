"use client";

import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const BASE_INPUT =
  "w-full rounded-lg border bg-surface px-3 text-[14px] text-ink placeholder:text-[#9aa79b] transition-colors focus:outline-none focus:ring-2 focus:ring-brand/25";

function ring(galat?: string) {
  return galat ? "border-danger" : "border-line focus:border-brand";
}

export function Label({
  htmlFor,
  children,
  wajib,
  petunjuk,
}: {
  htmlFor: string;
  children: ReactNode;
  wajib?: boolean;
  petunjuk?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1 text-[13px] font-medium text-ink">
      {children}
      {wajib ? <span className="text-danger" aria-hidden>*</span> : null}
      {petunjuk ? <span className="text-[12px] font-normal text-muted">· {petunjuk}</span> : null}
    </label>
  );
}

export function Input({
  galat,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { galat?: string }) {
  return (
    <input
      id={id}
      aria-invalid={galat ? true : undefined}
      aria-describedby={galat ? `${id}-galat` : undefined}
      className={`${BASE_INPUT} ${ring(galat)} h-10 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  galat,
  id,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { galat?: string }) {
  return (
    <textarea
      id={id}
      aria-invalid={galat ? true : undefined}
      aria-describedby={galat ? `${id}-galat` : undefined}
      className={`${BASE_INPUT} ${ring(galat)} min-h-24 py-2 leading-5 ${className}`}
      {...props}
    />
  );
}

export function Select({
  galat,
  id,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { galat?: string }) {
  return (
    <select
      id={id}
      aria-invalid={galat ? true : undefined}
      aria-describedby={galat ? `${id}-galat` : undefined}
      className={`${BASE_INPUT} ${ring(galat)} h-10 pr-8 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldError({ id, pesan }: { id: string; pesan?: string }) {
  if (!pesan) return null;
  return (
    <p id={`${id}-galat`} className="mt-1.5 flex items-start gap-1 text-[12px] leading-4 text-danger">
      <svg aria-hidden viewBox="0 0 20 20" className="mt-[2px] h-3 w-3 shrink-0">
        <path d="M10 3v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="14.5" r="1.3" fill="currentColor" />
      </svg>
      <span>{pesan}</span>
    </p>
  );
}

export function Field({
  id,
  label,
  wajib,
  petunjuk,
  galat,
  children,
  className = "",
}: {
  id: string;
  label: string;
  wajib?: boolean;
  petunjuk?: string;
  galat?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} wajib={wajib} petunjuk={petunjuk}>
        {label}
      </Label>
      {children}
      <FieldError id={id} pesan={galat} />
    </div>
  );
}

export function Checkbox({
  id,
  label,
  deskripsi,
  checked,
  onChange,
}: {
  id: string;
  label: ReactNode;
  deskripsi?: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 hover:bg-[#fafbf8] has-checked:border-brand-line has-checked:bg-brand-soft/60"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#1f4d3a]"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-5 text-ink">{label}</span>
        {deskripsi ? <span className="block text-[12px] leading-4 text-muted">{deskripsi}</span> : null}
      </span>
    </label>
  );
}
