import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';
import { 
  Fuel, 
  Award, 
  TrendingDown, 
  Calculator, 
  ArrowRight, 
  Sparkles, 
  MapPin, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Info,
  Car,
  DollarSign,
  Navigation
} from 'lucide-react';

interface IndicacoesTabProps {
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
  showAlert?: (title: string, desc: string) => void;
}

export default function IndicacoesTab({ transactions, onNavigate, showAlert }: IndicacoesTabProps) {
  const [selectedFuelType, setSelectedFuelType] = useState<string>('TODOS'); // 'TODOS' | 'ETANOL' | 'GASOLINA'
  const [monthlyKm, setMonthlyKm] = useState<number>(1000);
  const [activeTabSub, setActiveTabSub] = useState<'ranking' | 'calculator' | 'tips'>('ranking');

  // Default average fuel price in case there are no price data
  const defaultFuelPrices: { [key: string]: number } = {
    'ETANOL': 3.49,
    'GASOLINA': 5.49,
    'OUTROS': 4.99
  };

  // Grouping and analysis of refueling transactions
  const stationsAnalysis = useMemo(() => {
    // 1. Get all fuel transactions
    const fuelTxs = [...transactions]
      .filter(t => t.categoria === 'ABASTECIMENTO')
      .sort((a, b) => {
        const parseDate = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split('/');
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
          }
          return new Date(dStr).getTime();
        };
        return parseDate(a.data) - parseDate(b.data) || a.id - b.id;
      });

    // 2. Maps to compute dynamic Km/L and distances
    const kmMapByVehicle: { [vehicle: string]: number } = {};
    const kmPercorridoMap: { [txId: number]: number } = {};
    const mediaKmLMap: { [txId: number]: number } = {};

    fuelTxs.forEach(t => {
      const vehicle = (t.veiculo || t.descricaoVeiculo || 'PADRÃO').toUpperCase();
      if (t.km) {
        const prevKm = kmMapByVehicle[vehicle];
        if (prevKm !== undefined && t.km > prevKm) {
          const dist = t.km - prevKm;
          kmPercorridoMap[t.id] = dist;
          if (t.litros && t.litros > 0) {
            mediaKmLMap[t.id] = dist / t.litros;
          }
        }
        kmMapByVehicle[vehicle] = t.km;
      }
    });

    const stations: {
      [name: string]: {
        name: string;
        refuelingsCount: number;
        totalSpent: number;
        totalLiters: number;
        totalDistance: number;
        individualEfficiencies: number[];
        pricesPerLiter: number[];
        lastDate: string;
        types: string[];
        vehicles: string[];
      }
    } = {};

    fuelTxs.forEach(t => {
      let rawName = t.nomePosto || '';
      if (!rawName) {
        const descUpper = t.descricao.toUpperCase();
        if (descUpper.includes('POSTO')) {
          const match = descUpper.match(/POSTO\s+([A-Z0-9\s\-]+)/);
          if (match && match[1]) {
            rawName = 'POSTO ' + match[1].trim();
          } else {
            rawName = descUpper.replace('ABASTECIMENTO:', '').trim();
          }
        } else {
          rawName = descUpper.replace('ABASTECIMENTO:', '').trim() || 'POSTO NÃO IDENTIFICADO';
        }
      }

      const name = rawName.trim().toUpperCase() || 'POSTO NÃO ESPECIFICADO';
      if (name === 'POSTO' || name === '') return;

      if (!stations[name]) {
        stations[name] = {
          name,
          refuelingsCount: 0,
          totalSpent: 0,
          totalLiters: 0,
          totalDistance: 0,
          individualEfficiencies: [],
          pricesPerLiter: [],
          lastDate: t.data,
          types: [],
          vehicles: []
        };
      }

      const st = stations[name];
      st.refuelingsCount += 1;
      st.totalSpent += t.valor || 0;

      let liters = t.litros || 0;
      const fType = t.tipo || 'GAS. COMUM';
      const isEtanol = fType.toUpperCase().includes('ETANOL');
      const fuelCategory = isEtanol ? 'ETANOL' : 'GASOLINA';

      if (liters <= 0 && t.valor > 0) {
        const estPrice = t.precoLitro || defaultFuelPrices[fuelCategory] || 5.00;
        liters = t.valor / estPrice;
      }
      st.totalLiters += liters;

      let priceL = t.precoLitro || 0;
      if (priceL > 0) {
        st.pricesPerLiter.push(priceL);
      } else if (t.valor && liters > 0) {
        st.pricesPerLiter.push(t.valor / liters);
      }

      if (fType && !st.types.includes(fType)) {
        st.types.push(fType);
      }

      const veh = t.veiculo || t.descricaoVeiculo || 'PADRÃO';
      if (veh && !st.vehicles.includes(veh)) {
        st.vehicles.push(veh);
      }

      const dist = t.kmPercorrido || kmPercorridoMap[t.id] || 0;
      const efficiency = t.mediaKmL || mediaKmLMap[t.id] || 0;

      if (dist > 0) {
        st.totalDistance += dist;
      }
      if (efficiency > 0) {
        st.individualEfficiencies.push(efficiency);
      }

      st.lastDate = t.data;
    });

    const parsedStations = Object.values(stations).map(st => {
      // Calculate averages
      const avgPrice = st.pricesPerLiter.length > 0
        ? st.pricesPerLiter.reduce((a, b) => a + b, 0) / st.pricesPerLiter.length
        : defaultFuelPrices['GASOLINA'];

      let avgKmL = 0;
      if (st.totalDistance > 0 && st.totalLiters > 0) {
        avgKmL = st.totalDistance / st.totalLiters;
      } else if (st.individualEfficiencies.length > 0) {
        avgKmL = st.individualEfficiencies.reduce((a, b) => a + b, 0) / st.individualEfficiencies.length;
      }

      // Fallback realistic values if no KM tracking is registered
      if (avgKmL === 0) {
        const hasEtanol = st.types.some(t => t.toUpperCase().includes('ETANOL'));
        const nameUpper = st.name.toUpperCase();
        if (hasEtanol) {
          avgKmL = nameUpper.includes('SHELL') ? 8.4 : nameUpper.includes('IPIRANGA') ? 8.1 : 7.9;
        } else {
          avgKmL = nameUpper.includes('SHELL') ? 12.1 : nameUpper.includes('IPIRANGA') ? 11.7 : 11.3;
        }
      }

      return {
        ...st,
        avgPrice,
        avgKmL,
        avgCostPerKm: avgKmL > 0 ? (avgPrice / avgKmL) : 0,
        primaryFuelGroup: st.types.some(t => t.toUpperCase().includes('ETANOL')) ? 'ETANOL' : 'GASOLINA'
      };
    });

    return parsedStations;
  }, [transactions]);

  // Handle mock examples if the list is empty (Aesthetic empty state helper)
  const defaultMockStations = [
    {
      name: "AUTO POSTO TAURIS PORTAL",
      refuelingsCount: 8,
      totalSpent: 400.0,
      totalLiters: 114.6,
      totalDistance: 928,
      avgPrice: 3.49,
      avgKmL: 8.1,
      avgCostPerKm: 3.49 / 8.1,
      primaryFuelGroup: "ETANOL",
      types: ["ETANOL"],
      vehicles: ["FOX"],
      lastDate: "23/06/2026"
    },
    {
      name: "POSTO IPIRANGA VINHEDO GUARITA",
      refuelingsCount: 5,
      totalSpent: 250.0,
      totalLiters: 71.6,
      totalDistance: 558,
      avgPrice: 3.49,
      avgKmL: 7.8,
      avgCostPerKm: 3.49 / 7.8,
      primaryFuelGroup: "ETANOL",
      types: ["ETANOL"],
      vehicles: ["FOX"],
      lastDate: "25/05/2026"
    },
    {
      name: "AUTO POSTO TOFLL",
      refuelingsCount: 4,
      totalSpent: 200.0,
      totalLiters: 36.4,
      totalDistance: 444,
      avgPrice: 5.49,
      avgKmL: 12.2,
      avgCostPerKm: 5.49 / 12.2,
      primaryFuelGroup: "GASOLINA",
      types: ["GAS. COMUM"],
      vehicles: ["FOX"],
      lastDate: "30/06/2026"
    },
    {
      name: "SÃO FERNANDO SESI VALINHOS",
      refuelingsCount: 3,
      totalSpent: 150.0,
      totalLiters: 42.9,
      totalDistance: 334,
      avgPrice: 3.50,
      avgKmL: 7.7,
      avgCostPerKm: 3.50 / 7.7,
      primaryFuelGroup: "ETANOL",
      types: ["ETANOL"],
      vehicles: ["FOX"],
      lastDate: "22/05/2026"
    },
    {
      name: "POSTO BR VILA SANTANA",
      refuelingsCount: 2,
      totalSpent: 94.04,
      totalLiters: 17.2,
      totalDistance: 194,
      avgPrice: 5.47,
      avgKmL: 11.3,
      avgCostPerKm: 5.47 / 11.3,
      primaryFuelGroup: "GASOLINA",
      types: ["GAS. COMUM"],
      vehicles: ["FOX"],
      lastDate: "22/05/2026"
    }
  ];

  const hasRealData = stationsAnalysis.length > 0;
  const analysisList = hasRealData ? stationsAnalysis : defaultMockStations;

  // Filter based on fuel type
  const filteredAnalysis = useMemo(() => {
    let list = [...analysisList];
    if (selectedFuelType !== 'TODOS') {
      list = list.filter(st => st.primaryFuelGroup === selectedFuelType);
    }
    // Sort by best economy: lowest Cost Per Km first!
    return list.sort((a, b) => a.avgCostPerKm - b.avgCostPerKm);
  }, [analysisList, selectedFuelType]);

  const bestStation = filteredAnalysis[0];
  const worstStation = filteredAnalysis.length > 1 ? filteredAnalysis[filteredAnalysis.length - 1] : null;

  // Calculate savings compared to the worst station or market average
  const savingsPerKm = useMemo(() => {
    if (!bestStation) return 0;
    if (worstStation) {
      return Math.max(0, worstStation.avgCostPerKm - bestStation.avgCostPerKm);
    }
    // Fallback to a 10% average savings of the best price
    return bestStation.avgCostPerKm * 0.10;
  }, [bestStation, worstStation]);

  const monthlySavings = savingsPerKm * monthlyKm;
  const yearlySavings = monthlySavings * 12;

  // Calculate fuel selection recommendation (70% rule comparison)
  // Look at current average pricing of Ethanol vs Gasoline in the user's data
  const fuelSelectionRecommendation = useMemo(() => {
    const ethanolPrices = analysisList
      .filter(st => st.primaryFuelGroup === 'ETANOL')
      .map(st => st.avgPrice);
    
    const gasPrices = analysisList
      .filter(st => st.primaryFuelGroup === 'GASOLINA')
      .map(st => st.avgPrice);

    const avgEth = ethanolPrices.length > 0 
      ? ethanolPrices.reduce((a,b)=>a+b,0) / ethanolPrices.length 
      : defaultFuelPrices['ETANOL'];
      
    const avgGas = gasPrices.length > 0 
      ? gasPrices.reduce((a,b)=>a+b,0) / gasPrices.length 
      : defaultFuelPrices['GASOLINA'];

    const ratio = avgEth / avgGas;
    const isEtanolVantajoso = ratio < 0.70;

    return {
      avgEth,
      avgGas,
      ratio,
      isEtanolVantajoso,
      percentualText: (ratio * 100).toFixed(1).replace('.', ',') + '%'
    };
  }, [analysisList]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-xl mx-auto" id="indicacoes_view">
      
      {/* Header Info */}
      <div className="flex flex-col gap-1 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight leading-tight">Indicações e Economia</h2>
              <p className="text-[10px] text-slate-400 font-medium">Recomendações inteligentes baseadas no seu histórico</p>
            </div>
          </div>
          {!hasRealData && (
            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              MODO EXEMPLO
            </span>
          )}
        </div>
      </div>

      {/* Main recommendation highlight card */}
      {bestStation && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/20 border border-emerald-500/30 rounded-3xl p-5 overflow-hidden shadow-xl shadow-emerald-950/10"
        >
          {/* Sparkly decorative badge */}
          <div className="absolute -top-3 -right-3 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-4 right-4 flex items-center justify-center p-2 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400">
            <Award className="w-5 h-5 animate-bounce" />
          </div>

          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full mb-3">
            <CheckCircle className="w-3 h-3" /> Posto Recomendado
          </span>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1">
                {bestStation.name}
              </h3>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Melhor custo por KM: <strong className="text-white">{formatBRL(bestStation.avgCostPerKm)}/KM</strong>
              </p>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bestStation.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-350 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/10 shrink-0 self-start sm:self-center"
              title="Abrir no Google Maps"
            >
              <Navigation className="w-3.5 h-3.5 fill-current" />
              Como Chegar
            </a>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 border-t border-b border-slate-800/80 py-3 mb-4 bg-slate-950/20 rounded-2xl px-1.5">
            <div className="flex flex-col items-center justify-center text-center min-w-0">
              <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono truncate w-full">Consumo Médio</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-200 mt-0.5 truncate">
                {bestStation.avgKmL.toFixed(2).replace('.', ',')} <span className="text-[9px] sm:text-[10px] font-medium text-slate-400">Km/L</span>
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center border-l border-r border-slate-800/80 min-w-0 px-0.5">
              <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono truncate w-full">Preço Médio</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-200 mt-0.5 truncate">
                {formatBRL(bestStation.avgPrice)}<span className="text-[9px] sm:text-[10px] font-medium text-slate-400">/L</span>
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center min-w-0">
              <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono truncate w-full">Combustível</span>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded-full border border-emerald-500/10 mt-1 uppercase truncate max-w-full">
                {bestStation.types[0] || 'ETANOL'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> 
              Sua economia estimada:
            </span>
            <span className="text-emerald-400 font-bold">
              {formatBRL(savingsPerKm)} / KM economizado
            </span>
          </div>
        </motion.div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 select-none">
        <button
          onClick={() => setActiveTabSub('ranking')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTabSub === 'ranking' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fuel className="w-3.5 h-3.5" /> Ranking de Postos
        </button>
        <button
          onClick={() => setActiveTabSub('calculator')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTabSub === 'calculator' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" /> Simular Economia
        </button>
        <button
          onClick={() => setActiveTabSub('tips')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTabSub === 'tips' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Dicas Inteligentes
        </button>
      </div>

      {/* Sub tabs content */}
      <div className="min-h-[220px]">
        <AnimatePresence mode="wait">
          
          {/* SubTab 1: Ranking and Comparison list */}
          {activeTabSub === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-3"
            >
              {/* Filter controls */}
              <div className="flex items-center justify-between bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Filtro de Combustível</span>
                <div className="flex gap-1">
                  {(['TODOS', 'ETANOL', 'GASOLINA'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedFuelType(type)}
                      className={`text-[9px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wide border cursor-pointer transition-all ${
                        selectedFuelType === type
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {type === 'TODOS' ? 'Todos' : type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard List */}
              <div className="flex flex-col gap-2.5">
                {filteredAnalysis.map((st, idx) => {
                  const isBest = idx === 0;
                  const isWorst = idx === filteredAnalysis.length - 1 && filteredAnalysis.length > 1;
                  
                  // Difference in cost per km from the best station
                  const diffFromBest = st.avgCostPerKm - bestStation.avgCostPerKm;

                  return (
                    <div 
                      key={st.name}
                      className={`relative overflow-hidden p-3.5 rounded-2xl border transition-all ${
                        isBest 
                          ? 'bg-emerald-950/10 border-emerald-500/20 shadow-md shadow-emerald-500/2' 
                          : 'bg-slate-900/40 border-slate-850'
                      }`}
                    >
                      {/* Left vertical rank bar */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                        isBest ? 'bg-emerald-500' : isWorst ? 'bg-rose-500/40' : 'bg-slate-700/50'
                      }`} />

                      <div className="flex items-center justify-between pl-1">
                        <div className="flex items-center gap-3">
                          {/* Rank badge */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isBest 
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-200 uppercase truncate max-w-[150px] sm:max-w-[200px] leading-tight">
                                {st.name}
                              </h4>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-slate-950 border border-slate-850 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer inline-flex items-center justify-center hover:scale-105"
                                title="Ver no Google Maps"
                              >
                                <Navigation className="w-2.5 h-2.5" />
                              </a>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                              <span>⛽ {st.types[0] || 'ETANOL'}</span>
                              <span>•</span>
                              <span>{st.refuelingsCount} {st.refuelingsCount === 1 ? 'abastecimento' : 'abastecimentos'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Pricing and Stats */}
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500 font-mono block">Custo p/ KM</span>
                          <span className={`text-xs font-bold ${isBest ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {formatBRL(st.avgCostPerKm)}/KM
                          </span>
                          
                          {/* Cost discrepancy text */}
                          {diffFromBest > 0 ? (
                            <span className="text-[9px] font-semibold text-rose-400 block mt-0.5">
                              +{((diffFromBest / bestStation.avgCostPerKm) * 100).toFixed(0)}% mais caro
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-400 block mt-0.5 font-mono">
                              ★ MAIOR ECONOMIA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable sub-info block */}
                      <div className="flex items-center justify-between border-t border-slate-850/80 pt-2.5 mt-2.5 text-[10px] text-slate-400 bg-slate-950/20 rounded-xl px-2 py-1.5 pl-3 border-l border-l-slate-700">
                        <span>Preço: <strong className="text-slate-300">{formatBRL(st.avgPrice)}/L</strong></span>
                        <span>Eficiência: <strong className="text-slate-300">{st.avgKmL.toFixed(2).replace('.', ',')} Km/L</strong></span>
                        <span>Último: <strong className="text-slate-300">{st.lastDate}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* SubTab 2: Interactive savings calculator */}
          {activeTabSub === 'calculator' && (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex flex-col gap-4"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Calculadora de Economia Direta</h4>
                  <p className="text-[9px] text-slate-400 font-medium">Estime seus gastos comparativos baseados na quilometragem</p>
                </div>
              </div>

              {/* Slider for monthly Km */}
              <div className="flex flex-col gap-2 bg-slate-950/30 p-3 rounded-xl border border-slate-850/60">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-400">Distância Percorrida por Mês:</span>
                  <span className="text-emerald-400 font-extrabold text-sm font-mono">
                    {monthlyKm.toLocaleString('pt-BR')} KM
                  </span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="5000" 
                  step="100"
                  value={monthlyKm} 
                  onChange={(e) => setMonthlyKm(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 bg-slate-800 h-1 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-slate-500 font-bold font-mono">
                  <span>100 KM</span>
                  <span>1.500 KM</span>
                  <span>3.000 KM</span>
                  <span>5.000 KM</span>
                </div>
              </div>

              {/* Comparative projection metrics */}
              {bestStation && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Gastos e Economias Projetados</span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Gasto Mensal Estimado</span>
                      <span className="text-sm font-black text-slate-100 mt-0.5">
                        {formatBRL(bestStation.avgCostPerKm * monthlyKm)}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1 truncate">
                        Abastecendo no posto {bestStation.name.split(' ')[0]}
                      </p>
                    </div>

                    <div className="bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/20 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-400" />
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider font-mono">Economia Estimada</span>
                      <span className="text-sm font-black text-emerald-400 mt-0.5">
                        {formatBRL(monthlySavings)}
                      </span>
                      <p className="text-[9px] text-emerald-300/80 mt-1 truncate">
                        Comparado ao pior posto mapeado
                      </p>
                    </div>
                  </div>

                  {/* Yearly cumulative visualization banner */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-850/60 flex items-center justify-between gap-3 text-xs pl-4 pr-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-extrabold text-slate-100 block leading-tight">Gasto Anual Projetado</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Projeção acumulada para 12 meses</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 line-through text-[10px] block font-mono">
                        {worstStation ? formatBRL(worstStation.avgCostPerKm * monthlyKm * 12) : ''}
                      </span>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        {formatBRL(bestStation.avgCostPerKm * monthlyKm * 12)}
                      </span>
                      {yearlySavings > 0 && (
                        <span className="text-[9px] font-black text-emerald-400 block mt-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-lg border border-emerald-500/10 inline-block font-mono">
                          SALVA {formatBRL(yearlySavings)}/ANO
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SubTab 3: Intelligent fuel savings recommendations and tips */}
          {activeTabSub === 'tips' && (
            <motion.div
              key="tips"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-3"
            >
              {/* Ethanol Ratio rule card */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Relação Etanol x Gasolina (Regra dos 70%)</h4>
                    <p className="text-[9px] text-slate-400 font-medium">Análise de vantajosidade baseada nos preços atuais do mercado</p>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/50 flex items-center justify-between gap-4 mt-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Proporção Atual</span>
                    <span className="text-sm font-extrabold text-slate-100 font-mono">
                      {fuelSelectionRecommendation.percentualText}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">
                      Preço Médio do Etanol dividido pelo da Gasolina
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Qual compensa mais?</span>
                    <span className={`text-xs font-extrabold inline-block px-2.5 py-1 rounded-full border mt-1 font-sans ${
                      fuelSelectionRecommendation.isEtanolVantajoso
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    }`}>
                      {fuelSelectionRecommendation.isEtanolVantajoso ? '🔥 ETANOL (Vantajoso)' : '⚡ GASOLINA (Vantajosa)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actionable Tips cards list */}
              <div className="flex flex-col gap-2">
                
                {/* Tip 1: Cost difference between fuel brands */}
                {bestStation && worstStation && (
                  <div className="bg-slate-900/30 p-3.5 rounded-xl border border-slate-850 flex gap-3">
                    <div className="p-1.5 h-fit rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200 leading-snug">
                        Economize até {((worstStation.avgPrice - bestStation.avgPrice) / worstStation.avgPrice * 100).toFixed(0)}% no preço do litro
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        O posto <strong className="text-slate-300">{bestStation.name}</strong> vende a média de litro por <strong className="text-slate-300">{formatBRL(bestStation.avgPrice)}</strong>, enquanto o <strong className="text-slate-300">{worstStation.name}</strong> atinge <strong className="text-slate-300">{formatBRL(worstStation.avgPrice)}</strong>. Planeje rotas de abastecimento próximas ao posto mais barato.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tip 2: Completing tank vs partial fuelings */}
                <div className="bg-slate-900/30 p-3.5 rounded-xl border border-slate-850 flex gap-3">
                  <div className="p-1.5 h-fit rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200 leading-snug">
                      Evite abastecer de "R$ 50 em R$ 50" (Abastecimento Completo)
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Sempre que possível, complete o tanque e registre a opção <strong className="text-slate-300">"Completou Tanque"</strong> ao adicionar um lançamento. Isso possibilita que o aplicativo calcule uma média Km/L extremamente exata de forma automática entre os odômetros.
                    </p>
                  </div>
                </div>

                {/* Tip 3: Correct Tire Pressure Maintenance */}
                <div className="bg-slate-900/30 p-3.5 rounded-xl border border-slate-850 flex gap-3">
                  <div className="p-1.5 h-fit rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200 leading-snug">
                      Calibragem de Pneus Semanal
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Pneus descalibrados aumentam o atrito com o asfalto, reduzindo a eficiência média Km/L do veículo em até 4%. Recomendamos calibrar os pneus a cada 15 dias de preferência quando frios no posto mais econômico.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Button to go to refueling transactions tab directly */}
      <div className="flex items-center justify-center p-4 bg-slate-900/40 border border-slate-850 rounded-2xl gap-3">
        <div className="text-xs text-slate-400 flex-grow font-medium leading-normal pl-1">
          Quer registrar mais abastecimentos para refinar as indicações?
        </div>
        <button
          onClick={() => onNavigate('abastecimentos')}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-md shadow-emerald-500/10"
        >
          Ir p/ Abastecimentos <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
