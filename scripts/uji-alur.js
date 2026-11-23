const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3210";
const out = [];
const log = (...a) => { const s = a.join(" "); out.push(s); console.log(s); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // 1. Ringkasan Ketua
  await page.goto(BASE + "/admin/ringkasan", { waitUntil: "networkidle" });
  await page.waitForSelector("h1", { timeout: 15000 });
  log("H1 ringkasan ketua:", (await page.locator("h1").first().innerText()).replace(/\n/g, " | "));
  const navItems = await page.locator("aside nav a").allInnerTexts();
  log("Menu sidebar:", navItems.map((s) => s.replace(/\n/g, " ").trim()).join(" / "));

  // 2. Buat jadwal baru
  await page.goto(BASE + "/admin/jadwal/baru", { waitUntil: "networkidle" });
  await page.waitForSelector("form", { timeout: 15000 });
  const inputs = await page.locator("form input, form select").count();
  log("Form jadwal - jumlah field:", inputs);
  // submit kosong -> validasi
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(500);
  const alerts = await page.locator('[role="alert"], .text-danger').allInnerTexts();
  log("Validasi kosong:", alerts.map((s) => s.trim()).filter(Boolean).slice(0, 4).join(" || "));

  // isi form
  const dateInput = page.locator('form input[type="date"]').first();
  if (await dateInput.count()) {
    await dateInput.fill("2026-11-27");
  }
  const namaPetugas = await page.locator('form input[type="checkbox"]').count();
  log("Checkbox petugas:", namaPetugas);
  if (namaPetugas > 0) {
    await page.locator('form input[type="checkbox"]').nth(0).check();
    await page.locator('form input[type="checkbox"]').nth(1).check();
  }
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(1500);
  log("URL setelah simpan:", page.url());
  const toast = await page.locator('[aria-live="polite"]').allInnerTexts();
  log("Toast:", toast.map((s) => s.replace(/\n/g, " ")).join(" | ").slice(0, 160));

  // 3. Daftar jadwal
  await page.goto(BASE + "/admin/jadwal", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const rows = await page.locator("table tbody tr, ul.divide-y > li").count();
  log("Jumlah baris jadwal:", rows);

  // 4. Kehadiran: cari tombol status
  await page.goto(BASE + "/admin/kehadiran", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  log("Kehadiran H1:", (await page.locator("h1").first().innerText()).replace(/\n/g, " "));

  // 5. Data warga
  await page.goto(BASE + "/admin/warga", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const wargaRows = await page.locator("table tbody tr").count();
  log("Baris data warga:", wargaRows);

  // 6. Pertukaran ketua
  await page.goto(BASE + "/admin/pertukaran", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const linkPertukaran = page.locator('a[href^="/admin/pertukaran/"]').first();
  if (await linkPertukaran.count()) {
    const href = await linkPertukaran.getAttribute("href");
    log("Link pertukaran pertama:", href);
    await page.goto(BASE + href, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    log("Detail pertukaran H1:", (await page.locator("h1").first().innerText()).replace(/\n/g, " "));
  } else {
    log("Tidak ada link pertukaran di daftar");
  }

  // 7. Ganti peran ke warga
  await page.goto(BASE + "/admin/ringkasan", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.locator("aside button", { hasText: "Warga" }).first().click();
  await page.waitForTimeout(1500);
  log("URL setelah ganti peran:", page.url());
  const navWarga = await page.locator("aside nav a").allInnerTexts();
  log("Menu warga:", navWarga.map((s) => s.replace(/\n/g, " ").trim()).join(" / "));

  // 8. Warga: ajukan pertukaran
  await page.goto(BASE + "/warga/pertukaran/baru", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const selects = page.locator("form select");
  log("Select pada form pertukaran:", await selects.count());
  const selCount = await selects.count();
  if (selCount >= 2) {
    const opsiAsal = await selects.nth(0).locator("option").count();
    log("Opsi jadwal asal:", opsiAsal);
    if (opsiAsal > 1) await selects.nth(0).selectOption({ index: 1 });
    const opsiTujuan = await selects.nth(1).locator("option").count();
    log("Opsi jadwal tujuan:", opsiTujuan);
    if (opsiTujuan > 1) await selects.nth(1).selectOption({ index: 1 });
  }
  await page.locator("form textarea").first().fill("Ada acara keluarga di luar kota malam itu.");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(700);
  const dlg = await page.locator('[role="dialog"]').count();
  log("Dialog konfirmasi muncul:", dlg);
  if (dlg) {
    await page.locator('[role="dialog"] button', { hasText: "Ya, kirim" }).first().click();
    await page.waitForTimeout(1500);
    log("URL setelah kirim pengajuan:", page.url());
  }

  // 9. Daftar pertukaran warga
  await page.goto(BASE + "/warga/pertukaran", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const liWarga = await page.locator("ul.divide-y > li").count();
  log("Baris pertukaran warga:", liWarga);

  // 10. Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/warga/ringkasan", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const tabbar = await page.locator('nav[aria-label="Navigasi utama ponsel"] a').count();
  log("Tab bar mobile item:", tabbar);
  const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  log("Overflow horizontal mobile:", hasHScroll);

  // 11. Notifikasi
  await page.goto(BASE + "/warga/notifikasi", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  log("Notifikasi H1:", (await page.locator("h1").first().innerText()).replace(/\n/g, " "));

  // 12. Pengaturan
  await page.goto(BASE + "/warga/pengaturan", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  log("Pengaturan H1:", (await page.locator("h1").first().innerText()).replace(/\n/g, " "));

  // 13. 404-ish detail
  await page.goto(BASE + "/admin/jadwal/XXX", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  log("Detail jadwal id ngawur:", (await page.locator("body").innerText()).slice(0, 120).replace(/\n/g, " "));

  log("\nERRORS:", errors.length ? errors.join("\n") : "tidak ada");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
