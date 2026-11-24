-- ============================================================================
-- TAMBALAN 40: Kata sandi minimal 4 karakter (seragam di semua fungsi)
--
-- Masalah: ubah_warga() sudah dilonggarkan ke minimal 4 karakter (tambalan 25),
-- tetapi tambah_warga() masih menuntut minimal 6. Akibatnya saat Ketua RT
-- menambah warga baru dengan sandi 4 digit, server menolak dengan pesan
-- "Kata sandi minimal 6 karakter" dan akun tidak terbentuk.
--
-- Perbaikan: aturan sandi disatukan di satu fungsi public.cek_sandi() yang
-- dipakai ubah_warga(), tambah_warga(), dan hapus_warga() (untuk verifikasi).
--
-- Aturan:
--   - minimal 4 karakter, maksimal 64 karakter
--   - hanya huruf kecil dan angka, tanpa spasi
--   - huruf besar otomatis dijadikan huruf kecil
--
-- Jalankan di Supabase > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

-- 1. Satu tempat untuk aturan kata sandi --------------------------------------
create or replace function public.cek_sandi(sandi text)
returns text
language plpgsql immutable set search_path = public as $$
declare
  bersih text;
begin
  bersih := lower(btrim(coalesce(sandi, '')));

  if length(bersih) < 4 then
    raise exception 'Kata sandi minimal 4 karakter';
  end if;
  if length(bersih) > 64 then
    raise exception 'Kata sandi maksimal 64 karakter';
  end if;
  if bersih !~ '^[a-z0-9]+$' then
    raise exception 'Kata sandi hanya huruf kecil dan angka, tanpa spasi';
  end if;

  return bersih;
end $$;

grant execute on function public.cek_sandi(text) to anon, authenticated;

-- 2. tambah_warga: pakai aturan baru (penyebab warga gagal ditambahkan) --------
create or replace function public.tambah_warga(
  token_sesi uuid, nama_baru text, sandi_baru text, no_hp text, username_baru text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  peran text; hasil uuid; sandi_bersih text; user_bersih text;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat mengelola data warga';
  end if;

  if nullif(btrim(coalesce(nama_baru, '')), '') is null then
    raise exception 'Nama lengkap wajib diisi';
  end if;

  -- Minimal 4 karakter (sebelumnya 6 sehingga sandi 4 digit selalu ditolak).
  sandi_bersih := public.cek_sandi(sandi_baru);

  user_bersih := lower(regexp_replace(btrim(replace(coalesce(username_baru, ''), '@', '')), '\s+', '.', 'g'));
  if user_bersih = '' then user_bersih := lower(regexp_replace(btrim(nama_baru), '\s+', '.', 'g')); end if;
  if user_bersih = '' then raise exception 'Username tidak dapat dibentuk dari nama yang diisi'; end if;
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

-- 3. ubah_warga: aturan sama (ganti sandi opsional) ---------------------------
create or replace function public.ubah_warga(
  token_sesi uuid,
  warga_id uuid,
  nama_baru text default null,
  no_hp_baru text default null,
  status_baru text default null,
  sandi_baru text default null
) returns void
language plpgsql security definer set search_path = public, extensions as $$
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
    sandi_bersih := public.cek_sandi(sandi_baru);
    update public.pengguna
       set kata_sandi_hash = crypt(sandi_bersih, gen_salt('bf'))
     where id = warga_id;
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
      when sandi_baru is not null and btrim(sandi_baru) <> '' then 'Kata sandi ' || nama_lama || ' diganti.'
      else 'Data ' || nama_lama || ' diperbarui.'
    end,
    to_char(now(), 'HH24.MI'), current_date
  );
end $$;

grant execute on function public.ubah_warga(uuid, uuid, text, text, text, text) to anon, authenticated;

-- 4. Verifikasi --------------------------------------------------------------
-- a) Aturan sandi: yang pertama harus ERROR, sisanya harus mengembalikan nilai.
--    select public.cek_sandi('123');       -- error: minimal 4 karakter
--    select public.cek_sandi('1234');      -- 1234
--    select public.cek_sandi('Ab12');      -- ab12
--
-- b) Tambah warga dengan sandi 4 digit (harus berhasil, bukan error):
--    select public.tambah_warga(
--      (select token from public.login('fajar', '3131')),
--      'Contoh Warga Baru', '1234', '0812-0000-1234', 'contohwarga');
--
-- c) Hapus lagi akun percobaan di atas:
--    delete from public.pengguna where username = 'contohwarga';
