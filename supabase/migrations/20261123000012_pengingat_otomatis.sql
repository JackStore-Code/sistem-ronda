-- ============================================================================
-- TAMBALAN 12: Pengingat ronda OTOMATIS (FR-07)
--
-- Latar: versi sebelumnya hanya mengirim pengingat bila Ketua RT menekan
-- tombol (kirim_pengingat). FR-07 meminta pengingat otomatis sebelum giliran
-- dimulai. Tambalan ini menambah:
--   1. kolom jadwal.pengingat_terakhir_dikirim  -> penanda anti-kirim-ganda
--   2. fungsi kirim_pengingat_otomatis()        -> dipanggil penjadwal, tanpa sesi
--   3. penjadwalan pg_cron tiap 10 menit
--   4. kirim_pengingat() manual ikut menandai, agar tidak dobel
--
-- Aturan kirim otomatis (semua harus terpenuhi):
--   - status jadwal 'dipublikasikan'
--   - jadwalronda belum dimulai (sekarang < waktu_mulai, WIB)
--   - mulai dalam <= 120 menit
--   - pengingat_terakhir_dikirim kosong / lebih lama dari 60 menit
--
-- Semua perbandingan waktu memakai Asia/Jakarta secara eksplisit karena
-- database Supabase berjalan di UTC.
-- Jalankan di Supabase Dashboard > SQL Editor.
-- ============================================================================

-- 1. Penanda pengingat -------------------------------------------------------
alter table public.jadwal
  add column if not exists pengingat_terakhir_dikirim timestamptz;

comment on column public.jadwal.pengingat_terakhir_dikirim is
  'Waktu (UTC) pengingat terakhir dikirim untuk jadwal ini; dipakai mencegah kirim ganda.';

-- 2. Fungsi inti: mengirim pengingat untuk satu jadwal -----------------------
create or replace function public.kirim_pengingat_jadwal(jadwal_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  baris public.jadwal;
  jumlah integer := 0;
begin
  select j.* into baris from public.jadwal j where j.id = jadwal_id;
  if baris.id is null then return 0; end if;

  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  select 'Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY'),
         'Ronda dimulai pukul ' || baris.waktu_mulai || ' WIB di ' || baris.lokasi || '.',
         'pengingat', d.warga_id, 'jadwal/' || baris.id
    from public.detail_jadwal d
   where d.jadwal_id = baris.id;
  get diagnostics jumlah = row_count;

  update public.jadwal
     set pengingat_terakhir_dikirim = now()
   where id = jadwal_id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY') || ' dikirim.',
          to_char(now() at time zone 'Asia/Jakarta', 'HH24.MI'),
          (now() at time zone 'Asia/Jakarta')::date);

  return jumlah;
end $$;

revoke all on function public.kirim_pengingat_jadwal(uuid) from public;
grant execute on function public.kirim_pengingat_jadwal(uuid) to service_role;

-- 3. Pemindai otomatis: dipanggil pg_cron -----------------------------------
create or replace function public.kirim_pengingat_otomatis()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  sekarang_jkt timestamp;
  baris record;
  total integer := 0;
begin
  sekarang_jkt := now() at time zone 'Asia/Jakarta';

  for baris in
    select j.id
      from public.jadwal j
     where j.status = 'dipublikasikan'
       -- mulai = tanggal + jam mulai (kolom teks '22.00' -> '22:00')
       and (j.tanggal + replace(j.waktu_mulai, '.', ':')::time) >= sekarang_jkt
       and (j.tanggal + replace(j.waktu_mulai, '.', ':')::time) <= sekarang_jkt + interval '120 minutes'
       and (j.pengingat_terakhir_dikirim is null
            or j.pengingat_terakhir_dikirim < now() - interval '60 minutes')
       and exists (select 1 from public.detail_jadwal d where d.jadwal_id = j.id)
  loop
    total := total + public.kirim_pengingat_jadwal(baris.id);
  end loop;

  return total;
end $$;

revoke all on function public.kirim_pengingat_otomatis() from public, anon, authenticated;
grant execute on function public.kirim_pengingat_otomatis() to service_role;

-- 4. Pengingat manual tetap ada (pakai fungsi inti yang sama, jadi ikut
--    menandai pengingat_terakhir_dikirim dan tidak dobel dengan yang otomatis).
create or replace function public.kirim_pengingat(token_sesi uuid, jadwal_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare peran text; baris public.jadwal;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat mengirim pengingat';
  end if;

  select j.* into baris from public.jadwal j where j.id = jadwal_id;
  if baris.id is null then raise exception 'Jadwal tidak ditemukan'; end if;

  perform public.kirim_pengingat_jadwal(jadwal_id);
end $$;
grant execute on function public.kirim_pengingat(uuid, uuid) to anon, authenticated;

-- 5. Penjadwal: pg_cron tiap 10 menit ---------------------------------------
create extension if not exists pg_cron;

select cron.unschedule('pengingat-ronda-otomatis')
 where exists (select 1 from cron.job where jobname = 'pengingat-ronda-otomatis');

select cron.schedule(
  'pengingat-ronda-otomatis',
  '*/10 * * * *',
  $$select public.kirim_pengingat_otomatis();$$
);

-- Verifikasi:
--   select * from cron.job;
--   select public.kirim_pengingat_otomatis();          -- jumlah notifikasi terkirim
--   select id, tanggal, waktu_mulai, pengingat_terakhir_dikirim from public.jadwal
--    where status = 'dipublikasikan' order by tanggal desc limit 5;
