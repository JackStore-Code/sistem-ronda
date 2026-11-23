const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  p.on("console", async (m) => {
    if (m.type() === "error" && /same key/.test(m.text())) {
      // ambil semua teks id yang sedang dirender
      const ids = await p
        .evaluate(() => {
          const s = JSON.parse(localStorage.getItem("ronda-warga:v1") || "{}");
          return {
            notif: (s.notifikasi || []).map((n) => `${n.id}|${n.penerimaId ?? "-"}|${n.judul.slice(0, 20)}`),
            sesi: s.sesi,
          };
        })
        .catch(() => ({}));
      console.log("SESI:", JSON.stringify(ids.sesi));
      console.log(ids.notif?.join("\n"));
      throw new Error("stop");
    }
  });
  await p.goto(BASE + "/admin/notifikasi", { waitUntil: "domcontentloaded" }).catch(() => {});
  await p.waitForTimeout(4000);
  await b.close().catch(() => {});
})();
