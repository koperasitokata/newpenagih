
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PinjamanAktif, ViewMode, PengajuanPinjaman, PetugasProfile, Nasabah, Prospect, Mutation, ThemeType } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CollectionForm from './components/CollectionForm';
import HistoryList from './components/HistoryList';
import CollectionMap from './components/CollectionMap';
import SubmissionMenu from './components/SubmissionMenu';
import CustomerList from './components/CustomerList';
import InstallmentCard from './components/InstallmentCard';
import MutationList from './components/MutationList';
import SavingsWithdrawal from './components/SavingsWithdrawal';
import ReceiptPopup from './components/ReceiptPopup';
import ProfileSettings from './components/ProfileSettings';
import Login from './components/Login';
import { ApiService } from './ApiService';
import { WebhookService } from './WebhookService';
import { Home, FileSignature, Camera, Users, Map as MapIcon, Loader2, AlertCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const THEMES = {
  default: {
    bg: 'bg-slate-950',
    gradient: 'from-blue-900/20 via-transparent to-emerald-900/20',
    glow1: 'bg-blue-500/10',
    glow2: 'bg-emerald-500/10',
    navIcon: 'text-emerald-400',
    button: 'from-emerald-400 to-blue-500',
    shadow: 'shadow-emerald-500/30'
  },
  midnight: {
    bg: 'bg-gray-950',
    gradient: 'from-indigo-900/30 via-transparent to-purple-900/30',
    glow1: 'bg-indigo-500/15',
    glow2: 'bg-purple-500/15',
    navIcon: 'text-indigo-400',
    button: 'from-indigo-500 to-purple-600',
    shadow: 'shadow-indigo-500/30'
  },
  sunset: {
    bg: 'bg-stone-950',
    gradient: 'from-amber-900/20 via-transparent to-rose-900/20',
    glow1: 'bg-amber-500/10',
    glow2: 'bg-rose-500/10',
    navIcon: 'text-rose-400',
    button: 'from-amber-500 to-rose-500',
    shadow: 'shadow-rose-500/30'
  },
  light: {
    bg: 'bg-white',
    gradient: 'from-emerald-100 via-transparent to-blue-100',
    glow1: 'bg-emerald-500/10',
    glow2: 'bg-blue-500/10',
    navIcon: 'text-emerald-600',
    button: 'from-emerald-500 to-blue-600',
    shadow: 'shadow-emerald-500/20'
  }
};

const App: React.FC = () => {
  // Hapus penyimpanan lokal karena membuat data stuck dan tidak sinkron
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [records, setRecords] = useState<PinjamanAktif[]>([]);
  const [submissions, setSubmissions] = useState<PengajuanPinjaman[]>([]);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [nasabahList, setNasabahList] = useState<Nasabah[]>([]);
  const [fullNasabahList, setFullNasabahList] = useState<Nasabah[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<{id: number, text: string, time: string}[]>([]);
  const [selectedNasabahId, setSelectedNasabahId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [prefilledName, setPrefilledName] = useState<string>('');
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('app_theme') as ThemeType) || 'light';
  });

  const activeTheme = THEMES[currentTheme];

  useEffect(() => {
    localStorage.setItem('app_theme', currentTheme);
  }, [currentTheme]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [petugas, setPetugas] = useState<PetugasProfile>({ id_petugas: '', nama: 'Memuat...', no_hp: '', jabatan: 'KOLEKTOR', foto: '' });
  const dataSyncedRef = useRef(false);

  const prevSubmissionsRef = useRef<PengajuanPinjaman[]>([]);

  const loadData = useCallback(async (showFullLoader = true) => {
    const petugasId = petugas.id_petugas || (petugas as any).id;
    const userRole = String(petugas.jabatan || 'KOLEKTOR').toUpperCase();
    
    // Optimasi: Jika sudah pernah sinkron (dataSyncedRef), jangan tampilkan full loader 
    // agar transisi setelah login mulus tanpa menunggu loading lagi.
    const shouldShowFullLoader = showFullLoader && isAuthenticated && !dataSyncedRef.current;

    if (shouldShowFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    
    setApiError(null);
    
    try {
      // 1. Ambil data utama via POST (Dashboard logic)
      let response = { success: false, data: {}, message: '' };
      if (petugasId) {
        response = await ApiService.getDashboardData(petugas.jabatan, petugasId);
      }
      
      // 2. Ambil data tambahan via GET (doGet logic)
      let getResponse = { success: false, data: {} };
      try {
        getResponse = await ApiService.getData();
      } catch (e) {
        console.warn("Gagal mengambil data via GET:", e);
      }
      
      if (!response.success && !getResponse.success && isAuthenticated) {
        throw new Error(response.message || (getResponse as any).message || "Gagal mengambil data dari server");
      }
      
      // Gabungkan data dari kedua sumber
      const data: any = { 
        ...(getResponse.data || {}),
        ...(response.data || {})
      };
      
      setApiError(null);
      dataSyncedRef.current = true;
      
      // Ambil data pengajuan dari berbagai kemungkinan field
      let allSubmissionsMap = new Map<string, PengajuanPinjaman>();
      const synthesizedMutations: Mutation[] = [];
      
      // Build Nasabah Name Map for ID resolution
      const nasabahMap = new Map<string, string>();
      const rawNasabah = data.nasabah || data.NASABAH || [];
      if (Array.isArray(rawNasabah)) {
        rawNasabah.forEach((n: any) => {
          const id = String(n.id_nasabah || n.id || '').toUpperCase();
          if (id) nasabahMap.set(id, n.nama);
        });
      }

      const getDisplayName = (id: any, fallbackName: any) => {
        const sid = String(id || '').toUpperCase();
        if (nasabahMap.has(sid)) return nasabahMap.get(sid);
        return fallbackName || id || 'Nasabah';
      };
      
      const mergeSubmissions = (list: any[], sourceKey: string) => {
        if (!list || !Array.isArray(list)) return;
        list.forEach(sub => {
          if (sub && (sub.id_pengajuan || sub.id)) {
            const id = String(sub.id_pengajuan || sub.id);
            allSubmissionsMap.set(id, {
              ...sub,
              id_pengajuan: id,
              status: sub.status || 'Pending',
              submissionType: sourceKey.toLowerCase().includes('simpanan') ? 'SIMPANAN' : 'PINJAMAN'
            });
          }
        });
      };

      const cleanNumber = (val: any) => {
        if (val === null || val === undefined || val === "") return 0;
        if (typeof val === 'number') return val;
        // Remove currency and thousand separators (dots/commas followed by 3 digits)
        let s = String(val).replace(/Rp/gi, '').trim();
        
        // If it contains a dot and a comma, it's definitely formatted
        // e.g. 1.250.000,00 or 1,250,000.00
        if (s.includes('.') && s.includes(',')) {
          // Heuristic: remove the one that appears more often or is used as thousand separator
          const dots = (s.match(/\./g) || []).length;
          const commas = (s.match(/,/g) || []).length;
          if (dots > commas) s = s.replace(/\./g, '').replace(',', '.');
          else s = s.replace(/,/g, '').replace(',', '.');
        } else {
          // If only dots or only commas
          // If it's like 25.000 (IDR style)
          if (/\.\d{3}/.test(s) && !s.includes(',')) s = s.replace(/\./g, '');
          // If it's like 25,000 (US style)
          else if (/,\d{3}/.test(s) && !s.includes('.')) s = s.replace(/,/g, '');
        }

        const cleaned = s.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      const extractMutations = (list: any[], sourceKey: string) => {
        if (!list || !Array.isArray(list)) return;
        const sKey = sourceKey.toLowerCase();
        
        // Filter for Kolektor: Exclude Pengeluaran and Modal
        const userRole = String(petugas.jabatan || '').toUpperCase();
        const isKolektor = userRole === 'KOLEKTOR';
        
        if (isKolektor && (sKey.includes('pengeluaran') || sKey.includes('modal') || sKey.includes('biaya') || sKey.includes('investasi'))) {
          return;
        }
        
        list.forEach(item => {
          if (!item || typeof item !== 'object') return;
          
          // If it's a combined mutation list, check the item's own source
          if (isKolektor && (sKey.includes('mutasi') || sKey.includes('history'))) {
            const itemSource = String(item.source || '').toLowerCase();
            const itemType = String(item.tipe || item.jenis || '').toLowerCase();
            const itemDesc = String(item.keterangan || item.ket || '').toLowerCase();
            
            if (itemSource.includes('pengeluaran') || itemSource.includes('modal') || 
                itemType.includes('pengeluaran') || itemType.includes('modal') ||
                itemDesc.includes('pengeluaran') || itemDesc.includes('modal')) {
              return;
            }
          }
          
          const itemKeys = Object.keys(item);
          // Helper to find value by partial key match with priority
          const findVal = (patterns: string[]) => {
            // 1. Exact match (normalized)
            const exactKey = itemKeys.find(k => {
              const nk = k.toLowerCase().replace(/[\s_.]/g, '');
              return patterns.some(p => p.toLowerCase().replace(/[\s_.]/g, '') === nk);
            });
            if (exactKey) return item[exactKey];

            // 2. Partial match
            const partialKey = itemKeys.find(k => {
              const nk = k.toLowerCase().replace(/[\s_.]/g, '');
              return patterns.some(p => {
                const np = p.toLowerCase().replace(/[\s_.]/g, '');
                return nk.includes(np) || np.includes(nk);
              });
            });
            return partialKey ? item[partialKey] : undefined;
          };

          // 1. Date Extraction - Very aggressive
          let rawDate = findVal(['tanggal', 'tgl', 'date', 'time', 'waktu', 'timestamp', 'created', 'update', 'input', 'hari', 'tanggal_transaksi', 'tanggal_acc', 'tanggal_cair']);
          if (!rawDate) {
            const dateKey = itemKeys.find(k => {
              const val = String(item[k]);
              return /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(val) || val.includes('202') || val.includes('Feb') || val.includes('Jan');
            });
            if (dateKey) rawDate = item[dateKey];
          }
          
          // Fallback to today if no date found - don't return early!
          if (!rawDate) rawDate = new Date().toISOString();
          
          let itemDate: string;
          try {
            const d = new Date(rawDate);
            itemDate = isNaN(d.getTime()) ? String(rawDate) : d.toISOString();
          } catch { itemDate = String(rawDate); }

          // 2. Amount Extraction - Very aggressive but avoid years
          let amount = cleanNumber(findVal(['jumlah', 'nominal', 'bayar', 'setor', 'tarik', 'pokok', 'total', 'masuk', 'keluar', 'biaya', 'value', 'amount', 'bayaran', 'setoran', 'tagihan', 'piutang', 'saldo', 'nominal_transaksi', 'jumlah_bayar', 'jumlah_pinjaman', 'setoran_modal', 'total_bayar']));
          
          // If amount looks like a year (2020-2030), be suspicious unless it's from a specific amount column
          const isLikelyYear = amount >= 2020 && amount <= 2035;
          
          if (amount === 0 || isLikelyYear) {
            const numKey = itemKeys.find(k => {
              const nk = k.toLowerCase();
              // Ignore keys that are likely IDs, dates, or years
              if (nk.includes('id') || nk.includes('no') || nk.includes('nik') || nk.includes('tenor') || nk.includes('telp') || nk.includes('tgl') || nk.includes('date') || nk.includes('tahun') || nk.includes('year')) return false;
              const val = cleanNumber(item[k]);
              // Transaction amounts are usually > 1000 or specific small values, but definitely not just a year
              return val > 0 && val < 1000000000 && (val < 2020 || val > 2035); 
            });
            if (numKey) amount = cleanNumber(item[numKey]);
          }
          if (amount === 0 && !sKey.includes('mutasi') && !sKey.includes('pengeluaran') && !sKey.includes('pemasukan') && !sKey.includes('modal')) return;

          // 3. Identity Extraction - Prioritize Nasabah ID
          const nasabahId = findVal(['idnasabah', 'nasabahid', 'idmember', 'memberid', 'iduser', 'userid', 'idpelanggan', 'norekening', 'idpinjam', 'penerima', 'penyetor', 'nama_nasabah']);
          const idPinjam = findVal(['id_pinjam', 'id_pinjaman', 'loan_id', 'pinjaman_id', 'id_pinj']);
          const transId = findVal(['id', 'no', 'kode', 'nik', 'ref', 'invoice', 'transaksi']);
          const name = findVal(['nama', 'nasabah', 'member', 'customer', 'user', 'nama_nasabah', 'penerima', 'penyetor']);
          const petugas = findVal(['petugas', 'admin', 'kolektor', 'operator', 'userinput', 'staf']) || "Petugas";
          const foto = findVal(['foto', 'bukti', 'gambar', 'image', 'foto_bukti', 'foto_bayar', 'bukti_cair']);
          
          let keterangan = findVal(['keterangan', 'deskripsi', 'catatan', 'memo', 'info', 'uraian', 'ket', 'keterangan_transaksi', 'jenis_transaksi', 'detail']) || name || nasabahId || transId || 'Transaksi';
          let jenis = String(findVal(['jenis', 'tipe', 'category', 'status']) || '').toLowerCase();

          // 4. Categorization Logic
          const displayName = getDisplayName(nasabahId, name);

          if (sKey.includes('angsuran') || sKey.includes('bayar') || sKey.includes('pay') || jenis.includes('angsuran')) {
            keterangan = `Angsuran: ${displayName}`;
            jenis = 'angsuran';
          } else if ((sKey.includes('simpanan') || jenis.includes('simpanan')) && !sKey.includes('pengajuan')) {
            // STRICT SIMPANAN LOGIC: Use setor and tarik columns
            const setorVal = cleanNumber(findVal(['setor', 'setoran', 'masuk']));
            const tarikVal = cleanNumber(findVal(['tarik', 'tarikan', 'keluar', 'wd']));
            
            if (setorVal > 0) {
              amount = setorVal;
              keterangan = `Simpanan (Setor): ${displayName}`;
              jenis = 'simpanan';
            } else if (tarikVal > 0) {
              amount = tarikVal;
              // UNIFIED NAME for de-duplication with PENGELUARAN
              keterangan = `Pencairan Simpanan: ${displayName}`;
              jenis = 'penarikan';
            } else {
              // Fallback if no specific setor/tarik found but amount exists
              if (keterangan.toLowerCase().includes('tarik') || jenis.includes('tarik')) {
                jenis = 'penarikan';
                keterangan = `Pencairan Simpanan: ${displayName}`;
              } else {
                jenis = 'simpanan';
                keterangan = `Simpanan: ${displayName}`;
              }
            }
          } else if (sKey.includes('pengeluaran') || sKey.includes('expense') || sKey.includes('keluar')) {
            const desc = (String(keterangan) + ' ' + jenis).toLowerCase();
            const isTransport = jenis.includes('transport') || desc.includes('transport');
            const isSavingsWithdrawal = desc.includes('simpanan') && (desc.includes('cair') || desc.includes('tarik') || desc.includes('ambil') || desc.includes('keluar'));
            
            if (isTransport) jenis = 'transport';
            else if (isSavingsWithdrawal) {
              jenis = 'penarikan';
              // UNIFIED NAME for de-duplication with SIMPANAN
              keterangan = `Pencairan Simpanan: ${displayName}`;
            }
            else jenis = 'pengeluaran';
          } else if (sKey.includes('pemasukan') || sKey.includes('income') || sKey.includes('masuk')) {
            jenis = 'pemasukan';
          } else if (sKey.includes('modal')) {
            jenis = 'modal';
          } else if (sKey.includes('jadwal_global') || sKey.includes('pinjaman_aktif') || sKey.includes('penagihan_list') || sKey.includes('loan')) {
            const status = String(findVal(['status', 'state']) || '').toLowerCase();
            if (status === 'aktif' || status === 'lunas' || !status) {
              keterangan = `Pencairan: ${displayName}`;
              jenis = 'pencairan';
            } else return;
          } else if (sKey.includes('pengajuan')) {
            // Skip pengajuan for mutations to avoid duplication with PINJAMAN_AKTIF
            return;
          }

          // 5. Final Synthesis with smarter de-duplication
          // Truncate ISO string to seconds to handle slight differences in sheet timestamps
          const dObj = new Date(itemDate);
          const normalizedDate = isNaN(dObj.getTime()) ? itemDate : dObj.toISOString().split('.')[0]; 
          
          const mutationKey = `${normalizedDate}-${keterangan}-${amount}`;
          
          // Check if a similar mutation already exists (same date-second, same name, same amount)
          const isDuplicate = synthesizedMutations.some(m => {
            const existingD = new Date(m.tanggal);
            const existingNormalized = isNaN(existingD.getTime()) ? m.tanggal : existingD.toISOString().split('.')[0];
            return existingNormalized === normalizedDate && m.keterangan === keterangan && m.jumlah === amount;
          });

          if (!isDuplicate) {
            // Final safety check for Kolektor
            const finalJenis = String(jenis || '').toLowerCase();
            const finalKet = String(keterangan || '').toLowerCase();
            const finalSource = String(sourceKey || '').toLowerCase();

            if (isKolektor && (
              finalJenis.includes('pengeluaran') || finalJenis.includes('modal') || 
              finalKet.includes('pengeluaran') || finalKet.includes('modal') ||
              finalSource.includes('pengeluaran') || finalSource.includes('modal')
            )) {
              return;
            }

            synthesizedMutations.push({
              tanggal: itemDate,
              keterangan: String(keterangan),
              jumlah: amount,
              petugas: String(petugas),
              jenis,
              id_nasabah: String(nasabahId || name || transId),
              id_pinjam: String(idPinjam || ''),
              source: sourceKey,
              foto: String(foto || '')
            } as any);
          }
        });
      };

      // 1. Merge Submissions & Active Loans
      Object.keys(data).forEach(key => {
        const lowerKey = key.toLowerCase();
        const list = data[key];
        if (Array.isArray(list)) {
          if (lowerKey.includes('pengajuan') || lowerKey.includes('submission') || lowerKey.includes('simpanan')) {
            mergeSubmissions(list, key);
          }
        }
      });

      // 2. Extract Mutations - Strictly from authorized sheets as requested
      // The user specified: ANGSURAN, PENGELUARAN, PEMASUKAN, SIMPANAN, MODAL
      // Added pinjaman/loan/pengajuan to authorizedSheets for Kolektor to ensure Pencairan is visible
      const authorizedSheets = userRole === 'ADMIN' 
        ? ['angsuran', 'pengeluaran', 'pemasukan', 'simpanan', 'modal', 'mutasi', 'history', 'record', 'pinjaman', 'loan', 'pengajuan']
        : ['angsuran', 'pemasukan', 'simpanan', 'mutasi', 'history', 'record', 'pinjaman', 'loan', 'pengajuan'];
      
      Object.keys(data).forEach(key => {
        const lowerKey = key.toLowerCase();
        const list = data[key];
        
        if (Array.isArray(list)) {
          // Check if this sheet is one of the authorized ones
          if (authorizedSheets.some(s => lowerKey.includes(s)) || lowerKey === 'mutasi' || lowerKey.includes('mutasi')) {
            extractMutations(list, key);
          }
        }
      });

      setMutations([...synthesizedMutations]);

      // Jika role adalah KOLEKTOR, coba ambil data PENDING dengan request sebagai ADMIN (Penyesuaian Aplikasi)
      if (userRole === 'KOLEKTOR') {
        try {
          const adminRes = await ApiService.getDashboardData('ADMIN', petugasId);
          if (adminRes.success && adminRes.data) {
            Object.keys(adminRes.data).forEach(key => {
              const lowerKey = key.toLowerCase();
              const list = adminRes.data[key];
              
              if (Array.isArray(list)) {
                if (lowerKey.includes('pengajuan') || lowerKey.includes('submission') || lowerKey.includes('simpanan')) {
                  mergeSubmissions(list, key);
                }
                
                // Only extract if authorized
                if (authorizedSheets.some(s => lowerKey.includes(s)) || lowerKey === 'mutasi' || lowerKey.includes('mutasi')) {
                  extractMutations(list, key);
                }
              }
            });
          }
        } catch (e) {
          console.warn("Gagal mengambil data tambahan sebagai admin:", e);
        }
      }
      
      // Sort mutations by date descending
      synthesizedMutations.sort((a, b) => {
        const dateA = new Date(a.tanggal).getTime();
        const dateB = new Date(b.tanggal).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
      });
      
      setMutations([...synthesizedMutations]);
      
      const syncedSubmissions = Array.from(allSubmissionsMap.values());
      
      const newNotifs: any[] = [];
      syncedSubmissions.forEach((sub: PengajuanPinjaman) => {
        const prev = prevSubmissionsRef.current.find(p => String(p.id_pengajuan) === String(sub.id_pengajuan));
        if (!prev) {
          newNotifs.push({
            id: Date.now() + Math.random(),
            text: `✅ Pengajuan '${sub.nama}' telah DISETUJUI oleh Admin. Silahkan lakukan pencairan di menu Ajuan.`,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          });
          setHasNewNotifications(true);
        }
      });

      if (newNotifs.length > 0) {
        setAdminNotifications(prev => [...newNotifs, ...prev]);
      }

      const normalizeRecords = (list: any[]) => {
        if (!list || !Array.isArray(list)) return [];
        return list.map(r => ({
          ...r,
          id_pinjaman: r.id_pinjaman || r.id_pinjam || r.id || r.loan_id || r.pinjaman_id,
          // Mencoba berbagai kemungkinan nama field tanggal dari Google Sheets
          tanggal: r.tanggal || r.tgl_cair || r.tgl || r.tanggal_pinjam || r.date || r.tanggal_acc
        }));
      };

      // Collect all loans from all possible sources to include history
      const allLoanRecords: any[] = [];
      const loanIdSet = new Set<string>();

      const addLoans = (list: any[]) => {
        if (!Array.isArray(list)) return;
        list.forEach(r => {
          const id = String(r.id_pinjaman || r.id || r.id_pinjam || '').trim();
          if (id && !loanIdSet.has(id)) {
            loanIdSet.add(id);
            allLoanRecords.push(r);
          }
        });
      };

      // Check common keys for loans
      if (data.penagihan_list) addLoans(data.penagihan_list);
      if (data.jadwal_global) addLoans(data.jadwal_global);
      if (data.PINJAMAN_AKTIF) addLoans(data.PINJAMAN_AKTIF);
      if (data.pinjaman) addLoans(data.pinjaman);
      
      // Also check all keys for anything that looks like a loan record (has id_nasabah and id_pinjaman)
      Object.keys(data).forEach(key => {
        const list = data[key];
        if (Array.isArray(list) && list.length > 0) {
          const first = list[0];
          if (first && typeof first === 'object' && 
              (first.id_nasabah || first.id_nasabah_list) && 
              (first.id_pinjaman || first.id_pinjam)) {
            addLoans(list);
          }
        }
      });

      const finalRecords = normalizeRecords(allLoanRecords);
      setRecords(finalRecords);
      
      setSubmissions(syncedSubmissions);
      prevSubmissionsRef.current = syncedSubmissions;
      
      if (data.nasabah_list) {
        setFullNasabahList(data.nasabah_list);
        
        // Ambil semua ID nasabah yang punya pinjaman (aktif maupun lunas)
        const loanNasabahIds = new Set(
          finalRecords.map((r: any) => String(r.id_nasabah || "").trim().toLowerCase())
        );
        
        const filteredNasabah = data.nasabah_list.filter((n: any) => {
          const id = String(n.id_nasabah || "").trim().toLowerCase();
          const saldo = parseFloat(String(n.saldo_simpanan || 0));
          const hasSimpanan = saldo > 0;
          const hasLoanHistory = loanNasabahIds.has(id);
          
          // Nasabah muncul jika punya simpanan > 0 ATAU punya riwayat pinjaman
          return hasSimpanan || hasLoanHistory;
        });
        
        setNasabahList(filteredNasabah);
      }
      
      // Simpan mutasi jika ada (untuk Admin)
      if (data.mutasi) {
        (window as any).adminMutasi = data.mutasi;
      }
      if (data.stats) {
        (window as any).adminStats = data.stats;
      }
      if (data.petugas_list) {
        (window as any).petugasList = data.petugas_list;
      }
      
    } catch (e: any) {
      console.error("Failed to load global data:", e);
      if (showFullLoader) {
        setApiError(e?.message || "Gagal terhubung ke server. Pastikan koneksi internet aktif.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, petugas.id_petugas, petugas.jabatan]);

  useEffect(() => {
    // Start loading data immediately on mount
    loadData(isAuthenticated);
    
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadData, isAuthenticated]);

  const handleLogin = (profile: PetugasProfile) => {
    setPetugas(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleRefresh = () => {
    loadData(false);
  };

  const handleAddRecord = async (payload: any) => {
    try {
      const res = await ApiService.bayarAngsuran({
        pakaiSimpanan: false,
        jumlahSimpananDiterapkan: 0,
        ...payload,
        petugas: petugas.nama
      });
      if (res.success) {
        // Kirim data pembayaran angsuran ke n8n webhook via Service
        const activeLoan = records.find(r => r.id_pinjaman === payload.id_pinjam);
        const newSisa = activeLoan ? activeLoan.sisa_hutang - payload.jumlah : 0;
        
        WebhookService.sendAngsuranWebhook({
          id_pinjam: payload.id_pinjam,
          jumlah: payload.jumlah,
          sisa_hutang: newSisa,
          petugas: petugas.nama,
          status: newSisa <= 0 ? "LUNAS" : "ANGSURAN_MASUK"
        });

        const activeNasabah = nasabahList.find(n => n.id_nasabah === payload.id_nasabah);
        
        if (activeLoan && activeNasabah) {
          setLastTransaction({ 
            record: { ...activeLoan, sisa_hutang: activeLoan.sisa_hutang - payload.jumlah }, 
            nasabah: activeNasabah,
            amountPaid: payload.jumlah,
            timestamp: Date.now() 
          });
        }
        
        setView(ViewMode.DASHBOARD);
        setPrefilledName('');
        loadData(false);
      } else {
        alert("Gagal simpan angsuran: " + res.message);
      }
    } catch (e) {
      alert("Gagal sinkronisasi ke server!");
    }
  };

  const handleAddSubmission = async (newSub: any) => {
    try {
      const res = await ApiService.ajukanPinjaman({
        ...newSub,
        petugas: petugas.nama
      });
      if (res.success) {
        loadData(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCairkanPinjaman = async (payload: any) => {
    try {
      const res = await ApiService.cairkanPinjaman({
        ...payload,
        petugas: petugas.nama
      });
      if (res.success) {
        // Cari data pengajuan asli untuk melengkapi data webhook
        const subData = submissions.find(s => s.id_pengajuan === payload.id_pengajuan);
        
        // Hitung cicilan untuk payload webhook
        const amount = subData ? parseInt(String(subData.jumlah)) : 0;
        const bungaPersen = subData ? parseInt(String((subData as any).bunga_persen || "0")) : 0;
        const totalHutang = amount + (amount * bungaPersen / 100);
        const tenor = subData ? (parseInt(String(subData.tenor)) || 1) : 1;
        const cicilan = Math.ceil(totalHutang / tenor);

        // Kirim data pencairan ke n8n webhook via Service
        WebhookService.sendPencairanWebhook({
          nama: subData?.nama || "Unknown",
          jumlah_pinjam: amount,
          tenor: tenor,
          cicilan: cicilan,
          petugas: petugas.nama,
          status: "CAIR"
        });
        
        loadData(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async (profile: PetugasProfile) => {
    try {
      const res = await ApiService.updateProfilePhoto(
        profile.jabatan,
        profile.id_petugas,
        profile.foto || ''
      );
      if (res.success) {
        setPetugas(profile);
      } else {
        alert("Gagal update foto profil: " + res.message);
      }
    } catch (e) {
      console.error("Error updating profile photo:", e);
      alert("Gagal terhubung ke server untuk update profil.");
    }
  };

  const handleSelectNasabah = (nasabahId: string, loanId?: string) => {
    setSelectedNasabahId(nasabahId);
    setSelectedLoanId(loanId || null);
    setView(ViewMode.INSTALLMENT_CARD);
  };

  const handleGoToForm = (name: string = '') => {
    setPrefilledName(name);
    setView(ViewMode.FORM);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} currentTheme={currentTheme} />;
  }

  if (apiError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-lg font-black uppercase tracking-widest mb-2">Koneksi Gagal</h2>
        <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed mb-8 max-w-[240px]">
          {apiError.includes('fetch') ? 'Gagal mengambil data dari Google Sheets. Periksa URL API atau koneksi internet Anda.' : apiError}
        </p>
        <button 
          onClick={() => loadData(true)}
          className="px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
        >
          Coba Lagi
        </button>
        <button 
          onClick={handleLogout}
          className="mt-4 text-[9px] font-black text-white/20 uppercase tracking-widest hover:text-white/40 transition-colors"
        >
          Keluar Sesi
        </button>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col max-w-md mx-auto ${activeTheme.bg} ${currentTheme === 'light' ? 'text-slate-900' : 'text-white'} shadow-2xl relative border-x ${currentTheme === 'light' ? 'border-slate-200' : 'border-white/10'} overflow-hidden`}>
      {/* Background Decorations like Login */}
      <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${activeTheme.gradient} z-0 pointer-events-none`}></div>
      <div className={`absolute -top-24 -left-24 w-96 h-96 ${activeTheme.glow1} blur-[120px] rounded-full pointer-events-none`}></div>
      <div className={`absolute -bottom-24 -right-24 w-96 h-96 ${activeTheme.glow2} blur-[120px] rounded-full pointer-events-none`}></div>

      <Header 
        setView={setView} 
        currentView={view} 
        hasNewNotifications={hasNewNotifications} 
        adminNotifications={adminNotifications}
        onViewNotifications={() => setHasNewNotifications(false)} 
        onProfileClick={() => setShowProfileSettings(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        petugas={petugas}
        accentColor={activeTheme.navIcon}
        currentTheme={currentTheme}
      />
      
      <main className="flex-1 overflow-y-auto pb-28 relative scroll-smooth z-10">
        <AnimatePresence mode="wait">
          {view === ViewMode.MAP ? (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 top-16 bottom-20 z-0 bg-slate-900">
              <CollectionMap 
                records={records} 
                submissions={submissions} 
                nasabahList={nasabahList} 
              />
            </motion.div>
          ) : (
            <div className="p-4">
              {view === ViewMode.DASHBOARD && (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Dashboard 
                    records={records} 
                    nasabahList={nasabahList}
                    mutations={mutations}
                    setView={setView} 
                    onSelectTarget={handleGoToForm} 
                    collector={petugas} 
                    accentColor={activeTheme.navIcon}
                    currentTheme={currentTheme}
                  />
                </motion.div>
              )}
              
              {view === ViewMode.FORM && (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CollectionForm 
                    records={records}
                    nasabahList={nasabahList}
                    prefillName={prefilledName}
                    onSubmit={handleAddRecord} 
                    onCancel={() => {
                      setView(ViewMode.DASHBOARD);
                      setPrefilledName('');
                    }} 
                    currentTheme={currentTheme}
                  />
                </motion.div>
              )}
              
              {view === ViewMode.HISTORY && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <HistoryList records={records} currentTheme={currentTheme} />
                </motion.div>
              )}

              {view === ViewMode.SUBMISSION && (
                <motion.div key="submission" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SubmissionMenu 
                    submissions={submissions} 
                    nasabahList={fullNasabahList}
                    records={records}
                    petugas={petugas}
                    onAddSubmission={handleAddSubmission} 
                    onCairkan={handleCairkanPinjaman}
                    currentTheme={currentTheme}
                  />
                </motion.div>
              )}

              {view === ViewMode.CUSTOMER_LIST && (
                <motion.div key="customer-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CustomerList 
                    records={records} 
                    nasabahList={nasabahList}
                    onSelectCustomer={handleSelectNasabah} 
                    currentTheme={currentTheme}
                  />
                </motion.div>
              )}

              {view === ViewMode.INSTALLMENT_CARD && selectedNasabahId && (
                <motion.div key="installment-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <InstallmentCard 
                    nasabahId={selectedNasabahId} 
                    loanId={selectedLoanId || undefined}
                    nasabahList={nasabahList}
                    records={records.filter(r => r.id_nasabah === selectedNasabahId)} 
                    mutations={mutations.filter(m => {
                      const n = nasabahList.find(nas => nas.id_nasabah === selectedNasabahId);
                      const searchId = String(selectedNasabahId).toLowerCase();
                      const searchLoanId = selectedLoanId ? String(selectedLoanId).toLowerCase() : null;
                      const searchName = n?.nama?.toLowerCase() || "";
                      const desc = String(m.keterangan || "").toLowerCase();
                      const itemNasabahId = String(m.id_nasabah || "").toLowerCase();
                      const itemLoanId = String(m.id_pinjam || "").toLowerCase();
                      
                      // If specific loan selected, try to match it first
                      if (searchLoanId && itemLoanId === searchLoanId) return true;
                      
                      // If we have a loan ID but it doesn't match, and the mutation has a DIFFERENT loan ID, skip it
                      if (searchLoanId && itemLoanId && itemLoanId !== searchLoanId) return false;

                      // Extremely aggressive and fuzzy matching for general nasabah history
                      const idMatch = itemNasabahId && (itemNasabahId === searchId || itemNasabahId.includes(searchId) || searchId.includes(itemNasabahId));
                      const idInDesc = searchId && desc.includes(searchId);
                      const nameInDesc = searchName && desc.includes(searchName);
                      
                      // Fuzzy name matching: check if any significant word from the name is in the description
                      const nameWords = searchName.split(' ').filter(w => w.length >= 3);
                      const fuzzyNameMatch = nameWords.some(word => desc.includes(word));
                      
                      return idMatch || idInDesc || nameInDesc || fuzzyNameMatch;
                    })}
                    onBack={() => setView(ViewMode.CUSTOMER_LIST)} 
                    currentTheme={currentTheme}
                  />
                </motion.div>
              )}

              {view === ViewMode.MUTATION && (
                <motion.div key="mutation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <MutationList 
                    mutations={mutations}
                    nasabahList={nasabahList}
                    records={records}
                    onBack={() => setView(ViewMode.DASHBOARD)} 
                    currentTheme={currentTheme}
                  />
                </motion.div>
              )}

              {view === ViewMode.SAVINGS_WITHDRAWAL && (
                <motion.div key="savings-withdrawal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SavingsWithdrawal 
                    nasabahList={nasabahList}
                    collector={petugas}
                    onBack={() => setView(ViewMode.DASHBOARD)}
                    onSuccess={() => {
                      setView(ViewMode.DASHBOARD);
                      loadData(false);
                    }}
                    currentTheme={currentTheme}
                  />
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      <nav className={`fixed bottom-6 left-4 right-4 max-w-[calc(448px-2rem)] mx-auto ${currentTheme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-white/10'} backdrop-blur-3xl border flex justify-around items-center h-18 z-[1001] rounded-[2.5rem] shadow-2xl ${currentTheme === 'light' ? 'shadow-slate-200/50' : 'shadow-black/50'}`}>
        <button onClick={() => setView(ViewMode.DASHBOARD)} className={`flex flex-col items-center justify-center w-full h-full transition-all ${view === ViewMode.DASHBOARD ? activeTheme.navIcon : (currentTheme === 'light' ? 'text-slate-400' : 'text-white/40')}`}>
          <Home size={18} />
          <span className="text-[8px] mt-1 font-bold uppercase tracking-wider">Home</span>
        </button>
        <button onClick={() => setView(ViewMode.SUBMISSION)} className={`flex flex-col items-center justify-center w-full h-full transition-all ${view === ViewMode.SUBMISSION ? activeTheme.navIcon : (currentTheme === 'light' ? 'text-slate-400' : 'text-white/40')}`}>
          <FileSignature size={18} />
          <span className="text-[8px] mt-1 font-bold uppercase tracking-wider">Ajuan</span>
        </button>
        <button onClick={() => handleGoToForm()} className="flex flex-col items-center justify-center w-full h-full">
          <motion.div 
            whileTap={{ scale: 0.9 }}
            className={`bg-gradient-to-br ${activeTheme.button} text-white w-14 h-14 rounded-full flex items-center justify-center -mt-12 shadow-xl ${activeTheme.shadow} border-4 ${currentTheme === 'light' ? 'border-slate-50' : 'border-slate-950'}`}
          >
            <Camera size={24} />
          </motion.div>
          <span className={`text-[8px] mt-1 font-bold uppercase tracking-wider ${view === ViewMode.FORM ? activeTheme.navIcon : (currentTheme === 'light' ? 'text-slate-400' : 'text-white/40')}`}>Input</span>
        </button>
        <button onClick={() => setView(ViewMode.CUSTOMER_LIST)} className={`flex flex-col items-center justify-center w-full h-full transition-all ${view === ViewMode.CUSTOMER_LIST || view === ViewMode.INSTALLMENT_CARD ? activeTheme.navIcon : (currentTheme === 'light' ? 'text-slate-400' : 'text-white/40')}`}>
          <Users size={18} />
          <span className="text-[8px] mt-1 font-bold uppercase tracking-wider">Nasabah</span>
        </button>
        <button onClick={() => setView(ViewMode.MAP)} className={`flex flex-col items-center justify-center w-full h-full transition-all ${view === ViewMode.MAP ? activeTheme.navIcon : (currentTheme === 'light' ? 'text-slate-400' : 'text-white/40')}`}>
          <MapIcon size={18} />
          <span className="text-[8px] mt-1 font-bold uppercase tracking-wider">Peta</span>
        </button>
      </nav>

      <AnimatePresence>
        {lastTransaction && (
          <ReceiptPopup 
            record={lastTransaction.record} 
            nasabah={lastTransaction.nasabah}
            amountPaid={lastTransaction.amountPaid}
            onClose={() => setLastTransaction(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileSettings && (
          <ProfileSettings 
            petugas={petugas} 
            onSave={handleSaveProfile} 
            onLogout={handleLogout}
            onClose={() => setShowProfileSettings(false)} 
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            accentColor={activeTheme.navIcon}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
