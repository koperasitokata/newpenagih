
import React, { useState, useEffect, useMemo } from 'react';
import { PinjamanAktif, Nasabah, Mutation } from '../types';
import { ChevronLeft, Coins, X, Calendar, User, Phone, MapPin, CheckCircle, Wallet, AlertTriangle, Clock, RefreshCcw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '../ApiService';
import { generateLoanSchedule, parseSafeDate } from '../src/utils/loanUtils';
import ReceiptPopup from './ReceiptPopup';

interface InstallmentCardProps {
  nasabahId: string;
  loanId?: string;
  nasabahList: Nasabah[];
  records: PinjamanAktif[];
  mutations: Mutation[];
  onBack: () => void;
  currentTheme?: string;
}

const InstallmentCard: React.FC<InstallmentCardProps> = ({ 
  nasabahId, 
  loanId, 
  nasabahList, 
  records, 
  mutations, 
  onBack,
  currentTheme = 'default'
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [memberBalance, setMemberBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ amount: number, photo?: string, date: string | Date } | null>(null);

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';
  
  const nasabah = nasabahList.find(n => n.id_nasabah === nasabahId);
  
  // If loanId is provided, find that specific loan. Otherwise, find the active one.
  const activeLoan = useMemo(() => {
    if (loanId && loanId !== 'NONE') {
      return records.find(r => r.id_pinjaman === loanId);
    }
    return records.find(r => r.id_nasabah === nasabahId && r.status === 'Aktif');
  }, [records, nasabahId, loanId]);

  const loanSchedule = useMemo(() => {
    if (!activeLoan) return [];
    return generateLoanSchedule(activeLoan.tanggal, activeLoan.tenor);
  }, [activeLoan]);

  useEffect(() => {
    if (nasabahId) {
      const fetchBalance = async () => {
        setIsLoadingBalance(true);
        try {
          const res = await ApiService.getMemberBalance(nasabahId);
          if (res.success) {
            setMemberBalance(res.balance);
          }
        } catch (err) {
          console.error("Error fetching balance:", err);
        } finally {
          setIsLoadingBalance(false);
        }
      };
      fetchBalance();
    }
  }, [nasabahId]);

  if (!nasabah) return null;

  const totalContractValue = activeLoan ? activeLoan.pokok * (1 + (activeLoan.bunga_persen / 100)) : 0;
  const totalPaid = activeLoan ? totalContractValue - activeLoan.sisa_hutang : 0;
  const currentPercentage = totalContractValue > 0 ? Math.min(100, Math.round((totalPaid / totalContractValue) * 100)) : 0;
  const isLunasTotal = activeLoan ? activeLoan.sisa_hutang <= 0 : true;

  // Filter and sort angsuran mutations for this loan
  const angsuranMutations = useMemo(() => {
    return mutations
      .filter(m => {
        const isAngsuran = m.jenis === 'angsuran';
        if (!isAngsuran) return false;
        
        // If we have an active loan, try to match by id_pinjam
        if (activeLoan && m.id_pinjam) {
          return String(m.id_pinjam) === String(activeLoan.id_pinjaman);
        }
        return true;
      })
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [mutations, activeLoan]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6 pb-12 relative"
    >
      <div className="flex items-center justify-between px-1">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onBack} 
          className={`w-10 h-10 rounded-xl ${currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white/10 border-white/10 text-white/60'} border flex items-center justify-center shadow-sm`}
        >
          <ChevronLeft size={20} />
        </motion.button>
        <div className="text-center flex-1 min-w-0">
          <h2 className={`text-xl font-black ${textPrimary} tracking-tight leading-tight uppercase truncate px-2`}>{nasabah.nama}</h2>
          <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-[0.3em]">Profil Nasabah</p>
        </div>
        <div className="w-10"></div>
      </div>

      <motion.div 
        className={`p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/10 transition-all duration-500 ${isLunasTotal ? 'bg-blue-600' : 'bg-emerald-600/90'}`}
      >
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.4em] mb-1">Capaian Progres</p>
              <div className="flex items-end gap-2">
                <p className="text-5xl font-black tracking-tighter leading-none">{currentPercentage}<span className="text-xl">%</span></p>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isLunasTotal ? 'bg-white/20' : 'bg-black/20'}`}>
                   {isLunasTotal ? 'LUNAS' : 'AKTIF'}
                </div>
              </div>
            </div>
            {activeLoan && (
              <div className="text-right">
                 <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.4em] mb-1">Sisa Tagihan</p>
                 <p className="text-xl font-black">Rp {activeLoan.sisa_hutang.toLocaleString()}</p>
              </div>
            )}
          </div>

          {activeLoan && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-black/10 rounded-2xl p-3 border border-white/5">
                <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-1">Total Pinjaman</p>
                <p className="text-xs font-black text-white">Rp {totalContractValue.toLocaleString()}</p>
              </div>
              <div className="bg-black/10 rounded-2xl p-3 border border-white/5">
                <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-1">Cicilan</p>
                <p className="text-xs font-black text-emerald-300">Rp {activeLoan.cicilan.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${currentPercentage}%` }}
              transition={{ duration: 1 }}
              className={`h-full ${isLunasTotal ? 'bg-white' : 'bg-emerald-400'}`}
            ></motion.div>
          </div>
        </div>
        
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Coins size={96} className="rotate-12" />
        </div>
      </motion.div>

      <div className={`${currentTheme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-white/5 border-white/10 shadow-2xl'} backdrop-blur-xl border p-6 rounded-[2.5rem] space-y-6`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-[10px] font-black ${textMuted} uppercase tracking-[0.2em]`}>Jadwal & Tiket Angsuran</h3>
          <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Tenor {activeLoan?.tenor || 0} Hari</span>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {activeLoan && loanSchedule.length > 0 ? loanSchedule.map((ticketDate, i) => {
            // Reset jam untuk perbandingan tanggal saja
            const today = new Date();
            today.setHours(0,0,0,0);
            const checkDate = new Date(ticketDate);
            checkDate.setHours(0,0,0,0);

            if (isNaN(checkDate.getTime())) {
              return (
                <div key={i} className={`aspect-[3/4.8] rounded-xl border ${currentTheme === 'light' ? 'border-slate-100 bg-slate-50' : 'border-white/5 bg-white/5'} flex items-center justify-center`}>
                  <p className="text-[6px] text-white/20">ERR</p>
                </div>
              );
            }

            const cicilan = activeLoan?.cicilan || 0;
            const amountAllocated = Math.max(0, Math.min(cicilan, totalPaid - (i * cicilan)));
            const isPartiallyPaid = amountAllocated > 0 && amountAllocated < cicilan;
            const isActuallyPaid = amountAllocated >= cicilan;
            
            const isCurrent = !isActuallyPaid && checkDate.getTime() === today.getTime();
            const isOverdue = !isActuallyPaid && checkDate < today;
            const totalHutang = activeLoan?.total_hutang || totalContractValue;
            const remainingAfterThis = Math.max(0, totalHutang - ((i + 1) * cicilan));

            const dayName = ticketDate.toLocaleDateString('id-ID', { weekday: 'short' });
            const dateStr = ticketDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });

            // Find the mutation for this specific installment index
            const mutationForTicket = angsuranMutations[i];

            return (
              <motion.div 
                key={i} 
                whileTap={isActuallyPaid ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (isActuallyPaid && mutationForTicket) {
                    setSelectedReceipt({
                      amount: mutationForTicket.jumlah,
                      photo: mutationForTicket.foto,
                      date: mutationForTicket.tanggal
                    });
                  }
                }}
                className={`relative aspect-[3/4.8] rounded-xl border flex flex-col items-center justify-between py-2 transition-all overflow-hidden cursor-pointer ${
                  isActuallyPaid 
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' 
                    : isPartiallyPaid
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                      : isOverdue
                        ? 'bg-red-500/20 border-red-500/30 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : isCurrent 
                          ? `bg-white/10 border-emerald-400 ${currentTheme === 'light' ? 'text-slate-800' : 'text-white'} shadow-[0_0_10px_rgba(16,185,129,0.3)]` 
                          : `${currentTheme === 'light' ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white/5 border-white/5 text-white/20'}`
                }`}
              >
                <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 ${currentTheme === 'light' ? 'bg-white border-slate-200 shadow-inner' : 'bg-slate-950 border-white/10'} rounded-full border`}></div>
                <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 ${currentTheme === 'light' ? 'bg-white border-slate-200 shadow-inner' : 'bg-slate-950 border-white/10'} rounded-full border`}></div>
                <div className="text-center">
                  <p className="text-[6px] font-black uppercase tracking-tighter opacity-60">{dayName}</p>
                  <p className="text-[8px] font-black leading-none">{dateStr}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-black leading-none">{i + 1}</p>
                  <p className="text-[5px] font-bold uppercase opacity-40">Hari</p>
                </div>
                <div className="text-center w-full px-1">
                  <div className="h-[1px] w-full bg-current opacity-10 mb-1"></div>
                  <p className="text-[7px] font-black">
                    {isActuallyPaid ? 'LUNAS' : `Rp ${((cicilan - amountAllocated) / 1000).toFixed(0)}K`}
                  </p>
                  <p className="text-[4px] font-bold opacity-40">Sisa: {(remainingAfterThis / 1000).toFixed(0)}K</p>
                </div>
                {isActuallyPaid && <div className="absolute top-1 right-1"><CheckCircle size={8} className="text-emerald-500" /></div>}
                {isPartiallyPaid && <div className="absolute top-1 right-1 animate-pulse"><Clock size={8} className="text-amber-500" /></div>}
                {isOverdue && !isPartiallyPaid && <div className="absolute top-1 right-1 animate-pulse"><AlertTriangle size={8} className="text-red-500" /></div>}
                {isCurrent && !isActuallyPaid && !isPartiallyPaid && <div className="absolute top-1 right-1"><Clock size={8} className="text-emerald-500" /></div>}
              </motion.div>
            );
          }) : (
            <div className="col-span-4 py-8 text-center opacity-20">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tidak ada jadwal aktif</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100/10 space-y-4">
          <div className={`${currentTheme === 'light' ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/10 border-emerald-500/20'} p-4 rounded-2xl flex items-center justify-between border shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Wallet size={20} />
              </div>
              <div>
                <p className={`text-[8px] font-black ${textMuted} uppercase tracking-widest`}>Saldo Simpanan</p>
                <h4 className={`text-lg font-black ${textPrimary}`}>
                  {isLoadingBalance ? '...' : `Rp ${(memberBalance || 0).toLocaleString()}`}
                </h4>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-bold text-emerald-500 uppercase tracking-widest">Tersedia</p>
            </div>
          </div>
        </div>
      </div>

      {activeLoan && activeLoan.foto_bukti && (
        <div className={`${currentTheme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-white/5 border-white/10 shadow-2xl'} backdrop-blur-xl border p-6 rounded-[2.5rem]`}>
          <h3 className={`text-[10px] font-black ${textMuted} uppercase tracking-[0.2em] mb-4`}>Foto Bukti Terakhir</h3>
          <div 
            onClick={() => setSelectedPhoto(activeLoan.foto_bukti)}
            className={`w-full h-48 rounded-3xl overflow-hidden border ${currentTheme === 'light' ? 'border-slate-100' : 'border-white/10'} cursor-pointer hover:opacity-80 transition-all shadow-sm`}
          >
            <img src={activeLoan.foto_bukti} alt="Bukti" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {selectedReceipt && activeLoan && nasabah && (
          <ReceiptPopup 
            record={activeLoan}
            nasabah={nasabah}
            amountPaid={selectedReceipt.amount}
            photo={selectedReceipt.photo}
            date={selectedReceipt.date}
            onClose={() => setSelectedReceipt(null)}
          />
        )}

        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6" 
            onClick={() => setSelectedPhoto(null)}
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-sm rounded-[2.5rem] overflow-hidden border-2 border-emerald-400 shadow-3xl" 
               onClick={(e) => e.stopPropagation()}
             >
                <img src={selectedPhoto} alt="Bukti" className="w-full object-cover" />
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                   <div className="bg-emerald-500 text-white text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Verified Photo</div>
                   <button onClick={() => setSelectedPhoto(null)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center">
                      <X size={20} />
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InstallmentCard;
