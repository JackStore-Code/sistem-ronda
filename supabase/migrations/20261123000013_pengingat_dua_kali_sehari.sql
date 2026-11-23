-- ============================================================================
-- TAMBALAN 13: Pengingat otomatis 2x sehari (07.00 dan 18.00 WIB)
--
-- Aturan kirim: warga HANYA menerima pengingat pada hari-H jadwalnya.
--   - jam 07.00 WIB -> pengingat untuk ronda yang jatuh HARI INI
--   - jam 18.00 WIB -> pengingat ulang untuk ronda malam ini
-- Jadwal tanggal lain tidak disentuh, sehingga warga tidak dibanjiri pengingat
-- dari hari-hari sebelumnya.
--
-- Dua penanda mencegah kirim ganda:
--   1. jadwal.pengingat_terakhir_dikirim -> satu jadwal maksimal 1x per 8 jam
--   2. notifikasi kategori 'pengingat'   -> per warga, tidak dobel di hari yang sama
--
-- Semua waktu dihitung di Asia/Jakarta secara eksplisit karena server
-- database Supabase berjalan di UTC (07.00 WIB = 00.00 UTC, 18.00 WIB = 11.00 UTC).
-- Jalankan di Supabase Dashboard > SQL Editor.
-- ============================================================================

-- 1. Fungsi inti: satu pemberitahuan per warga per hari per jadwal ----------
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
   where d.jadwal_id = baris.id
     and d.status_kehadiran = 'belum-dicatat'
     -- warga ini belum menerima pengingat untuk jadwal ini hari ini
     and not exists (
       select 1 from public.notifikasi n
        where n.penerima_id = d.warga_id
          and n.kategori = 'pengingat'
          and n.tautan = 'jadwal/' || baris.id
          and (n.waktu at time zone 'Asia/Jakarta')::date
              = (now() at time zone 'Asia/Jakarta')::date
     );
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

revoke all on function public.kirim_pengingat_jadwal(uuid) from public, anon, authenticated;
grant execute on function public.kirim_pengingat_jadwal(uuid) to service_role;

-- 2. Pemindai: hanya jadwal HARI INI ----------------------------------------
create or replace function public.kirim_pengingat_otomatis()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  sekarang_jkt timestamp;
  hari_ini date;
  baris record;
  total integer := 0;
begin
  sekarang_jkt := now() at time zone 'Asia/Jakarta';
  hari_ini := sekarang_jkt::date;

  for baris in
    select j.id
      from public.jadwal j
     where j.status = 'dipublikasikan'
       and j.tanggal = hari_ini
       -- hanya ronda yang belum dimulai (jam mulai sudah lewat -> dilewati)
       and (j.tanggal + replace(j.waktu_mulai, '.', ':')::time) > sekarang_jkt
       and (j.pengingat_terakhir_dikirim is null
            or j.pengingat_terakhir_dikirim < now() - interval '8 hours')
       and exists (select 1 from public.detail_jadwal d where d.jadwal_id = j.id)
  loop
    total := total + public.kirim_pengingat_jadwal(baris.id);
  end loop;

  return total;
end $$;

revoke all on function public.kirim_pengingat_otomatis() from public, anon, authenticated;
grant execute on function public.kirim_pengingat_otomatis() to service_role;

-- 2. Jadwal cron: 07.00 dan 18.00 WIB ---------------------------------------
-- UTC: 07.00 WIB = 00.00 UTC, 18.00 WIB = 11.00 UTC.
select cron.unschedule('pengingat-ronda-otomatis')
 where exists (select 1 from cron.job where jobname = 'pengingat-ronda-otomatis');

select cron.schedule(
  'pengingat-ronda-pagi',
  '0 0 * * *',
  $$select public.kirim_pengingat_otomatis();$$
);

select cron.schedule(
  'pengingat-ronda-sore',
  '0 11 * * *',
  $$select public.kirim_pengingat_otomatis();$$
);

-- Verifikasi (harus ada 2 baris, keduanya active = true):
--   select jobid, jobname, schedule, active from cron.job;
-- Uji manual tanpa menunggu jam:
--   select public.kirim_pengingat_otomatis();
