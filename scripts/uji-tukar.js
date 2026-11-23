const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
let fail = 0;
const cek = (label, ok, extra = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"}  ${label}${extra ? "  -> " + extra : ""}`);
  if (!ok) fail++;
};
const teks = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  p.on("console", (m) => m.type() === "error" && !m.text().includes("WebSocket") && errs.push(m.text().slice(0, 160)));

  // --- Warga (Andi) menanggapi pengajuan masuk: PT-027 ---
  await p.goto(BASE + "/warga/pengaturan", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#pilih-warga", { timeout: 20000 });
  await p.waitForTimeout(1000);
  await p.locator("#pilih-warga").selectOption("andi");
  await p.waitForTimeout(900);
  cek("Pemilih warga demo berfungsi", (await p.locator("#pilih-warga").inputValue()) === "andi");

  await p.goto(BASE + "/warga/pertukaran/PT-027", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);

  const sebelum = await teks(p);
  const adaMenunggu = /Menunggu tanggapan warga/i.test(sebelum);
  cek("Ada pengajuan masuk berstatus menunggu tanggapan", adaMenunggu);

  const btnSetuju = p.locator('button', { hasText: /Setujui|Terima/i }).first();
  if (await btnSetuju.count()) {
    await btnSetuju.click();
    await p.waitForTimeout(600);
    const dlg = await p.locator('[role="dialog"]').innerText().catch(() => "");
    cek("Dialog konfirmasi tanggapi muncul", dlg.length > 0, dlg.split("\n")[0]);
    const ya = p.locator('[role="dialog"] button', { hasText: /Ya|Setujui|Kirim/i }).first();
    if (await ya.count()) await ya.click();
    await p.waitForTimeout(1600);
    const sesudah = await teks(p);
    cek("Status naik ke menunggu validasi Ketua RT", /Menunggu validasi/i.test(sesudah), (sesudah.match(/Menunggu [A-Za-z ]+/i) || [])[0] ?? "");
  } else {
    cek("Tombol tanggapi pengajuan ada", false, "tombol tidak ditemukan");
  }

  // --- Ketua memvalidasi -> disetujui ---
  await p.goto(BASE + "/admin/ringkasan", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1000);
  const btnKetua = p.locator("aside button", { hasText: "Ketua" }).first();
  if (await btnKetua.count()) await btnKetua.click();
  await p.waitForTimeout(1800);
  cek("Kembali ke area Ketua", p.url().includes("/admin/"), p.url());

  await p.goto(BASE + "/admin/pertukaran", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  const filterValidasi = p.locator('button, a', { hasText: /Menunggu validasi/i }).first();
  if (await filterValidasi.count()) await filterValidasi.click();
  await p.waitForTimeout(800);

  const linkValidasi = p.locator('a[href^="/admin/pertukaran/"]').first();
  if (await linkValidasi.count()) {
    await p.goto(BASE + await linkValidasi.getAttribute("href"), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1200);
    const detail = await teks(p);
    cek("Detail pertukaran punya tombol Setujui", /Setujui/i.test(detail));

    const setuju = p.locator("main button", { hasText: /Setujui &/i }).first();
    await setuju.click();
    await p.waitForTimeout(600);
    const dlg = await p.locator('[role="dialog"]').innerText().catch(() => "");
    cek("Dialog validasi persetujuan muncul", /setuju/i.test(dlg), dlg.split("\n")[0]);
    const ya = p.locator('[role="dialog"] button', { hasText: /Ya, setujui|Setujui/i }).first();
    if (await ya.count()) await ya.click();
    await p.waitForTimeout(1600);
    const akhir = await teks(p);
    cek("Pertukaran berubah menjadi Disetujui", /Disetujui/i.test(akhir));

    // Notifikasi ikut bertambah
    await p.goto(BASE + "/admin/notifikasi", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1000);
    const notif = await teks(p);
    cek("Notifikasi halaman terbuka dengan item", /Notifikasi/i.test(notif), (await p.locator("li, article").count()) + " elemen");
  } else {
    cek("Ada pertukaran menunggu validasi", false, "tidak ditemukan");
  }

  console.log("\nERROR:", errs.length ? errs.slice(0, 5).join(" | ") : "tidak ada");
  console.log(`Ringkasan: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"}`);
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
