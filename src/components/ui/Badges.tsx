import type { KategoriNotifikasi, StatusKehadiran, StatusPublikasi, StatusTanggapan } from "@/lib/types";
import { Badge } from "./Badge";

export function StatusPublikasiBadge({ status }: { status: StatusPublikasi }) {
  return status === "dipublikasikan" ? (
    <Badge nada="brand" title="Jadwal sudah dipublikasikan ke warga">
      Dipublikasikan
    </Badge>
  ) : (
    <Badge nada="neutral" title="Jadwal masih draft, belum terlihat warga">
      Draft
    </Badge>
  );
}

export function StatusKehadiranBadge({ status }: { status: StatusKehadiran }) {
  if (status === "hadir") {
    return (
      <Badge nada="brand" title="Petugas hadir">
        Hadir
      </Badge>
    );
  }
  if (status === "tidak-hadir") {
    return (
      <Badge nada="danger" title="Petugas tidak hadir">
        Tidak hadir
      </Badge>
    );
  }
  return (
    <Badge nada="attention" title="Kehadiran belum dicatat">
      Belum dicatat
    </Badge>
  );
}

export function StatusPertukaranBadge({ status }: { status: StatusTanggapan }) {
  if (status === "menunggu-warga") {
    return (
      <Badge nada="attention" title="Menunggu tanggapan warga tujuan">
        Menunggu warga tujuan
      </Badge>
    );
  }
  if (status === "menunggu-validasi") {
    return (
      <Badge nada="attention" title="Warga tujuan sudah setuju, menunggu validasi Ketua RT">
        Menunggu validasi RT
      </Badge>
    );
  }
  if (status === "disetujui") {
    return (
      <Badge nada="brand" title="Pertukaran disetujui Ketua RT">
        Disetujui
      </Badge>
    );
  }
  return (
    <Badge nada="danger" title="Pertukaran ditolak">
      Ditolak
    </Badge>
  );
}

export function KategoriBadge({ kategori }: { kategori: KategoriNotifikasi }) {
  if (kategori === "pertukaran") return <Badge nada="attention" dot={false}>Pertukaran</Badge>;
  if (kategori === "pengingat") return <Badge nada="brand" dot={false}>Pengingat</Badge>;
  return <Badge nada="neutral" dot={false}>Perubahan jadwal</Badge>;
}
