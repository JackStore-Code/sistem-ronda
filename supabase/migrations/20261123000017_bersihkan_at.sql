-- ============================================================================
-- TAMBALAN 17: Bersihkan tanda @ pada username (sisa versi lama)
--
-- Form "Data Warga" versi lama membentuk username dengan awalan @ sehingga
-- akun yang baru diganti sandinya mendapat username "@nazwa". Tambalan 15
-- merapikan data lama, tetapi aplikasi versi lama masih bisa menulis ulang @.
-- Kode aplikasi sudah diperbaiki (tanpa @); skrip ini merapikan data yang
-- telanjur kembali ber-@.
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

update public.pengguna
   set username = lower(regexp_replace(btrim(replace(username, '@', '')), '\s+', '.', 'g'))
 where username like '%@%' or username <> lower(username);

-- Verifikasi: harus 0 baris
--   select username from public.pengguna where username like '%@%';
--   select username, nama from public.pengguna order by username;
