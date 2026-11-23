-- ============================================================================
-- TAMBALAN 14: Rapikan pengingat otomatis 2x sehari (07.00 & 18.00 WIB)
--
-- Tambalan 13 sudah benar untuk jadwal cron dan aturan hari-H. Yang perlu
-- dibereskan:
--   1. Syarat "maksimal 1x per 8 jam" dihapus. Syarat itu warisan desain lama
--      (cron tiap 10 menit); dengan cron hanya 2x sehari, efeknya jadwal hari-H
--      bisa TIDAK dapat pengingat 18.00 karena sudah dipakai pagi. Pengaman
--      dobel sekarang cukup: satu pengingat per warga per jadwal per hari.
--   2. Penanda pengingat_terakhir_dikirim yang telanjur terisi hari ini
--      dikosongkan supaya 18.00 nanti benar-benar mengirim.
--
-- Jalankan di Supabase Dashboard > SQL Editor.
-- ============================================================================

-- 1. Fungsi inti: satu pengingat per warga per jadwal per hari --------------
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

-- 2. Pemindai: jadwal HARI INI saja, tanpa syarat 8 jam --------------------
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
       and (j.tanggal + replace(j.waktu_mulai, '.', ':')::time) > sekarang_jkt
       and exists (select 1 from public.detail_jadwal d where d.jadwal_id = j.id)
  loop
    total := total + public.kirim_pengingat_jadwal(baris.id);
  end loop;

  return total;
end $$;

revoke all on function public.kirim_pengingat_otomatis() from public, anon, authenticated;
grant execute on function public.kirim_pengingat_otomatis() to service_role;

-- 3. Bersihkan penanda hari ini agar 18.00 mengirim ------------------------
update public.jadwal
   set pengingat_terakhir_dikirim = null
 where tanggal = (now() at time zone 'Asia/Jakarta')::date;

-- 4. Hapus pengingat sisa uji "14.12" hari ini (dikirim sebelum jam 15.00) --
delete from public.notifikasi
 where kategori = 'pengingat'
   and pesan like '%pukul 14.12%'
   and (waktu at time zone 'Asia/Jakarta')::date
       = (now() at time zone 'Asia/Jakarta')::date;

-- Verifikasi:
--   select jobid, jobname, schedule, active from cron.job;   -- 2 baris
--   select public.kirim_pengingat_otomatis();                -- jumlah notifikasi
