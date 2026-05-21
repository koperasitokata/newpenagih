import React, { useState, useRef } from 'react';
import { PinjamanAktif, Nasabah } from '../types';
import { toPng } from 'html-to-image';
import { CheckCircle2, X, Loader2, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_CONFIG } from '../src/config';

interface ReceiptPopupProps {
  record: PinjamanAktif;
  nasabah: Nasabah;
  amountPaid: number;
  photo?: string;
  date: string | Date;
  onClose: () => void;
}

const ReceiptPopup: React.FC<ReceiptPopupProps> = ({ record, nasabah, amountPaid, photo, date, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const receiptContentRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    setIsSharing(true);
    const element = receiptContentRef.current;
    
    if (element) {
      try {
        // Ensure image attachments (bukti photo) are fully loaded
        const images = element.getElementsByTagName('img');
        await Promise.all(Array.from(images).map(elementImg => {
          const img = elementImg as HTMLImageElement;
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
          });
        }));

        // Convert the HTML element containing receipt info to high quality crisp PNG image
        const dataUrl = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          style: {
            transform: 'none',
            margin: '0',
          }
        });

        const filename = `STRUK-${nasabah.nama.replace(/\s+/g, '-')}-${Date.now()}.png`;

        // Create Blob from Base64 Data URL
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        if (blob) {
          // Priority 1: Web Share API (native on mobile devices / browsers)
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
            try {
              const file = new File([blob], filename, { type: 'image/png' });
              await navigator.share({
                files: [file],
                title: 'Struk Pembayaran Angsuran',
                text: `Struk Pembayaran Angsuran ${nasabah.nama}` +
                      `\nID Pinjam: ${record.id_pinjaman}` +
                      `\nJumlah: Rp ${amountPaid.toLocaleString()}`
              });
              setIsSharing(false);
              return;
            } catch (shareErr) {
              console.log("Share cancelled/unsupported, falling back to direct download", shareErr);
            }
          }

          // Priority 2: Direct virtual click simulation for PNG download
          const link = document.createElement('a');
          link.style.display = 'none';
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            setIsSharing(false);
          }, 500);
        } else {
          throw new Error("Gagal memproses data struk");
        }
      } catch (err) {
        console.error("Gagal generate struk", err);
        alert("Gagal memproses gambar struk. Anda dapat melakukan tangkapan layar (screenshot) sebagai bukti transaksi.");
        setIsSharing(false);
      }
    } else {
      window.print();
      setIsSharing(false);
    }
  };

  const timestampStr = new Date(date).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md print:p-0 print:bg-white">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-[280px] rounded-2xl overflow-hidden shadow-2xl flex flex-col print:shadow-none print:rounded-none print:max-w-none relative max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: '#ffffff', color: '#111827' }}
      >
        {/* Printable/Saveable Receipt Wrapper Section */}
        <div 
          ref={receiptContentRef}
          className="bg-white flex flex-col w-full text-black"
          style={{ backgroundColor: '#ffffff', color: '#111827' }}
        >
          {/* Header */}
          <div 
            className="p-3 text-white flex flex-col items-center gap-0.5"
            style={{ background: 'linear-gradient(to right, #4f46e5, #2563eb)' }}
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              <CheckCircle2 size={18} />
            </div>
            <h2 className="font-black text-xs tracking-wider uppercase">Setoran Berhasil</h2>
            <p className="text-[7px] font-bold opacity-70 tracking-widest">{APP_CONFIG.APP_NAME} {APP_CONFIG.APP_TAGLINE}</p>
          </div>

          {/* Receipt Content Body */}
          <div className="p-4 flex-1 space-y-3 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" style={{ backgroundColor: '#ffffff' }}>
            <div className="text-center space-y-0.5">
              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Struk Pembayaran Angsuran</p>
              <p className="text-lg font-black tracking-tighter" style={{ color: '#111827' }}>Rp {amountPaid.toLocaleString()}</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-[1px] flex-1" style={{ backgroundColor: '#e5e7eb' }}></span>
                <span className="text-[6px] font-black uppercase tracking-widest" style={{ color: '#d1d5db' }}>Detail Transaksi</span>
                <span className="h-[1px] flex-1" style={{ backgroundColor: '#e5e7eb' }}></span>
              </div>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-[9px] leading-tight">
                <span className="uppercase" style={{ color: '#6b7280' }}>Nasabah</span>
                <span className="font-bold text-right truncate ml-2" style={{ color: '#111827' }}>{nasabah.nama}</span>
              </div>
              <div className="flex justify-between text-[9px] leading-tight">
                <span className="uppercase" style={{ color: '#6b7280' }}>ID Pinjam</span>
                <span className="font-bold" style={{ color: '#111827' }}>{record.id_pinjaman}</span>
              </div>
              <div className="flex justify-between text-[9px] leading-tight">
                <span className="uppercase" style={{ color: '#6b7280' }}>Waktu Bayar</span>
                <span className="font-bold" style={{ color: '#111827' }}>{timestampStr}</span>
              </div>
              <div className="border-t border-dashed my-1" style={{ borderColor: '#d1d5db' }}></div>
              <div className="flex justify-between text-[9px] leading-tight">
                <span className="uppercase" style={{ color: '#6b7280' }}>Sisa Tagihan</span>
                <span className="font-black" style={{ color: '#dc2626' }}>Rp {record.sisa_hutang.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[9px] leading-tight">
                <span className="uppercase" style={{ color: '#6b7280' }}>Ref ID</span>
                <span style={{ color: '#9ca3af' }}>#{nasabah.nik.slice(-8)}</span>
              </div>
            </div>

            {photo && (
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="h-[1px] flex-1" style={{ backgroundColor: '#f3f4f6' }}></div>
                  <p className="text-[6px] font-black uppercase tracking-widest" style={{ color: '#d1d5db' }}>Lampiran Bukti</p>
                  <div className="h-[1px] flex-1" style={{ backgroundColor: '#f3f4f6' }}></div>
                </div>
                <div className="w-full h-24 rounded-lg overflow-hidden border shadow-inner" style={{ borderColor: '#f9fafb' }}>
                  <img src={photo} alt="Bukti" className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
              </div>
            )}

            <div className="text-center pt-1.5">
              <p className="text-[6px] font-black uppercase tracking-[0.25em]" style={{ color: '#9ca3af' }}>
                Terima Kasih Atas Pembayaran Anda
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons (Excluded from html-to-image capture since they are outside receiptContentRef) */}
        <div className="p-3 bg-gray-50 flex gap-1.5 print:hidden border-t border-gray-100">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            disabled={isSharing}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSharing ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
            {isSharing ? 'Memproses...' : 'Bagikan Struk'}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-10 bg-white border border-gray-200 text-gray-400 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100 cursor-pointer"
          >
            <X size={15} />
          </motion.button>
        </div>

        {/* Zigzag Bottom Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-1 flex print:hidden overflow-hidden translate-y-full" style={{ backgroundImage: 'radial-gradient(circle, transparent 70%, #f9fafb 70%)', backgroundSize: '10px 10px' }}></div>
      </motion.div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .fixed { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block !important; }
          .bg-black\\/80 { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptPopup;
