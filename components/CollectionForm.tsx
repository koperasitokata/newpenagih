
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PinjamanAktif, GeoLocation, Nasabah } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CheckCircle, AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollectionFormProps {
  records: PinjamanAktif[];
  nasabahList: Nasabah[];
  prefillName?: string;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  currentTheme?: string;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ 
  records, 
  nasabahList, 
  prefillName, 
  onSubmit, 
  onCancel,
  currentTheme = 'default'
}) => {
  const [qrVerified, setQrVerified] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(prefillName || '');
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(true);
  
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const isMounted = useRef(true);

  const activeNasabah = useMemo(() => {
    return nasabahList.find(n => n.nama === customerName);
  }, [customerName, nasabahList]);

  const activeLoan = useMemo(() => {
    if (!activeNasabah) return null;
    return records.find(r => r.id_nasabah === activeNasabah.id_nasabah && r.status === 'Aktif');
  }, [activeNasabah, records]);

  const handleQrSuccess = (decodedText: string) => {
    const scannedCode = decodedText.trim();
    
    // Validasi berdasarkan id_pinjaman (Kolom O pada sheet PINJAMAN_AKTIF)
    let targetLoan = records.find(r => 
      String(r.id_pinjaman || "").trim() === scannedCode || 
      String(r.qr_code || "").trim() === scannedCode
    );
    
    if (!targetLoan) {
      setQrError(`QR Code: ${scannedCode} tidak terdaftar di Pinjaman Aktif!`);
      return;
    }

    let targetNasabah = nasabahList.find(n => n.id_nasabah === targetLoan!.id_nasabah);
    
    if (!targetNasabah) {
      setQrError(`Nasabah untuk pinjaman ini tidak ditemukan!`);
      return;
    }

    if (prefillName && targetNasabah.nama !== prefillName) {
      setQrError(`Scan Salah! QR ini milik ${targetNasabah.nama}.`);
      return;
    }

    setCustomerName(targetNasabah.nama);
    setQrVerified(true);
    setQrError(null);
    
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch((err: any) => console.error("Stop camera error:", err));
    }
  };

  const startCamera = async () => {
    if (html5QrCodeRef.current?.isScanning) return;
    
    setCameraError(null);
    setIsCameraStarting(true);
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const html5QrCode = new Html5Qrcode("reader-camera");
      html5QrCodeRef.current = html5QrCode;
      
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleQrSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore noisy logs
        }
      );
      setIsCameraStarting(false);
    } catch (err: any) {
      console.error("Camera start error:", err);
      setCameraError("Gagal membuka kamera. Pastikan izin kamera diaktifkan.");
      setIsCameraStarting(false);
    }
  };

  // Efek Kamera
  useEffect(() => {
    if (!qrVerified) {
      startCamera();

      return () => {
        if (html5QrCodeRef.current?.isScanning) {
          html5QrCodeRef.current.stop().catch((err: any) => console.error("Stop camera error:", err));
        }
      };
    }
  }, [qrVerified]);

  // Efek GPS
  useEffect(() => {
    isMounted.current = true;
    setIsLocating(true);
    let watchId: number;

    const startWatching = () => {
      if (!navigator.geolocation) {
        setIsLocating(false);
        return;
      }
      
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isMounted.current) {
            setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setIsLocating(false);
          }
        },
        (err) => {
          console.warn("GPS Watch Error:", err);
          if (isMounted.current) {
             setTimeout(() => {
                if (isMounted.current) setIsLocating(false);
             }, 2000);
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
    };

    startWatching();

    return () => {
      isMounted.current = false;
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !amount || !photo) return;
    
    // Validasi sisa hutang
    if (activeLoan) {
      const currentPaid = parseInt(amount.replace(/\D/g, '')) || 0;
      if (currentPaid > activeLoan.sisa_hutang) {
        setFormError(`Pembayaran Rp ${currentPaid.toLocaleString()} melebihi sisa hutang Rp ${activeLoan.sisa_hutang.toLocaleString()}!`);
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    // Pastikan lokasi terambil
    let finalLocation = location;
    if (!finalLocation) {
       // Coba ambil paksa sekali lagi
       try {
         const pos = await new Promise<GeolocationPosition>((res, rej) => {
           navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 });
         });
         finalLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
       } catch (e) {
         console.warn("Forced location failed, using null");
       }
    }

    const payload = {
      id_nasabah: activeNasabah?.id_nasabah,
      id_pinjam: activeLoan?.id_pinjaman,
      nama: customerName,
      jumlah: parseInt(amount.replace(/\D/g, '')),
      foto: photo,
      lokasi: finalLocation
    };

    try {
      await onSubmit(payload);
      // Success is handled by parent view change
    } catch (err) {
      setFormError("Gagal mengirim data. Coba lagi.");
      setIsSubmitting(false);
    }
  };

  const handlePhotoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
          canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) { 
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5); 
            if (isMounted.current) setPhoto(dataUrl); 
          }
        };
        img.src = readerEvent.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const currentPaid = parseInt(amount.replace(/\D/g, '')) || 0;
  const isOverLimit = activeLoan && currentPaid > activeLoan.sisa_hutang;

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';
  const bgCard = currentTheme === 'light' ? 'bg-white border-slate-100 shadow-xl' : 'bg-white/5 border-white/10 shadow-2xl';

  if (!qrVerified) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col p-6"
      >
        <div className="flex items-center justify-between mb-8">
           <div>
              <h2 className={`text-2xl font-black ${textPrimary}`}>Validasi QR</h2>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em]">Scan Menggunakan Kamera</p>
           </div>
           <div className="flex gap-2">
             <button onClick={onCancel} className={`w-10 h-10 rounded-xl ${currentTheme === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/40'} flex items-center justify-center transition-all`}>
               <X size={20} />
             </button>
           </div>
        </div>

        <div className={`${currentTheme === 'light' ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'} border rounded-[2.5rem] p-8 flex-1 flex flex-col items-center justify-center gap-8 overflow-hidden relative shadow-sm`}>
           <AnimatePresence>
             {qrError && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl w-full z-20"
               >
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                    <AlertTriangle size={14} />{qrError}
                  </p>
               </motion.div>
             )}
           </AnimatePresence>

           <div className="w-full aspect-square max-w-[320px] rounded-[3rem] border-4 border-emerald-500/30 bg-black relative overflow-hidden shadow-2xl shadow-emerald-500/10">
             <div id="reader-camera" className="w-full h-full"></div>
             {cameraError && (
               <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80 z-30">
                 <AlertTriangle size={32} className="text-red-500 mb-4" />
                 <p className="text-white text-xs font-bold mb-4">{cameraError}</p>
                 <button 
                   type="button"
                   onClick={startCamera}
                   className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                 >
                   Coba Lagi
                 </button>
               </div>
             )}
             <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-emerald-500 rounded-2xl pointer-events-none">
               <motion.div 
                 animate={{ top: ['0%', '100%', '0%'] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                 className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
               />
             </div>
           </div>
           
           <div id="reader-hidden" className="hidden"></div>

           <div className="text-center">
              <p className={`text-[9px] font-black ${textMuted} uppercase tracking-[0.3em] leading-relaxed max-w-[200px]`}>
                Arahkan kamera ke QR Code NIK Nasabah untuk validasi otomatis.
              </p>
           </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-12"
    >
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
           <h2 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Input Tagihan</h2>
           <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em]">Status QR: <span className={textPrimary}>TERVERIFIKASI</span></p>
        </div>
        <button onClick={onCancel} className={`w-10 h-10 rounded-xl ${currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white/5 border-white/10 text-white/40'} border flex items-center justify-center active:scale-90 transition-all`}>
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence>
          {formError && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl"
            >
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                <AlertTriangle size={14} />{formError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={`${bgCard} backdrop-blur-xl border p-6 rounded-[2.5rem] space-y-6`}>
          <div className="relative">
            <label className={`block text-[10px] font-black ${textMuted} uppercase tracking-[0.2em] mb-2 ml-1`}>Nama Nasabah</label>
            <div className={`w-full p-4 ${currentTheme === 'light' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} border rounded-2xl text-left text-sm font-black flex justify-between items-center`}>
              <span>{customerName}</span>
              <CheckCircle size={18} />
            </div>
            <p className={`text-[7px] ${textMuted} font-bold uppercase mt-2 ml-1`}>Divalidasi via QR NIK</p>
          </div>
          {activeLoan && (
            <div className={`grid grid-cols-2 gap-3 p-3 ${currentTheme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'} rounded-2xl border`}>
              <div><p className={`text-[7px] font-black ${textMuted} uppercase tracking-widest`}>Sisa Hutang</p><p className={`text-[10px] font-bold ${isOverLimit ? 'text-red-500' : 'text-emerald-500'}`}>Rp {activeLoan.sisa_hutang.toLocaleString()}</p></div>
              <div><p className={`text-[7px] font-black ${textMuted} uppercase tracking-widest`}>Cicilan</p><p className={`text-[10px] font-bold ${currentTheme === 'light' ? 'text-slate-700' : 'text-white'}`}>Rp {activeLoan.cicilan.toLocaleString()}</p></div>
            </div>
          )}
          <div>
            <div className="flex justify-between items-end mb-2 ml-1">
              <label className={`text-[10px] font-black ${textMuted} uppercase tracking-[0.2em]`}>Nominal Tunai</label>
              <div className={`text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors ${activeLoan && currentPaid < activeLoan.cicilan ? 'text-red-500' : 'text-emerald-500'}`}>
                {activeLoan && currentPaid < activeLoan.cicilan ? <><span>Target: Rp {activeLoan.cicilan.toLocaleString()}</span></> : <><span>Target Terpenuhi</span><CheckCircle size={12} /></>}
              </div>
            </div>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black ${textMuted}`}>RP</span>
              <input type="text" inputMode="numeric" value={amount ? new Intl.NumberFormat('id-ID').format(parseInt(amount.replace(/\D/g, ''))) : ''} onChange={(e) => setAmount(e.target.value)} className={`w-full p-4 pl-12 ${currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'} border rounded-2xl text-lg font-black outline-none transition-all placeholder:text-slate-300 ${isOverLimit ? 'border-red-500 ring-2 ring-red-500/20 text-red-500' : 'focus:ring-emerald-500 shadow-sm'}`} placeholder="0" />
            </div>
          </div>
        </div>
        <div className={`${bgCard} backdrop-blur-xl border p-6 rounded-[2.5rem] space-y-6`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-[10px] font-black ${textMuted} uppercase tracking-[0.2em]`}>Bukti Kunjungan</h3>
          </div>
          <div onClick={() => fileInputRef.current?.click()} className={`w-full h-48 rounded-3xl border-2 border-dashed ${currentTheme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'} flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100/50 transition-all overflow-hidden relative group`}>
            {photo ? <img src={photo} alt="Bukti" className="w-full h-full object-cover" /> : <><Camera size={32} className={`${currentTheme === 'light' ? 'text-slate-300' : 'text-white/10'} group-hover:text-emerald-500 transition-colors mb-4`} /><p className={`text-[9px] font-black ${textMuted} uppercase tracking-widest text-center px-8`}>Ambil Foto Selfie Bersama Nasabah</p></>}
            <input type="file" ref={fileInputRef} onChange={handlePhotoSelection} accept="image/*" capture="user" className="hidden" />
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.98 }}
          type="submit" 
          disabled={!customerName || !photo || isSubmitting || isOverLimit} 
          className={`w-full py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all relative overflow-hidden ${!customerName || !photo || isSubmitting || isOverLimit ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed' : 'bg-emerald-500 text-white shadow-emerald-500/30'}`}
        >
          {isSubmitting ? <div className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /><span>Sinkronisasi...</span></div> : 'SIMPAN DATA'}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default CollectionForm;
