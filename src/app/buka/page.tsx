import { redirect } from "next/navigation";

/**
 * Perantara untuk notifikasi HP.
 *
 * Tautan di database disimpan singkat ("jadwal/<id>"), sedangkan halaman
 * sebenarnya berada di area peran. Halaman ini membaca sesi yang tersimpan di
 * peramban (lewat skrip kecil) lalu mengarahkan ke alamat yang benar.
 *
 * Contoh: /buka?ke=jadwal%2F<id>
 *   -> /warga/jadwal/<id>  (bila sesi warga)
 *   -> /admin/jadwal/<id>  (bila sesi ketua)
 */
export default async function Tujuan({ searchParams }: PageProps<"/">) {
  const params = (await searchParams) as { ke?: string };
  const ke = (params.ke ?? "").replace(/^\/+/, "");
  const sah = /^(jadwal|pertukaran)\/[A-Za-z0-9-]+$/.test(ke);

  if (!sah) redirect("/login");

  // Pengalihan dilakukan di peramban karena sesi disimpan di sana.
  const skrip = `
(function () {
  var ke = ${JSON.stringify(ke)};
  var awalan = "/warga";
  try {
    var sesi = JSON.parse(localStorage.getItem("ronda-sesi") || "null");
    if (sesi && sesi.role === "ketua") awalan = "/admin";
  } catch (e) {}
  location.replace(awalan + "/" + ke);
})();
`;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <p className="text-sm text-muted">Membuka halaman…</p>
      <script dangerouslySetInnerHTML={{ __html: skrip }} />
    </main>
  );
}
