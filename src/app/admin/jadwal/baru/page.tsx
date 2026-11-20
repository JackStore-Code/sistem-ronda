import { FormJadwal } from "@/components/pages/admin/FormJadwal";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Buat Jadwal · Ronda Warga RT 05" };

export default function Page() {
  return <FormJadwal />;
}
