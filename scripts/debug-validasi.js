const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  p.on("pageerror", (e) => console.log("PAGEERR:", e.message.slice(0, 200)));
  await p.goto(BASE + "/admin/jadwal/baru", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("form", { timeout: 20000 });
  await p.waitForTimeout(800);
  await p.locator("#tanggal").fill("");
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(800);
  const form = await p.locator("form").innerText();
  console.log("--- ISI FORM SETELAH SUBMIT KOSONG ---");
  console.log(form.replace(/\n{2,}/g, "\n").slice(0, 900));
  console.log("--- ADA role=alert? ---", await p.locator('[role="alert"]').count());
  await b.close();
})();
