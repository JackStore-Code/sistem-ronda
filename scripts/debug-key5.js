const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  let hit = 0;
  const dump = async (tag) => {
    const info = await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("ronda-warga:v1") || "{}");
      const sem = s.aktivitas || [];
      return {
        sesi: s.sesi,
        notif: (s.notifikasi || []).map((n) => `${n.id} | ${n.judul.slice(0, 22)}`),
        akt: sem.map((a) => `${a.id} | ${a.teks?.slice(0, 22)}`),
      };
    });
    console.log(`--- ${tag} --- SESI`, JSON.stringify(info.sesi));
    console.log("NOTIF:\n" + info.notif.join("\n"));
    console.log("AKTIVITAS:\n" + info.akt.join("\n"));
  };
  p.on("console", async (m) => {
    if (m.type() === "error" && /same key/.test(m.text()) && hit < 1) {
      hit++;
      await dump("SAAT DUP");
    }
  });
  await p.goto(BASE + "/warga/pengaturan", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);
  await p.locator("#pilih-warga").selectOption("andi");
  await p.waitForTimeout(1000);
  await p.goto(BASE + "/warga/pertukaran/PT-027", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);
  await p.locator("button", { hasText: "Setujui pertukaran" }).click();
  await p.waitForTimeout(500);
  await p.locator('[role="dialog"] button', { hasText: "Ya, setujui" }).click();
  await p.waitForTimeout(1500);
  await p.goto(BASE + "/admin/notifikasi", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  console.log("dup total:", hit);
  if (!hit) await dump("TANPA DUP (absen)");
  await b.close();
})();
