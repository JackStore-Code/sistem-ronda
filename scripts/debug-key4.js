const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  let hit = 0;
  p.on("console", async (m) => {
    if (m.type() === "error" && /same key/.test(m.text()) && hit < 1) {
      hit++;
      const info = await p.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("ronda-warga:v1") || "{}");
        return {
          sesi: s.sesi,
          notif: (s.notifikasi || []).map((n) => `${n.id} | penerima=${n.penerimaId} | ${n.judul.slice(0, 24)}`),
        };
      });
      console.log("SESI:", JSON.stringify(info.sesi));
      console.log(info.notif.join("\n"));
    }
  });
  await p.goto(BASE + "/admin/ringkasan", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  // buka notifikasi lewat sidebar seperti pengguna
  await p.waitForTimeout(1000);
  console.log("dup saat ringkasan:", hit);
  await p.goto(BASE + "/admin/notifikasi", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  console.log("dup total:", hit);
  await b.close();
})();
