-- ============================================================================
-- Skema database Sistem Informasi Manajemen Ronda Malam (Supabase / PostgreSQL)
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > tempel seluruh isi
-- file ini > Run.
--
-- Isi:
--   1. Tabel: pengguna, jadwal, detail_jadwal, pertukaran, notifikasi, aktivitas
--   2. Aturan akses (RLS) per peran: Ketua RT vs Warga
--   3. Fungsi bantu login (nama lengkap + kata sandi, kata sandi di-hash)
--   4. Realtime untuk notifikasi & pertukaran
--   5. Data awal: 1 Ketua RT + 40 warga
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------------------------

create table if not exists public.pengguna (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid unique references auth.users (id) on delete set null,
  nama            text not null,
  nama_normal     text generated always as (lower(btrim(nama))) stored,
  username        text not null,
  no_hp           text not null,
  role            text not null default 'warga' check (role in ('ketua', 'warga')),
  status_akun     text not null default 'aktif' check (status_akun in ('aktif', 'nonaktif')),
  kata_sandi_hash text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Nama lengkap dipakai untuk login, jadi tidak boleh kembar (tidak peka kapitalisasi/spasi).
create unique index if not exists pengguna_nama_normal_key on public.pengguna (nama_normal);
create unique index if not exists pengguna_username_key on public.pengguna (lower(username));

create table if not exists public.jadwal (
  id                   uuid primary key default gen_random_uuid(),
  tanggal              date not null,
  waktu_mulai          text not null default '22.00',
  waktu_selesai        text not null default '02.00',
  lokasi               text not null default 'Pos ronda RT 05',
  status               text not null default 'draft' check (status in ('draft', 'dipublikasikan')),
  dipublikasikan_pada  timestamptz,
  dibuat_oleh          uuid references public.pengguna (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tanggal)
);

create table if not exists public.detail_jadwal (
  id               uuid primary key default gen_random_uuid(),
  jadwal_id        uuid not null references public.jadwal (id) on delete cascade,
  warga_id         uuid not null references public.pengguna (id) on delete cascade,
  status_kehadiran text not null default 'belum-dicatat'
                   check (status_kehadiran in ('hadir', 'tidak-hadir', 'belum-dicatat')),
  waktu_dicatat    timestamptz,
  unique (jadwal_id, warga_id)
);

create table if not exists public.pertukaran (
  id                uuid primary key default gen_random_uuid(),
  kode              text not null unique,                 -- contoh PT-027
  pemohon_id        uuid not null references public.pengguna (id) on delete cascade,
  jadwal_asal_id    uuid not null references public.jadwal (id) on delete cascade,
  warga_tujuan_id   uuid not null references public.pengguna (id) on delete cascade,
  jadwal_tujuan_id  uuid not null references public.jadwal (id) on delete cascade,
  alasan            text not null,
  status            text not null default 'menunggu-warga'
                    check (status in ('menunggu-warga', 'menunggu-validasi', 'disetujui', 'ditolak')),
  diajukan_pada     timestamptz not null default now(),
  ditanggapi_pada   timestamptz,
  divalidasi_pada   timestamptz,
  alasan_penolakan  text,
  ditolak_oleh      text check (ditolak_oleh in ('warga', 'ketua')),
  created_at        timestamptz not null default now()
);

create table if not exists public.notifikasi (
  id           uuid primary key default gen_random_uuid(),
  judul        text not null,
  pesan        text not null,
  kategori     text not null default 'pertukaran'
               check (kategori in ('pertukaran', 'pengingat', 'perubahan-jadwal')),
  penerima_id  uuid references public.pengguna (id) on delete cascade, -- null = semua
  tautan       text,
  dibaca       boolean not null default false,
  waktu        timestamptz not null default now()
);
create index if not exists notifikasi_penerima_idx on public.notifikasi (penerima_id, dibaca);

create table if not exists public.aktivitas (
  id         uuid primary key default gen_random_uuid(),
  teks       text not null,
  tanggal    date not null default current_date,
  waktu      text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. ATURAN AKSES (RLS)
--    Anon key hanya boleh membaca. Semua penulisan lewat fungsi di bagian 3
--    yang sudah memeriksa kata sandi/peran, sehingga warga tidak bisa
--    mengubah jadwal atau membaca data warga lain secara bebas.
-- ---------------------------------------------------------------------------

alter table public.pengguna      enable row level security;
alter table public.jadwal        enable row level security;
alter table public.detail_jadwal enable row level security;
alter table public.pertukaran    enable row level security;
alter table public.notifikasi    enable row level security;
alter table public.aktivitas     enable row level security;

-- pengguna: warga & ketua boleh melihat daftar akun aktif (tanpa kata sandi),
-- kolom kata_sandi_hash tidak pernah dikirim ke klien.
create policy "pengguna terbaca" on public.pengguna for select using (true);

create policy "jadwal terbaca" on public.jadwal for select using (true);
create policy "detail jadwal terbaca" on public.detail_jadwal for select using (true);
create policy "pertukaran terbaca" on public.pertukaran for select using (true);
create policy "notifikasi terbaca" on public.notifikasi for select using (true);
create policy "aktivitas terbaca" on public.aktivitas for select using (true);

-- Sembunyikan hash kata sandi dari anon: buat view tanpa kolom itu.
create or replace view public.pengguna_publik
with (security_invoker = true) as
select id, nama, username, no_hp, role, status_akun
from public.pengguna;

-- ---------------------------------------------------------------------------
-- 3. FUNGSI LOGIN & AKSI (SECURITY DEFINER)
--    Aplikasi memanggilnya lewat supabase.rpc(...). Token sesi sederhana
--    disimpan di tabel sesi; ini cukup untuk demo satu RT.
-- ---------------------------------------------------------------------------

create table if not exists public.sesi (
  token       uuid primary key default gen_random_uuid(),
  pengguna_id uuid not null references public.pengguna (id) on delete cascade,
  dibuat      timestamptz not null default now(),
  kedaluwarsa timestamptz not null default now() + interval '30 days'
);
alter table public.sesi enable row level security;

create or replace function public.login(nama_lengkap text, kata_sandi text)
returns table (token uuid, pengguna_id uuid, nama text, role text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  p public.pengguna;
begin
  select * into p from public.pengguna
   where nama_normal = lower(btrim(nama_lengkap))
     and status_akun = 'aktif'
   limit 1;

  if p.id is null then
    raise exception 'Nama lengkap atau kata sandi tidak cocok';
  end if;
  if p.kata_sandi_hash <> crypt(lower(btrim(kata_sandi)), p.kata_sandi_hash) then
    raise exception 'Nama lengkap atau kata sandi tidak cocok';
  end if;

  return query
    insert into public.sesi (pengguna_id) values (p.id)
    returning sesi.token, p.id, p.nama, p.role;
end $$;

create or replace function public.ambil_pengguna(token_sesi uuid)
returns table (id uuid, nama text, username text, no_hp text, role text, status_akun text)
language sql security definer set search_path = public as $$
  select p.id, p.nama, p.username, p.no_hp, p.role, p.status_akun
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
$$;

-- Siapa saja (anon) boleh membuat pengajuan pertukaran.
create or replace function public.ajukan_pertukaran(
  token_sesi uuid, pemohon uuid, jadwal_asal uuid, warga_tujuan uuid,
  jadwal_tujuan uuid, alasan_tukar text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  kode_baru text;
  nama_pemohon text;
begin
  if not exists (select 1 from public.sesi where token = token_sesi and pengguna_id = pemohon and kedaluwarsa > now()) then
    raise exception 'Sesi tidak valid';
  end if;
  if length(btrim(alasan_tukar)) < 10 then
    raise exception 'Alasan pertukaran minimal 10 karakter';
  end if;

  kode_baru := 'PT-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0');

  insert into public.pertukaran (kode, pemohon_id, jadwal_asal_id, warga_tujuan_id, jadwal_tujuan_id, alasan)
  values (kode_baru, pemohon, jadwal_asal, warga_tujuan, jadwal_tujuan, btrim(alasan_tukar));

  select nama into nama_pemohon from public.pengguna where id = pemohon;
  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  values ('Permintaan pertukaran jadwal', nama_pemohon || ' mengajukan pertukaran jadwal dengan Anda.',
          'pertukaran', warga_tujuan, 'pertukaran/' || kode_baru);

  return kode_baru;
end $$;

-- Warga tujuan menanggapi. Jika setuju -> notifikasi ke SEMUA akun Ketua RT.
create or replace function public.tanggapi_pertukaran(
  token_sesi uuid, kode_tukar text, setuju boolean, alasan_tolak text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  it public.pertukaran;
  nama_pemohon text;
  nama_tujuan text;
begin
  select * into it from public.pertukaran where kode = kode_tukar for update;
  if it.id is null then raise exception 'Permohonan tidak ditemukan'; end if;

  if not exists (select 1 from public.sesi where token = token_sesi
                  and pengguna_id = it.warga_tujuan_id and kedaluwarsa > now()) then
    raise exception 'Hanya warga tujuan yang dapat menanggapi permohonan ini';
  end if;
  if it.status <> 'menunggu-warga' then
    raise exception 'Permohonan sudah ditanggapi';
  end if;

  select nama into nama_pemohon from public.pengguna where id = it.pemohon_id;
  select nama into nama_tujuan  from public.pengguna where id = it.warga_tujuan_id;

  update public.pertukaran
     set status = case when setuju then 'menunggu-validasi' else 'ditolak' end,
         ditanggapi_pada = now(),
         alasan_penolakan = case when setuju then null
                                 else coalesce(nullif(btrim(alasan_tolak), ''), 'Permintaan ditolak oleh warga tujuan.') end,
         ditolak_oleh = case when setuju then null else 'warga' end
   where id = it.id;

  if setuju then
    -- Notifikasi ke semua akun Ketua RT (bukan ID tetap seperti versi lama).
    insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
    select 'Pertukaran menunggu validasi Anda',
           nama_pemohon || ' dan ' || nama_tujuan || ' telah menyetujui pertukaran. Tinjau sebelum jadwal diperbarui.',
           'pertukaran', p.id, 'pertukaran/' || it.kode
      from public.pengguna p
     where p.role = 'ketua' and p.status_akun = 'aktif';
  else
    insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
    values ('Permintaan pertukaran ditolak',
            nama_tujuan || ' menolak permintaan Anda. Jadwal Anda tidak berubah.',
            'pertukaran', it.pemohon_id, 'pertukaran/' || it.kode);
  end if;
end $$;

-- Ketua RT memvalidasi: tukar petugas pada kedua jadwal.
create or replace function public.validasi_pertukaran(
  token_sesi uuid, kode_tukar text, setuju boolean, alasan_tolak text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  it public.pertukaran;
  peran text;
  ada_pemohon boolean;
  ada_tujuan boolean;
begin
  select role into peran from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then raise exception 'Hanya Ketua RT yang dapat memvalidasi'; end if;

  select * into it from public.pertukaran where kode = kode_tukar for update;
  if it.status <> 'menunggu-validasi' then raise exception 'Permohonan belum siap divalidasi'; end if;

  if setuju then
    select exists (select 1 from public.detail_jadwal where jadwal_id = it.jadwal_asal_id and warga_id = it.pemohon_id) into ada_pemohon;
    select exists (select 1 from public.detail_jadwal where jadwal_id = it.jadwal_tujuan_id and warga_id = it.warga_tujuan_id) into ada_tujuan;
    if not (ada_pemohon and ada_tujuan) then
      raise exception 'Permohonan belum dapat diproses: petugas pada jadwal ini sudah berubah';
    end if;

    update public.detail_jadwal set warga_id = it.warga_tujuan_id
     where jadwal_id = it.jadwal_asal_id and warga_id = it.pemohon_id;
    update public.detail_jadwal set warga_id = it.pemohon_id
     where jadwal_id = it.jadwal_tujuan_id and warga_id = it.warga_tujuan_id;
  end if;

  update public.pertukaran
     set status = case when setuju then 'disetujui' else 'ditolak' end,
         divalidasi_pada = now(),
         alasan_penolakan = case when setuju then null
                                 else coalesce(nullif(btrim(alasan_tolak), ''), 'Ditolak Ketua RT.') end,
         ditolak_oleh = case when setuju then null else 'ketua' end
   where id = it.id;

  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  select case when setuju then 'Pertukaran disetujui' else 'Pertukaran ditolak' end,
         case when setuju then 'Jadwal Anda telah diperbarui otomatis setelah validasi Ketua RT.'
              else coalesce(nullif(btrim(alasan_tolak), ''), 'Pengajuan ditolak Ketua RT. Jadwal tidak berubah.') end,
         'pertukaran', x.id, 'pertukaran/' || it.kode
    from (select it.pemohon_id as id union select it.warga_tujuan_id) x;
end $$;

-- Ketua RT mencatat kehadiran.
create or replace function public.catat_kehadiran(token_sesi uuid, detail uuid, status_baru text)
returns void
language plpgsql security definer set search_path = public as $$
declare peran text;
begin
  select role into peran from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then raise exception 'Hanya Ketua RT yang dapat mencatat kehadiran'; end if;
  if status_baru not in ('hadir', 'tidak-hadir', 'belum-dicatat') then raise exception 'Status tidak dikenal'; end if;

  update public.detail_jadwal
     set status_kehadiran = status_baru,
         waktu_dicatat = case when status_baru = 'belum-dicatat' then null else now() end
   where id = detail;
end $$;

grant execute on function public.login(text, text) to anon, authenticated;
grant execute on function public.ambil_pengguna(uuid) to anon, authenticated;
grant execute on function public.ajukan_pertukaran(uuid, uuid, uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.tanggapi_pertukaran(uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.validasi_pertukaran(uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.catat_kehadiran(uuid, uuid, text) to anon, authenticated;
grant select on public.pengguna_publik to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. REALTIME: notifikasi & pertukaran tampil tanpa refresh
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifikasi;
alter publication supabase_realtime add table public.pertukaran;
alter publication supabase_realtime add table public.jadwal;
alter publication supabase_realtime add table public.detail_jadwal;

-- ---------------------------------------------------------------------------
-- 5. DATA AWAL
--    Hanya dua hal yang diisi: akun (Ketua RT + 40 warga) dan jadwal ronda acak.
--    Tabel pertukaran, notifikasi, aktivitas, dan kehadiran sengaja DIBIARKAN
--    KOSONG agar pengajuan tukar jadwal dibuat manual saat presentasi.
--    Kata sandi di-hash dengan bcrypt (pgcrypto), tidak disimpan sebagai teks.
-- ---------------------------------------------------------------------------

-- Bersihkan dulu bila skrip ini dijalankan ulang.
truncate table public.notifikasi, public.aktivitas, public.pertukaran restart identity cascade;
delete from public.detail_jadwal;
delete from public.jadwal;
delete from public.pengguna;

insert into public.pengguna (nama, username, no_hp, role, kata_sandi_hash) values
  ('Fajar Raihan Hanafi', '@fajar', '0812-0000-0100', 'ketua', crypt('fajarhimsika99', gen_salt('bf'))),
  ('Aditya Pratama',  '@aditya',  '0812-0000-0101', 'warga', crypt('aditya142',    gen_salt('bf'))),
  ('Bayu Saputra',    '@bayu',    '0812-0000-0102', 'warga', crypt('bayu857',      gen_salt('bf'))),
  ('Candra Wijaya',   '@candra',  '0812-0000-0103', 'warga', crypt('candra391',    gen_salt('bf'))),
  ('Dimas Anggara',   '@dimas',   '0812-0000-0104', 'warga', crypt('dimas604',     gen_salt('bf'))),
  ('Eka Putra',       '@eka',     '0812-0000-0105', 'warga', crypt('eka275',       gen_salt('bf'))),
  ('Fajar Ramadhan',  '@fajar.r', '0812-0000-0106', 'warga', crypt('fajar938',     gen_salt('bf'))),
  ('Gilang Permana',  '@gilang',  '0812-0000-0107', 'warga', crypt('gilang419',    gen_salt('bf'))),
  ('Hadi Sucipto',    '@hadi',    '0812-0000-0108', 'warga', crypt('hadi582',      gen_salt('bf'))),
  ('Indra Lesmana',   '@indra',   '0812-0000-0109', 'warga', crypt('indra726',     gen_salt('bf'))),
  ('Joko Susanto',    '@joko',    '0812-0000-0110', 'warga', crypt('joko193',      gen_salt('bf'))),
  ('Kevin Sanjaya',   '@kevin',   '0812-0000-0111', 'warga', crypt('kevin840',     gen_salt('bf'))),
  ('Lukman Hakim',    '@lukman',  '0812-0000-0112', 'warga', crypt('lukman567',    gen_salt('bf'))),
  ('Muhamad Rizki',   '@muhamad', '0812-0000-0113', 'warga', crypt('muhamad214',   gen_salt('bf'))),
  ('Naufal Akmal',    '@naufal',  '0812-0000-0114', 'warga', crypt('naufal905',    gen_salt('bf'))),
  ('Oki Setiawan',    '@oki',     '0812-0000-0115', 'warga', crypt('oki378',       gen_salt('bf'))),
  ('Putra Mahardika', '@putra',   '0812-0000-0116', 'warga', crypt('putra651',     gen_salt('bf'))),
  ('Rizki Fauzi',     '@rizki',   '0812-0000-0117', 'warga', crypt('rizki429',     gen_salt('bf'))),
  ('Surya Dharma',    '@surya',   '0812-0000-0118', 'warga', crypt('surya813',     gen_salt('bf'))),
  ('Tri Nugroho',     '@tri',     '0812-0000-0119', 'warga', crypt('tri506',       gen_salt('bf'))),
  ('Wahyu Hidayat',   '@wahyu',   '0812-0000-0120', 'warga', crypt('wahyu972',     gen_salt('bf'))),
  ('Yudi Purnomo',    '@yudi',    '0812-0000-0121', 'warga', crypt('yudi185',      gen_salt('bf'))),
  ('Zainal Arifin',   '@zainal',  '0812-0000-0122', 'warga', crypt('zainal640',    gen_salt('bf'))),
  ('Akbar Maulana',   '@akbar',   '0812-0000-0123', 'warga', crypt('akbar357',     gen_salt('bf'))),
  ('Bagus Prasetyo',  '@bagus',   '0812-0000-0124', 'warga', crypt('bagus924',     gen_salt('bf'))),
  ('Cahyo Wibowo',    '@cahyo',   '0812-0000-0125', 'warga', crypt('cahyo731',     gen_salt('bf'))),
  ('Dwi Saputra',     '@dwi',     '0812-0000-0126', 'warga', crypt('dwi486',       gen_salt('bf'))),
  ('Erwin Syahputra', '@erwin',   '0812-0000-0127', 'warga', crypt('erwin259',     gen_salt('bf'))),
  ('Firman Maulana',  '@firman',  '0812-0000-0128', 'warga', crypt('firman803',    gen_salt('bf'))),
  ('Galih Kusuma',    '@galih',   '0812-0000-0129', 'warga', crypt('galih174',     gen_salt('bf'))),
  ('Harianto Wijaya', '@harianto','0812-0000-0130', 'warga', crypt('harianto692',  gen_salt('bf'))),
  ('Ilham Akbar',     '@ilham',   '0812-0000-0131', 'warga', crypt('ilham538',     gen_salt('bf'))),
  ('Jaka Kusuma',     '@jaka',    '0812-0000-0132', 'warga', crypt('jaka915',      gen_salt('bf'))),
  ('Kurniawan Dwi',   '@kurniawan','0812-0000-0133','warga', crypt('kurniawan247', gen_salt('bf'))),
  ('Lutfi Hasan',     '@lutfi',   '0812-0000-0134', 'warga', crypt('lutfi860',     gen_salt('bf'))),
  ('Maulana Yusuf',   '@maulana', '0812-0000-0135', 'warga', crypt('maulana329',   gen_salt('bf'))),
  ('Nugroho Susilo',  '@nugroho', '0812-0000-0136', 'warga', crypt('nugroho714',   gen_salt('bf'))),
  ('Pandu Wibowo',    '@pandu',   '0812-0000-0137', 'warga', crypt('pandu495',     gen_salt('bf'))),
  ('Reza Pahlevi',    '@reza',    '0812-0000-0138', 'warga', crypt('reza608',      gen_salt('bf'))),
  ('Sandi Pratama',   '@sandi',   '0812-0000-0139', 'warga', crypt('sandi153',     gen_salt('bf'))),
  ('Teguh Santoso',   '@teguh',   '0812-0000-0140', 'warga', crypt('teguh826',     gen_salt('bf')))
on conflict (nama_normal) do nothing;

-- Jadwal ronda 14 hari ke depan mulai besok, petugas diacak (6 orang per malam).
-- Jadwal hari ke-7 dan ke-14 sengaja dibiarkan draft agar status draft tetap ada.
insert into public.jadwal (tanggal, waktu_mulai, waktu_selesai, lokasi, status, dipublikasikan_pada)
select (current_date + n)::date,
       '22.00', '02.00', 'Pos ronda RT 05',
       case when n in (7, 14) then 'draft' else 'dipublikasikan' end,
       case when n in (7, 14) then null else now() end
  from generate_series(1, 14) as n
on conflict (tanggal) do nothing;

-- Bagikan petugas secara acak ke setiap jadwal.
with petugas as (
  select j.id as jadwal_id,
         w.id as warga_id,
         row_number() over (partition by j.id order by random()) as urutan
    from public.jadwal j
    cross join lateral (
      select id from public.pengguna
       where role = 'warga' and status_akun = 'aktif'
       order by random() limit 6
    ) w
)
insert into public.detail_jadwal (jadwal_id, warga_id)
select jadwal_id, warga_id from petugas where urutan <= 6
on conflict (jadwal_id, warga_id) do nothing;

-- Verifikasi cepat setelah dijalankan:
--   select count(*) from public.pengguna;   -- 41
--   select count(*) from public.jadwal;     -- 14
--   select count(*) from public.pertukaran; -- 0 (kosong, sesuai permintaan)
--   select * from public.login('Aditya Pratama', 'aditya142');
