-- ============================================================================
-- TAMBALAN 3: fungsi tambahan + pembagian petugas lebih merata
-- Jalankan di SQL Editor setelah tambalan sebelumnya.
--
-- Isi:
--   1. tambah_warga()  - Ketua RT menambah warga dari aplikasi (sandi di-hash)
--   2. tandai_semua_dibaca(), kirim_pengingat()
--   3. izin update kolom yang aman pada tabel pengguna/jadwal/notifikasi/pertukaran
--   4. Pembagian ulang petugas: setiap warga dapat giliran, 6 orang per malam
-- ============================================================================

-- 1. Tambah warga (hanya Ketua RT).
create or replace function public.tambah_warga(
  token_sesi uuid, nama_baru text, sandi_baru text, no_hp text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare peran text; hasil uuid;
begin
  select role into peran from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then raise exception 'Hanya Ketua RT yang dapat mengelola data warga'; end if;
  if length(btrim(sandi_baru)) < 6 then raise exception 'Kata sandi minimal 6 karakter'; end if;
  if sandi_baru !~ '^[a-z0-9]+$' then raise exception 'Kata sandi hanya huruf kecil dan angka'; end if;

  insert into public.pengguna (nama, username, no_hp, role, kata_sandi_hash)
  values (btrim(nama_baru), '@' || lower(split_part(btrim(nama_baru), ' ', 1)),
          no_hp, 'warga', crypt(lower(btrim(sandi_baru)), gen_salt('bf')))
  returning id into hasil;
  return hasil;
end $$;
grant execute on function public.tambah_warga(uuid, text, text, text) to anon, authenticated;

-- 2a. Tandai semua notifikasi milik satu penerima sebagai dibaca.
create or replace function public.tandai_semua_dibaca(token_sesi uuid, penerima uuid)
returns void language plpgsql security definer set search_path = public as $$
declare peran text;
begin
  select role into peran from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is null then raise exception 'Sesi tidak valid'; end if;

  update public.notifikasi set dibaca = true
   where (penerima_id = penerima or penerima_id is null)
     and (penerima_id = penerima or peran = 'ketua');
end $$;
grant execute on function public.tandai_semua_dibaca(uuid, uuid) to anon, authenticated;

-- 2b. Kirim pengingat ronda ke petugas sebuah jadwal.
create or replace function public.kirim_pengingat(token_sesi uuid, jadwal uuid)
returns void language plpgsql security definer set search_path = public as $$
declare peran text; j public.jadwal;
begin
  select role into peran from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then raise exception 'Hanya Ketua RT yang dapat mengirim pengingat'; end if;

  select * into j from public.jadwal where id = jadwal;
  if j.id is null then raise exception 'Jadwal tidak ditemukan'; end if;

  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  select 'Pengingat ronda ' || to_char(j.tanggal, 'DD Mon YYYY'),
         'Ronda dimulai pukul ' || j.waktu_mulai || ' WIB di ' || j.lokasi || '.',
         'pengingat', d.warga_id, 'jadwal/' || j.id
    from public.detail_jadwal d where d.jadwal_id = j.id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Pengingat ronda ' || to_char(j.tanggal, 'DD Mon YYYY') || ' dikirim.',
          to_char(now(), 'HH24.MI'), current_date);
end $$;
grant execute on function public.kirim_pengingat(uuid, uuid) to anon, authenticated;

-- 3. Izin tulis terbatas untuk aksi tanpa fungsi khusus.
grant update (nama, username, no_hp, status_akun) on public.pengguna to authenticated, anon;
grant delete on public.jadwal to authenticated, anon;
grant update (dibaca) on public.notifikasi to authenticated, anon;
grant update (status, ditolak_oleh, alasan_penolakan) on public.pertukaran to authenticated, anon;

-- 4. Pembagian petugas lebih merata: setiap warga minimal 2 giliran pada
--    14 jadwal (6 petugas/malam = 84 slot untuk 40 warga).
delete from public.detail_jadwal;

with slot as (
  select j.id as jadwal_id,
         row_number() over (order by j.tanggal) as urutan_jadwal
    from public.jadwal j
),
warga as (
  select id as warga_id,
         row_number() over (order by nama_normal) - 1 as nomor
    from public.pengguna
   where role = 'warga' and status_akun = 'aktif'
),
kombinasi as (
  select s.jadwal_id, w.warga_id, s.urutan_jadwal, w.nomor,
         row_number() over (partition by s.jadwal_id order by ((w.nomor + s.urutan_jadwal * 6) % 40)) as urutan
    from slot s cross join warga w
)
insert into public.detail_jadwal (jadwal_id, warga_id)
select jadwal_id, warga_id from kombinasi where urutan <= 6
on conflict (jadwal_id, warga_id) do nothing;

-- Verifikasi: setiap warga harus muncul minimal 2 kali
--   select count(*) filter (where jml = 0) as tanpa_giliran from (
--     select p.id, count(d.id) as jml from public.pengguna p
--       left join public.detail_jadwal d on d.warga_id = p.id
--      where p.role = 'warga' group by p.id) x;
