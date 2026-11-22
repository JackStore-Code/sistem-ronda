/* Service worker: menampilkan notifikasi push dari HP (di luar halaman aplikasi). */

self.addEventListener("install", () => {
  // Langsung aktifkan versi baru tanpa menunggu tab lama ditutup.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Mengubah tautan notifikasi menjadi alamat halaman yang benar.
 * Di database tautan disimpan singkat ("jadwal/<id>"), sedangkan halaman
 * sebenarnya berada di bawah area peran ("/warga/jadwal/<id>" atau
 * "/admin/jadwal/<id>"). Area dipilih dari sesi yang tersimpan di peramban.
 */
function alamatAman(tautan) {
  if (!tautan || typeof tautan !== "string") return "/";
  const bersih = tautan.replace(/^\/+/, "");
  if (bersih === "" || bersih === "notifikasi") return "/";
  if (!/^(jadwal|pertukaran)\//.test(bersih)) return "/";
  return `/buka?ke=${encodeURIComponent(bersih)}`;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { judul: "Ronda Warga", pesan: event.data ? event.data.text() : "" };
  }

  const judul = data.judul || "Ronda Warga";
  const opsi = {
    body: data.pesan || "",
    icon: "/ikon-192.png",
    badge: "/ikon-192.png",
    tag: data.tag || "ronda-warga",
    renotify: true,
    data: { tautan: alamatAman(data.tautan) },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(judul, opsi));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tautan = alamatAman(event.notification.data?.tautan);

  event.waitUntil(
    (async () => {
      const semua = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Bila aplikasi sudah terbuka, fokuskan dan arahkan ke halaman terkait.
      for (const klien of semua) {
        if ("focus" in klien) {
          await klien.focus();
          if ("navigate" in klien) {
            try {
              await klien.navigate(tautan);
            } catch {
              /* abaikan: sebagian browser tidak mengizinkan */
            }
          }
          return;
        }
      }
      // Belum terbuka: buka jendela baru.
      await self.clients.openWindow(tautan);
    })(),
  );
});
