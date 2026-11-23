-- ============================================================================
-- TAMBALAN 23: Perbaiki saringan pengingat (Alma tidak menerima pengingat 18.00)
--
-- Penyebab: kirim_pengingat_jadwal() menganggap warga "sudah dikirimi hari ini"
-- bila ada notifikasi APA PUN dengan tautan 'jadwal/<id>' pada hari itu.
-- Notifikasi "Anda mendapat giliran ronda ..." (kategori perubahan-jadwal) yang
-- muncul saat jadwal disimpan ikut terhitung, sehingga warga tersebut dilewati
-- pada pengingat 07.00 / 18.00.
--
-- Perbaikan: saringan hanya menghitung notifikasi berkategori 'pengingat'.
-- Aturan lain tetap: hanya jadwal hari-H, hanya yang belum dimulai.
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

create or replace function public.kirim_pengingat_jadwal(jadwal_id uuid)
returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  baris public.jadwal;
  jumlah integer := 0;
begin
  select j.* into baris from public.jadwal j where j.id = kirim_pengingat_jadwal.jadwal_id;
  if baris.id is null then return 0; end if;

  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  select 'Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY'),
         'Ronda dimulai pukul ' || baris.waktu_mulai || ' WIB di ' || baris.lokasi || '.',
         'pengingat', d.warga_id, 'jadwal/' || baris.id
    from public.detail_jadwal d
   where d.jadwal_id = baris.id
     and d.status_kehadiran = 'belum-dicatat'
     -- Hanya pengingat yang dihitung, bukan notifikasi perubahan jadwal.
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
   where id = kirim_pengingat_jadwal.jadwal_id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY') || ' dikirim.',
          to_char(now() at time zone 'Asia/Jakarta', 'HH24.MI'),
          (now() at time zone 'Asia/Jakarta')::date);

  return jumlah;
end $$;

revoke all on function public.kirim_pengingat_jadwal(uuid) from public, anon, authenticated;
grant execute on function public.kirim_pengingat_jadwal(uuid) to service_role;

-- Verifikasi: jalankan pemindai untuk hari ini (manual, tidak menunggu jam).
-- Hasil > 0 berarti ada warga yang baru saja menerima pengingat.
--   select public.kirim_pengingat_otomatis();
--   select n.judul, p.nama, n.waktu from public.notifikasi n
--     join public.pengguna p on p.id = n.penerima_id
--    where n.kategori = 'pengingat'
--      and (n.waktu at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date
--    order by n.waktu desc;
