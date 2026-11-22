-- ============================================================================
-- TAMBALAN 4: perbaikan fungsi kirim_pengingat()
-- Sebelumnya error 42702 karena nama parameter "jadwal" bentrok dengan kolom
-- tabel. Parameter diganti menjadi "jadwal_id" agar tidak ambigu.
-- Jalankan di SQL Editor.
-- ============================================================================

create or replace function public.kirim_pengingat(token_sesi uuid, jadwal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  peran text;
  baris public.jadwal;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();

  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat mengirim pengingat';
  end if;

  select j.* into baris from public.jadwal j where j.id = jadwal_id;
  if baris.id is null then
    raise exception 'Jadwal tidak ditemukan';
  end if;

  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  select 'Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY'),
         'Ronda dimulai pukul ' || baris.waktu_mulai || ' WIB di ' || baris.lokasi || '.',
         'pengingat', d.warga_id, 'jadwal/' || baris.id
    from public.detail_jadwal d where d.jadwal_id = baris.id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY') || ' dikirim.',
          to_char(now(), 'HH24.MI'), current_date);
end $$;

grant execute on function public.kirim_pengingat(uuid, uuid) to anon, authenticated;

-- Bersihkan notifikasi hasil uji agar database kembali kosong untuk demo manual.
-- (Tabel pertukaran juga dibersihkan di sini.)
delete from public.notifikasi;
delete from public.aktivitas;
delete from public.pertukaran;
update public.detail_jadwal
   set status_kehadiran = 'belum-dicatat', waktu_dicatat = null;

-- Verifikasi: ketiganya harus 0
--   select count(*) from public.pertukaran;
--   select count(*) from public.notifikasi;
--   select count(*) from public.aktivitas;
