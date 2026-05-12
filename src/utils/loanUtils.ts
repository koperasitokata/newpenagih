
/**
 * Parsing tanggal dengan aman, mengutamakan ekstraksi komponen tanggal (Y, M, D)
 * untuk menghindari pergeseran hari akibat zona waktu/jam.
 */
export const parseSafeDate = (dateStr: string | Date): Date => {
  if (!dateStr) return new Date();
  
  let s = "";
  if (dateStr instanceof Date) {
    // Jika input berupa objek Date, kita konversi ke ISO string 
    // agar bisa diekstrak komponen tanggalnya secara murni (mengatasi pergeseran zona waktu)
    s = dateStr.toISOString();
  } else {
    s = String(dateStr).trim();
  }
  
  // 1. Coba format ISO/Database: yyyy-mm-dd... (paling sering dari JSON)
  // Kita ambil 10 karakter pertama (yyyy-mm-dd) untuk menghindari gangguan jam/timezone
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    return new Date(year, month, day);
  }

  // 2. Coba format Indonesia/Umum: dd/mm/yyyy...
  const idMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (idMatch) {
    const day = parseInt(idMatch[1]);
    const month = parseInt(idMatch[2]) - 1;
    const year = parseInt(idMatch[3]);
    return new Date(year, month, day);
  }
  
  // 3. Fallback ke parsing standar tapi tetap paksa ke jam 0 lokal
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }
  
  // 4. Jika semua gagal, gunakan hari ini (jam 0)
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

/**
 * Mendapatkan hari kerja berikutnya (menghindari Sabtu dan Minggu)
 */
export const getNextWorkingDay = (date: Date): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  
  // 0 = Minggu, 6 = Sabtu
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

/**
 * Menghasilkan daftar tanggal jatuh tempo berdasarkan tanggal cair dan tenor
 */
export const generateLoanSchedule = (disbursementDate: string | Date, tenor: number) => {
  const schedule: Date[] = [];
  
  // Gunakan parseSafeDate untuk memastikan tanggal diparsing dengan benar dari format apapun
  let current = parseSafeDate(disbursementDate);
  
  // Penagihan dimulai 1 hari kerja setelah pencairan
  current = getNextWorkingDay(current);

  // Menentukan interval hari berdasarkan tenor:
  // - Tenor 4: Interval 5 hari kerja (Mingguan)
  // - Tenor 20/24: Interval 1 hari kerja (Harian)
  // - Tenor lainnya: Disesuaikan agar masuk dalam siklus 20 hari kerja
  let interval = 1;
  if (tenor === 4) {
    interval = 5;
  } else if (tenor >= 20) {
    interval = 1;
  } else {
    interval = Math.max(1, Math.floor(20 / tenor));
  }

  for (let i = 1; i <= tenor; i++) {
    schedule.push(new Date(current));
    
    // Lompat ke hari penagihan berikutnya berdasarkan interval hari kerja
    for (let j = 0; j < interval; j++) {
      current = getNextWorkingDay(current);
    }
  }
  
  return schedule;
};
