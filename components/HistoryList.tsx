
import React from 'react';
import { PinjamanAktif } from '../types';
import { Receipt, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import LazyImage from './LazyImage';

interface HistoryListProps {
  records: PinjamanAktif[];
  currentTheme?: string;
}

const HistoryList: React.FC<HistoryListProps> = ({ records, currentTheme = 'default' }) => {
  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';

  if (records.length === 0) {
    return (
      <div className={`text-center py-40 flex flex-col items-center ${textMuted}`}>
        <Receipt size={64} className="mb-6" />
        <h3 className="text-lg font-black uppercase tracking-widest">Data Kosong</h3>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex items-center justify-between px-2">
        <div>
           <h2 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Pinjaman Aktif</h2>
           <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.3em]">Monitoring Kontrak Lapangan</p>
        </div>
        <span className={`text-[9px] font-black ${currentTheme === 'light' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/10 text-white/60 border-white/5'} px-4 py-2 rounded-full uppercase border shadow-sm`}>{records.length} Kontrak</span>
      </div>

      <div className="space-y-6">
        {records.map((record, idx) => {
          return (
            <motion.div 
              key={`${record.id_pinjaman}-${idx}`} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative group"
            >
              <div className={`${currentTheme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10 shadow-2xl'} backdrop-blur-xl border rounded-[2.5rem] p-6 flex gap-6 items-center`}>
                <div className={`w-20 h-24 rounded-2xl overflow-hidden border ${currentTheme === 'light' ? 'border-slate-100 bg-slate-50' : 'border-white/10 bg-white/5'} shadow-lg flex-shrink-0`}>
                  {record.foto_bukti ? (
                    <LazyImage src={record.foto_bukti} alt={record.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${currentTheme === 'light' ? 'text-slate-200' : 'text-white/10'}`}>
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                     <h3 className={`font-black ${textPrimary} text-base truncate pr-4`}>{record.nama}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4">
                    <div>
                      <p className={`text-[8px] font-black ${textMuted} uppercase tracking-widest`}>Pokok</p>
                      <p className={`text-sm font-black ${currentTheme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>Rp {record.pokok.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className={`text-[8px] font-black ${textMuted} uppercase tracking-widest`}>Sisa</p>
                      <p className={`text-sm font-black ${currentTheme === 'light' ? 'text-red-500' : 'text-red-400'}`}>Rp {record.sisa_hutang.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between text-[9px] font-bold ${textMuted} uppercase`}>
                    <span>Mulai: {formatDate(record.tanggal)}</span>
                    <span className="text-emerald-500/50">{record.tenor}X</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default HistoryList;
