-- ============================================================================
-- TAMBALAN 15 (GABUNGAN): LOGIN PAKAI USERNAME
--
-- Isi:
--   1. username dirapikan: tanpa @, huruf kecil, spasi jadi titik
--   2. lima username yang mirip / tidak khas diganti
--   3. username dijamin unik
--   4. fungsi login() mencari berdasarkan username
--
-- Yang TIDAK berubah: kata sandi, kolom nama lengkap di seluruh aplikasi,
-- dan fungsi tambah_warga()/ubah_warga() (username tetap turunan nama depan).
--
-- Aman dijalankan berulang. Jalankan di Supabase Dashboard > SQL Editor.
-- ============================================================================

-- 1. Rapikan username: buang @, huruf kecil, spasi -> titik ---------------
update public.pengguna
   set username = lower(regexp_replace(btrim(replace(username, '@', '')), '\s+', '.', 'g'));

-- 2. Lima username diganti menjadi nama depan yang khas ------------------
update public.pengguna set username = 'ikhsan' where lower(username) = 'aqila';     -- Aqila Maulana Ikhsan
update public.pengguna set username = 'fathir' where lower(username) = 'naufal';    -- Naufal Fathir Hidayat
update public.pengguna set username = 'irfan'  where lower(username) = 'muhamad';   -- Muhamad Irfan Zainudin
update public.pengguna set username = 'aji'    where lower(username) = 'muhammad';  -- Muhammad Aji Nur Majid
update public.pengguna set username = 'zaky'   where lower(username) = 'fathu';     -- Fathu Zaky Nugraha

-- 3. Jamin username unik: kalau masih bentrok, yang lebih baru diberi angka.
do $$
declare r record; dasar text; calon text; n integer;
begin
  for r in
    select p.id, lower(p.username) as username
      from public.pengguna p
     order by p.created_at, p.id
  loop
    dasar := r.username;
    calon := dasar;
    n := 1;
    while exists (
      select 1 from public.pengguna q
       where lower(q.username) = calon and q.id <> r.id
    ) loop
      n := n + 1;
      calon := dasar || n::text;
    end loop;
    if calon <> r.username then
      update public.pengguna set username = calon where id = r.id;
    end if;
  end loop;
end $$;

create unique index if not exists pengguna_username_key on public.pengguna (lower(username));

-- 4. Login dengan username -------------------------------------------------
create or replace function public.login(nama_lengkap text, kata_sandi text)
returns table (token uuid, pengguna_id uuid, nama text, role text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  p public.pengguna;
begin
  -- Parameter pertama dipertahankan namanya agar aplikasi tetap kompatibel,
  -- tetapi isinya sekarang username.
  select * into p from public.pengguna
   where lower(btrim(replace(nama_lengkap, '@', ''))) = lower(username)
     and status_akun = 'aktif'
   limit 1;

  if p.id is null then
    raise exception 'Username atau kata sandi tidak cocok';
  end if;
  if p.kata_sandi_hash <> crypt(lower(btrim(kata_sandi)), p.kata_sandi_hash) then
    raise exception 'Username atau kata sandi tidak cocok';
  end if;

  return query
    insert into public.sesi (pengguna_id) values (p.id)
    returning sesi.token, p.id, p.nama, p.role;
end $$;

grant execute on function public.login(text, text) to anon, authenticated;

-- Verifikasi:
--   select username, nama from public.pengguna order by username;
--   select * from public.login('fajar', '2510631250031');  -- harus keluar token
