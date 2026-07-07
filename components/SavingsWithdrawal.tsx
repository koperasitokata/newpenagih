
import React, { useState, useRef } from 'react';
import { Nasabah, PetugasProfile } from '../types';
import { ApiService } from '../ApiService';
import { Search, Wallet, Camera, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavingsWithdrawalProps {
  nasabahList: Nasabah[];
  collector: PetugasProfile;
  onBack: () => void;
  onSuccess: () => void;
  currentTheme?: string;
}

const SavingsWithdrawal: React.FC<SavingsWithdrawalProps> = ({ 
  nasabahList, 
  collector, 
  onBack,
  onSuccess,
  currentTheme = 'default'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNasabah, setSelectedNasabah] = useState<Nasabah | null>(null);
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'LIST' | 'FORM'>('LIST');

  const photoInputRef = useRef<HTMLInputElement>(null);

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';

  const filteredNasabah = nasabahList.filter(n => 
    n.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.id_nasabah.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250; // Extreme compression limit
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
        canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setPhoto(canvas.toDataURL('image/jpeg', 0.2)); // Quality 0.2 for extreme compression
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedNasabah || !amount || !photo) return;
    setIsLoading(true);
    try {
      const res = await ApiService.cairkanSimpanan({
        id_nasabah: selectedNasabah.id_nasabah,
        nama: selectedNasabah.nama,
        jumlah: parseInt(amount.replace(/\D/g, '')),
        petugas: collector.nama,
        fotoBukti: photo
      });
      if (res.success) {
        alert("Pencairan simpanan berhasil!");
        onSuccess();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Gagal memproses pencairan simpanan.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'FORM' && selectedNasabah) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setStep('LIST')} className={`p-2 ${currentTheme === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/40'} rounded-xl`}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className={`text-xl font-black ${textPrimary} tracking-tight`}>Cairkan Simpanan</h2>
            <p className="text-[8px] text-blue-400 font-bold uppercase tracking-[0.2em]">Konfirmasi Pencairan Tunai</p>
          </div>
        </div>

        <div className={`${currentTheme === 'light' ? 'bg-blue-50 border-blue-100' : 'bg-blue-600/10 border-blue-500/30'} border p-5 rounded-[2rem] flex items-center gap-4 shadow-sm`}>
          <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
            {selectedNasabah.nama.charAt(0)}
          </div>
          <div>
            <h3 className={`font-black ${textPrimary} text-lg leading-tight`}>{selectedNasabah.nama}</h3>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Saldo: Rp {(selectedNasabah.saldo_simpanan || 0).toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-[10px] font-black ${textMuted} uppercase tracking-widest mb-2 ml-1`}>Nominal Pencairan</label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black ${currentTheme === 'light' ? 'text-slate-300' : 'text-white/20'}`}>RP</span>
              <input 
                type="text" 
                inputMode="numeric"
                value={amount ? new Intl.NumberFormat('id-ID').format(parseInt(amount.replace(/\D/g, ''))) : ''}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full p-5 pl-14 ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'} border rounded-3xl text-xl font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-200`}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className={`block text-[10px] font-black ${textMuted} uppercase tracking-widest mb-2 ml-1`}>Bukti Foto</label>
            <div 
              onClick={() => photoInputRef.current?.click()}
              className={`w-full h-56 rounded-[2.5rem] border-2 border-dashed ${currentTheme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'} flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-blue-500/50 transition-all`}
            >
              {photo ? (
                <img src={photo} alt="Bukti" className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-full ${currentTheme === 'light' ? 'bg-slate-100' : 'bg-white/5'} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Camera size={32} className={currentTheme === 'light' ? 'text-slate-200' : 'text-white/20'} />
                  </div>
                  <p className={`text-[10px] font-black ${currentTheme === 'light' ? 'text-slate-300' : 'text-white/20'} uppercase tracking-widest text-center px-12 leading-relaxed`}>Ambil Foto Selfie Bersama Nasabah & Uang</p>
                </>
              )}
            </div>
            <input type="file" ref={photoInputRef} onChange={handlePhotoCapture} accept="image/*" capture="user" className="hidden" />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={!amount || !photo || isLoading}
            className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Konfirmasi Pencairan'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-black ${textPrimary} tracking-tight`}>Pilih Nasabah</h2>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.3em]">Daftar Simpanan Nasabah</p>
        </div>
        <button 
          onClick={onBack} 
          className={`px-4 py-2 ${currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-white'} border rounded-xl text-[10px] font-black uppercase tracking-widest`}
        >
          Kembali
        </button>
      </div>

      <div className="relative mb-6">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${currentTheme === 'light' ? 'text-slate-300' : 'text-white/20'}`} size={18} />
        <input 
          type="text" 
          placeholder="Cari Nama atau ID Nasabah..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-12 pr-4 py-4 ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'} border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-200`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredNasabah.map((nasabah, idx) => (
          <motion.div 
            key={nasabah.id_nasabah}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedNasabah(nasabah);
              setStep('FORM');
            }}
            className={`${currentTheme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-blue-600/5 border-blue-500/10'} border p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-blue-500/40 transition-all`}
          >
            <div className={`w-12 h-12 rounded-xl ${currentTheme === 'light' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-blue-500/20 border-blue-400/30 text-blue-400'} border flex items-center justify-center font-black text-lg shadow-sm shadow-blue-500/5`}>
              {nasabah.nama.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className={`font-black text-sm ${textPrimary} truncate pr-2`}>{nasabah.nama}</h4>
                <span className="text-[8px] font-black bg-blue-500 text-white px-2 py-0.5 rounded uppercase tracking-tighter shadow-lg shadow-blue-500/20">SIMPANAN</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <p className={`text-[9px] font-black ${textMuted} uppercase tracking-widest`}>ID: {nasabah.id_nasabah}</p>
                <p className={`text-[9px] font-black ${currentTheme === 'light' ? 'text-blue-500' : 'text-blue-400'} uppercase tracking-widest`}>SALDO: Rp {(nasabah.saldo_simpanan || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
            <ChevronRight size={16} className={currentTheme === 'light' ? 'text-slate-200' : 'text-white/10'} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SavingsWithdrawal;
