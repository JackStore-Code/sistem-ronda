-- ============================================================================
-- TAMBALAN 25: Kata sandi menjadi 4 angka terakhir NPM
--
-- Contoh: sandi warga 2510631250052 -> 0052
-- Khusus Ketua RT: 2510631250031 -> 3131 (bukan 4 angka terakhir).
-- Berlaku untuk 24 akun (1 Ketua RT + 23 warga).
--
-- Catatan keamanan: 4 digit berarti hanya 10.000 kemungkinan. Ini cukup untuk
-- aplikasi RT, tetapi tidak untuk dipakai di luar keperluan demo/nilai tugas.
-- Sistem sudah punya penguncian? belum — bila perlu, tambahkan batas percobaan
-- login nanti.
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

-- Validasi aturan sandi ikut dilonggarkan menjadi minimal 4 karakter,
-- agar Ketua RT juga bisa mengganti sandi warga menjadi 4 digit dari aplikasi.
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

  select nama into nama_lama from public.pengguna where id = ubah_warga.warga_id;
  if nama_lama is null then raise exception 'Warga tidak ditemukan'; end if;

  if status_baru is not null and status_baru not in ('aktif', 'nonaktif') then
    raise exception 'Status akun tidak dikenal';
  end if;

  if sandi_baru is not null and btrim(sandi_baru) <> '' then
    sandi_bersih := lower(btrim(sandi_baru));
    if length(sandi_bersih) < 4 then raise exception 'Kata sandi minimal 4 karakter'; end if;
    if sandi_bersih !~ '^[a-z0-9]+$' then raise exception 'Kata sandi hanya huruf kecil dan angka'; end if;
    update public.pengguna
       set kata_sandi_hash = crypt(sandi_bersih, gen_salt('bf'))
     where id = ubah_warga.warga_id;
  end if;

  -- Username sengaja TIDAK diubah di sini.
  update public.pengguna
     set nama = coalesce(nullif(btrim(nama_baru), ''), nama),
         no_hp = coalesce(nullif(btrim(no_hp_baru), ''), no_hp),
         status_akun = coalesce(status_baru, status_akun),
         updated_at = now()
   where id = ubah_warga.warga_id;

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

-- Ganti sandi 24 akun menjadi 4 angka terakhir NPM ------------------------
-- Dipasangkan lewat nama lengkap (unik), bukan posisi baris.
do $$
declare d record;
begin
  for d in
    select * from (values
      ('Fajar Raihan Hanafi', '2510631250031', '3131'),  -- khusus Ketua RT, bukan 4 digit terakhir
      ('Azkiya Aulia Hidayah', '2510631250055', '0055'),
      ('Beby Naila Putri', '2510631250028', '0028'),
      ('Anisa Putri Amelia', '2510631250004', '0004'),
      ('Mukhlash Hisyam', '2510631250040', '0040'),
      ('Junaedi Adi Prasetyo', '2510631250064', '0064'),
      ('Muhammad Aji Nur Majid', '2510631250037', '0037'),
      ('Salsabila Fadillah Putri', '2510631250016', '0016'),
      ('Hadid Kurnia Fadillah', '2510631250010', '0010'),
      ('Salwa Khalipa', '2510631250013', '0013'),
      ('Sofian', '2510631250049', '0049'),
      ('Fathu Zaky Nugraha', '2510631250061', '0061'),
      ('Muhamad Irfan Zainudin', '2510631250070', '0070'),
      ('Lutfi Radithia Firmansyah', '2510631250067', '0067'),
      ('Alma Laila', '2510631250052', '0052'),
      ('Marsya Bella Puspita Rizky', '2510631250019', '0019'),
      ('Reihan Alfa Setiawan', '2510631250043', '0043'),
      ('Line Budiarti', '2510631250007', '0007'),
      ('Savina Hayati Ramadhani', '2510631250046', '0046'),
      ('Nazwa Cindy Cantika', '2510631250001', '0001'),
      ('Emira Dahilvis', '2510631250058', '0058'),
      ('Naufal Fathir Hidayat', '2510631250073', '0073'),
      ('Aqila Maulana Ikhsan', '2510631250025', '0025'),
      ('Meyla Sabrina', '2510631250022', '0022')
    ) as t(nama, npm, sandi)
  loop
    update public.pengguna
       set kata_sandi_hash = crypt(d.sandi, gen_salt('bf')),
           updated_at = now()
     where nama_normal = lower(btrim(d.nama));
  end loop;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Kata sandi seluruh akun diseragamkan menjadi 4 angka terakhir NPM.',
          to_char(now(), 'HH24.MI'), current_date);
end $$;

-- Verifikasi (harus 24 baris, semuanya 4 digit):
--   select nama, '1234' as contoh from public.pengguna where role in ('ketua','warga') order by nama;
-- Uji login:
--   select * from public.login('alma', '0052');   -- harus keluar token
--   select * from public.login('fajar', '3131');  -- Ketua RT
