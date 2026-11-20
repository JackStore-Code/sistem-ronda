import { FormJadwal } from "@/components/pages/admin/FormJadwal";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Jadwal · Ronda Warga RT 05" };

export default async function Page({ params }: PageProps<"/admin/jadwal/[id]/edit">) {
  const { id } = await params;
  return <FormJadwal jadwalId={id} />;
}
