-- ============================================================================
-- TAMBALAN 29: Kosongkan riwayat pertukaran jadwal
--
-- Yang dihapus hanya isi tabel pertukaran (permohonan tukar jadwal beserta
-- status dan alasannya). Jadwal, petugas, kehadiran, akun warga, notifikasi,
-- dan log aktivitas TIDAK disentuh.
--
-- Jalankan di Supabase Dashboard > SQL Editor.
-- ============================================================================

delete from public.pertukaran;

-- Verifikasi: harus 0
--   select count(*) from public.pertukaran;
--   select tanggal, status from public.jadwal order by tanggal;
