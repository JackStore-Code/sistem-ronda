import { Suspense } from "react";
import { FormPertukaranWarga } from "@/components/pages/warga/PertukaranWarga";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-[13px] text-muted">Memuat form…</p>}>
      <FormPertukaranWarga />
    </Suspense>
  );
}
