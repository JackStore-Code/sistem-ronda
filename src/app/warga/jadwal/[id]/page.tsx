import { DetailJadwalWarga } from "@/components/pages/warga/DaftarJadwalWarga";

export default async function Page({ params }: PageProps<"/warga/jadwal/[id]">) {
  const { id } = await params;
  return <DetailJadwalWarga jadwalId={id} />;
}
