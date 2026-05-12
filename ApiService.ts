
import { Nasabah, PinjamanAktif, PengajuanPinjaman, PetugasProfile } from './types';

// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA
const API_URL = 'https://script.google.com/macros/s/AKfycbwRvcXUI1GVEo-Uc83Y_8eizho-LWPlsHXmcsA_tg2JAspUl9LBF5Sdak3MpiQduajt2g/exec';

export const ApiService = {
  /**
   * Mengirim perintah eksekusi ke Google Apps Script dengan format { action, payload }
   * Ditambahkan logika retry untuk menangani kegagalan fetch sementara
   */
  async call(action: string, payload: any = {}, retries = 3) {
    const body = JSON.stringify({ action, payload });
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: body,
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("Gagal parse JSON dari respons:", text);
          throw new Error("Format respons server tidak valid (Bukan JSON)");
        }
      } catch (error) {
        const isLastRetry = i === retries - 1;
        if (isLastRetry) {
          console.error(`API Error [${action}]:`, error);
          return { 
            success: false, 
            message: `Koneksi Gagal: Pastikan Google Script sudah di-Deploy sebagai Web App (Anyone). Error: ${error instanceof Error ? error.message : 'Failed to fetch'}` 
          };
        }
        await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1)));
      }
    }
  },

  /**
   * Mengambil data menggunakan GET (doGet di Apps Script)
   */
  async getData(retries = 2) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(API_URL, {
          method: 'GET',
          mode: 'cors',
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          return { success: false, message: "doGet tidak mengembalikan JSON" };
        }
      } catch (error) {
        const isLastRetry = i === retries - 1;
        if (isLastRetry) {
          return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch' };
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return { success: false, message: "Gagal mengambil data via GET" };
  },

  // Auth
  async login(payload: { role: string; identifier: string; password: string }) {
    return this.call('LOGIN', payload);
  },

  // Dashboard Data
  async getDashboardData(role: string, id_user: string) {
    return this.call('GET_DASHBOARD_DATA', { role: role.toUpperCase(), id_user });
  },

  // Nasabah
  async registerNasabah(payload: Partial<Nasabah>) {
    return this.call('REGISTER_NASABAH', payload);
  },

  async updateLokasiNasabah(payload: { id_nasabah: string; latitude: number; longitude: number }) {
    return this.call('UPDATE_LOKASI_NASABAH', payload);
  },

  // Pinjaman
  async ajukanPinjaman(payload: { id_nasabah: string; nama: string; jumlah: number; tenor: number; petugas: string }) {
    return this.call('AJUKAN_PINJAMAN', payload);
  },

  async approvePinjaman(id_pengajuan: string) {
    return this.call('APPROVE_PINJAMAN', { id_pengajuan });
  },

  async cairkanPinjaman(payload: { id_pengajuan: string; petugas: string; potongSimpanan: boolean; fotoBukti: string }) {
    return this.call('CAIRKAN_PINJAMAN', payload);
  },

  async bayarAngsuran(payload: { 
    id_pinjam: string; 
    id_nasabah: string; 
    jumlah: number; 
    petugas: string; 
    fotoBayar: string; 
    pakaiSimpanan: boolean; 
    jumlahSimpananDiterapkan: number 
  }) {
    return this.call('BAYAR_ANGSURAN', payload);
  },

  // Others
  async ambilTransport(petugas: string, fotoBukti: string) {
    return this.call('AMBIL_TRANSPORT', { petugas, fotoBukti });
  },

  async updateProfilePhoto(role: string, id_user: string, foto: string) {
    return this.call('UPDATE_PROFILE_PHOTO', { role, id_user, foto });
  },

  async getMemberBalance(id_nasabah: string) {
    return this.call('GET_MEMBER_BALANCE', { id_nasabah });
  },

  async cairkanSimpanan(payload: { id_nasabah: string; nama: string; jumlah: number; petugas: string; fotoBukti: string }) {
    return this.call('CAIRKAN_SIMPANAN', payload);
  }
};
