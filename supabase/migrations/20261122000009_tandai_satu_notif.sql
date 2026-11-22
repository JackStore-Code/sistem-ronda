-- ============================================================================
-- TAMBALAN 9: TANDAI SATU NOTIFIKASI SEBAGAI DIBACA
--
-- Sebelumnya aplikasi memperbarui tabel notifikasi langsung dari peramban,
-- padahal peran anon tidak diberi hak tulis di sana, sehingga notifikasi tidak
-- berubah menjadi "sudah dibaca" saat diklik.
--
-- Fungsi ini menandai SATU notifikasi saja. Berbeda dari tandai_semua_dibaca()
-- yang menandai seluruh notifikasi milik pengguna.
--
-- Aturan keamanan:
--   - hanya pemilik notifikasi (atau akun Ketua RT) yang boleh menandainya
--   - notifikasi "untuk semua" (penerima_id kosong) boleh ditandai siapa pun
--   - notifikasi milik orang lain tidak bisa ditandai
--
-- Jalankan di Supabase > SQL Editor.
-- ============================================================================

create or replace function public.tandai_dibaca(token_sesi uuid, notif_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  peran text;
  pemilik uuid;
begin
  -- 1. Pastikan sesi masih sah.
  select p.role into peran
    from public.sesi s join public.pengguna p on p.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();
  if peran is null then
    raise exception 'Sesi tidak valid';
  end if;

  select n.penerima_id into pemilik from public.notifikasi n where n.id = notif_id;
  if not found then
    raise exception 'Notifikasi tidak ditemukan';
  end if;

  -- 2. Hanya untuk dirinya sendiri; Ketua RT boleh menandai milik siapa pun.
  if pemilik is not null and peran <> 'ketua' then
    if not exists (
      select 1 from public.sesi s
       where s.token = token_sesi and s.pengguna_id = pemilik
    ) then
      raise exception 'Notifikasi ini bukan milik akun Anda';
    end if;
  end if;

  -- 3. Tandai satu notifikasi saja.
  update public.notifikasi set dibaca = true where id = notif_id;
end $$;

grant execute on function public.tandai_dibaca(uuid, uuid) to anon, authenticated;

-- Pastikan izin dasar tetap ada (dipakai fungsi tandai_semua_dibaca).
grant select on public.notifikasi to anon, authenticated;

-- Verifikasi (ganti <token> dan <id notif>):
--   select public.tandai_dibaca('<token>', '<id notif>');
--   select judul, dibaca from public.notifikasi where id = '<id notif>';
