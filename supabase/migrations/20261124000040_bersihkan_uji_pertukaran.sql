-- ============================================================================
-- BERSIHKAN PERMOHONAN SISA UJI COBA
--
-- Isinya: menghapus permohonan pertukaran yang dibuat oleh SKRIP UJI OTOMATIS,
-- yaitu pasangan Salwa Khalipa -> Reihan Alfa Setiawan dengan alasan:
--   'Ada acara keluarga di luar kota pada tanggal tersebut.'
--   'Uji penolakan oleh warga tujuan.'
--   'Uji penolakan oleh Ketua RT.'
--
-- Data asli TIDAK disentuh:
--   PT-526433 (Reihan -> Fathu, sudah disetujui)  -> tetap
--   PT-933139, PT-982985, PT-622173 (dibuat Pak RT) -> tetap
--
-- Jalankan di Supabase > SQL Editor.
-- ============================================================================

-- 1. Lihat dulu apa yang akan dihapus (jalankan SELECT ini lebih dulu kalau mau periksa)
select kode, status, alasan, diajukan_pada
  from public.pertukaran
 where alasan in (
        'Ada acara keluarga di luar kota pada tanggal tersebut.',
        'Uji penolakan oleh warga tujuan.',
        'Uji penolakan oleh Ketua RT.'
       )
   and pemohon_id in (select id from public.pengguna where lower(username) = 'salwa')
 order by diajukan_pada;

-- 2. Hapus
delete from public.pertukaran
 where alasan in (
        'Ada acara keluarga di luar kota pada tanggal tersebut.',
        'Uji penolakan oleh warga tujuan.',
        'Uji penolakan oleh Ketua RT.'
       )
   and pemohon_id in (select id from public.pengguna where lower(username) = 'salwa');

-- 3. Hapus juga notifikasi yang menunjuk ke permohonan yang sudah tidak ada
delete from public.notifikasi n
 where n.tautan like 'pertukaran/%'
   and not exists (
     select 1 from public.pertukaran p
      where n.tautan = 'pertukaran/' || p.kode
   );

-- Verifikasi: sisa permohonan harus 3 data asli + PT-526433 (sudah disetujui)
select kode, status, alasan from public.pertukaran order by diajukan_pada;
