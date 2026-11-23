const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3210";
let fail = 0;
const log = (...a) => console.log(...a);
const cek = (label, ok, extra = "") => {
  log(`${ok ? "LULUS" : "GAGAL"}  ${label}${extra ? "  -> " + extra : ""}`);
  if (!ok) fail++;
};

async function tutupDialog(page) {
  const dlg = page.locator('[role="dialog"]');
  if (await dlg.count()) {
    const batal = dlg.locator("button", { hasText: /Batal|Periksa lagi|Tidak/ }).first();
    if (await batal.count()) await batal.click().catch(() => {});
  }
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("WebSocket")) errors.push("console: " + m.text().slice(0, 160));
  });

  // ---------- 1. Ringkasan Ketua ----------
  await page.goto(BASE + "/admin/ringkasan", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 20000 });
  await page.waitForTimeout(600);
  const h1 = await page.locator("h1").first().innerText();
  cek("Ringkasan Ketua tampil", h1.length > 3, h1.replace(/\n/g, " "));

  const navText = (await page.locator("aside nav a").allInnerTexts()).map((s) => s.replace(/\s+/g, " ").trim());
  cek("Menu sidebar Ketua 6 item", navText.length === 6, navText.join(" / "));
  cek("Menu Data Warga ada untuk Ketua", navText.some((t) => t.includes("Data Warga")));

  // ---------- 2. Buat jadwal: validasi lalu simpan ----------
  await page.goto(BASE + "/admin/jadwal/baru", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("form", { timeout: 20000 });
  await page.waitForTimeout(500);

  await page.locator("#tanggal").fill("");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(500);
  const galat = (await page.locator("form").innerText()).replace(/\s+/g, " ");
  cek("Validasi: tanggal wajib", /wajib diisi/i.test(galat));
  cek("Validasi: minimal 2 petugas", /minimal 2 warga/i.test(galat));
  await tutupDialog(page);

  const tanggalBaru = "2026-12-03";
  await page.locator("#tanggal").fill(tanggalBaru);
  const checkbox = page.locator('form input[type="checkbox"]');
  await checkbox.nth(0).check();
  await checkbox.nth(1).check();
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(600);
  const dlgTeks = await page.locator('[role="dialog"]').innerText().catch(() => "");
  cek("Dialog konfirmasi simpan draft muncul", dlgTeks.length > 0, dlgTeks.split("\n")[0]);
  const simpanBtn = page.locator('[role="dialog"] button', { hasText: /Ya, simpan|Simpan/i }).first();
  if (await simpanBtn.count()) await simpanBtn.click();
  await page.waitForTimeout(1800);
  cek("Redirect ke daftar jadwal setelah simpan", page.url().includes("/admin/jadwal"), page.url());

  // ---------- 3. Jadwal baru ada di daftar ----------
  await page.goto(BASE + "/admin/jadwal", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const daftarTeks = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  cek("Jadwal baru (3 Des 2026) muncul di daftar", /3 Des 2026/.test(daftarTeks));

  // ---------- 4. Detail jadwal ----------
  const linkJadwal = page.locator('a[href^="/admin/jadwal/j-"]:not([href$="/edit"])').first();
  if (await linkJadwal.count()) {
    const href = await linkJadwal.getAttribute("href");
    await page.goto(BASE + href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const detail = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    cek("Detail jadwal menampilkan petugas", /Petugas/i.test(detail));
    cek("Detail jadwal menampilkan status kehadiran", /Hadir|Belum Dicatat|Tidak Hadir/.test(detail));
  } else {
    cek("Detail jadwal bisa dibuka", false, "tidak ada link jadwal");
  }

  // ---------- 5. Kehadiran ketua ----------
  await page.goto(BASE + "/admin/kehadiran", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const keh = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  cek("Halaman kehadiran punya rekap", /Hadir/i.test(keh), (await page.locator("h1").first().innerText()).replace(/\n/g, " "));

  // ---------- 6. Data warga ----------
  await page.goto(BASE + "/admin/warga", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const jumlahWarga = await page.locator("table tbody tr").count();
  cek("Tabel data warga terisi", jumlahWarga > 5, jumlahWarga + " baris");

  // ---------- 7. Pertukaran: detail ketua ----------
  await page.goto(BASE + "/admin/pertukaran", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const linkTukar = page.locator('a[href^="/admin/pertukaran/"]').first();
  if (await linkTukar.count()) {
    const href = await linkTukar.getAttribute("href");
    await page.goto(BASE + href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const tukarTeks = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    cek("Detail pertukaran menampilkan status alur", /menunggu|disetujui|ditolak/i.test(tukarTeks));
    cek("Detail pertukaran menampilkan alasan", /Alasan/i.test(tukarTeks));
  } else {
    cek("Daftar pertukaran punya item", false);
  }

  // ---------- 8. Ganti peran ke warga ----------
  await page.goto(BASE + "/admin/ringkasan", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.locator("aside button", { hasText: "Warga" }).first().click();
  await page.waitForTimeout(2000);
  cek("Ganti peran pindah ke area warga", page.url().includes("/warga/"), page.url());
  const navWarga = (await page.locator("aside nav a").allInnerTexts()).map((s) => s.replace(/\s+/g, " ").trim());
  cek("Menu warga 5 item", navWarga.length === 5, navWarga.join(" / "));
  cek("Data Warga TIDAK ada di menu warga", !navWarga.some((t) => t.includes("Data Warga")));

  // ---------- 9. Warga ajukan pertukaran ----------
  await page.goto(BASE + "/warga/pertukaran/baru", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const select = page.locator("form select");
  const opsiAsal = await select.nth(0).locator("option").count();
  cek("Dropdown jadwal asal terisi", opsiAsal > 1, opsiAsal + " opsi");
  if (opsiAsal > 1) await select.nth(0).selectOption({ index: 1 });
  await page.waitForTimeout(300);
  const opsiTujuan = await select.nth(1).locator("option").count();
  cek("Dropdown jadwal tujuan terisi", opsiTujuan > 1, opsiTujuan + " opsi");
  if (opsiTujuan > 1) await select.nth(1).selectOption({ index: 1 });

  await page.locator("form textarea").first().fill("pendek");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(600);
  const validasiTukar = (await page.locator("form").innerText()).replace(/\s+/g, " ");
  cek("Validasi: alasan minimal 10 karakter", /minimal 10 karakter/i.test(validasiTukar));

  await page.locator("form textarea").first().fill("Ada acara keluarga di luar kota malam itu.");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(700);
  const dlgKirim = await page.locator('[role="dialog"]').innerText().catch(() => "");
  cek("Dialog konfirmasi kirim pengajuan", dlgKirim.includes("Kirim pengajuan"), dlgKirim.split("\n")[0]);
  await page.locator('[role="dialog"] button', { hasText: "Ya, kirim" }).first().click();
  await page.waitForTimeout(2000);
  const setelahKirim = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  cek("Pengajuan pertukaran terkirim", /dikirim ke warga tujuan/i.test(setelahKirim));

  // ---------- 10. Daftar pertukaran warga ----------
  await page.goto(BASE + "/warga/pertukaran", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const barisTukar = await page.locator("ul.divide-y > li").count();
  cek("Daftar pertukaran warga terisi", barisTukar > 0, barisTukar + " baris");
  const adaStatus = /Menunggu|Disetujui|Ditolak/i.test((await page.locator("body").innerText()).replace(/\s+/g, " "));
  cek("Status pertukaran tampil", adaStatus);

  // ---------- 11. Mobile 390px ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/warga/ringkasan", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const tabbar = await page.locator('nav[aria-label="Navigasi utama ponsel"] a').count();
  cek("Tab bar mobile 5 item", tabbar === 5, tabbar + " item");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  cek("Tidak ada overflow horizontal di 390px", !overflow);

  await page.goto(BASE + "/warga/jadwal", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  cek("Halaman jadwal tidak overflow di 390px", !overflow2);

  // ---------- 12. Notifikasi & pengaturan ----------
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto(BASE + "/warga/notifikasi", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const notif = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  cek("Notifikasi warga tampil", /Notifikasi/i.test(notif));

  await page.goto(BASE + "/warga/pengaturan", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const set = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  cek("Pengaturan menampilkan data demo", /Data demo/i.test(set));

  // ---------- 13. ID tidak dikenal ----------
  await page.goto(BASE + "/admin/jadwal/NGARANG", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const nf = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  cek("ID ngawur -> fallback tidak ditemukan", /tidak ditemukan|belum tersedia/i.test(nf));

  // ---------- hasil ----------
  log("\n=== ERROR KONSOL ===");
  log(errors.length ? errors.slice(0, 6).join("\n") : "tidak ada");
  log(`\nRingkasan: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"}`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
