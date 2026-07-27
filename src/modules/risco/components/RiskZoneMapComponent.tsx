import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RiskZone } from '../../../types';
import { 
  MapPin, 
  Layers, 
  Locate, 
  Maximize2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Compass,
  Navigation
} from 'lucide-react';

interface RiskZoneMapComponentProps {
  riskZones: RiskZone[];
  vehicleLat: number;
  vehicleLng: number;
  radarMode: 'REAL' | 'SIMULATOR';
  currentAlertZone: string | null;
  onSelectZone?: (zone: RiskZone) => void;
  onStartEditZone?: (zone: RiskZone) => void;
}

type TileLayerType = 'dark' | 'streets' | 'satellite';

const TILE_SERVERS: Record<TileLayerType, { url: string; attribution: string; maxZoom: number }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }
};

// Haversine formula helper
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function RiskZoneMapComponent({
  riskZones,
  vehicleLat,
  vehicleLng,
  radarMode,
  currentAlertZone,
  onSelectZone,
  onStartEditZone
}: RiskZoneMapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const circlesGroupRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const [activeTile, setActiveTile] = useState<TileLayerType>('dark');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);

  // Filter valid zones with valid numeric coordinates
  const validZones = riskZones.filter(
    (z) =>
      typeof z.latitude === 'number' &&
      typeof z.longitude === 'number' &&
      !isNaN(z.latitude) &&
      !isNaN(z.longitude) &&
      (z.latitude !== 0 || z.longitude !== 0)
  );

  const highRiskCount = validZones.filter((z) => z.nivelRisco === 'ALTO' && z.ativo).length;
  const activeCount = validZones.filter((z) => z.ativo).length;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Only init once

    const initialLat = validZones.length > 0 ? validZones[0].latitude : vehicleLat || -22.89676;
    const initialLng = validZones.length > 0 ? validZones[0].longitude : vehicleLng || -47.02577;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    const tileCfg = TILE_SERVERS[activeTile];
    const tileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add Attribution Control bottom-right quietly
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // Custom Zoom controls
    L.control.zoom({ position: 'topright' }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);
    circlesGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Force size recalculation after render
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Tile Server Change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileCfg = TILE_SERVERS[activeTile];
    const newTileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeTile]);

  // Update Markers and Perimeter Circles whenever riskZones change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !circlesGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    circlesGroupRef.current.clearLayers();

    validZones.forEach((zone) => {
      const isHighRisk = zone.nivelRisco === 'ALTO';
      const isMediumRisk = zone.nivelRisco === 'MEDIO';
      const isAlerting = currentAlertZone === zone.nomeLocal;

      const mainColor = isHighRisk ? '#ef4444' : isMediumRisk ? '#f59e0b' : '#10b981';
      const pulseClass = isHighRisk
        ? 'animate-pulse'
        : isMediumRisk
        ? 'animate-pulse'
        : '';

      // Create Custom HTML Marker Icon
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            zone.ativo
              ? `<div class="absolute -inset-2.5 rounded-full ${pulseClass}" style="background-color: ${mainColor}25; border: 1px solid ${mainColor}50;"></div>`
              : ''
          }
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2" style="background-color: #020617; border-color: ${
            zone.ativo ? mainColor : '#64748b'
          }; color: ${zone.ativo ? mainColor : '#64748b'};">
            <span class="text-xs font-bold font-mono">${
              isHighRisk ? '⚠️' : isMediumRisk ? '⚡' : '🛡️'
            }</span>
          </div>
          <div class="absolute top-9 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-slate-800 text-slate-100 text-[9px] font-bold font-mono px-2 py-0.5 rounded shadow-md whitespace-nowrap pointer-events-none">
            ${zone.nomeLocal} ${zone.ativo ? '' : '(MUTADO)'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-risk-zone-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([zone.latitude, zone.longitude], { icon: customIcon });

      // Calculate distance to current vehicle/user position
      const dist = calculateDistanceMeters(vehicleLat, vehicleLng, zone.latitude, zone.longitude);
      const distFormatted =
        dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} metros`;

      // Custom popup content
      const popupContent = `
        <div style="font-family: inherit; color: #f8fafc; background: #0f172a; padding: 12px; border-radius: 12px; min-width: 200px; border: 1px solid #334155;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; font-family: monospace; padding: 2px 6px; border-radius: 4px; background: ${mainColor}20; color: ${mainColor}; border: 1px solid ${mainColor}40;">
              ${zone.nivelRisco} RISCO
            </span>
            <span style="font-size: 10px; font-weight: 700; color: ${zone.ativo ? '#10b981' : '#94a3b8'}; font-family: monospace;">
              ${zone.ativo ? '● ATIVO' : '○ MUTADO'}
            </span>
          </div>
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #ffffff; text-transform: uppercase;">
            ${zone.nomeLocal}
          </h4>
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #94a3b8; font-family: monospace;">
            📍 ${zone.latitude.toFixed(5)}, ${zone.longitude.toFixed(5)}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #38bdf8; font-family: monospace; font-weight: 700;">
            📏 Raio: ${zone.raioMetros} metros
          </p>
          <p style="margin: 0 0 8px 0; font-size: 10px; color: #34d399; font-family: monospace; font-weight: 700;">
            🧭 Distância: ${distFormatted}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'risk-zone-leaflet-popup'
      });

      marker.on('click', () => {
        setSelectedZone(zone);
        if (onSelectZone) onSelectZone(zone);
      });

      markersGroupRef.current.addLayer(marker);

      // Add Perimeter Circle Overlay
      if (zone.raioMetros && zone.raioMetros > 0 && zone.ativo) {
        const circle = L.circle([zone.latitude, zone.longitude], {
          radius: zone.raioMetros,
          color: mainColor,
          fillColor: mainColor,
          fillOpacity: isHighRisk ? 0.18 : 0.1,
          weight: isHighRisk ? 2 : 1,
          dashArray: isHighRisk ? undefined : '4, 4'
        });

        circlesGroupRef.current.addLayer(circle);
      }
    });
  }, [validZones, currentAlertZone, vehicleLat, vehicleLng]);

  // Update Vehicle/User Location Marker on Map
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([vehicleLat, vehicleLng]);
    } else {
      const vehicleHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-3 bg-emerald-400/30 rounded-full animate-ping"></div>
          <div class="w-7 h-7 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/50">
            <span class="text-slate-950 font-extrabold text-[10px]">📍</span>
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        html: vehicleHtml,
        className: 'vehicle-location-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([vehicleLat, vehicleLng], { icon: vehicleIcon, zIndexOffset: 1000 });
      marker.bindTooltip(
        radarMode === 'REAL' ? '📍 Meu GPS em Tempo Real' : '✈️ Veículo em Rota Simulada',
        { permanent: false, direction: 'top', className: 'vehicle-tooltip' }
      );

      marker.addTo(map);
      vehicleMarkerRef.current = marker;
    }
  }, [vehicleLat, vehicleLng, radarMode]);

  // Fit All Markers in Viewport
  const handleFitAllMarkers = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const points: [number, number][] = validZones.map((z) => [z.latitude, z.longitude]);
    points.push([vehicleLat, vehicleLng]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  };

  // Center on Vehicle / User GPS
  const handleCenterOnVehicle = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([vehicleLat, vehicleLng], 15, { animate: true });
  };

  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0 transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 bg-slate-950 flex flex-col' : 'relative'
      }`}
      id="risk-zone-map-wrapper"
    >
      {/* Map Header Controls Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
              Mapa Interativo de Zonas de Risco
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                {validZones.length} Mapeadas
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Visualização de perímetros de segurança, raios e alertas de proximidade.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tile Layer Selector */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTile('dark')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTile === 'dark'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mapa Escuro (CartoDB Dark)"
            >
              Escuro
            </button>
            <button
              type="button"
              onClick={() => setActiveTile('streets')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTile === 'streets'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mapa de Ruas (OpenStreetMap)"
            >
              Ruas
            </button>
            <button
              type="button"
              onClick={() => setActiveTile('satellite')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTile === 'satellite'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visão de Satélite (Esri)"
            >
              Satélite
            </button>
          </div>

          {/* Fit All Button */}
          <button
            type="button"
            onClick={handleFitAllMarkers}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            title="Enquadrar todas as zonas e marcador GPS no mapa"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Enquadrar</span>
          </button>

          {/* Center GPS Button */}
          <button
            type="button"
            onClick={handleCenterOnVehicle}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            title="Centralizar na posição do GPS"
          >
            <Locate className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Meu GPS</span>
          </button>

          {/* Toggle Fullscreen */}
          <button
            type="button"
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => {
                if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
              }, 200);
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 rounded-xl transition-all cursor-pointer"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Expandir Mapa'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1 min-h-0' : 'h-[380px] sm:h-[450px]'}`}>
        {validZones.length === 0 && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Nenhuma Coordenada Cadastrada
            </h4>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Para visualizar os marcadores no mapa, cadastre áreas de risco informando as coordenadas de Latitude e Longitude ou utilize o botão "GPS Atual" no formulário de cadastro.
            </p>
          </div>
        )}

        {/* Leaflet Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

        {/* Floating Quick Legend Badge */}
        <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 border border-slate-800/90 backdrop-blur p-2.5 rounded-xl shadow-lg flex flex-wrap items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white" />
            <span>Alto Risco ({highRiskCount})</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
            <span>Médio / Baixo Risco</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950" />
            <span>GPS Ativo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
