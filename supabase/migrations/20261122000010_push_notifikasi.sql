-- ============================================================================
-- TAMBALAN 10: NOTIFIKASI PUSH KE PERANGKAT (Web Push)
--
-- Notifikasi dalam aplikasi tetap berjalan seperti sekarang. Tambahan ini
-- membuat notifikasi yang SAMA ikut dikirim ke HP warga lewat push, sehingga
-- muncul di layar atas HP walau aplikasi sedang tertutup.
--
-- Isi:
--   1. Tabel langganan_push  : menyimpan endpoint push tiap perangkat warga
--   2. Fungsi simpan_langganan_push() / hapus_langganan_push()
--   3. Fungsi publikasi_jadwal()  -> kirim jadwal draft + beri tahu petugas
--   4. Fungsi kirim_pengingat()   -> versi baru bernama jelas (tanpa bentrok kolom)
--   5. Trigger: setiap notifikasi baru otomatis memanggil Edge Function pengirim
--
-- Sebelum menjalankan ini, kamu harus sudah deploy Edge Function "kirim-push"
-- dan mengisi dua nilai di bawah (lihat panduan yang saya kirim di chat):
--   - alamat fungsi  : https://<project-ref>.supabase.co/functions/v1/kirim-push
--   - rahasia        : string acak yang sama dengan PUSH_WEBHOOK_SECRET
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABEL LANGGANAN PUSH
-- ---------------------------------------------------------------------------
create table if not exists public.langganan_push (
  id          uuid primary key default gen_random_uuid(),
  pengguna_id uuid not null references public.pengguna (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  dibuat      timestamptz not null default now(),
  terakhir    timestamptz
);

alter table public.langganan_push enable row level security;
grant select on public.langganan_push to anon, authenticated;

create index if not exists langganan_push_pengguna_idx on public.langganan_push (pengguna_id);

-- ---------------------------------------------------------------------------
-- 2. SIMPAN / HAPUS LANGGANAN PERANGKAT
-- ---------------------------------------------------------------------------
create or replace function public.simpan_langganan_push(
  token_sesi uuid,
  endpoint_baru text,
  p256dh_baru text,
  auth_baru text,
  agent text default null
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare pengguna uuid;
begin
  select s.pengguna_id into pengguna
    from public.sesi s
   where s.token = token_sesi and s.kedaluwarsa > now();
  if pengguna is null then
    raise exception 'Sesi tidak valid';
  end if;

  insert into public.langganan_push (pengguna_id, endpoint, p256dh, auth, user_agent)
  values (pengguna, endpoint_baru, p256dh_baru, auth_baru, agent)
  on conflict (endpoint) do update
     set pengguna_id = excluded.pengguna_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         user_agent = excluded.user_agent,
         terakhir = now();
end $$;
grant execute on function public.simpan_langganan_push(uuid, text, text, text, text) to anon, authenticated;

create or replace function public.hapus_langganan_push(token_sesi uuid, endpoint_hapus text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare pengguna uuid;
begin
  select s.pengguna_id into pengguna
    from public.sesi s
   where s.token = token_sesi and s.kedaluwarsa > now();
  if pengguna is null then raise exception 'Sesi tidak valid'; end if;

  delete from public.langganan_push
   where endpoint = endpoint_hapus and pengguna_id = pengguna;
end $$;
grant execute on function public.hapus_langganan_push(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. PUBLIKASI JADWAL (sebelumnya aplikasi memperbarui tabel langsung,
--    padahal peran anon tidak diberi hak itu -> tombol tidak berefek).
-- ---------------------------------------------------------------------------
create or replace function public.publikasi_jadwal(token_sesi uuid, jadwal_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare peran text; baris public.jadwal;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat mempublikasikan jadwal';
  end if;

  update public.jadwal j
     set status = 'dipublikasikan',
         dipublikasikan_pada = coalesce(j.dipublikasikan_pada, now()),
         updated_at = now()
   where j.id = jadwal_id
  returning * into baris;
  if baris.id is null then raise exception 'Jadwal tidak ditemukan'; end if;

  -- Setiap petugas menerima notifikasi giliran ronda.
  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  select 'Anda bertugas ronda ' || to_char(baris.tanggal, 'DD Mon YYYY'),
         'Jadwal: pukul ' || baris.waktu_mulai || ' - ' || baris.waktu_selesai ||
         ' WIB di ' || baris.lokasi || '. Mohon hadir tepat waktu.',
         'perubahan-jadwal', d.warga_id, 'jadwal/' || baris.id
    from public.detail_jadwal d
   where d.jadwal_id = baris.id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Jadwal ' || to_char(baris.tanggal, 'DD Mon YYYY') || ' dipublikasikan.',
          to_char(now(), 'HH24.MI'), current_date);
end $$;
grant execute on function public.publikasi_jadwal(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. PENGINGAT RONDA (versi baru: parameter tidak lagi bentrok dengan kolom)
-- ---------------------------------------------------------------------------
create or replace function public.kirim_pengingat(token_sesi uuid, jadwal_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare peran text; baris public.jadwal;
begin
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is distinct from 'ketua' then
    raise exception 'Hanya Ketua RT yang dapat mengirim pengingat';
  end if;

  select j.* into baris from public.jadwal j where j.id = jadwal_id;
  if baris.id is null then raise exception 'Jadwal tidak ditemukan'; end if;

  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  select 'Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY'),
         'Ronda dimulai pukul ' || baris.waktu_mulai || ' WIB di ' || baris.lokasi || '.',
         'pengingat', d.warga_id, 'jadwal/' || baris.id
    from public.detail_jadwal d where d.jadwal_id = baris.id;

  insert into public.aktivitas (teks, waktu, tanggal)
  values ('Pengingat ronda ' || to_char(baris.tanggal, 'DD Mon YYYY') || ' dikirim.',
          to_char(now(), 'HH24.MI'), current_date);
end $$;
grant execute on function public.kirim_pengingat(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. TRIGGER: setiap notifikasi baru -> panggil Edge Function pengirim push
--
-- GANTI dua nilai berikut sebelum menjalankan file ini.
-- ---------------------------------------------------------------------------
create or replace function public.kirim_push_notifikasi()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  alamat_fungsi text := 'ISI_DENGAN_https://<project-ref>.supabase.co/functions/v1/kirim-push';
  rahasia text := 'ISI_DENGAN_PUSH_WEBHOOK_SECRET';
begin
  -- Bila belum diisi, lewati dengan tenang agar notifikasi dalam aplikasi tetap jalan.
  if alamat_fungsi like 'ISI_DENGAN%' or rahasia like 'ISI_DENGAN%' then
    return new;
  end if;

  perform net.http_post(
    url := alamat_fungsi,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', rahasia),
    body := jsonb_build_object(
      'judul', new.judul,
      'pesan', new.pesan,
      'penerima', new.penerima_id,
      'tautan', new.tautan
    ),
    timeout_milliseconds := 5000
  );
  return new;
end $$;

drop trigger if exists trg_kirim_push on public.notifikasi;
create trigger trg_kirim_push
after insert on public.notifikasi
for each row execute function public.kirim_push_notifikasi();


-- ---------------------------------------------------------------------------
-- 6. UJI: kirim satu notifikasi ke akun sendiri (untuk memastikan push sampai)
-- ---------------------------------------------------------------------------
create or replace function public.uji_notifikasi_hp(token_sesi uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare pengguna uuid;
begin
  select s.pengguna_id into pengguna
    from public.sesi s
   where s.token = token_sesi and s.kedaluwarsa > now();
  if pengguna is null then raise exception 'Sesi tidak valid'; end if;

  insert into public.notifikasi (judul, pesan, kategori, penerima_id, tautan)
  values ('Notifikasi uji', 'Bila pesan ini muncul di layar atas HP Anda, notifikasi push sudah berjalan.',
          'pengingat', pengguna, 'notifikasi');
end $$;
grant execute on function public.uji_notifikasi_hp(uuid) to anon, authenticated;

-- Verifikasi:
--   select count(*) from public.langganan_push;   -- 0 sebelum ada yang mengaktifkan
