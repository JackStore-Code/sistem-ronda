/* Service worker: menampilkan notifikasi push dari HP (di luar halaman aplikasi). */

self.addEventListener("install", () => {
  // Langsung aktifkan versi baru tanpa menunggu tab lama ditutup.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Hanya izinkan alamat internal aplikasi; selain itu arahkan ke beranda. */
function alamatAman(tautan) {
  if (!tautan || typeof tautan !== "string") return "/";
  // Tautan dari database berbentuk "jadwal/<id>" atau "pertukaran/<kode>".
  if (tautan.startsWith("/")) return tautan;
  if (/^(jadwal|pertukaran|notifikasi)\//.test(tautan)) return `/${tautan}`;
  return "/";
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
