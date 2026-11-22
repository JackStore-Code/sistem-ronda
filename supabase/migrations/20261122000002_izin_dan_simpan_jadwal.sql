-- ============================================================================
-- TAMBALAN IZIN (jalankan setelah skema awal)
-- Penyebab: role "anon" belum diberi hak baca tabel, sehingga REST API
-- menolak dengan "permission denied for table ..." / "Invalid API key".
--
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > tempel > Run.
-- ============================================================================

-- 1. Hak baca untuk pengunjung (anon) dan pengguna login (authenticated).
grant usage on schema public to anon, authenticated;

grant select on public.pengguna to anon, authenticated;
grant select on public.jadwal to anon, authenticated;
grant select on public.detail_jadwal to anon, authenticated;
grant select on public.pertukaran to anon, authenticated;
grant select on public.notifikasi to anon, authenticated;
grant select on public.aktivitas to anon, authenticated;
grant select on public.pengguna_publik to anon, authenticated;

-- 2. Kolom kata sandi tidak boleh terbaca klien. Buang hak baca tabel pengguna
--    lalu beri hak hanya pada kolom yang aman (tanpa kata_sandi_hash).
revoke select on public.pengguna from anon, authenticated;
grant select (id, nama, username, no_hp, role, status_akun, created_at)
  on public.pengguna to anon, authenticated;

-- 3. Fungsi yang dipanggil aplikasi.
grant execute on function public.login(text, text) to anon, authenticated;
grant execute on function public.ambil_pengguna(uuid) to anon, authenticated;
grant execute on function public.ajukan_pertukaran(uuid, uuid, uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.tanggapi_pertukaran(uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.validasi_pertukaran(uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.catat_kehadiran(uuid, uuid, text) to anon, authenticated;

-- 4. Realtime: daftarkan tabel, lewati yang sudah terdaftar
--    (versi sebelumnya error 42710 "already member of publication").
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

-- 5. Fungsi tambahan: Ketua RT membuat jadwal baru dari aplikasi.
create or replace function public.simpan_jadwal(
  token_sesi uuid,
  id_jadwal uuid,
  tgl date,
  mulai text,
  selesai text,
  tempat text,
  petugas uuid[],
  publikasikan boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare peran text;
        hasil uuid;
begin
  select role into peran from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then raise exception 'Hanya Ketua RT yang dapat mengatur jadwal'; end if;

  if id_jadwal is null then
    insert into public.jadwal (tanggal, waktu_mulai, waktu_selesai, lokasi, status, dipublikasikan_pada)
    values (tgl, mulai, selesai, coalesce(nullif(btrim(tempat), ''), 'Pos ronda RT 05'),
            case when publikasikan then 'dipublikasikan' else 'draft' end,
            case when publikasikan then now() else null end)
    returning id into hasil;
  else
    update public.jadwal
       set tanggal = tgl, waktu_mulai = mulai, waktu_selesai = selesai,
           lokasi = coalesce(nullif(btrim(tempat), ''), lokasi),
           status = case when publikasikan then 'dipublikasikan' else status end,
           dipublikasikan_pada = case when publikasikan then now() else dipublikasikan_pada end,
           updated_at = now()
     where id = id_jadwal
    returning id into hasil;
    delete from public.detail_jadwal where jadwal_id = hasil;
  end if;

  insert into public.detail_jadwal (jadwal_id, warga_id)
  select hasil, unnest(petugas)
  on conflict (jadwal_id, warga_id) do nothing;

  -- Beri tahu petugas bila jadwal yang sudah tayang berubah susunannya.
  if publikasikan then
    insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
    select 'Anda mendapat giliran ronda ' || to_char(tgl, 'DD Mon YYYY'),
           'Jadwal ronda Anda: pukul ' || mulai || ' WIB di ' || coalesce(nullif(btrim(tempat), ''), 'Pos ronda RT 05') || '.',
           'perubahan-jadwal', w, 'jadwal/' || hasil
      from unnest(petugas) as w;
  end if;

  return hasil;
end $$;

grant execute on function public.simpan_jadwal(uuid, uuid, date, text, text, text, uuid[], boolean) to anon, authenticated;

-- Verifikasi: jalankan setelah Run
--   select count(*) from public.pengguna;   -- 41
--   select count(*) from public.jadwal;     -- 14
--   select count(*) from public.pertukaran; -- 0
