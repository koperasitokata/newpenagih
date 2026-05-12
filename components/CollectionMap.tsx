
import React, { useEffect, useRef, useState } from 'react';
import { PinjamanAktif, GeoLocation, PengajuanPinjaman, Nasabah } from '../types';
import L from 'leaflet';
import { Crosshair, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLoanSchedule } from '../src/utils/loanUtils';

interface CollectionMapProps {
  records: PinjamanAktif[];
  submissions: PengajuanPinjaman[];
  nasabahList: Nasabah[];
}

const CollectionMap: React.FC<CollectionMapProps> = ({ records, submissions, nasabahList = [] }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const collectorLayerRef = useRef<any>(null);
  const [collectorLoc, setCollectorLoc] = useState<GeoLocation | null>(null);
  const [showUI, setShowUI] = useState(true);
  const [zoom, setZoom] = useState(16);
  
  const hasCenteredOnCollectorRef = useRef(false);
  
  // GPS Watcher
  useEffect(() => {
    // Ambil posisi awal secepat mungkin
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        setCollectorLoc(loc);
        if (mapInstanceRef.current && !hasCenteredOnCollectorRef.current) {
          mapInstanceRef.current.setView([loc.latitude, loc.longitude], 17);
          hasCenteredOnCollectorRef.current = true;
        }
      },
      (err) => console.error("Initial GPS Error:", err),
      { enableHighAccuracy: true }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        setCollectorLoc(loc);
        
        // Langsung tampilkan pada titik lokasi kolektor saat pertama kali buka
        if (!hasCenteredOnCollectorRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.setView([loc.latitude, loc.longitude], 17);
          hasCenteredOnCollectorRef.current = true;
        }
      },
      (err) => console.error("GPS Watch Error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const centerOnMe = () => {
    if (collectorLoc && mapInstanceRef.current) {
      mapInstanceRef.current.setView([collectorLoc.latitude, collectorLoc.longitude], 17, { animate: true });
    } else {
      alert("Mencari sinyal GPS...");
    }
  };

  // Init Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Gunakan lokasi kolektor jika sudah ada, jika tidak gunakan fallback sementara
    const initialCenter: [number, number] = collectorLoc 
      ? [collectorLoc.latitude, collectorLoc.longitude] 
      : [-2.5489, 118.0149]; // Koordinat tengah Indonesia (Sulawesi area-ish) sebagai ganti Jakarta

    const map = L.map(mapContainerRef.current, { 
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true
    }).setView(initialCenter, collectorLoc ? 17 : 5);

    if (collectorLoc) {
      hasCenteredOnCollectorRef.current = true;
    }

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    map.on('zoomend', () => {
      if (mapInstanceRef.current) setZoom(map.getZoom());
    });

    collectorLayerRef.current = L.layerGroup().addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Force a resize check to prevent gray areas or initialization errors
    setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 100);

    // DEFINISI CSS MARKER SESUAI STATUS
    const style = document.createElement('style');
    style.id = 'tokata-minimal-map-theme';
    style.innerHTML = `
      .target-marker {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: transform 0.2s ease;
      }
      .marker-core {
        width: 28px;
        height: 28px;
        background: #9ca3af;
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 5;
      }
      /* Kriteria Mark Baru */
      .status-gray .marker-core { background: #9ca3af !important; width: 20px; height: 20px; } /* Lunas Total */
      .status-green .marker-core { background: #10b981 !important; width: 24px; height: 24px; } /* Aman (Diluar Jadwal) */
      .status-pulse-green .marker-core { background: #10b981 !important; width: 30px; height: 30px; } /* Jadwal Hari Ini */
      .status-orange .marker-core { background: #f97316 !important; width: 32px; height: 32px; } /* Jadwal Hari Ini & Bayar Sebagian */
      .status-red .marker-core { background: #ef4444 !important; width: 34px; height: 34px; } /* Menunggak */
      
      .collector-marker .marker-core { background: #0070f3; width: 20px; height: 20px; }
      .collector-pulse { position: absolute; width: 60px; height: 60px; background: rgba(0, 112, 243, 0.2); border-radius: 50%; animation: collectorPulse 1.5s infinite; }
      
      /* Animasi Berdenyut Hijau */
      .pulse-green { 
        position: absolute; 
        width: 70px; 
        height: 70px; 
        border: 4px solid rgba(16, 185, 129, 0.4); 
        border-radius: 50%; 
        animation: mapPulseGreen 2s infinite; 
      }
      
      /* Animasi Berdenyut Orange */
      .pulse-orange { 
        position: absolute; 
        width: 80px; 
        height: 80px; 
        border: 4px solid rgba(249, 115, 22, 0.4); 
        border-radius: 50%; 
        animation: mapPulseOrange 2s infinite; 
      }

      /* Animasi Berdenyut Merah */
      .pulse-red { 
        position: absolute; 
        width: 90px; 
        height: 90px; 
        border: 4px solid rgba(239, 68, 68, 0.4); 
        border-radius: 50%; 
        animation: mapPulseRed 2s infinite; 
      }

      .custom-popup .leaflet-popup-content-wrapper { background: rgba(0, 0, 0, 0.8) !important; color: white !important; border-radius: 16px !important; }
      
      @keyframes mapPulseGreen { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
      @keyframes mapPulseOrange { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
      @keyframes mapPulseRed { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
      @keyframes collectorPulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
    `;
    document.head.appendChild(style);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      const s = document.getElementById('tokata-minimal-map-theme');
      if (s) s.remove();
    };
  }, []);

  // Update Collector Marker & Center if needed
  useEffect(() => {
    if (!mapInstanceRef.current || !collectorLayerRef.current || !collectorLoc) return;
    
    collectorLayerRef.current.clearLayers();
    const icon = L.divIcon({
      className: 'collector-icon',
      html: `<div class="target-marker collector-marker"><div class="collector-pulse"></div><div class="marker-core"></div></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    L.marker([collectorLoc.latitude, collectorLoc.longitude], { icon, zIndexOffset: 1000 }).addTo(collectorLayerRef.current);

    if (!hasCenteredOnCollectorRef.current) {
      mapInstanceRef.current.setView([collectorLoc.latitude, collectorLoc.longitude], 17);
      hasCenteredOnCollectorRef.current = true;
    }
  }, [collectorLoc]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    const zScale = zoom < 15 ? 0.6 : zoom < 17 ? 0.8 : 1;
    const iSize = 60;
    const today = new Date();
    today.setHours(0,0,0,0);

    nasabahList.forEach((nasabah) => {
      if (!nasabah.latitude || !nasabah.longitude) return;

      const activeLoan = records.find(r => r.id_nasabah === nasabah.id_nasabah && r.status === 'Aktif');
      
      let statusClass = 'status-gray';
      let statusColor = '#9ca3af';
      let statusLabel = 'LUNAS TOTAL';
      let hasPulse = false;
      let pulseClass = '';

      if (activeLoan) {
        const schedule = generateLoanSchedule(activeLoan.tanggal, activeLoan.tenor);
        
        // Cek apakah ada jadwal hari ini
        const isToday = schedule.some(date => {
          const d = new Date(date);
          d.setHours(0,0,0,0);
          return d.getTime() === today.getTime();
        });

        // Cek apakah menunggak (logika sama dengan Dashboard)
        const pastScheduleCount = schedule.filter(date => {
          const d = new Date(date);
          d.setHours(0,0,0,0);
          return d.getTime() < today.getTime();
        }).length;

        const totalContractValue = activeLoan.pokok * (1 + (activeLoan.bunga_persen / 100));
        const totalPaid = totalContractValue - activeLoan.sisa_hutang;
        const expectedPaid = activeLoan.cicilan * pastScheduleCount;
        const expectedIncludingToday = activeLoan.cicilan * (pastScheduleCount + 1);
        
        const isOverdue = totalPaid < expectedPaid;
        const isStillOwedToday = totalPaid < expectedIncludingToday;
        const hasPartialPaymentToday = totalPaid > expectedPaid && isStillOwedToday;

        if (isOverdue) {
          statusClass = 'status-red';
          statusColor = '#ef4444';
          statusLabel = 'MENUNGGAK';
          hasPulse = true;
          pulseClass = 'pulse-red';
        } else if (isToday) {
          if (hasPartialPaymentToday) {
            statusClass = 'status-orange';
            statusColor = '#f97316';
            statusLabel = 'TAGIHAN (BAYAR SEBAGIAN)';
            hasPulse = true;
            pulseClass = 'pulse-orange';
          } else if (isStillOwedToday) {
            statusClass = 'status-pulse-green';
            statusColor = '#10b981';
            statusLabel = 'JADWAL HARI INI';
            hasPulse = true;
            pulseClass = 'pulse-green';
          } else {
            statusClass = 'status-pulse-green';
            statusColor = '#10b981';
            statusLabel = 'JADWAL HARI INI (LUNAS)';
            hasPulse = true;
            pulseClass = 'pulse-green';
          }
        } else {
          statusClass = 'status-green';
          statusColor = '#10b981';
          statusLabel = 'AMAN (DILUAR JADWAL)';
        }
      }

      const icon = L.divIcon({
        className: 'custom-icon',
        html: `
          <div class="target-marker ${statusClass}" style="transform: scale(${zScale})">
            ${hasPulse ? `<div class="${pulseClass}"></div>` : ''}
            <div class="marker-core"></div>
          </div>
        `,
        iconSize: [iSize, iSize],
        iconAnchor: [iSize/2, iSize/2]
      });

      const popupHtml = `
        <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 11px; font-weight: 900; color: white; text-transform: uppercase;">${nasabah.nama}</div>
          <div style="font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.4);">${statusLabel}</div>
          ${activeLoan ? `<div style="font-size: 10px; font-weight: 900; color: ${statusColor};">Sisa: Rp ${activeLoan.sisa_hutang.toLocaleString()}</div>` : ''}
        </div>
      `;

      L.marker([nasabah.latitude, nasabah.longitude], { icon })
        .addTo(layerGroupRef.current)
        .bindPopup(popupHtml, { className: 'custom-popup', closeOnClick: false, autoClose: false, offset: [0, -10] });
    });
  }, [records, nasabahList, zoom]);

  return (
    <div className="absolute inset-0 z-0 bg-slate-900 overflow-hidden">
      <div className="h-full w-full relative" ref={mapContainerRef}></div>
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3 items-end">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={centerOnMe} 
          className="w-12 h-12 rounded-2xl bg-white text-blue-600 shadow-2xl flex items-center justify-center border-2 border-blue-100"
        >
          <Crosshair size={24} />
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowUI(!showUI)} 
          className="w-12 h-12 rounded-2xl bg-slate-900/90 backdrop-blur-md text-white shadow-xl flex items-center justify-center border-2 border-white/20"
        >
          {showUI ? <EyeOff size={20} /> : <Eye size={20} />}
        </motion.button>
        <AnimatePresence>
          {showUI && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/95 backdrop-blur-md px-4 py-3 flex flex-col gap-3 border border-black/10 shadow-2xl rounded-2xl"
            >
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#0070f3]"></div><span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Posisi Saya</span></div>
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#ef4444] animate-pulse"></div><span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Menunggak</span></div>
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#f97316] animate-pulse"></div><span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Bayar Sebagian</span></div>
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#10b981] animate-pulse"></div><span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Jadwal Hari Ini</span></div>
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Aman (Luar Jadwal)</span></div>
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#9ca3af]"></div><span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Lunas Total</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CollectionMap;
