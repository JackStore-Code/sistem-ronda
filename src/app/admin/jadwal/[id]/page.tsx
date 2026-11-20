import { DetailJadwalKetua } from "@/components/pages/admin/DetailJadwalKetua";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Detail Jadwal · Ronda Warga RT 05" };

export default async function Page({ params }: PageProps<"/admin/jadwal/[id]">) {
  const { id } = await params;
  return <DetailJadwalKetua jadwalId={id} />;
}
