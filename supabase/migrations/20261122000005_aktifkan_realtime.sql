-- ============================================================================
-- TAMBALAN 5: AKTIFKAN REALTIME
-- Masalah: aplikasi sudah berlangganan perubahan, tetapi server realtime belum
-- diberi izin/broadcast untuk tabel ronda, sehingga notifikasi baru tidak
-- muncul sampai halaman dimuat ulang.
-- Jalankan di SQL Editor.
-- ============================================================================

-- 1. Fungsi bantu: pastikan tabel terdaftar pada publication realtime.
do $$
declare t text;
begin
  foreach t in array array['notifikasi', 'pertukaran', 'jadwal', 'detail_jadwal']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 2. Pastikan replika identitas lengkap: tanpa ini, event UPDATE/DELETE bisa
--    terkirim tanpa data yang dibutuhkan klien untuk memuat ulang.
alter table public.notifikasi      replica identity full;
alter table public.pertukaran      replica identity full;
alter table public.jadwal          replica identity full;
alter table public.detail_jadwal   replica identity full;

-- 3. Beri izin baca untuk peran realtime (dipakai server saat menyiarkan).
grant select on public.notifikasi to anon, authenticated;
grant select on public.pertukaran to anon, authenticated;
grant select on public.jadwal to anon, authenticated;
grant select on public.detail_jadwal to anon, authenticated;

-- 4. Cek hasilnya: keempat tabel harus muncul di daftar ini.
--    select tablename from pg_publication_tables where pubname = 'supabase_realtime';

-- 5. Bersihkan notifikasi sisa uji coba agar mulai dari keadaan kosong.
delete from public.notifikasi where judul in ('uji realtime');
