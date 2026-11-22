-- ============================================================================
-- TAMBALAN 8: PERBAIKAN SKEMA FUNGSI (gen_salt tidak ditemukan)
--
-- Gejala: menyimpan perubahan data warga gagal walau kata sandi benar, karena
-- fungsi memakai crypt()/gen_salt() dari pgcrypto padahal search_path fungsi
-- hanya "public" sehingga fungsi tersebut tidak terlihat.
-- Perbaikan: search_path disertakan "extensions".
--
-- Sekaligus mengaktifkan izin update (dipakai saat menandai notifikasi dibaca).
-- Jalankan di SQL Editor.
-- ============================================================================

-- 1. Fungsi yang memakai pgcrypto (crypt / gen_salt)
create or replace function public.ubah_warga(
  token_sesi uuid, warga_id uuid, nama_baru text default null,
  no_hp_baru text default null, status_baru text default null, sandi_baru text default null
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

  sandi_bersih := nullif(btrim(coalesce(sandi_baru, '')), '');
  if sandi_bersih is not null then
    if length(sandi_bersih) < 6 then raise exception 'Kata sandi minimal 6 karakter'; end if;
    if sandi_bersih !~ '^[a-z0-9]+$' then raise exception 'Kata sandi hanya huruf kecil dan angka'; end if;
  end if;

  update public.pengguna p
     set nama = coalesce(nullif(btrim(nama_baru), ''), p.nama),
         no_hp = coalesce(nullif(btrim(no_hp_baru), ''), p.no_hp),
         status_akun = coalesce(status_baru, p.status_akun),
         kata_sandi_hash = case when sandi_bersih is null then p.kata_sandi_hash
                                else crypt(lower(sandi_bersih), gen_salt('bf')) end,
         username = case when nullif(btrim(nama_baru), '') is null then p.username
                         else '@' || lower(split_part(btrim(nama_baru), ' ', 1)) end,
         updated_at = now()
   where p.id = warga_id;

  if status_baru = 'nonaktif' then
    delete from public.sesi where pengguna_id = warga_id;
  end if;

  insert into public.aktivitas (teks, waktu, tanggal)
  values (case when status_baru = 'nonaktif' then 'Akun ' || nama_lama || ' dinonaktifkan.'
               when status_baru = 'aktif' then 'Akun ' || nama_lama || ' diaktifkan kembali.'
               else 'Data ' || nama_lama || ' diperbarui.' end,
          to_char(now(), 'HH24.MI'), current_date);
end $$;
grant execute on function public.ubah_warga(uuid, uuid, text, text, text, text) to anon, authenticated;

create or replace function public.tambah_warga(
  token_sesi uuid, nama_baru text, sandi_baru text, no_hp text
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare peran text; hasil uuid; sandi_bersih text;
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

  insert into public.pengguna (nama, username, no_hp, role, kata_sandi_hash)
  values (btrim(nama_baru), '@' || lower(split_part(btrim(nama_baru), ' ', 1)),
          no_hp, 'warga', crypt(sandi_bersih, gen_salt('bf')))
  returning id into hasil;

  insert into public.aktivitas (teks, waktu, tanggal)
  values (btrim(nama_baru) || ' ditambahkan sebagai warga.', to_char(now(), 'HH24.MI'), current_date);
  return hasil;
end $$;
grant execute on function public.tambah_warga(uuid, text, text, text) to anon, authenticated;

create or replace function public.daftar_warga(token_sesi uuid)
returns table (id uuid, nama text, username text, no_hp text, role text, status_akun text)
language plpgsql security definer set search_path = public, extensions as $$
declare peran text;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat melihat data warga';
  end if;
  return query
    select p.id, p.nama, p.username, p.no_hp, p.role, p.status_akun
      from public.pengguna p order by p.role, p.nama_normal;
end $$;
grant execute on function public.daftar_warga(uuid) to anon, authenticated;

-- 2. Izin tulis yang dipakai aplikasi (menandai notifikasi dibaca).
grant update (dibaca) on public.notifikasi to anon, authenticated;

-- Verifikasi: kedua baris di bawah harus mengembalikan hasil, bukan error.
--   (login dulu) select token from public.login('Fajar Raihan Hanafi', '2510631250031');
--   select * from public.daftar_warga('<token>');
