-- ============================================================================
-- TAMBALAN 27: Kosongkan SEMUA notifikasi (RT dan warga)
--
-- Yang dihapus hanya isi tabel notifikasi. Jadwal, petugas, kehadiran, data
-- warga, dan permohonan tukar TIDAK disentuh.
--
-- Penanda pengingat_terakhir_dikirim dikosongkan juga supaya pengingat
-- otomatis 07.00 / 18.00 tetap jalan untuk jadwal hari-H setelah ini.
--
-- Jalankan di Supabase Dashboard > SQL Editor.
-- ============================================================================

delete from public.notifikasi;

update public.jadwal
   set pengingat_terakhir_dikirim = null
 where pengingat_terakhir_dikirim is not null;

-- Verifikasi: harus 0
--   select count(*) from public.notifikasi;
--   select tanggal, pengingat_terakhir_dikirim from public.jadwal order by tanggal;
