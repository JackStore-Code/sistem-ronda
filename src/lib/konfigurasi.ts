/**
 * Konfigurasi publik aplikasi.
 *
 * Kunci VAPID di bawah adalah kunci PUBLIK untuk Web Push — memang harus bisa
 * dibaca browser, sama seperti kunci publik pada umumnya. Kunci rahasianya
 * (VAPID_PRIVATE_KEY) hanya disimpan di Supabase Secrets dan tidak pernah
 * ikut ke klien.
 *
 * Nilai bisa ditimpa lewat environment NEXT_PUBLIC_VAPID_PUBLIC_KEY bila ada.
 */
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BH-X-aE6ypS6cpdK-3jUHlX80o1DYW1dwJbnn5lsbKg0jcM1MpxH6sk9iBexHQsVfjAm9CVaRQ7mRzQIFw5mVwM";
