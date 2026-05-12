
import React, { useState } from 'react';
import { PinjamanAktif, Nasabah } from '../types';
import html2canvas from 'html2canvas';
import { CheckCircle2, Download, X, QrCode, Loader2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const handleShare = async () => {
    setIsSharing(true);
    const element = document.getElementById('receipt-card');
    
    if (element && typeof html2canvas !== 'undefined') {
      try {
        // Ensure images are loaded
        const images = element.getElementsByTagName('img');
        await Promise.all(Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        }));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: element.offsetWidth,
          height: element.scrollHeight,
          windowWidth: element.offsetWidth,
          windowHeight: element.scrollHeight,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('receipt-card');
            if (clonedElement) {
              clonedElement.style.transform = 'none';
              clonedElement.style.borderRadius = '0';
              clonedElement.style.maxHeight = 'none';
              clonedElement.style.overflow = 'visible';
              clonedElement.style.position = 'absolute';
              clonedElement.style.top = '0';
              clonedElement.style.left = '0';
              clonedElement.style.width = `${element.offsetWidth}px`;
              
              // Remove any motion styles that might interfere
              const motionDivs = clonedElement.querySelectorAll('div');
              motionDivs.forEach(div => {
                (div as HTMLElement).style.transform = 'none';
                (div as HTMLElement).style.transition = 'none';
              });
            }
          }
        });
        
        const filename = `STRUK-${nasabah.nama.replace(/\s+/g, '-')}-${Date.now()}.jpg`;

        canvas.toBlob(async (blob) => {
          if (blob) {
            // Priority 1: Native Share (Best for Mobile Gallery & WhatsApp)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/jpeg' })] })) {
              try {
                const file = new File([blob], filename, { type: 'image/jpeg' });
                await navigator.share({
                  files: [file],
                  title: 'Struk Pembayaran',
                  text: `Struk Pembayaran ${nasabah.nama}`
                });
                setIsSharing(false);
                return;
              } catch (shareErr) {
                console.log("Share cancelled or failed, falling back to download", shareErr);
              }
            }

            // Priority 2: Standard Download (Fallback for Desktop)
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              setIsSharing(false);
            }, 500);
          } else {
            throw new Error("Blob generation failed");
          }
        }, 'image/jpeg', 0.95);
      } catch (err) {
        console.error("Gagal generate struk", err);
        alert("Gagal memproses gambar. Silakan coba lagi atau ambil tangkapan layar (screenshot).");
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md print:p-0 print:bg-white">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        id="receipt-card" 
        className="bg-white w-full max-w-[320px] rounded-3xl overflow-hidden shadow-2xl flex flex-col print:shadow-none print:rounded-none print:max-w-none relative max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#ffffff', color: '#111827' }}
      >
        <div 
          className="p-4 text-white flex flex-col items-center gap-1 print:bg-white print:text-black print:border-b print:border-black"
          style={{ background: 'linear-gradient(to right, #4f46e5, #2563eb)' }}
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
            <CheckCircle2 size={24} />
          </div>
          <h2 className="font-black text-sm tracking-[0.2em] uppercase">Setoran Berhasil</h2>
          <p className="text-[8px] font-bold opacity-70 tracking-widest">{APP_CONFIG.APP_NAME} {APP_CONFIG.APP_TAGLINE}</p>
        </div>

        {/* Receipt Content - Indomaret/BRILink Style */}
        <div className="p-5 flex-1 space-y-4 print:p-4 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" style={{ backgroundColor: '#ffffff' }}>
          <div className="text-center space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Struk Pembayaran Angsuran</p>
            <p className="text-xl font-black tracking-tighter" style={{ color: '#111827' }}>Rp {amountPaid.toLocaleString()}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="h-[1px] flex-1" style={{ backgroundColor: '#e5e7eb' }}></span>
              <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#d1d5db' }}>Detail Transaksi</span>
              <span className="h-[1px] flex-1" style={{ backgroundColor: '#e5e7eb' }}></span>
            </div>
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex justify-between text-[10px] leading-tight">
              <span className="uppercase" style={{ color: '#6b7280' }}>Nasabah</span>
              <span className="font-bold text-right truncate ml-4" style={{ color: '#111827' }}>{nasabah.nama}</span>
            </div>
            <div className="flex justify-between text-[10px] leading-tight">
              <span className="uppercase" style={{ color: '#6b7280' }}>ID Pinjam</span>
              <span className="font-bold" style={{ color: '#111827' }}>{record.id_pinjaman}</span>
            </div>
            <div className="flex justify-between text-[10px] leading-tight">
              <span className="uppercase" style={{ color: '#6b7280' }}>Waktu Bayar</span>
              <span className="font-bold" style={{ color: '#111827' }}>{timestampStr}</span>
            </div>
            <div className="border-t border-dashed my-1.5" style={{ borderColor: '#d1d5db' }}></div>
            <div className="flex justify-between text-[10px] leading-tight">
              <span className="uppercase" style={{ color: '#6b7280' }}>Sisa Tagihan</span>
              <span className="font-black" style={{ color: '#dc2626' }}>Rp {record.sisa_hutang.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] leading-tight">
              <span className="uppercase" style={{ color: '#6b7280' }}>Ref ID</span>
              <span style={{ color: '#9ca3af' }}>#{nasabah.nik.slice(-8)}</span>
            </div>
          </div>

          {photo && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-[1px] flex-1" style={{ backgroundColor: '#f3f4f6' }}></div>
                <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#d1d5db' }}>Lampiran Bukti</p>
                <div className="h-[1px] flex-1" style={{ backgroundColor: '#f3f4f6' }}></div>
              </div>
              <div className="w-full h-36 rounded-xl overflow-hidden border-2 shadow-inner" style={{ borderColor: '#f9fafb' }}>
                <img src={photo} alt="Bukti" className="w-full h-full object-cover" crossOrigin="anonymous" />
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-[7px] font-black uppercase tracking-[0.3em]" style={{ color: '#9ca3af' }}>
              Terima Kasih Atas Pembayaran Anda
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-gray-50 flex gap-2 print:hidden border-t border-gray-100" data-html2canvas-ignore="true">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            disabled={isSharing}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            {isSharing ? 'Memproses...' : 'Bagikan Struk'}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-12 bg-white border border-gray-200 text-gray-400 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100"
          >
            <X size={18} />
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
