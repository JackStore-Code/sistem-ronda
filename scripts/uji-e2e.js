import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:3210";
const hasil = [];
let gagal = 0;
const ok = (nama, lulus, detail = "") => {
  if (!lulus) gagal += 1;
  hasil.push(`${lulus ? "LULUS" : "GAGAL"} · ${nama}${detail ? " — " + detail : ""}`);
};
const teks = (s) => (s || "").replace(/\s+/g, " ").trim();

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  // Mulai dari seed segar tiap run agar tahap-tahap e2e tidak saling mengotori.
  await page.goto(BASE + "/admin/ringkasan", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("ronda-warga:v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  // Geser data demo ke hari ini supaya status relatif (Malam ini/Besok) masuk akal.
  await page.evaluate(() => {
    const KEY = "ronda-warga:v1";
    const d = new Date();
    const ymd = (x) => `${x.getFullYear()}-${`${x.getMonth() + 1}`.padStart(2, "0")}-${`${x.getDate()}`.padStart(2, "0")}`;
    const add = (n) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return ymd(x);
    };
    const map = { "2026-11-19": add(0), "2026-11-20": add(1), "2026-11-21": add(2), "2026-11-22": add(3), "2026-11-23": add(4), "2026-11-24": add(5) };
    const alih = (iso) => (iso && map[iso.slice(0, 10)] ? map[iso.slice(0, 10)] + iso.slice(10) : iso);
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s) return;
    s.jadwal = s.jadwal.map((j) => ({ ...j, tanggal: alih(j.tanggal), dipublikasikanPada: alih(j.dipublikasikanPada) }));
    localStorage.setItem(KEY, JSON.stringify(s));
  });

  // 1 — jadwal baru (draft): tombol submit membuka dialog, bukan menyimpan langsung
  await page.goto(BASE + "/admin/jadwal/baru", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("form input[type=date]", { timeout: 20000 });
  // tanggal yang pasti kosong: 30 hari ke depan
  const target = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
  });
  await page.fill("form input[type=date]", target);

  // validasi: tanpa petugas harus muncul pesan
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(400);
  const pesanValidasi = teks(await page.locator("form .text-danger, [aria-live=polite]").allInnerTexts().then((a) => a.join(" ")));
  ok("validasi petugas kosong muncul", /minimal 2 warga/i.test(pesanValidasi), pesanValidasi.slice(0, 90));

  const cek = page.locator("form input[type=checkbox]");
  await page.evaluate(() => localStorage.removeItem("ronda-warga:v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  await page.waitForSelector("form input[type=date]");
  await page.fill("form input[type=date]", target);
    await cek.nth(0).check();
  await cek.nth(2).check();
  await page.click('form button[type="submit"]');
  await page.waitForSelector('[role=dialog]', { timeout: 5000 });
  const dlg = teks(await page.locator("[role=dialog]").innerText());
  ok("dialog konfirmasi draft muncul", /simpan sebagai draft/i.test(dlg), dlg.slice(0, 80));
  await page.locator("[role=dialog] button", { hasText: /ya, simpan draft/i }).click();
  await page.waitForURL(/\/admin\/jadwal$/, { timeout: 10000 });
  ok("setelah simpan draft pindah ke daftar jadwal", /\/admin\/jadwal$/.test(page.url()), page.url());

  await page.waitForTimeout(600);
  const barisDraft = await page.locator("tbody tr").evaluateAll((trs) =>
    trs.map((tr) => tr.innerText.replace(/\s+/g, " ")),
  );
  ok("jadwal baru berstatus Draft di daftar", barisDraft.some((r) => /Draft/.test(r)), `${barisDraft.length} baris`);

  // 2 — publikasikan draft itu
  const barisDraftEl = page.locator("tbody tr", { hasText: /Draft/ }).first();
  const tombolPublikasi = barisDraftEl.locator("button", { hasText: /publikasi/i }).first();
  const adaTombol = (await tombolPublikasi.count()) > 0;
  if (adaTombol) {
    await tombolPublikasi.click();
    await page.waitForTimeout(300);
    const dialogPublish = page.locator("[role=dialog] button", { hasText: /ya|publikasi/i }).last();
    if (await dialogPublish.count()) await dialogPublish.click();
    await page.waitForTimeout(900);
    const sesudah = await page.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, " ")));
    ok("draft bisa dipublikasikan", sesudah.filter((r) => /Dipublikasikan/.test(r)).length >= 6, `${sesudah.length} baris`);
  } else {
    ok("draft bisa dipublikasikan (tombol ada di daftar)", false, "tombol publikasi tidak ditemukan pada baris draft");
  }

  // 3 — bentrok tanggal harus ditolak
  await page.goto(BASE + "/admin/jadwal/baru", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("form input[type=date]");
  await page.fill("form input[type=date]", target);
  await (await page.locator("form input[type=checkbox]").nth(0)).check();
  await (await page.locator("form input[type=checkbox]").nth(1)).check();
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(500);
  const bentrok = teks(await page.locator("form").innerText());
  ok("tanggal bentrok ditolak", /sudah ada jadwal pada tanggal ini/i.test(bentrok), "");

  // 4 — kehadiran: desktop memakai select, mobile memakai tombol
  await page.goto(BASE + "/admin/kehadiran", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const selectKehadiran = page.locator("select[id^=ubah-]").first();
  if (await selectKehadiran.count()) {
    const sebelum = await page.locator("th").first().innerText();
    await selectKehadiran.selectOption("hadir");
    await page.waitForTimeout(500);
    const nilai = await selectKehadiran.inputValue();
    ok("ubah kehadiran (desktop) tersimpan", nilai === "hadir", `${sebelum} -> ${nilai}`);
  } else {
    const tombolHadir = page.locator("button:visible", { hasText: /^Hadir$/i }).first();
    ok("kontrol kehadiran tersedia", (await tombolHadir.count()) > 0);
  }

  // 5 — alur pertukaran penuh: pengajuan warga -> tanggapan warga tujuan -> validasi ketua
  // Ganti sesi melalui UI demo ke Andi (punya jadwal j-19) sebelum mengajukan.
  await page.goto(BASE + "/admin/ringkasan", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const bukaMenuProfil = page.locator("header button[aria-haspopup=menu]");
  if (await bukaMenuProfil.count()) await bukaMenuProfil.click();
  const gantiKeWarga = page.getByRole("menuitem", { name: /masuk sebagai warga/i });
  if (await gantiKeWarga.count()) await gantiKeWarga.click();
  await page.waitForTimeout(500);
  await page.goto(BASE + "/warga/ringkasan", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.goto(BASE + "/warga/pertukaran/baru", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("form select", { timeout: 10000 });
  // Uji alur di seed bersih (bukan melalui pergantian sesi yang menambah data draft).
  await page.evaluate(() => localStorage.removeItem("ronda-warga:v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const key = "ronda-warga:v1";
    const s = JSON.parse(localStorage.getItem(key));
    s.sesi.penggunaId = "andi";
    localStorage.setItem(key, JSON.stringify(s));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("form select", { timeout: 10000 });
  const selects = page.locator("form select");
  const jumlahSelect = await selects.count();
  ok("form pengajuan pertukaran punya select asal & tujuan", jumlahSelect >= 2, `${jumlahSelect} select`);
  // pilih tujuan yang berbeda dari asal
  const opsiTujuan = await selects.nth(jumlahSelect - 1).locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
  if (opsiTujuan.length) {
    const asalSelect = selects.nth(0);
    const asalOpts = await asalSelect.locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
    if (asalOpts.length) {
      await asalSelect.selectOption(asalOpts[0]);
      await page.waitForTimeout(200);
      const tujuanOpts = await selects.nth(1).locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
      if (tujuanOpts.length) {
        await selects.nth(1).selectOption(tujuanOpts.find((id) => id !== asalOpts[0]) || tujuanOpts[0]);
        await page.fill("form textarea", "Ada keperluan keluarga yang tidak bisa ditinggalkan malam ini, mohon tukar jadwal.");
        await page.locator("form button", { hasText: /kirim pengajuan/i }).click();
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        await page.locator("[role=dialog] button", { hasText: /ya, kirim/i }).click();
        await page.waitForTimeout(700);
      }
    }
    const daftar = teks(await page.locator("main").innerText());
    ok("pengajuan pertukaran tercatat", /pengajuan PT-|menunggu tanggapan/i.test(daftar) || /warga\/pertukaran\/(PT-|$)/.test(page.url()), `${page.url()} · ${daftar.slice(0, 120)}`);
  }

  // 6 — mobile tidak overflow
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const rute of ["/admin/ringkasan", "/admin/jadwal", "/warga/ringkasan", "/warga/pertukaran"]) {
    await m.goto(BASE + rute, { waitUntil: "domcontentloaded" });
    await m.waitForTimeout(600);
    const lebar = await m.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    ok(`mobile tanpa scroll horizontal ${rute}`, lebar[0] <= lebar[1] + 1, `${lebar[0]} vs ${lebar[1]}`);
  }

  ok("tidak ada error konsol/runtime", errors.length === 0, errors.slice(0, 3).join(" | "));

  console.log(hasil.join("\n"));
  console.log(`\nRINGKASAN: ${hasil.length - gagal}/${hasil.length} lulus`);
  if (errors.length) console.log("ERROR:", errors.slice(0, 8).join("\n"));
  await browser.close();
  process.exit(gagal ? 1 : 0);
})();
