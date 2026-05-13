
export const WebhookService = {
  sendAngsuranWebhook: async (payload: {
    id_pinjam: string;
    jumlah: number;
    sisa_hutang: number;
    petugas: string;
    status: string;
  }) => {
    try {
      await fetch("https://n8n.tokata.site/webhook-test/Angsuran", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          id_pinjaman: payload.id_pinjam,
          jumlah_bayar: String(payload.jumlah || 0),
          sisa_hutang: String(payload.sisa_hutang || 0),
          petugas: payload.petugas,
          tanggal_bayar: new Date().toISOString().split('T')[0],
          status: payload.status
        })
      });
    } catch (e) {
      console.error("Webhook Angsuran Service Gagal:", e);
    }
  },

  sendPencairanWebhook: async (payload: {
    nama: string;
    jumlah_pinjam: number;
    tenor: number;
    cicilan: number;
    petugas: string;
    status: string;
  }) => {
    try {
      await fetch("https://n8n.tokata.site/webhook-test/Pinjaman", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          nama: payload.nama || "Unknown",
          jumlah_pinjaman: String(payload.jumlah_pinjam || 0),
          tenor: String(payload.tenor || 0),
          cicilan: String(payload.cicilan || 0),
          tanggal_pencairan: new Date().toISOString().split('T')[0]
        })
      });
    } catch (e) {
      console.error("Webhook Pencairan Service Gagal:", e);
    }
  }
};
