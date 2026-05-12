
import React, { useState } from 'react';
import { Mutation, Nasabah, PinjamanAktif } from '../types';
import { Activity, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReceiptPopup from './ReceiptPopup';

interface MutationListProps {
  mutations: Mutation[];
  nasabahList: Nasabah[];
  records: PinjamanAktif[];
  onBack: () => void;
  currentTheme?: string;
}

const MutationList: React.FC<MutationListProps> = ({ 
  mutations = [], 
  nasabahList = [], 
  records = [], 
  onBack,
  currentTheme = 'default'
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<{ 
    mutation: Mutation, 
    nasabah: Nasabah, 
    record: PinjamanAktif 
  } | null>(null);

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';

  const sortedMutations = Array.isArray(mutations) ? [...mutations].sort((a, b) => {
    return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
  }) : [];

  const getGroupLabel = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).toUpperCase();
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'HARI INI';
    if (d.toDateString() === yesterday.toDateString()) return 'KEMARIN';
    
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
  };

  const groupedMutations: { [key: string]: Mutation[] } = {};
  sortedMutations.forEach(m => {
    const label = getGroupLabel(m.tanggal);
    if (!groupedMutations[label]) groupedMutations[label] = [];
    groupedMutations[label].push(m);
  });

  const formatTime = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-6 px-1">
        <div>
          <h2 className={`text-xl font-black ${textPrimary} tracking-tight`}>Mutasi Transaksi</h2>
          <p className="text-[8px] text-purple-400 font-bold uppercase tracking-[0.2em]">Data Aktivitas Keuangan</p>
        </div>
        <button 
          onClick={onBack}
          className={`px-3 py-1.5 ${currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-white/60'} rounded-xl text-[8px] font-black uppercase tracking-widest border`}
        >
          Kembali
        </button>
      </div>

      <div className="space-y-6 pb-10">
        {Object.keys(groupedMutations).length === 0 ? (
          <div className="text-center py-20 opacity-20">
            <Activity size={48} className={`mx-auto mb-4 ${textPrimary}`} />
            <p className={`text-xs font-black uppercase tracking-widest ${textPrimary}`}>Belum ada data mutasi</p>
          </div>
        ) : (
          Object.entries(groupedMutations).map(([label, items], gIdx) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <span className={`text-[7px] font-black ${textMuted} uppercase tracking-[0.3em] whitespace-nowrap`}>{label}</span>
                <div className={`h-[1px] w-full ${currentTheme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`}></div>
              </div>
              
              <div className="space-y-1.5">
                {items.map((m, idx) => {
                  const keterangan = m.keterangan.toLowerCase();
                  const jenis = (m.jenis || '').toLowerCase();
                  
                  // Logic to determine if it's income or expense
                  const isIncome = 
                    keterangan.includes('bayar') || 
                    keterangan.includes('setor') || 
                    keterangan.includes('modal') || 
                    keterangan.includes('pemasukan') ||
                    jenis === 'simpanan' ||
                    jenis === 'pemasukan' ||
                    jenis === 'angsuran';

                  const isExpense = 
                    keterangan.includes('tarik') || 
                    keterangan.includes('cair') || 
                    keterangan.includes('pengeluaran') || 
                    keterangan.includes('transport') ||
                    jenis === 'pengeluaran' ||
                    jenis === 'penarikan' ||
                    jenis === 'pencairan';
                  
                  const isTransport = jenis === 'transport' || keterangan.includes('transport');
                  const isPencairan = jenis === 'pencairan' || keterangan.includes('pencairan');
                  const isSimpanan = jenis === 'simpanan' || keterangan.includes('setor simpanan');
                  const isPenarikan = jenis === 'penarikan' || keterangan.includes('tarik simpanan') || keterangan.includes('cair simpanan');
                  const isAngsuran = jenis === 'angsuran' || keterangan.includes('angsuran') || keterangan.includes('bayar');
                  
                  return (
                    <motion.div 
                      key={`${gIdx}-${idx}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (gIdx * 0.1) + (idx * 0.02) }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        // Find nasabah
                        const nasabah = nasabahList.find(n => 
                          n.id_nasabah === m.id_nasabah || 
                          n.nama === m.id_nasabah ||
                          m.keterangan.includes(n.nama)
                        );
                        
                        if (nasabah) {
                          // Find or create record
                          let record = records.find(r => 
                            r.id_nasabah === nasabah.id_nasabah || 
                            (m.id_pinjam && r.id_pinjaman === m.id_pinjam)
                          );
                          
                          if (!record) {
                            // Mock record for non-loan mutations
                            record = {
                              id_pinjaman: m.id_pinjam || 'TRX-' + Date.now(),
                              tanggal: m.tanggal,
                              id_nasabah: nasabah.id_nasabah,
                              nama: nasabah.nama,
                              pokok: m.jumlah,
                              bunga_persen: 0,
                              total_hutang: 0,
                              tenor: 0,
                              cicilan: 0,
                              sisa_hutang: 0,
                              status: 'Lunas',
                              petugas: m.petugas,
                              update_terakhir: m.tanggal,
                              foto_bukti: m.foto || ''
                            };
                          }
                          
                          setSelectedReceipt({
                            mutation: m,
                            nasabah,
                            record
                          });
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer ${
                        currentTheme === 'light'
                          ? (isIncome 
                              ? 'bg-emerald-50/50 border-emerald-100' 
                              : isExpense
                                ? isTransport 
                                  ? 'bg-blue-50/50 border-blue-100'
                                  : isPenarikan
                                    ? 'bg-orange-50/50 border-orange-100'
                                    : 'bg-red-50/50 border-red-100'
                                : 'bg-white border-slate-100')
                          : (isIncome 
                              ? 'bg-emerald-500/[0.03] border-emerald-500/10' 
                              : isExpense
                                ? isTransport 
                                  ? 'bg-blue-500/[0.03] border-blue-500/10'
                                  : isPenarikan
                                    ? 'bg-orange-500/[0.03] border-orange-500/10'
                                    : 'bg-red-500/[0.03] border-red-500/10'
                                : 'bg-white/5 border-white/10')
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                          isIncome 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                            : isExpense
                              ? isTransport
                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                                : isPenarikan
                                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-600'
                                  : 'bg-red-500/10 border-red-500/20 text-red-600'
                              : 'bg-white/10 border-white/20 text-white/40'
                        }`}>
                          {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className={`text-[9px] font-black ${textPrimary} leading-tight truncate`}>{m.keterangan}</h4>
                            {isTransport && <span className="text-[6px] font-black bg-blue-500 text-white px-1 rounded-sm uppercase tracking-tighter">TRANS</span>}
                            {isPencairan && <span className="text-[6px] font-black bg-orange-500 text-white px-1 rounded-sm uppercase tracking-tighter">CAIR</span>}
                            {isPenarikan && <span className="text-[6px] font-black bg-orange-600 text-white px-1 rounded-sm uppercase tracking-tighter">WD</span>}
                          </div>
                          <div className={`flex items-center gap-1 mt-0.5 text-[6px] font-bold ${textMuted} uppercase tracking-widest`}>
                            <Clock size={7} />
                            <span>{formatTime(m.tanggal)} • {m.petugas}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[10px] font-black ${
                          isIncome ? (currentTheme === 'light' ? 'text-emerald-600' : 'text-emerald-400') : 
                          isTransport ? (currentTheme === 'light' ? 'text-blue-600' : 'text-blue-400') : 
                          isPenarikan ? (currentTheme === 'light' ? 'text-orange-600' : 'text-orange-400') :
                          isExpense ? (currentTheme === 'light' ? 'text-red-600' : 'text-red-400') : textMuted
                        }`}>
                          {isIncome ? '+' : isExpense ? '-' : ''} {m.jumlah.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedReceipt && (
          <ReceiptPopup 
            record={selectedReceipt.record}
            nasabah={selectedReceipt.nasabah}
            amountPaid={selectedReceipt.mutation.jumlah}
            date={selectedReceipt.mutation.tanggal}
            onClose={() => setSelectedReceipt(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MutationList;
