
import React, { useState } from 'react';
import { ViewMode, PetugasProfile } from '../types';
import { Bell, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_CONFIG } from '../src/config';

interface HeaderProps {
  setView: (view: ViewMode) => void;
  currentView: ViewMode;
  hasNewNotifications: boolean;
  adminNotifications?: {id: number, text: string, time: string}[];
  onViewNotifications: () => void;
  onProfileClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  petugas: PetugasProfile;
  accentColor?: string;
  currentTheme?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  setView, 
  currentView, 
  hasNewNotifications, 
  adminNotifications = [], 
  onViewNotifications, 
  onProfileClick, 
  onRefresh, 
  isRefreshing, 
  petugas,
  accentColor = 'text-emerald-400',
  currentTheme = 'default'
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  
  const defaultNotifications = [
    { id: 99, text: "Selamat datang di sistem TOKATA.", time: "Hari ini" }
  ];

  const activeNotifications = adminNotifications.length > 0 ? adminNotifications : defaultNotifications;

  const handleToggleNotifications = () => {
    if (!showNotifications) {
      onViewNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <header className={`${currentTheme === 'light' ? 'text-slate-900 border-b border-slate-100 bg-white/50 backdrop-blur-md' : 'text-white'} p-4 sticky top-0 z-[1100]`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={APP_CONFIG.LOGO_URL} alt="Logo" className={`${APP_CONFIG.LOGO_SIZE_HEADER} object-contain`} />
          <div>
            <h1 className="font-black text-xl leading-none tracking-tight">{APP_CONFIG.APP_NAME}</h1>
            <p className={`text-[8px] ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/50'} uppercase tracking-[0.2em] font-black mt-1`}>{APP_CONFIG.APP_TAGLINE}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-9 h-9 rounded-xl ${currentTheme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-white/60'} flex items-center justify-center border border-transparent hover:bg-white/10 transition-colors`}
            title="Muat Ulang Data"
          >
            <RefreshCw size={16} className={`${isRefreshing ? `animate-spin ${accentColor}` : ''}`} />
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleNotifications}
            className={`w-9 h-9 rounded-xl ${currentTheme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-white/60'} flex items-center justify-center border border-transparent hover:bg-white/10 transition-colors relative`}
          >
            <Bell size={16} />
            {hasNewNotifications && (
              <span className={`absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 ${currentTheme === 'light' ? 'border-white' : 'border-slate-900'} animate-pulse`}></span>
            )}
          </motion.button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`absolute top-12 right-0 w-64 ${currentTheme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'} border rounded-2xl shadow-2xl overflow-hidden z-[1200]`}
              >
                <div className={`p-3 ${currentTheme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'} border-b flex justify-between items-center`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${accentColor}`}>Pesan Admin Pusat</span>
                  <button onClick={() => setShowNotifications(false)} className={`text-[10px] ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} hover:text-white`}>
                    <X size={12} />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {activeNotifications.map(notif => (
                    <div key={notif.id} className={`p-3 border-b ${currentTheme === 'light' ? 'border-slate-50 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'} transition-colors cursor-pointer`}>
                      <p className={`text-[10px] font-medium ${currentTheme === 'light' ? 'text-slate-700' : 'text-white/80'} leading-relaxed mb-1`}>{notif.text}</p>
                      <p className={`text-[8px] font-bold ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} uppercase`}>{notif.time}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onProfileClick}
            className={`w-9 h-9 rounded-xl ${currentTheme === 'light' ? 'bg-slate-200 border-slate-300' : 'bg-white/5 border-white/10'} flex items-center justify-center border overflow-hidden`}
          >
            {petugas.foto ? (
              <img src={petugas.foto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className={`text-[10px] font-black ${accentColor} uppercase`}>{getInitials(petugas.nama)}</span>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export default Header;
