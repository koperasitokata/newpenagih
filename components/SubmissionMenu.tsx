
import React, { useState, useRef } from 'react';
import { PengajuanPinjaman, GeoLocation, Nasabah, PetugasProfile, PinjamanAktif } from '../types';
import { Plus, X, Search, ChevronRight, Banknote, Camera, Image as ImageIcon, Clock, Download, Satellite, AlertCircle, Loader2, MapPin, CheckCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubmissionMenuProps {
  submissions: PengajuanPinjaman[];
  nasabahList: Nasabah[];
  records: PinjamanAktif[];
  petugas: PetugasProfile;
  onAddSubmission: (payload: any) => void;
  onCairkan: (payload: any) => void;
  currentTheme?: string;
}

const SubmissionMenu: React.FC<SubmissionMenuProps> = ({ 
  submissions = [], 
  nasabahList = [], 
  records = [],
  petugas,
  onAddSubmission, 
  onCairkan,
  currentTheme = 'default'
}) => {
  const [view, setView] = useState<'LIST' | 'FORM' | 'SELECTOR'>('LIST');
  const [isLoadingNasabah, setIsLoadingNasabah] = useState(false);
  const [selectedNasabah, setSelectedNasabah] = useState<Nasabah | null>(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [tenor, setTenor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [disbursementTarget, setDisbursementTarget] = useState<PengajuanPinjaman | null>(null);
  const [viewProof, setViewProof] = useState<string | null>(null);
  const [tempLocation, setTempLocation] = useState<GeoLocation | null>(null); 
  const [isGettingLoc, setIsGettingLoc] = useState(false);
  
  const [confirmData, setConfirmData] = useState<{
    sub: PengajuanPinjaman;
    originalAmount: number;
    fee: number;
    net: number;
  } | null>(null);
  const [potongSimpanan, setPotongSimpanan] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';
  const cardBg = currentTheme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-white/5 border-white/10';
  const inputBg = currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white';

  const handleOpenSelector = () => {
    setIsLoadingNasabah(true);
    setView('SELECTOR');
    setTimeout(() => {
      setIsLoadingNasabah(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNasabah || !requestAmount || !tenor) return;

    // Cek apakah nasabah masih punya pinjaman aktif
    const hasActiveLoan = records.some(r => r.id_nasabah === selectedNasabah.id_nasabah && r.status === 'Aktif');
    if (hasActiveLoan) {
      alert("Nasabah ini masih memiliki pinjaman aktif. Pengajuan baru hanya bisa dilakukan setelah pinjaman sebelumnya lunas 100%.");
      return;
    }

    const payload = {
      id_nasabah: selectedNasabah.id_nasabah,
      nama: selectedNasabah.nama,
      jumlah: parseInt(requestAmount.replace(/\D/g, '')),
      tenor: parseInt(tenor),
      petugas: petugas.nama
    };

    onAddSubmission(payload);
    setView('LIST');
    setSelectedNasabah(null);
    setRequestAmount('');
    setTenor('');
  };

  const handleDisburseClick = (sub: PengajuanPinjaman, e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();

    const validAmount = sub.jumlah || 0;
    const adminFee = validAmount * 0.05;
    const netCash = validAmount - adminFee;

    setConfirmData({
      sub,
      originalAmount: validAmount,
      fee: adminFee,
      net: netCash
    });
  };

  const proceedDisbursement = () => {
    if (!confirmData) return;
    
    const targetSub = confirmData.sub;
    setConfirmData(null); 
    
    setDisbursementTarget(targetSub);
    setIsGettingLoc(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setTempLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setIsGettingLoc(false);
          setTimeout(() => fileInputRef.current?.click(), 100);
        },
        (err) => {
          console.error(err);
          setIsGettingLoc(false);
          alert("Gagal mengambil lokasi GPS. Pastikan GPS aktif.");
          setTimeout(() => fileInputRef.current?.click(), 100);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsGettingLoc(false);
      fileInputRef.current?.click();
    }
  };

  const handleDisbursementPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !disbursementTarget) return;

    const reader = new FileReader();
    reader.onload = (event) => {
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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);

          const payload = {
            id_pengajuan: disbursementTarget.id_pengajuan,
            petugas: petugas.nama,
            fotoCair: compressedDataUrl,
            potongSimpanan: potongSimpanan
          };
          
          onCairkan(payload);
          setDisbursementTarget(null);
          setTempLocation(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? val.replace(/\D/g, '') : val.toString();
    return num ? new Intl.NumberFormat('id-ID').format(parseInt(num)) : '';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12 relative"
    >
      {view === 'LIST' && (
        <>
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className={`text-2xl font-black ${textPrimary} tracking-tight`}>Pengajuan</h2>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Klarifikasi Lapangan</p>
            </div>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setView('FORM')} 
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-emerald-500 text-white shadow-xl shadow-emerald-500/20"
            >
              <Plus size={24} />
            </motion.button>
          </div>

          <div className="space-y-2">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 mb-4 ${textMuted}`}>Daftar Status Pengajuan</h3>
            {submissions.length === 0 ? (
              <div className={`text-center py-12 ${currentTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'} rounded-[2rem] border-2 border-dashed`}>
                <p className={`text-xs ${textMuted} font-bold uppercase tracking-widest`}>Belum ada pengajuan</p>
              </div>
            ) : (
              submissions.map((sub, idx) => (
                <motion.div 
                  key={sub.id_pengajuan} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`${cardBg} backdrop-blur-md p-3 px-4 rounded-2xl border flex items-center justify-between gap-4 transition-all hover:bg-emerald-500/5`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                       <h4 className={`font-black text-xs ${textPrimary} truncate`}>{sub.nama}</h4>
                       <span className={`text-[6px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                        sub.status === 'Pending' ? 'bg-yellow-500 text-white shadow-sm shadow-yellow-500/20' :
                        sub.status === 'Approved' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' :
                        sub.status === 'Disbursed' ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {sub.status === 'Pending' ? 'Menunggu ACC Admin' : 
                         sub.status === 'Approved' ? 'Siap Dicairkan' : 
                         sub.status === 'Disbursed' ? 'Sudah Cair' : sub.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                       <p className={`text-[8px] font-black ${textMuted} uppercase tracking-tighter`}>Rp {formatCurrency(sub.jumlah)}</p>
                       {(sub as any).submissionType === 'SIMPANAN' ? (
                         <p className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">Pencairan Simpanan</p>
                       ) : (
                         <p className={`text-[8px] font-black ${textMuted} uppercase tracking-tighter`}>{sub.tenor} Hari</p>
                       )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {sub.status === 'Approved' ? (
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={(e) => handleDisburseClick(sub, e)}
                        disabled={isGettingLoc && disbursementTarget?.id_pengajuan === sub.id_pengajuan}
                        className="bg-emerald-500 text-white text-[8px] font-black px-3 py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-transform flex items-center gap-2"
                      >
                        {isGettingLoc && disbursementTarget?.id_pengajuan === sub.id_pengajuan ? (
                          <Satellite size={12} className="animate-spin" />
                        ) : (
                          <Banknote size={12} />
                        )}
                        {isGettingLoc && disbursementTarget?.id_pengajuan === sub.id_pengajuan ? 'GPS...' : 'Cairkan'}
                      </motion.button>
                    ) : sub.status === 'Cair' || sub.status === 'Disbursed' ? (
                      <div className={`w-8 h-8 rounded-full border ${currentTheme === 'light' ? 'border-emerald-100 bg-emerald-50' : 'border-white/5'} flex items-center justify-center opacity-60`}>
                        <CheckCircle size={14} className="text-emerald-500" />
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-full border ${currentTheme === 'light' ? 'border-slate-100 bg-slate-50' : 'border-white/5'} flex items-center justify-center opacity-40`}>
                        <Clock size={14} className={currentTheme === 'light' ? 'text-slate-400' : 'text-white/40'} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {view === 'FORM' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4 px-1">
            <button onClick={() => setView('LIST')} className={`w-10 h-10 rounded-xl ${currentTheme === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/40'} flex items-center justify-center`}>
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <h2 className={`text-xl font-black ${textPrimary} tracking-tight leading-none`}>Form Pengajuan</h2>
              <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Input Data Pinjaman</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={`${cardBg} backdrop-blur-xl border p-6 rounded-[2rem] shadow-xl space-y-5`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-xs font-black ${currentTheme === 'light' ? 'text-slate-500' : 'text-white/60'} uppercase tracking-widest`}>Data Nasabah</h3>
              <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">WAJIB ISI</span>
            </div>
            
            <div className="relative">
              <label className={`block text-[9px] font-black ${textMuted} uppercase tracking-widest mb-1.5 ml-1`}>Pilih Nasabah</label>
              <button 
                type="button"
                onClick={handleOpenSelector}
                className={`w-full p-4 ${inputBg} rounded-2xl text-sm font-bold flex justify-between items-center hover:bg-emerald-500/5 transition-all text-left border`}
              >
                <span className={selectedNasabah ? textPrimary : textMuted}>
                  {selectedNasabah?.nama || "Cari nasabah..."}
                </span>
                <Search size={14} className={textMuted} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-[9px] font-black ${textMuted} uppercase tracking-widest mb-1.5 ml-1`}>Nominal (Rp)</label>
                <input type="text" value={formatCurrency(requestAmount)} onChange={(e) => setRequestAmount(e.target.value)} className={`w-full p-4 ${inputBg} border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-black`} placeholder="0" required />
              </div>
              <div>
                <label className={`block text-[9px] font-black ${textMuted} uppercase tracking-widest mb-1.5 ml-1`}>Tenor (Hari)</label>
                <input type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} className={`w-full p-4 ${inputBg} border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-black`} placeholder="10" required />
              </div>
            </div>
            
            <motion.button 
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={!selectedNasabah} 
              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${!selectedNasabah ? 'bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}
            >
              Ajukan Pinjaman
            </motion.button>
          </form>
        </motion.div>
      )}

      {view === 'SELECTOR' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('FORM')} className={`w-10 h-10 rounded-xl ${currentTheme === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/40'} flex items-center justify-center`}>
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div>
                <h2 className={`text-xl font-black ${textPrimary} tracking-tight leading-none`}>Pilih Nasabah</h2>
                <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Database Pusat</p>
              </div>
            </div>
          </div>

          <div className="relative px-1">
            <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${textMuted}`} size={16} />
            <input 
              type="text" 
              placeholder="Cari Nama atau ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 ${inputBg} border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300`}
            />
          </div>

          <div className="space-y-3">
            {isLoadingNasabah ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <Loader2 size={32} className="text-emerald-500 animate-spin" />
                <p className={`text-[8px] font-black ${textMuted} uppercase tracking-[0.3em]`}>Sinkronisasi Database...</p>
              </div>
            ) : (
              nasabahList
                .filter(n => n.nama.toLowerCase().includes(searchTerm.toLowerCase()) || n.id_nasabah.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((n, idx) => {
                  const hasActiveLoan = records.some(r => r.id_nasabah === n.id_nasabah && r.status === 'Aktif');
                  
                  return (
                    <motion.button
                      key={idx}
                      whileTap={hasActiveLoan ? {} : { scale: 0.98 }}
                      type="button"
                      disabled={hasActiveLoan}
                      onClick={() => {
                        setSelectedNasabah(n);
                        setView('FORM');
                      }}
                      className={`w-full p-4 text-left rounded-2xl flex items-center gap-4 transition-all border ${
                        hasActiveLoan 
                          ? 'bg-red-500/5 border-red-500/10 opacity-50 cursor-not-allowed' 
                          : selectedNasabah?.id_nasabah === n.id_nasabah 
                            ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-[1.02] border-emerald-400' 
                            : `${currentTheme === 'light' ? 'bg-white border-slate-100 hover:border-emerald-200' : 'bg-white/5 border-white/5'} ${textPrimary}`
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                        hasActiveLoan
                          ? 'bg-red-500/20 text-red-500'
                          : selectedNasabah?.id_nasabah === n.id_nasabah 
                            ? 'bg-white/20' 
                            : (currentTheme === 'light' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-emerald-500/10 text-emerald-400')
                      }`}>
                        {hasActiveLoan ? <Lock size={14} /> : n.nama.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-xs truncate`}>{n.nama}</p>
                        <p className={`text-[8px] font-bold ${selectedNasabah?.id_nasabah === n.id_nasabah && !hasActiveLoan ? 'text-white/60' : textMuted}`}>
                          {hasActiveLoan ? 'PINJAMAN MASIH AKTIF' : `ID: ${n.id_nasabah}`}
                        </p>
                      </div>
                      {!hasActiveLoan && <ChevronRight size={12} className={textMuted} />}
                    </motion.button>
                  );
                })
            )}
          </div>
        </motion.div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleDisbursementPhoto} 
        accept="image/*" 
        capture="user" 
        className="hidden" 
      />

      <AnimatePresence>
        {confirmData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative"
             >
                <div className="bg-emerald-500 p-6 pt-8 pb-10 text-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                   <Banknote size={48} className="text-white mx-auto mb-2 relative z-10" />
                   <h3 className="text-xl font-black text-white tracking-tight relative z-10 uppercase">Konfirmasi Pencairan</h3>
                   <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest relative z-10">Sistem Potongan Admin 5%</p>
                </div>
                <div className="px-6 py-6 -mt-6 bg-white rounded-t-[2.5rem] relative z-20">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Pinjaman</span>
                         <span className="text-sm font-black text-gray-800">Rp {confirmData.originalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                         <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Potongan Admin (5%)</span>
                         <span className="text-sm font-black text-red-500">- Rp {confirmData.fee.toLocaleString()}</span>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center mt-2">
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">TERIMA BERSIH</span>
                         <span className="text-xl font-black text-emerald-600">Rp {(confirmData.net - (potongSimpanan ? confirmData.originalAmount * 0.05 : 0)).toLocaleString()}</span>
                      </div>

                      <div className="pt-2">
                         <button 
                           type="button"
                           onClick={() => setPotongSimpanan(!potongSimpanan)}
                           className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${potongSimpanan ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}
                         >
                           <div className="flex items-center gap-3">
                             <div className={`w-5 h-5 rounded-full flex items-center justify-center ${potongSimpanan ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                               {potongSimpanan && <CheckCircle size={12} />}
                             </div>
                             <div className="text-left">
                               <p className={`text-[9px] font-black uppercase tracking-widest ${potongSimpanan ? 'text-blue-600' : 'text-gray-400'}`}>Simpanan Wajib (5%)</p>
                               <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Rp {(confirmData.originalAmount * 0.05).toLocaleString()}</p>
                             </div>
                           </div>
                           <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${potongSimpanan ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                             {potongSimpanan ? 'AKTIF' : 'NON-AKTIF'}
                           </span>
                         </button>
                      </div>

                      <p className="text-[9px] text-gray-400 text-center leading-relaxed px-4 pt-2">
                         Pastikan nasabah menerima uang bersih sejumlah <strong>Rp {(confirmData.net - (potongSimpanan ? confirmData.originalAmount * 0.05 : 0)).toLocaleString()}</strong>.
                      </p>
                   </div>
                   <div className="grid grid-cols-2 gap-3 mt-6">
                      <button 
                         onClick={() => setConfirmData(null)}
                         className="py-3.5 rounded-xl bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors"
                      >
                         Batal
                      </button>
                      <motion.button 
                         whileTap={{ scale: 0.95 }}
                         onClick={proceedDisbursement}
                         className="py-3.5 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                      >
                         <span>Lanjut Foto</span>
                         <Camera size={14} />
                      </motion.button>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewProof && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6" 
            onClick={() => setViewProof(null)}
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-sm rounded-[2.5rem] overflow-hidden border-2 border-emerald-400 shadow-3xl" 
               onClick={(e) => e.stopPropagation()}
             >
                <img src={viewProof} alt="Bukti Pencairan" className="w-full object-cover" />
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                   <div className="bg-emerald-500 text-white text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Bukti Selfie Pencairan</div>
                   <button onClick={() => setViewProof(null)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center">
                      <X size={20} />
                   </button>
                </div>
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col gap-3">
                   <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-emerald-400" />
                      <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                         Data GPS Terkunci
                      </p>
                   </div>
                   
                   <a href={viewProof} download={`BUKTI-CAIR-${Date.now()}.jpg`} className="bg-white/20 hover:bg-white/30 text-white text-[9px] font-black py-3 rounded-xl uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2">
                      <Download size={14} /> Simpan Gambar
                   </a>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SubmissionMenu;
