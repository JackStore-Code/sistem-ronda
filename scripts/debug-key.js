const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const seen = [];
  p.on("console", (m) => {
    if (m.type() === "error" && /same key/.test(m.text())) {
      const stacks = m.location();
      seen.push(JSON.stringify(stacks));
    }
  });
  p.on("pageerror", (e) => seen.push("ERR:" + e.message.slice(0, 120)));
  const urls = [
    "/admin/ringkasan", "/admin/jadwal", "/admin/jadwal/baru", "/admin/kehadiran",
    "/admin/pertukaran", "/admin/pertukaran/PT-027", "/admin/notifikasi", "/admin/warga",
    "/warga/ringkasan", "/warga/jadwal", "/warga/kehadiran", "/warga/pertukaran",
    "/warga/pertukaran/PT-027", "/warga/notifikasi", "/warga/pengaturan",
  ];
  for (const u of urls) {
    const before = seen.length;
    await p.goto(BASE + u, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1500);
    if (seen.length > before) console.log("DUPLIKAT KEY di", u);
  }
  console.log("total pesan:", seen.length);
  console.log(seen.slice(0, 3).join("\n"));
  await b.close();
})();
