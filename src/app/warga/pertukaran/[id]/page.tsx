import { DetailPertukaranWarga } from "@/components/pages/warga/PertukaranWarga";

export default async function Page({ params }: PageProps<"/warga/pertukaran/[id]">) {
  const { id } = await params;
  return <DetailPertukaranWarga id={id} />;
}
