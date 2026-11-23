-- ============================================================================
-- TAMBALAN 28: Masukkan 7 jadwal ronda (26 Nov - 2 Des 2026)
--
-- Petugas diambil dari tabel yang dikirim pemilik proyek. Nama dicocokkan ke
-- akun lewat nama lengkap; setiap jadwal dibuat dengan status dipublikasikan
-- agar warga langsung melihatnya.
--
-- Jalankan di Supabase Dashboard > SQL Editor.
-- ============================================================================

do $$
declare
  d record;
  jid uuid;
  nama_petugas text;
  uid uuid;
  dibuat integer := 0;
  gagal text[] := '{}';
begin
  for d in
    select * from (values
      ('2026-11-26', array['Reihan Alfa Setiawan','Line Budiarti','Hadid Kurnia Fadillah']),
      ('2026-11-27', array['Fathu Zaky Nugraha','Salwa Khalipa','Emira Dahilvis']),
      ('2026-11-28', array['Azkiya Aulia Hidayah','Lutfi Radithia Firmansyah','Sofian','Anisa Putri Amelia']),
      ('2026-11-29', array['Beby Naila Putri','Junaedi Adi Prasetyo','Nazwa Cindy Cantika','Meyla Sabrina']),
      ('2026-11-30', array['Marsya Bella Puspita Rizky','Muhamad Irfan Zainudin','Alma Laila']),
      ('2026-12-01', array['Muhammad Aji Nur Majid','Savina Hayati Ramadhani','Aqila Maulana Ikhsan']),
      ('2026-12-02', array['Naufal Fathir Hidayat','Mukhlash Hisyam','Salsabila Fadillah Putri'])
    ) as t(tgl, petugas)
  loop
    -- Buat atau perbarui jadwal untuk tanggal ini.
    insert into public.jadwal (tanggal, waktu_mulai, waktu_selesai, lokasi, status, dipublikasikan_pada)
    values (d.tgl::date, '22.00', '02.00', 'Pos ronda RT 05', 'dipublikasikan', now())
    on conflict (tanggal) do update
       set status = 'dipublikasikan',
           dipublikasikan_pada = coalesce(public.jadwal.dipublikasikan_pada, now()),
           updated_at = now()
    returning id into jid;

    -- Bersihkan petugas lama (kalau dijalankan ulang), lalu isi dari daftar.
    delete from public.detail_jadwal where jadwal_id = jid;

    foreach nama_petugas in array d.petugas loop
      select p.id into uid from public.pengguna p
       where p.nama_normal = lower(btrim(nama_petugas))
         and p.role = 'warga'
         and p.status_akun = 'aktif'
       limit 1;

      if uid is null then
        gagal := array_append(gagal, nama_petugas || ' (' || d.tgl || ')');
      else
        insert into public.detail_jadwal (jadwal_id, warga_id)
        values (jid, uid)
        on conflict (jadwal_id, warga_id) do nothing;
      end if;
    end loop;

    dibuat := dibuat + 1;
  end loop;

  raise notice 'Jadwal dibuat/diperbarui: %', dibuat;
  if array_length(gagal, 1) > 0 then
    raise notice 'Nama tidak ditemukan: %', array_to_string(gagal, ', ');
  end if;
end $$;

-- Verifikasi: 7 baris, masing-masing 3 atau 4 petugas
--   select j.tanggal, count(d.id) as petugas,
--          string_agg(p.nama, ', ' order by p.nama) as nama
--     from public.jadwal j
--     left join public.detail_jadwal d on d.jadwal_id = j.id
--     left join public.pengguna p on p.id = d.warga_id
--    where j.tanggal between '2026-11-26' and '2026-12-02'
--    group by j.tanggal order by j.tanggal;
