# PROGRES SISTEM RONDA — status terakhir

Terakhir diperbarui: 23 November 2026

## Alamat & akses

| Hal | Nilai |
|---|---|
| Aplikasi (produksi) | https://sistem-ronda-six.vercel.app |
| Kode | `C:\Users\Hanif\ronda-app` (Next.js 16, TypeScript, Tailwind) |
| Database | Supabase project `fplgeaigsmipfbksqjlt` |
| Ketua RT | **Fajar Raihan Hanafi** — sandi `2510631250031` |
| Warga | 23 orang, sandi = NPM masing-masing (daftar di laporan) |
| Login | **nama lengkap** + sandi NPM (huruf besar/kecil bebas) |

## Fitur yang sudah jalan (terverifikasi, bukan perkiraan)

- Login nama lengkap + NPM, sesi lewat fungsi database (`login`), bukan localStorage
- Jadwal ronda: buat, ubah, simpan draft, publikasikan (via `publikasi_jadwal`)
- Tukar jadwal: warga **memilih sendiri** warga tujuan dari daftar petugas; klik kirim → langsung pindah ke daftar pertukaran, klik ganda terkunci
- Validasi Ketua RT: setujui/tolak + alasan; jadwal kedua warga bertukar otomatis
- Kehadiran: catat per petugas + rekap **per warga per periode** (persentase hadir)
- Data warga: tambah/edit, nonaktifkan **dengan konfirmasi sandi Ketua RT** (akun nonaktif langsung diputus sesinya)
- Notifikasi: realtime (Supabase), klik = tandai satu dibaca, tombol = tandai semua
- Pengingat ronda: tombol "Kirim pengingat" berfungsi (diuji 3x berturut, semua sukses)
- **Push notifikasi ke HP (Android/Chrome)**: muncul di layar atas walau aplikasi ditutup
- Klik notifikasi HP → diarahkan ke halaman yang benar sesuai peran lewat `/buka?ke=...`
- Ringkasan data hanya terlihat Ketua RT; fitur reset data sudah dihapus

## Berkas SQL tambalan (sudah dijalankan semua)

Urutan di `supabase/migrations/`:
1. `...0001_skema_awal.sql`
2. `...0002_izin_dan_simpan_jadwal.sql`
3. `...0003_fungsi_tambahan.sql`
4. `...0004_perbaikan_pengingat.sql` — **JANGAN dipakai**: bagian bawahnya menghapus data
5. `...0005_aktifkan_realtime.sql`
6. `...0006_akun_baru_23_warga.sql`
7. `...0007_edit_warga.sql`
8. `...0008_perbaikan_search_path.sql` (perbaikan `gen_salt`)
9. `...0009_tandai_satu_notif.sql`
10. `...0010_push_notifikasi_SIAP.sql` (pakai yang `_SIAP`, bukan yang tanpa akhiran)
11. `...0011_perbaikan_trigger_push.sql`

## Pengaturan Supabase yang sudah dipasang

- Edge Function `kirim-push` (Verify JWT: OFF)
- Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (format `mailto:...`), `PUSH_WEBHOOK_SECRET`
- Ekstensi `pg_net` aktif; trigger `trg_kirim_push` pada tabel `notifikasi` (tahan gagal)
- Izin `service_role` untuk tabel `langganan_push`

## Catatan penting saat menguji / demo

- Data sekarang **di server**, dipakai bersama. Isi DB = yang dilihat semua orang.
- Izin notifikasi HP cukup **sekali per HP**. Kalau muncul "push server error", tutup semua tab lalu buka lagi (Chrome sering menyimpan berkas JS lama).
- iPhone: wajib "Tambahkan ke Layar Utama" dulu.
- Data sisa uji masih ada: beberapa permohonan tukar + belasan notifikasi pengingat milik Alma Laila. Dibiarkan sebagai contoh demo.
- Setelah ubah kode: `npx tsc --noEmit` → `npm run build` → `npx vercel --prod --yes`.

## Yang belum dikerjakan (opsional)

- Bersihkan data sisa uji coba
- Pindahkan repo ke GitHub (Lampiran B laporan masih `[URL]`)
- Diagram laporan (use case, activity, sequence, class, ERD) belum dibuat
- Isi §6.1 laporan: bentuk implementasi "Sistem berfungsi" + URL aplikasi

## Riwayat ringkas pekerjaan

1. Bangun aplikasi ronda sesuai mockup → deploy Vercel
2. Pisahkan akun Ketua RT & warga (hapus pratinjau peran), wajib login
3. Ganti akun → 40 warga, login nama lengkap + sandi per akun
4. Audit FR laporan + Tabel 27 pengujian black box (22 skenario)
5. Perbaiki FR-08 (notifikasi petugas terdampak) & FR-18 (rekap per warga)
6. Hapus penanda "data demo"
7. **Pindah total ke Supabase** (login, jadwal, tukar, kehadiran, notifikasi realtime)
8. Generasi data baru: 23 warga + NPM sebagai sandi, jadwal & pertukaran dikosongkan
9. Perbaiki badge notifikasi, kursor form (fokus dialog), edit warga + konfirmasi sandi
10. Tambah **push notification HP** + perbaikan 404 saat notifikasi diklik
