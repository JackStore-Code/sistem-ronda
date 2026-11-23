const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 300)));
  p.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("WebSocket")) console.log("CONSOLE:", m.text().slice(0, 200));
  });
  await p.goto("http://127.0.0.1:3210/admin/ringkasan", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(7000);
  const t = await p.locator("body").innerText();
  console.log("memuat?", t.includes("Memuat data demo"));
  console.log("h1:", await p.locator("h1").first().innerText().catch(() => "TIDAK ADA"));
  console.log("panjang teks:", t.length);
  await b.close();
})();
