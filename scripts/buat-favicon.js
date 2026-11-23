
const sharp = require("sharp");
const fs = require("fs");
(async () => {
  const src = "public/ikon-512.png";
  const sizes = [16, 32, 48, 180, 192, 512];
  for (const s of sizes) {
    await sharp(src).resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(`src/app/icon-${s}.png`);
  }
  // favicon.ico sederhana: pakai PNG 32 sebagai isi (didukung Chrome/Edge/Firefox modern)
  fs.copyFileSync("src/app/icon-32.png", "src/app/favicon.ico");
  console.log("selesai");
})();
