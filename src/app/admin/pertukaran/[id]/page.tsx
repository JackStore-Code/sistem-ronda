import { DetailPertukaranKetua } from "@/components/pages/admin/DetailPertukaranKetua";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Detail Pertukaran · Ronda Warga RT 05" };

export default async function Page({ params }: PageProps<"/admin/pertukaran/[id]">) {
  const { id } = await params;
  return <DetailPertukaranKetua id={id} />;
}
