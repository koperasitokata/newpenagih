
import React, { useState, useRef } from 'react';
import { PetugasProfile, ThemeType } from '../types';
import { X, Camera, Edit2, LogOut, User, Phone, Shield, Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileSettingsProps {
  petugas: PetugasProfile;
  onSave: (profile: PetugasProfile) => void;
  onLogout: () => void;
  onClose: () => void;
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  accentColor?: string;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  petugas, 
  onSave, 
  onLogout, 
  onClose,
  currentTheme,
  onThemeChange,
  accentColor = 'text-emerald-400'
}) => {
  const [photo, setPhoto] = useState<string | null>(petugas.foto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themes: { id: ThemeType; name: string; colors: string }[] = [
    { id: 'default', name: 'Default', colors: 'bg-emerald-500' },
    { id: 'light', name: 'Light', colors: 'bg-slate-200' },
    { id: 'midnight', name: 'Midnight', colors: 'bg-indigo-500' },
    { id: 'sunset', name: 'Sunset', colors: 'bg-rose-500' },
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200; // Extreme compression limit for profile photo
          const scaleSize = MAX_WIDTH / img.width;
          
          const targetWidth = scaleSize < 1 ? MAX_WIDTH : img.width;
          const targetHeight = scaleSize < 1 ? img.height * scaleSize : img.height;
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.imageSmoothingEnabled = true;
             ctx.imageSmoothingQuality = 'medium';
             ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
             setPhoto(canvas.toDataURL('image/jpeg', 0.2)); // Quality 0.2 for extreme compression
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({ ...petugas, foto: photo || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex justify-center overflow-y-auto p-4 py-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${currentTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-white/10'} w-full max-w-sm rounded-[2.5rem] border shadow-3xl overflow-hidden my-auto`}
      >
        <div className={`p-6 ${currentTheme === 'light' ? 'bg-slate-100/50 border-slate-200' : 'bg-white/5 border-white/5'} border-b flex justify-between items-center`}>
          <h3 className={`font-black text-sm uppercase tracking-widest ${accentColor}`}>Identitas Petugas</h3>
          <button onClick={onClose} className={currentTheme === 'light' ? 'text-slate-400' : 'text-white/40'}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-24 h-24 rounded-[2rem] ${currentTheme === 'light' ? 'bg-slate-200' : 'bg-white/5'} border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer hover:bg-white/10 transition-all relative group ${accentColor.replace('text', 'border')}/30`}
            >
              {photo ? (
                <img src={photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera size={32} className={currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Edit2 size={20} className="text-white" />
              </div>
            </div>
            <p className={`text-[9px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/40'} uppercase tracking-widest`}>Petugas ID: {petugas.id_petugas}</p>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-3">
            <div className={`p-3 ${currentTheme === 'light' ? 'bg-slate-200/50 border-slate-200' : 'bg-white/5 border-white/5'} rounded-2xl border flex items-center gap-3`}>
               <User size={16} className={accentColor} />
               <div>
                  <p className={`text-[7px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} uppercase tracking-widest`}>Nama</p>
                  <p className={`text-xs font-bold ${currentTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>{petugas.nama}</p>
               </div>
            </div>
            
            <div className={`p-3 ${currentTheme === 'light' ? 'bg-slate-200/50 border-slate-200' : 'bg-white/5 border-white/5'} rounded-2xl border flex items-center gap-3`}>
               <Phone size={16} className={accentColor} />
               <div>
                  <p className={`text-[7px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} uppercase tracking-widest`}>No. HP</p>
                  <p className={`text-xs font-bold ${currentTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>{petugas.no_hp}</p>
               </div>
            </div>
 
            <div className={`p-3 ${currentTheme === 'light' ? 'bg-slate-200/50 border-slate-200' : 'bg-white/5 border-white/5'} rounded-2xl border flex items-center gap-3`}>
               <Shield size={16} className={accentColor} />
               <div>
                  <p className={`text-[7px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/20'} uppercase tracking-widest`}>Jabatan</p>
                  <p className={`text-xs font-bold ${currentTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>{petugas.jabatan}</p>
               </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Palette size={14} className={currentTheme === 'light' ? 'text-slate-400' : 'text-white/40'} />
              <p className={`text-[8px] font-black ${currentTheme === 'light' ? 'text-slate-400' : 'text-white/40'} uppercase tracking-widest`}>Pilih Tema Aplikasi</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                    currentTheme === t.id 
                      ? (currentTheme === 'light' ? 'bg-slate-200 border-slate-300' : 'bg-white/10 border-white/20') 
                      : (currentTheme === 'light' ? 'bg-white border-transparent hover:bg-slate-100' : 'bg-white/5 border-transparent hover:bg-white/10')
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${t.colors} flex items-center justify-center shadow-lg`}>
                    {currentTheme === t.id && <Check size={12} className="text-white" />}
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-tighter ${currentTheme === t.id ? (currentTheme === 'light' ? 'text-slate-900' : 'text-white') : (currentTheme === 'light' ? 'text-slate-400' : 'text-white/40')}`}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className={`w-full py-4 ${accentColor.replace('text', 'bg')} text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all shadow-${accentColor.split('-')[1]}-500/20`}
            >
              Update Foto Profil
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={onLogout}
              className={`w-full py-3 ${currentTheme === 'light' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-red-500/10 text-red-500 border-red-500/20'} border rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
            >
              <LogOut size={14} /> Logout / Ganti Akun
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;
