-- ============================================================================
-- TAMBALAN 22: Perbaiki hapus_warga() — "column reference warga_id is ambiguous"
--
-- Penyebab: parameter fungsi bernama warga_id, dan tabel yang dipakai juga
-- punya kolom warga_id. Di dalam kueri, PostgreSQL tidak tahu mana yang
-- dimaksud. Login dan pemeriksaan sandi sudah berjalan; yang gagal hanya
-- langkah pemeriksaan jadwal.
--
-- Perbaikan: semua acuan diberi awalan tabel (d.warga_id, p.id, dst).
-- Aturan tetap sama seperti tambalan 20.
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

create or replace function public.hapus_warga(
  token_sesi uuid,
  warga_id uuid,
  sandi_ketua text
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  peran text; ketua_id uuid; nama_hapus text; jumlah_jadwal integer; kredensial_ok boolean;
begin
  -- 1. Sesi pelaku harus Ketua RT.
  select p.id, p.role into ketua_id, peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();

  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat menghapus akun';
  end if;

  -- 2. Kata sandi Ketua RT harus cocok.
  select (p.kata_sandi_hash = crypt(lower(btrim(sandi_ketua)), p.kata_sandi_hash))
    into kredensial_ok
    from public.pengguna p where p.id = ketua_id;
  if not coalesce(kredensial_ok, false) then
    raise exception 'Kata sandi Ketua RT tidak cocok';
  end if;

  -- 3. Akun yang dihapus harus warga (bukan Ketua RT).
  select p.nama, p.role into nama_hapus, peran
    from public.pengguna p where p.id = hapus_warga.warga_id;
  if nama_hapus is null then raise exception 'Akun tidak ditemukan'; end if;
  if peran = 'ketua' then raise exception 'Akun Ketua RT tidak dapat dihapus'; end if;

  -- 4. Tolak bila warga masih tercatat pada jadwal.
  select count(*) into jumlah_jadwal
    from public.detail_jadwal d where d.warga_id = hapus_warga.warga_id;
  if jumlah_jadwal > 0 then
    raise exception 'Akun % masih tercatat pada % jadwal ronda. Nonaktifkan saja agar riwayat kehadiran tetap utuh.', nama_hapus, jumlah_jadwal;
  end if;

  -- 5. Bersihkan data miliknya, lalu hapus akun.
  delete from public.pertukaran pt
   where pt.pemohon_id = hapus_warga.warga_id or pt.warga_tujuan_id = hapus_warga.warga_id;
  delete from public.notifikasi n where n.penerima_id = hapus_warga.warga_id;
  delete from public.sesi s where s.pengguna_id = hapus_warga.warga_id;
  delete from public.langganan_push lp where lp.pengguna_id = hapus_warga.warga_id;
  delete from public.pengguna p where p.id = hapus_warga.warga_id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Akun ' || nama_hapus || ' dihapus.', to_char(now(), 'HH24.MI'), current_date);
end $$;

revoke all on function public.hapus_warga(uuid, uuid, text) from public;
grant execute on function public.hapus_warga(uuid, uuid, text) to anon, authenticated;

-- Verifikasi:
--   select proname, proconfig from pg_proc where proname = 'hapus_warga';
