-- ============================================================================
-- TAMBALAN 11: PERBAIKAN TRIGGER PUSH
--
-- Masalah yang muncul saat uji:
--   ERROR 3F000: schema "net" does not exist
-- Artinya fungsi trigger memakai net.http_post (ekstensi pg_net) yang belum
-- aktif di project ini, sehingga pengiriman push gagal.
--
-- Perbaikan:
--   1. Aktifkan pg_net (bila diizinkan)
--   2. Trigger dibuat "tahan gagal": bila pemanggilan HTTP error, notifikasi
--      dalam aplikasi TETAP tersimpan dan tidak ikut batal.
--
-- Jalankan di SQL Editor. Aman diulang.
-- ============================================================================

-- 1. Ekstensi pemanggil HTTP. Bila baris ini error karena kebijakan dashboard,
--    lihat bagian 4 (alternatif) di bawah.
create extension if not exists pg_net with schema extensions;

-- 2. Trigger tahan gagal: seluruh pemanggilan dibungkus penanganan error,
--    sehingga kegagalan jaringan TIDAK membatalkan notifikasi.
create or replace function public.kirim_push_notifikasi()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  alamat_fungsi text := 'https://fplgeaigsmipfbksqjlt.supabase.co/functions/v1/kirim-push';
  rahasia text := 'ronda-rahasia-2026';
begin
  begin
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
  exception
    when others then
      -- Catat kegagalan ke aktivitas agar terlihat, tetapi jangan gagalkan insert.
      begin
        insert into public.aktivitas (teks, waktu, tanggal)
        values ('Push gagal dikirim: ' || left(sqlerrm, 160), to_char(now(), 'HH24.MI'), current_date);
      exception
        when others then null;
      end;
  end;
  return new;
end $$;

drop trigger if exists trg_kirim_push on public.notifikasi;
create trigger trg_kirim_push
after insert on public.notifikasi
for each row execute function public.kirim_push_notifikasi();

-- 3. Uji cepat: kirim satu notifikasi ke akun Alma Laila lalu lihat hasilnya.
--    (dijalankan otomatis oleh saya setelah file ini masuk)

-- 4. ALTERNATIF bila pg_net tidak bisa diaktifkan:
--    Supabase menyediakan pemanggil bawaan "supabase_functions.http_request".
--    Bila kamu menemui error saat membuat ekstensi di atas, beri tahu saya,
--    nanti fungsi trigger diganti memakai pemanggil bawaan tersebut.

-- Verifikasi:
--   select extname from pg_extension where extname = 'pg_net';   -- harus 1 baris
--   select tgname from pg_trigger where tgname = 'trg_kirim_push'; -- harus 1 baris
