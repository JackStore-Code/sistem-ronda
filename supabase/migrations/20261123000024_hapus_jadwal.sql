-- ============================================================================
-- TAMBALAN 24: Fungsi hapus jadwal (sementara tombol "Hapus" tidak berefek)
--
-- Penyebab: aplikasi menghapus jadwal langsung ke tabel (delete from jadwal),
-- padahal hak hapus untuk peran aplikasi tidak ada / dibatasi RLS. Permintaan
-- ditolak diam-diam (0 baris terhapus), tetapi aplikasi tetap menampilkan
-- "Jadwal dihapus."
--
-- Perbaikan:
--   1. fungsi hapus_jadwal(token_sesi, jadwal_id) yang memeriksa peran Ketua RT
--   2. mencatat aktivitas penghapusan
--   3. menghapus permohonan tukar jadwal yang menyangkut jadwal tsb
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

create or replace function public.hapus_jadwal(token_sesi uuid, jadwal_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  peran text; tanggal_hapus date; jumlah_petugas integer;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();

  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat menghapus jadwal';
  end if;

  select j.tanggal into tanggal_hapus from public.jadwal j where j.id = hapus_jadwal.jadwal_id;
  if tanggal_hapus is null then
    raise exception 'Jadwal tidak ditemukan (mungkin sudah dihapus)';
  end if;

  select count(*) into jumlah_petugas
    from public.detail_jadwal d where d.jadwal_id = hapus_jadwal.jadwal_id;

  -- Permohonan tukar yang menyangkut jadwal ini tidak boleh tertinggal.
  delete from public.pertukaran pt
   where pt.jadwal_asal_id = hapus_jadwal.jadwal_id
      or pt.jadwal_tujuan_id = hapus_jadwal.jadwal_id;

  -- detail_jadwal ikut terhapus lewat on delete cascade.
  delete from public.jadwal j where j.id = hapus_jadwal.jadwal_id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Jadwal ' || to_char(tanggal_hapus, 'DD Mon YYYY') || ' dihapus (' || jumlah_petugas || ' petugas).',
          to_char(now(), 'HH24.MI'), current_date);
end $$;

revoke all on function public.hapus_jadwal(uuid, uuid) from public;
grant execute on function public.hapus_jadwal(uuid, uuid) to anon, authenticated;

-- Verifikasi:
--   select proname from pg_proc where proname = 'hapus_jadwal';
