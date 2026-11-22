-- ============================================================================
-- TAMBALAN 6: GANTI SELURUH DATA AKUN + KOSONGKAN JADWAL & PERTUKARAN
--
-- Akun: 1 Ketua RT (Fajar Raihan Hanafi) + 23 warga.
-- Kata sandi: NPM masing-masing (huruf kecil/angka), disimpan ter-hash bcrypt.
-- Login tetap memakai NAMA LENGKAP + NPM.
--
-- Jadwal, detail jadwal, pertukaran, notifikasi, dan aktivitas DIKOSONGKAN TOTAL.
-- Ketua RT yang akan menambahkan jadwal lewat aplikasi.
--
-- Jalankan di Supabase > SQL Editor.
-- ============================================================================

-- 1. Kosongkan seluruh data kegiatan (urutan penting: anak dulu, induk belakangan).
truncate table public.notifikasi, public.aktivitas, public.pertukaran restart identity cascade;
delete from public.detail_jadwal;
delete from public.jadwal;
delete from public.sesi;

-- 2. Ganti seluruh akun.
delete from public.pengguna;

insert into public.pengguna (nama, username, no_hp, role, kata_sandi_hash) values
  ('Fajar Raihan Hanafi', '@fajar', '0812-0000-1010', 'ketua', crypt('2510631250031', gen_salt('bf'))),
  ('Azkiya Aulia Hidayah', '@azkiya', '0812-0000-1001', 'warga', crypt('2510631250055', gen_salt('bf'))),
  ('Beby Naila Putri', '@beby', '0812-0000-1002', 'warga', crypt('2510631250028', gen_salt('bf'))),
  ('Anisa Putri Amelia', '@anisa', '0812-0000-1003', 'warga', crypt('2510631250004', gen_salt('bf'))),
  ('Mukhlash Hisyam', '@mukhlash', '0812-0000-1004', 'warga', crypt('2510631250040', gen_salt('bf'))),
  ('Junaedi Adi Prasetyo', '@junaedi', '0812-0000-1005', 'warga', crypt('2510631250064', gen_salt('bf'))),
  ('Muhammad Aji Nur Majid', '@muhammad', '0812-0000-1006', 'warga', crypt('2510631250037', gen_salt('bf'))),
  ('Salsabila Fadillah Putri', '@salsabila', '0812-0000-1007', 'warga', crypt('2510631250016', gen_salt('bf'))),
  ('Hadid Kurnia Fadillah', '@hadid', '0812-0000-1008', 'warga', crypt('2510631250010', gen_salt('bf'))),
  ('Salwa Khalipa', '@salwa', '0812-0000-1009', 'warga', crypt('2510631250013', gen_salt('bf'))),
  ('Sofian', '@sofian', '0812-0000-1011', 'warga', crypt('2510631250049', gen_salt('bf'))),
  ('Fathu Zaky Nugraha', '@fathu', '0812-0000-1012', 'warga', crypt('2510631250061', gen_salt('bf'))),
  ('Muhamad Irfan Zainudin', '@muhamad', '0812-0000-1013', 'warga', crypt('2510631250070', gen_salt('bf'))),
  ('Lutfi Radithia Firmansyah', '@lutfi', '0812-0000-1014', 'warga', crypt('2510631250067', gen_salt('bf'))),
  ('Alma Laila', '@alma', '0812-0000-1015', 'warga', crypt('2510631250052', gen_salt('bf'))),
  ('Marsya Bella Puspita Rizky', '@marsya', '0812-0000-1016', 'warga', crypt('2510631250019', gen_salt('bf'))),
  ('Reihan Alfa Setiawan', '@reihan', '0812-0000-1017', 'warga', crypt('2510631250043', gen_salt('bf'))),
  ('Line Budiarti', '@line', '0812-0000-1018', 'warga', crypt('2510631250007', gen_salt('bf'))),
  ('Savina Hayati Ramadhani', '@savina', '0812-0000-1019', 'warga', crypt('2510631250046', gen_salt('bf'))),
  ('Nazwa Cindy Cantika', '@nazwa', '0812-0000-1020', 'warga', crypt('2510631250001', gen_salt('bf'))),
  ('Emira Dahilvis', '@emira', '0812-0000-1021', 'warga', crypt('2510631250058', gen_salt('bf'))),
  ('Naufal Fathir Hidayat', '@naufal', '0812-0000-1022', 'warga', crypt('2510631250073', gen_salt('bf'))),
  ('Aqila Maulana Ikhsan', '@aqila', '0812-0000-1023', 'warga', crypt('2510631250025', gen_salt('bf'))),
  ('Meyla Sabrina', '@meyla', '0812-0000-1024', 'warga', crypt('2510631250022', gen_salt('bf')))
on conflict (nama_normal) do nothing;

-- 3. Pastikan bersih.
--    select count(*) as akun from public.pengguna;       -- harus 24
--    select count(*) as jadwal from public.jadwal;       -- harus 0
--    select count(*) as tukar from public.pertukaran;    -- harus 0
--    select count(*) as kehadiran from public.detail_jadwal;  -- harus 0
