const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  const dups = [];
  p.on("console", async (m) => {
    if (m.type() === "error" && /same key/.test(m.text())) {
      const warn = m.text() + " | loc=" + JSON.stringify(m.location());
      const snapshot = await p
        .evaluate(() => {
          const s = JSON.parse(localStorage.getItem("ronda-warga:v1") || "{}");
          const ids = (s.notifikasi || []).map((n) => n.id);
          return { url: location.pathname, sesi: s.sesi, count: ids.length, unique: new Set(ids).size, ids };
        })
        .catch(() => null);
      dups.push({ warn, snapshot });
    }
  });
  const langkah = [
    ["/warga/pengaturan", async () => { await p.locator("#pilih-warga").selectOption("andi"); }],
    ["/warga/pertukaran/PT-027", async () => {
      await p.locator("button", { hasText: "Setujui pertukaran" }).click();
      await p.waitForTimeout(600);
      await p.locator('[role="dialog"] button', { hasText: "Ya, setujui" }).click();
    }],
    ["/admin/ringkasan", async () => { await p.locator("aside button", { hasText: "Ketua" }).click(); await p.waitForTimeout(1500); }],
    ["/admin/pertukaran/PT-027", async () => {
      await p.locator("main button", { hasText: /Setujui &/i }).click();
      await p.waitForTimeout(600);
      await p.locator('[role="dialog"] button', { hasText: /Ya, setujui/i }).click();
    }],
    ["/admin/notifikasi", async () => {
      const btn = p.locator("main button", { hasText: /Tandai semua/i }).first();
      if (await btn.count()) await btn.click();
    }],
  ];
  for (const [u, fn] of langkah) {
    await p.goto(BASE + u, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1600);
    await fn().catch((e) => console.log("langkah gagal", u, e.message.slice(0, 60)));
    await p.waitForTimeout(1800);
  }
  console.log("dup count:", dups.length);
  for (const d of dups.slice(0, 3)) console.log(JSON.stringify(d, null, 1).slice(0, 700));
  await b.close();
})();
