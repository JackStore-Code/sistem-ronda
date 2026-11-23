-- ============================================================================
-- TAMBALAN 18: Username tidak boleh berubah saat data warga disimpan
--
-- Masalah: setiap kali Ketua RT menekan "Simpan perubahan", aplikasi lama
-- mengirim username yang dibentuk ulang dari nama depan ("@nazwa"), sehingga
-- username yang sudah benar tertimpa tanda @.
--
-- Perbaikan:
--   1. ubah_warga() TIDAK lagi mengubah username sama sekali.
--   2. tambah_warga() membersihkan tanda @ dari username yang dikirim.
--   3. Data yang telanjur ber-@ dirapikan.
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

-- 1. Ubah warga: username tidak disentuh ----------------------------------
create or replace function public.ubah_warga(
  token_sesi uuid,
  warga_id uuid,
  nama_baru text default null,
  no_hp_baru text default null,
  status_baru text default null,
  sandi_baru text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  peran text; nama_lama text; sandi_bersih text;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat mengubah data warga';
  end if;

  select nama into nama_lama from public.pengguna where id = warga_id;
  if nama_lama is null then raise exception 'Warga tidak ditemukan'; end if;

  if status_baru is not null and status_baru not in ('aktif', 'nonaktif') then
    raise exception 'Status akun tidak dikenal';
  end if;

  if sandi_baru is not null and btrim(sandi_baru) <> '' then
    sandi_bersih := lower(btrim(sandi_baru));
    if length(sandi_bersih) < 6 then raise exception 'Kata sandi minimal 6 karakter'; end if;
    if sandi_bersih !~ '^[a-z0-9]+$' then raise exception 'Kata sandi hanya huruf kecil dan angka'; end if;
    update public.pengguna set kata_sandi_hash = crypt(sandi_bersih, gen_salt('bf')) where id = warga_id;
  end if;

  -- Username sengaja TIDAK diubah di sini. Username bersifat tetap.
  update public.pengguna
     set nama = coalesce(nullif(btrim(nama_baru), ''), nama),
         no_hp = coalesce(nullif(btrim(no_hp_baru), ''), no_hp),
         status_akun = coalesce(status_baru, status_akun),
         updated_at = now()
   where id = warga_id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values (
    case
      when status_baru = 'nonaktif' then 'Akun ' || nama_lama || ' dinonaktifkan.'
      when status_baru = 'aktif' then 'Akun ' || nama_lama || ' diaktifkan kembali.'
      else 'Data ' || nama_lama || ' diperbarui.'
    end,
    to_char(now(), 'HH24.MI'), current_date
  );
end $$;
grant execute on function public.ubah_warga(uuid, uuid, text, text, text, text) to anon, authenticated;

-- 2. Tambah warga: username dibersihkan dari @ dan spasi ------------------
create or replace function public.tambah_warga(
  token_sesi uuid, nama_baru text, sandi_baru text, no_hp text, username_baru text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  peran text; hasil uuid; sandi_bersih text; user_bersih text;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat mengelola data warga';
  end if;

  sandi_bersih := lower(btrim(sandi_baru));
  if length(sandi_bersih) < 6 then raise exception 'Kata sandi minimal 6 karakter'; end if;
  if sandi_bersih !~ '^[a-z0-9]+$' then raise exception 'Kata sandi hanya huruf kecil dan angka'; end if;

  user_bersih := lower(regexp_replace(btrim(replace(coalesce(username_baru, ''), '@', '')), '\s+', '.', 'g'));
  if user_bersih = '' then
    user_bersih := lower(split_part(btrim(nama_baru), ' ', 1));
  end if;
  if exists (select 1 from public.pengguna where lower(username) = user_bersih) then
    raise exception 'Username "%" sudah dipakai akun lain', user_bersih;
  end if;

  insert into public.pengguna (nama, username, no_hp, role, kata_sandi_hash)
  values (btrim(nama_baru), user_bersih, no_hp, 'warga', crypt(sandi_bersih, gen_salt('bf')))
  returning id into hasil;

  insert into public.aktivitas (teks, waktu, tanggal)
  values (btrim(nama_baru) || ' ditambahkan sebagai warga.', to_char(now(), 'HH24.MI'), current_date);

  return hasil;
end $$;
grant execute on function public.tambah_warga(uuid, text, text, text, text) to anon, authenticated;

-- 3. Rapikan username yang telanjur ber-@ ---------------------------------
update public.pengguna
   set username = lower(regexp_replace(btrim(replace(username, '@', '')), '\s+', '.', 'g'))
 where username like '%@%' or username <> lower(username);

-- Verifikasi: harus 0 baris
--   select username from public.pengguna where username like '%@%';
--   select username, nama from public.pengguna order by username;
