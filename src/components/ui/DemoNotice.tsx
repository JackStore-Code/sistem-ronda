export function DemoNotice({ ringkas = false }: { ringkas?: boolean }) {
  if (ringkas) {
    return (
      <p className="text-[12px] leading-4 text-muted">
        <span className="mr-1 rounded border border-line bg-surface px-1 py-px text-[10.5px] font-semibold uppercase tracking-wide text-ink">
          Demo
        </span>
        Data contoh, bukan data warga sungguhan.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-2 rounded-lg border border-dashed border-[#d9ded3] bg-[#fbfcfa] px-3.5 py-2.5 text-[12px] leading-5 text-muted">
      <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink">
        Data demo
      </span>
      <p className="min-w-0 flex-1">
        Seluruh nama, jadwal, dan riwayat di aplikasi ini adalah data contoh. Perubahan tersimpan di peramban Anda
        dan dapat dikembalikan lewat menu Pengaturan.
      </p>
    </div>
  );
}
