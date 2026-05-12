
import React, { useState, useRef, useMemo } from 'react';
import { PinjamanAktif, ViewMode, PetugasProfile, Nasabah, Mutation } from '../types';
import { ApiService } from '../ApiService';
import BannerCarousel from './BannerCarousel';
import { User, Check, Bike, CalendarX, AlertCircle, TrendingUp, Wallet, Camera, Loader2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLoanSchedule } from '../src/utils/loanUtils';

interface DashboardProps {
  records: PinjamanAktif[];
  nasabahList: Nasabah[];
  mutations: Mutation[];
  setView: (view: ViewMode) => void;
  onSelectTarget: (name: string) => void;
  collector: PetugasProfile;
  accentColor?: string;
  currentTheme?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  records = [], 
  nasabahList = [], 
  mutations = [],
  setView, 
  onSelectTarget, 
  collector,
  accentColor = 'text-emerald-400',
  currentTheme = 'default'
}) => {
  const now = new Date();
  
  // Hitung setoran hari ini dari mutasi
  const totalAmount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return mutations
      .filter(m => {
        const mDate = new Date(m.tanggal).toDateString();
        const desc = m.keterangan.toLowerCase();
        return mDate === todayStr && (
          desc.includes('bayar') || 
          desc.includes('setor') || 
          desc.includes('angsuran') ||
          m.jenis === 'angsuran' ||
          m.jenis === 'simpanan'
        );
      })
      .reduce((acc, curr) => acc + curr.jumlah, 0);
  }, [mutations]);

  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const DAILY_TARGET = useMemo(() => {
    if (isWeekend) return 0;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    
    // Target harian hanya angsuran yang dijadwalkan hari ini (termasuk yang sudah lunas hari ini)
    return records.reduce((total, record) => {
      const schedule = generateLoanSchedule(record.tanggal, record.tenor);
      
      const hasToday = schedule.some(date => {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        return d.getTime() === todayTime;
      });

      return total + (hasToday ? (record.cicilan || 0) : 0);
    }, 0);
  }, [records, isWeekend]);

  const targetPercentage = useMemo(() => {
    if (DAILY_TARGET <= 0) return totalAmount > 0 ? 100 : 0;
    return Math.min(100, Math.round((totalAmount / DAILY_TARGET) * 100));
  }, [totalAmount, DAILY_TARGET]);

  const [justClaimed, setJustClaimed] = useState(false);
  const [isTransportLoading, setIsTransportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasClaimedTransport = useMemo(() => {
    if (justClaimed) return true;
    const today = new Date().toDateString();
    return mutations.some(m => 
      m.jenis === 'Uang Transport' && 
      new Date(m.tanggal).toDateString() === today &&
      m.petugas === collector.nama
    );
  }, [mutations, collector.nama, justClaimed]);

  const collectionQueue = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const queue = records.filter(record => record.status === 'Aktif').map(record => {
      const schedule = generateLoanSchedule(record.tanggal, record.tenor);
      
      // Cek apakah ada jadwal hari ini
      const hasToday = schedule.some(date => {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
      });

      // Cek apakah menunggak (ada jadwal di masa lalu yang belum terbayar)
      // Logika: Jika (cicilan * jumlah_hari_lewat) > (total_bayar), maka menunggak
      const pastScheduleCount = schedule.filter(date => {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        return d.getTime() < today.getTime();
      }).length;

      const totalContractValue = record.pokok * (1 + (record.bunga_persen / 100));
      const totalPaid = totalContractValue - record.sisa_hutang;
      const expectedPaid = record.cicilan * pastScheduleCount;
      
      const isOverdue = totalPaid < expectedPaid;

      return {
        ...record,
        isOverdue,
        isToday: hasToday
      };
    }).filter(item => item.isToday || item.isOverdue);

    // Sort: Menunggak (isOverdue) paling atas, lalu Today
    return queue.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return 0;
    });
  }, [records]);

  const handleTransportClick = () => {
    if (isWeekend || hasClaimedTransport) return; 
    fileInputRef.current?.click();
  };

  const handleTransportPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTransportLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
        canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5); 

          try {
            const res = await ApiService.ambilTransport(collector.nama, compressedDataUrl);
            if (res.success) {
              setJustClaimed(true);
            } else {
              alert(res.message);
            }
          } catch (err) {
            alert("Gagal mengirim bukti transport ke server!");
          } finally {
            setIsTransportLoading(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';
  const textSub = currentTheme === 'light' ? 'text-slate-300' : 'text-white/20';
  const bgCard = currentTheme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-900/40 border-white/10 shadow-lg';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <section className="px-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className={`text-lg font-black ${textPrimary} tracking-tight leading-none`}>{collector.nama}</h2>
            <p className={`text-[7px] ${accentColor} font-bold uppercase tracking-[0.2em] mt-1`}>SINKRONISASI AKTIF</p>
          </div>
        </div>
        <div className={`${currentTheme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'} px-3 py-1 rounded-xl border text-right`}>
           <p className={`text-[6px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/40'} uppercase tracking-widest`}>Nasabah Aktif</p>
           <p className={`text-[9px] font-bold ${currentTheme === 'light' ? 'text-slate-900' : 'text-white'} uppercase`}>{nasabahList.length} Orang</p>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <section className={`${bgCard} p-2 rounded-2xl flex flex-col justify-between h-24 border`}>
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${hasClaimedTransport ? `${accentColor.replace('text', 'bg')}/20 ${accentColor}` : isWeekend ? 'bg-red-500/10 text-red-400' : (currentTheme === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/20')}`}>
              {hasClaimedTransport ? <Check size={12} /> : isWeekend ? <CalendarX size={12} /> : <Bike size={12} />}
            </div>
            <div className="min-w-0">
              <h4 className={`text-[7px] font-black ${textPrimary} uppercase tracking-widest leading-none truncate`}>Transport</h4>
              <p className={`text-[5px] font-bold ${textMuted} uppercase mt-0.5`}>
                {hasClaimedTransport ? 'OK' : isWeekend ? 'LIBUR' : 'SELFIE'}
              </p>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleTransportClick} 
            disabled={hasClaimedTransport || isTransportLoading || isWeekend} 
            className={`w-full py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all ${
              hasClaimedTransport 
                ? `${accentColor.replace('text', 'bg')}/10 ${accentColor}` 
                : isWeekend 
                  ? `${currentTheme === 'light' ? 'bg-slate-50 text-slate-300' : 'bg-white/5 text-white/20'} cursor-not-allowed border ${currentTheme === 'light' ? 'border-slate-100' : 'border-white/5'}`
                  : `${accentColor.replace('text', 'bg')} text-white shadow-lg`
            }`}
          >
            {isTransportLoading ? '...' : hasClaimedTransport ? 'CLAIMED' : isWeekend ? 'LIBUR' : 'AMBIL'}
          </motion.button>
          <input type="file" ref={fileInputRef} onChange={handleTransportPhoto} accept="image/*" capture="user" className="hidden" />
        </section>

        <section className={`${bgCard} border-blue-500/20 p-2 rounded-2xl flex flex-col justify-between h-24 border`}>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet size={12} />
            </div>
            <div className="min-w-0">
              <h4 className={`text-[7px] font-black ${textPrimary} uppercase tracking-widest leading-none truncate`}>Simpanan</h4>
              <p className={`text-[5px] font-bold ${textMuted} uppercase mt-0.5`}>CAIR TUNAI</p>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setView(ViewMode.SAVINGS_WITHDRAWAL)}
            className="w-full py-1.5 rounded-lg bg-blue-500 text-white text-[7px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
          >
            CAIRKAN
          </motion.button>
        </section>

        <section className={`${bgCard} border-purple-500/20 p-2 rounded-2xl flex flex-col justify-between h-24 border`}>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Activity size={12} />
            </div>
            <div className="min-w-0">
              <h4 className={`text-[7px] font-black ${textPrimary} uppercase tracking-widest leading-none truncate`}>Mutasi</h4>
              <p className={`text-[5px] font-bold ${textMuted} uppercase mt-0.5`}>TRANSAKSI</p>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setView(ViewMode.MUTATION)}
            className="w-full py-1.5 rounded-lg bg-purple-500 text-white text-[7px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20"
          >
            LIHAT
          </motion.button>
        </section>
      </div>

      <BannerCarousel />

      <section className={`${currentTheme === 'light' ? 'bg-white border-slate-100' : 'bg-white/5 border-white/10'} border p-5 rounded-[2rem] relative overflow-hidden shadow-sm`}>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h3 className={`text-[8px] font-black ${textMuted} uppercase tracking-[0.4em] mb-1`}>Setoran Hari Ini</h3>
            <p className={`text-xl font-black ${textPrimary}`}>Rp {totalAmount.toLocaleString('id-ID')}</p>
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-1 ${accentColor}`}>
              <TrendingUp size={14} />
              <span className="text-2xl font-black">{targetPercentage}%</span>
            </div>
          </div>
        </div>
        <div className={`w-full h-2 ${currentTheme === 'light' ? 'bg-slate-100' : 'bg-white/5'} rounded-full overflow-hidden border ${currentTheme === 'light' ? 'border-slate-50' : 'border-white/5'}`}>
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${targetPercentage}%` }}
             transition={{ duration: 1 }}
             className={`h-full ${accentColor.replace('text', 'bg')}`}
           />
        </div>
      </section>

      <section className="space-y-3 pb-4">
        <div className="flex justify-between items-center px-2">
           <h3 className={`text-[8px] font-black ${textMuted} uppercase tracking-[0.4em]`}>Antrian Penagihan</h3>
           <span className="text-[7px] font-bold text-red-500 uppercase tracking-widest animate-pulse">{collectionQueue.length} AKTIF</span>
        </div>
        <div className="space-y-3">
          {collectionQueue.length === 0 ? (
            <div className={`${currentTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'} p-8 rounded-[1.5rem] border border-dashed text-center opacity-40`}>
              <Check size={32} className="mx-auto mb-2 text-emerald-400" />
              <p className={`text-[9px] font-black uppercase tracking-widest ${textPrimary}`}>Tidak ada jadwal tagih hari ini</p>
            </div>
          ) : (
            collectionQueue.map((target, idx) => (
              <motion.div 
                key={idx} 
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectTarget(target.nama)} 
                className={`p-4 rounded-[1.5rem] border flex items-center justify-between transition-all cursor-pointer relative overflow-hidden group ${
                  target.isOverdue 
                    ? 'bg-red-500/10 border-red-500/20 shadow-lg shadow-red-500/5' 
                    : (currentTheme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-white/5 border-white/5')
                }`}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`w-1 h-8 rounded-full shadow-[0_0_10px_currentColor] ${target.isOverdue ? 'bg-red-500 text-red-500' : 'bg-blue-500 text-blue-500'}`}></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-[11px] font-black ${textPrimary} truncate max-w-[140px] leading-none tracking-wide`}>{target.nama}</p>
                      {target.isOverdue && (
                        <span className="text-[6px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">MENUNGGAK</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                       <p className={`text-[8px] font-bold uppercase ${textMuted}`}>
                         SISA: Rp {target.sisa_hutang.toLocaleString('id-ID')}
                       </p>
                    </div>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl border shadow-lg ${
                    target.isOverdue 
                      ? 'bg-red-500 text-white border-red-500 shadow-red-500/20' 
                      : (currentTheme === 'light' 
                          ? `bg-emerald-50 text-emerald-600 border-emerald-100` 
                          : `${accentColor.replace('text', 'bg')}/20 ${accentColor} ${accentColor.replace('text', 'border')}/20`)
                  }`}>
                    TAGIH {Math.round(target.cicilan / 1000)}K
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
};

export default Dashboard;
