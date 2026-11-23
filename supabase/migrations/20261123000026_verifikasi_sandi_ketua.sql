-- ============================================================================
-- TAMBALAN 26: Konfirmasi kata sandi Ketua RT dipindah ke server
--
-- Masalah: aplikasi memverifikasi sandi Ketua RT dengan memanggil login() dari
-- browser. Sesi yang sedang aktif bisa saja bukan sesi Ketua RT (mis. pengguna
-- membuka aplikasi warga di tab lain), sehingga pemeriksaan gagal walau sandi
-- benar. Selain itu sandi ikut terkirim ke fungsi login, bukan ke fungsi yang
-- memang untuk mengubah data.
--
-- Perbaikan: satu fungsi verifikasi_sandi_ketua(token_sesi, sandi) yang hanya
-- memeriksa KETUA RT PEMILIK SESI. Dipakai oleh nonaktifkan dan hapus akun.
--
-- Jalankan di Supabase Dashboard > SQL Editor. Aman dijalankan berulang.
-- ============================================================================

create or replace function public.verifikasi_sandi_ketua(token_sesi uuid, sandi text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  p public.pengguna;
begin
  select pg.* into p
    from public.sesi s join public.pengguna pg on pg.id = s.pengguna_id
   where s.token = token_sesi and s.kedaluwarsa > now();

  if p.id is null or p.role is distinct from 'ketua' then
    return false;
  end if;

  return p.kata_sandi_hash = crypt(lower(btrim(sandi)), p.kata_sandi_hash);
end $$;

revoke all on function public.verifikasi_sandi_ketua(uuid, text) from public;
grant execute on function public.verifikasi_sandi_ketua(uuid, text) to anon, authenticated;

-- Verifikasi:
--   select public.verifikasi_sandi_ketua('<token ketua>', '3131');  -- true
--   select public.verifikasi_sandi_ketua('<token ketua>', 'salah'); -- false
