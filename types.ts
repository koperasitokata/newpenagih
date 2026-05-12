
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Prospect {
  nama: string;
  nik: string;
  no_hp: string;
  pin: string;
  latitude: number;
  longitude: number;
}

export interface Nasabah {
  id_nasabah: string;
  nik: string;
  nama: string;
  no_hp: string;
  pin: string;
  foto: string;
  latitude: number;
  longitude: number;
  update_lokasi: string | Date;
  saldo_simpanan?: number;
}

export interface PinjamanAktif {
  id_pinjaman: string;
  tanggal: string | Date;
  id_nasabah: string;
  nama: string;
  pokok: number;
  bunga_persen: number;
  total_hutang: number;
  tenor: number;
  cicilan: number;
  sisa_hutang: number;
  status: 'Aktif' | 'Lunas';
  petugas: string;
  update_terakhir: string | Date;
  foto_bukti: string;
  qr_code?: string;
}

export interface AngsuranRecord {
  id_angsuran: string;
  tanggal: string | Date;
  id_pinjaman: string;
  id_nasabah: string;
  jumlah: number;
  sisa_hutang: number;
  petugas: string;
  foto_bukti: string;
}

export interface PengajuanPinjaman {
  id_pengajuan: string;
  tanggal: string | Date;
  id_nasabah: string;
  nama: string;
  jumlah: number;
  tenor: number;
  petugas: string;
  status: 'Pending' | 'Approved' | 'Disbursed';
}

export interface SimpananRecord {
  id_simpanan: string;
  tanggal: string | Date;
  id_nasabah: string;
  setor: number;
  tarik: number;
  saldo: number;
  petugas: string;
  keterangan: string;
}

export interface Mutation {
  tanggal: string | Date;
  keterangan: string;
  jumlah: number;
  petugas: string;
  jenis?: string;
  id_nasabah?: string;
  id_pinjam?: string;
  foto?: string;
}

export interface PetugasProfile {
  id_petugas: string;
  nama: string;
  no_hp: string;
  password?: string;
  jabatan: string;
  foto: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  FORM = 'FORM',
  HISTORY = 'HISTORY',
  MAP = 'MAP',
  SUBMISSION = 'SUBMISSION',
  CUSTOMER_LIST = 'CUSTOMER_LIST',
  INSTALLMENT_CARD = 'INSTALLMENT_CARD',
  LOGIN = 'LOGIN',
  MUTATION = 'MUTATION',
  SAVINGS_WITHDRAWAL = 'SAVINGS_WITHDRAWAL'
}

export type ThemeType = 'default' | 'midnight' | 'sunset' | 'light';
