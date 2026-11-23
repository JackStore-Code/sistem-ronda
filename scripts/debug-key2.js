const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  let n = 0;
  p.on("console", (m) => {
    if (m.type() === "error" && /same key/.test(m.text())) {
      n++;
      console.log("DUP di", p.url());
    }
  });
  const langkah = [
    ["/warga/pengaturan", async () => { await p.locator("#pilih-warga").selectOption("andi"); }],
    ["/warga/pertukaran/PT-027", async () => {
      await p.locator("button", { hasText: "Setujui pertukaran" }).click();
      await p.waitForTimeout(500);
      await p.locator('[role="dialog"] button', { hasText: "Ya, setujui" }).click();
    }],
    ["/admin/ringkasan", async () => { await p.locator("aside button", { hasText: "Ketua" }).click(); }],
    ["/admin/pertukaran/PT-027", async () => {
      await p.locator("main button", { hasText: /Setujui &/i }).click();
      await p.waitForTimeout(500);
      await p.locator('[role="dialog"] button', { hasText: /Ya, setujui/i }).click();
    }],
    ["/admin/notifikasi", async () => { await p.locator("main button", { hasText: /Tandai semua/i }).first().click().catch(() => {}); }],
    ["/admin/kehadiran", async () => { const s = p.locator("main button").first(); if (await s.count()) await s.click().catch(() => {}); }],
  ];
  for (const [u, fn] of langkah) {
    await p.goto(BASE + u, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1500);
    await fn().catch((e) => console.log("langkah gagal", u, e.message.slice(0, 80)));
    await p.waitForTimeout(1500);
  }
  console.log("total duplikat:", n);
  await b.close();
})();
