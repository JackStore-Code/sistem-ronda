-- ============================================================================
-- TAMBALAN 21: Hapus fungsi tambah_warga versi LAMA (penyebab "tambah warga" gagal)
--
-- Muncul dua versi fungsi tambah_warga di database:
--   tambah_warga(uuid, text, text, text)         <- versi lama (00003/00007)
--   tambah_warga(uuid, text, text, text, text)   <- versi baru (menerima username)
-- Aplikasi mengirim parameter username_baru; PostgreSQL tidak bisa memilih
-- versi yang tepat sehingga menolak dengan error PGRST203
-- ("Could not choose the best candidate function").
--
-- Perbaikan: buang versi lama, sisakan yang 5 parameter.
-- ubah_warga juga dibersihkan bila ada sisa versi lama.
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

drop function if exists public.tambah_warga(uuid, text, text, text);
drop function if exists public.ubah_warga(uuid, uuid, text, text, text, text, text);
drop function if exists public.ubah_warga(uuid, uuid);

-- Verifikasi: setiap fungsi harus muncul TEPAT satu baris
--   select proname, pg_get_function_identity_arguments(oid) as argumen
--     from pg_proc where proname in ('tambah_warga','ubah_warga','hapus_warga','login')
--     order by proname;
