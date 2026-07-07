
import React, { useState } from 'react';
import { PinjamanAktif, Nasabah } from '../types';
import { ChevronRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateLoanSchedule } from '../src/utils/loanUtils';
import LazyImage from './LazyImage';

interface CustomerListProps {
  records: PinjamanAktif[];
  nasabahList: Nasabah[];
  onSelectCustomer: (nasabahId: string, loanId?: string) => void;
  currentTheme?: string;
}

const CustomerList: React.FC<CustomerListProps> = ({ 
  records, 
  nasabahList, 
  onSelectCustomer,
  currentTheme = 'default'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const customersList: any[] = [];

  nasabahList.forEach(nasabah => {
    const userLoans = records.filter(r => r.id_nasabah === nasabah.id_nasabah);
    
    if (userLoans.length === 0) {
      customersList.push({
        id: nasabah.id_nasabah,
        loanId: 'NONE',
        name: nasabah.nama,
        percentage: 0,
        remainingAmount: 0,
        status: 'NO_LOAN',
        foto: nasabah.foto
      });
    } else {
      userLoans.forEach(loan => {
        const pokok = loan.pokok || 0;
        const bunga = loan.bunga_persen || 0;
        const sisa = loan.sisa_hutang || 0;
        
        const totalContractValue = pokok * (1 + (bunga / 100));
        const totalPaid = totalContractValue - sisa;
        let realPercentage = totalContractValue > 0 
          ? Math.min(100, Math.round((totalPaid / totalContractValue) * 100)) 
          : 0;

        let status = 'SAFE';
        if (loan.status === 'Lunas' || sisa <= 0) {
          status = 'LUNAS';
          realPercentage = 100; // Force 100% for Lunas
        } else {
          // Generate schedule to check for overdue
          const schedule = generateLoanSchedule(loan.tanggal, loan.tenor);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let hasOverdue = false;
          let hasToday = false;

          const cicilan = loan.cicilan;
          
          schedule.forEach((ticketDate, i) => {
            const checkDate = new Date(ticketDate);
            checkDate.setHours(0, 0, 0, 0);
            
            const amountAllocated = Math.max(0, Math.min(cicilan, totalPaid - (i * cicilan)));
            const isActuallyPaid = amountAllocated >= cicilan - 1; // Tolerance for rounding

            if (!isActuallyPaid) {
              if (checkDate < today) {
                hasOverdue = true;
              } else if (checkDate.getTime() === today.getTime()) {
                hasToday = true;
              }
            }
          });

          if (hasOverdue) {
            status = 'DEBT';
          } else if (hasToday) {
            status = 'DUE_TODAY';
          } else {
            status = 'SAFE';
          }
        }

        customersList.push({
          id: nasabah.id_nasabah,
          loanId: loan.id_pinjaman,
          name: nasabah.nama,
          percentage: realPercentage,
          remainingAmount: sisa,
          status,
          foto: nasabah.foto
        });
      });
    }
  });

  const sortedCustomers = customersList.sort((a, b) => {
    const statusOrder: Record<string, number> = { 
      'DEBT': 0, 
      'DUE_TODAY': 1, 
      'SAFE': 2, 
      'LUNAS': 3,
      'NO_LOAN': 4
    };
    
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.name.localeCompare(b.name);
  });

  const filteredCustomers = sortedCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const textPrimary = currentTheme === 'light' ? 'text-slate-800' : 'text-white';
  const textMuted = currentTheme === 'light' ? 'text-slate-400' : 'text-white/40';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-12"
    >
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className={`text-xl font-black ${textPrimary} tracking-tight`}>Database Nasabah</h2>
          <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Portfolio Management</p>
        </div>
        <span className={`text-[9px] font-black ${currentTheme === 'light' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white/10 text-emerald-400 border-white/10'} border px-3 py-1 rounded-full`}>{nasabahList.length} Nasabah</span>
      </div>

      <div className="relative group px-1">
        <Search size={14} className={`absolute left-5 top-1/2 -translate-y-1/2 ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} group-focus-within:text-emerald-400 transition-colors`} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau ID nasabah..."
          className={`w-full p-3.5 pl-11 ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'} border rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-300`}
        />
      </div>

      <div className="grid grid-cols-1 gap-2">
        {filteredCustomers.map((customer, idx) => {
          const isDebt = customer.status === 'DEBT';
          const isDueToday = customer.status === 'DUE_TODAY'; 
          const isLunas = customer.status === 'LUNAS';
          const isNoLoan = customer.status === 'NO_LOAN';
          
          return (
            <motion.div 
              key={`${customer.id}-${customer.loanId}`} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectCustomer(customer.id, customer.loanId)}
              className={`backdrop-blur-md p-2.5 px-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                isLunas || isNoLoan
                  ? (currentTheme === 'light' ? 'bg-slate-50/50 border-slate-100 opacity-60 grayscale' : 'bg-white/5 border-white/10 opacity-40 grayscale')
                  : isDueToday
                      ? (currentTheme === 'light' ? 'bg-orange-50 border-orange-100 shadow-sm shadow-orange-500/5' : 'bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-500/10')
                      : isDebt 
                        ? (currentTheme === 'light' ? 'bg-red-50 border-red-100 shadow-sm shadow-red-500/5' : 'bg-gradient-to-r from-red-900/40 to-slate-900/40 border-red-500/50 shadow-lg shadow-red-500/10') 
                        : (currentTheme === 'light' ? 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm' : 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/50')
              }`}
            >
              <div className={`w-8 h-8 rounded-lg border flex-shrink-0 flex items-center justify-center overflow-hidden font-black text-xs ${
                isLunas || isNoLoan
                  ? (currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white/10 border-white/20 text-white/40')
                  : isDueToday
                      ? 'bg-orange-500/20 border-orange-400/40 text-orange-400'
                      : isDebt 
                        ? 'bg-red-500/20 border-red-500/40 text-red-500' 
                        : 'bg-emerald-400/20 border-emerald-400/30 text-emerald-500'
              }`}>
                {customer.foto ? (
                  <LazyImage src={customer.foto} alt={customer.name} className="w-full h-full object-cover" />
                ) : (
                  customer.name.charAt(0)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className={`font-black text-[11px] pr-2 ${textPrimary} truncate`}>
                    {customer.name}
                  </h4>
                  {isLunas ? (
                    <span className={`text-[6px] font-black ${currentTheme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-white/20 text-white/60'} px-1 py-0.5 rounded-sm uppercase tracking-tighter`}>LUNAS</span>
                  ) : isNoLoan ? (
                    <span className={`text-[6px] font-black ${currentTheme === 'light' ? 'bg-slate-200 text-slate-400' : 'bg-white/20 text-white/40'} px-1 py-0.5 rounded-sm uppercase tracking-tighter`}>IDLE</span>
                  ) : isDebt ? (
                    <span className="text-[6px] font-black bg-red-600 text-white px-1 py-0.5 rounded-sm uppercase tracking-tighter shadow-red-500/50">MACET</span>
                  ) : isDueToday ? (
                    <span className="text-[6px] font-black bg-orange-500 text-white px-1 py-0.5 rounded-sm uppercase tracking-tighter shadow-orange-500/50">AKTIF</span>
                  ) : (
                    <span className="text-[6px] font-black bg-emerald-500 text-white px-1 py-0.5 rounded-sm uppercase tracking-tighter">AMAN</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <p className={`text-[8px] font-black ${textMuted} uppercase tracking-tighter`}>
                    {isLunas ? 'LUNAS' : isDebt ? 'MACET' : isNoLoan ? 'IDLE' : 'AMAN'}
                  </p>
                  <p className={`text-[8px] font-black ${textMuted} uppercase tracking-tighter`}>
                    <span className={isLunas ? 'text-slate-400' : isDebt ? 'text-red-500' : isDueToday ? 'text-orange-500' : 'text-emerald-600'}>{customer.percentage}%</span>
                  </p>
                </div>
              </div>

              <div className={`w-10 h-1 ${currentTheme === 'light' ? 'bg-slate-100' : 'bg-white/5'} rounded-full overflow-hidden flex-shrink-0`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${customer.percentage}%` }}
                  transition={{ duration: 1, delay: idx * 0.02 }}
                  className={`h-full rounded-full ${isLunas ? (currentTheme === 'light' ? 'bg-slate-300' : 'bg-white/20') : isDebt ? 'bg-red-500' : isDueToday ? 'bg-orange-500' : 'bg-emerald-400'}`} 
                ></motion.div>
              </div>
              
              <ChevronRight size={10} className={`${isLunas ? (currentTheme === 'light' ? 'text-slate-200' : 'text-white/10') : isDebt ? 'text-red-400/30' : isDueToday ? 'text-orange-400/30' : 'text-white/20'}`} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CustomerList;
