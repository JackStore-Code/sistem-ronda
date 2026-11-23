const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3210";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 950 } });
  p.on("console", (m) => console.log("[console]", m.type(), m.text()));
  await p.goto(BASE + "/warga/pertukaran/baru", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("form select", { timeout: 15000 });
  const sel = p.locator("form select");
  console.log("jumlah select", await sel.count());
  for (let i = 0; i < (await sel.count()); i++) {
    const label = await sel.nth(i).evaluate((el) => (el.labels?.[0]?.innerText || el.getAttribute("aria-label") || el.id));
    const opts = await sel.nth(i).locator("option").evaluateAll((o) => o.map((x) => `${x.value}=${x.textContent.trim()}`));
    console.log(i, "|", label, "|", opts.join(" ; "));
  }
  const ta = await p.locator("form textarea").count();
  console.log("textarea", ta);
  const btns = await p.locator("form button").evaluateAll((bs) => bs.map((x) => `${x.type}:${x.innerText.trim()}`));
  console.log("tombol form", btns.join(" | "));
  await b.close();
})();
