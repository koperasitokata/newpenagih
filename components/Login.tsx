
import React, { useState } from 'react';
import { PetugasProfile } from '../types';
import { User, Key, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '../ApiService';
import { APP_CONFIG } from '../src/config';

interface LoginProps {
  onLogin: (profile: PetugasProfile) => void;
  currentTheme?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, currentTheme = 'default' }) => {
  const [role, setRole] = useState<'KOLEKTOR' | 'ADMIN'>('KOLEKTOR');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await ApiService.login({ role, identifier, password });
      
      if (response.success && response.user) {
        onLogin(response.user);
      } else {
        setError(response.message || 'Login gagal. Periksa ID, Password, dan Role Anda.');
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`h-screen flex flex-col items-center justify-center p-6 ${currentTheme === 'light' ? 'bg-white text-slate-900' : 'bg-slate-950 text-white'} relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${currentTheme === 'light' ? 'from-emerald-100 via-transparent to-blue-100' : 'from-blue-900/20 via-transparent to-emerald-900/20'} z-0`}></div>
      <div className={`absolute -top-24 -left-24 w-96 h-96 ${currentTheme === 'light' ? 'bg-emerald-500/10' : 'bg-blue-500/10'} blur-[120px] rounded-full`}></div>
      <div className={`absolute -bottom-24 -right-24 w-96 h-96 ${currentTheme === 'light' ? 'bg-blue-500/10' : 'bg-emerald-500/10'} blur-[120px] rounded-full`}></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-8 relative z-10"
      >
        <div className="text-center space-y-4 flex flex-col items-center">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`${APP_CONFIG.LOGO_SIZE_LOGIN} flex items-center justify-center mb-2`}
          >
             <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-full h-full object-contain drop-shadow-2xl" />
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className={`text-[9px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/40'} uppercase tracking-[0.4em]`}>TOKATA SECURE ACCESS POINT</p>
          </motion.div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/20 border border-red-500/40 p-4 rounded-2xl text-center"
              >
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  <AlertCircle size={14} /> {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="relative group">
              <label className={`block text-[10px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/30'} uppercase tracking-widest mb-2 ml-1`}>ID Petugas / No. HP</label>
              <div className="relative">
                 <User size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} group-focus-within:text-emerald-400 transition-colors`} />
                 <input 
                    type="text" 
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={`w-full p-5 pl-14 ${currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'} border rounded-3xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300`} 
                    placeholder="Contoh: P01 atau 0812..."
                    required
                 />
              </div>
            </div>

            <div className="relative group">
              <label className={`block text-[10px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/30'} uppercase tracking-widest mb-2 ml-1`}>Password</label>
              <div className="relative">
                 <Key size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} group-focus-within:text-emerald-400 transition-colors`} />
                 <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full p-5 pl-14 ${currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'} border rounded-3xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300`} 
                    placeholder="••••••••"
                    required
                 />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <motion.button 
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 bg-emerald-500 text-white shadow-emerald-500/30"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Masuk Sistem</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </div>
        </form>

        <div className="text-center">
           <p className={`text-[8px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} uppercase tracking-[0.3em] leading-relaxed`}>
             Sistem Penagihan Otomatis & Terpusat<br/>
             Authorized Personnel Only
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
