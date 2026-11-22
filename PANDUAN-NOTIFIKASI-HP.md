# Notifikasi ke HP (Web Push) — panduan singkat

Fitur ini menggandakan notifikasi yang sudah ada di aplikasi ke **notifikasi asli di layar atas HP**,
termasuk saat aplikasi sedang ditutup. Cukup diaktifkan **sekali per perangkat**.

> Notifikasi dalam aplikasi tetap jalan seperti biasa. Fitur ini hanya tambahan.

---

## Bagian 1 — yang sudah selesai (tidak perlu kamu kerjakan)

- Ikon aplikasi + manifest (aplikasi bisa "dipasang" ke Layar Utama)
- Service worker `public/sw.js` (penampil notifikasi di HP)
- Kunci VAPID publik sudah terpasang di Vercel dan `.env.local`
- Kartu **"Notifikasi ke HP"** di halaman Pengaturan (Ketua RT dan warga)
- Edge Function `supabase/functions/kirim-push/index.ts` (kode pengirim)
- SQL tambalan 10 (tabel langganan + trigger)

---

## Bagian 2 — yang perlu kamu lakukan (sekali saja, ±5 menit)

### Langkah 1: Buat Edge Function
1. Supabase Dashboard → **Edge Functions** → **Create a new function**
2. Nama: `kirim-push` (harus persis)
3. Hapus contoh yang muncul, lalu **tempel seluruh isi file**:
   `C:\Users\Hanif\ronda-app\supabase\functions\kirim-push\index.ts`
4. **Verify JWT** → matikan (OFF), karena fungsi ini dipanggil oleh database, bukan pengguna
5. **Deploy**

### Langkah 2: Isi Secrets Edge Function
Buka **Edge Functions → Secrets** (atau Project Settings → Edge Functions → Secrets), tambahkan 4 baris:

| Nama | Nilai |
|---|---|
| `VAPID_PUBLIC_KEY` | (lihat di file `vapid_kunci.txt` yang saya kirim terpisah) |
| `VAPID_PRIVATE_KEY` | (lihat file yang sama) |
| `VAPID_SUBJECT` | `mailto:fajar@example.com` — ganti dengan emailmu |
| `PUSH_WEBHOOK_SECRET` | buat sendiri, string acak panjang, mis. `ronda-rahasia-2026` |

### Langkah 3: Jalankan SQL tambalan 10
Buka `supabase/migrations/20261122000010_push_notifikasi.sql`.

Di bagian atas file ada dua baris yang harus **kamu ganti dulu** sebelum Run:

```sql
alamat_fungsi text := 'ISI_DENGAN_https://<project-ref>.supabase.co/functions/v1/kirim-push';
rahasia text := 'ISI_DENGAN_PUSH_WEBHOOK_SECRET';
```

- `<project-ref>` → bagian awal URL Supabase kamu (`fplgeaigsmipfbksqjlt`)
- `PUSH_WEBHOOK_SECRET` → nilai yang sama dengan Langkah 2

Setelah diganti, tempel semua isinya ke **SQL Editor** lalu **Run**.

> Kalau dua nilai itu belum diisi, aplikasi tetap jalan normal — hanya push-nya yang tidak terkirim.

---

## Bagian 3 — cara memakai (untuk warga)

1. Buka https://sistem-ronda-six.vercel.app di **Chrome Android**
2. Login
3. Masuk **Pengaturan** → kartu **"Notifikasi ke HP"** → tekan **"Aktifkan notifikasi"**
4. Saat muncul pertanyaan browser, tekan **Izinkan**
5. Tekan **"Kirim notifikasi uji"** → notifikasi harus muncul di layar atas HP

Setelah itu, notifikasi seperti pengingat ronda, jadwal baru, dan keputusan tukar jadwal
akan ikut muncul di HP meskipun aplikasi sedang ditutup.

**iPhone:** wajib dipasang dulu — Safari → tombol Bagikan → **Tambahkan ke Layar Utama**,
lalu buka aplikasi dari ikon tersebut. Tanpa itu, tombol izin tidak akan muncul.

---

## Batasan yang wajar diketahui

- Izin hanya diminta **sekali** per HP + browser. Logout/masuk lagi tidak meminta ulang.
- Kalau warga menolak izin, notifikasi tidak bisa muncul sampai dia mengizinkan manual
  (ikon gembok di address bar → Notifikasi → Izinkan).
- Menghapus data browser (clear browsing data) membuat izin hilang dan harus diaktifkan ulang.
- Mode hemat baterai ekstrem di sebagian HP Android bisa menunda notifikasi.
