import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  BarChart3, 
  AlertTriangle, 
  TrendingUp, 
  User, 
  ShieldCheck, 
  Package, 
  Eye, 
  Filter, 
  CheckCircle2, 
  Tag, 
  Award,
  Building2,
  Layers,
  ArrowUpDown,
  Sparkles,
  Info,
  DollarSign,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LabelList 
} from 'recharts';
import { StockItem } from '../types';
import { 
  isItemUrgent, 
  OFFICIAL_WARRANTY_STATUSES, 
  getItemNormalizedStatus, 
  canonicalizeWarrantyStatus,
  matchesStatusFilter 
} from '../utils/statusUtils';
import { isDateInRange } from '../utils/dateUtils';
import { 
  matchItemSupplier, 
  matchItemFilial, 
  getAvailableSuppliers, 
  getAvailableFiliais 
} from '../utils/supplierUtils';
import { MultiSelectFilter, MultiSelectOption } from './MultiSelectFilter';

interface DashboardProps {
  items: StockItem[];
  onSelectItem: (item: StockItem, contextItems?: StockItem[], contextLabel?: string) => void;
  theme?: 'dark' | 'light';
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#06b6d4', '#f97316'];

const TARGET_FIXED_LOCALIDADES = [
  'mecanizou',
  'mecanizou - recebimento',
  'mecanizou - expresso',
  'mecanizou - bh'
];

function isFixedTargetLocalidade(loc?: string): boolean {
  if (!loc) return false;
  const clean = loc.trim().toLowerCase().replace(/\s+/g, ' ');
  return TARGET_FIXED_LOCALIDADES.some(t => clean === t || clean.replace(/\s*-\s*/g, '-') === t.replace(/\s*-\s*/g, '-'));
}

function parseItemValue(valStr?: string): number {
  if (!valStr) return 0;
  const clean = valStr.replace(/[R$\s\.]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parseItemQty(qtyStr?: string): number {
  if (!qtyStr) return 1;
  const num = parseInt(qtyStr, 10);
  return isNaN(num) || num <= 0 ? 1 : num;
}

export const Dashboard: React.FC<DashboardProps> = ({ items = [], onSelectItem, theme = 'dark' }) => {
  const isLight = theme === 'light';

  // Base date field toggle: 'dataSaida' | 'dataRecebimento' | 'dataIncidencia'
  const [dateField, setDateField] = useState<'dataSaida' | 'dataRecebimento' | 'dataIncidencia'>('dataIncidencia');
  
  // Date range state (YYYY-MM-DD for standard html date inputs)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Supplier & Filial Multi-Select Filter States
  const [selectedFornecedores, setSelectedFornecedores] = useState<string[]>([]);
  const [selectedNovosFornecedores, setSelectedNovosFornecedores] = useState<string[]>([]);

  // Interactive drilldown status for dynamic supplier chart
  const [selectedStatusDrilldown, setSelectedStatusDrilldown] = useState<string | null>(null);

  // Preset Date Helper
  const setQuickRange = (preset: 'all' | 'this_month' | 'last_30' | 'last_90' | 'this_year') => {
    const today = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'last_90') {
      const past90 = new Date();
      past90.setDate(today.getDate() - 90);
      setStartDate(past90.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const firstYearDay = new Date(today.getFullYear(), 0, 1);
      setStartDate(firstYearDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  // 1. Filter items by date range
  const dateFilteredItems = useMemo(() => {
    return (items || []).filter(item => {
      const dateVal = 
        dateField === 'dataSaida' 
          ? item.dataSaida 
          : dateField === 'dataRecebimento' 
          ? item.dataRecebimento 
          : item.dataIncidencia;
      return isDateInRange(dateVal, startDate, endDate);
    });
  }, [items, dateField, startDate, endDate]);

  // Suppliers options based on dateFilteredItems
  const fornecedorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const suppliers = getAvailableSuppliers(dateFilteredItems);
    suppliers.forEach(s => { counts[s] = 0; });
    dateFilteredItems.forEach(item => {
      suppliers.forEach(s => {
        if (matchItemSupplier(item, s)) {
          counts[s] = (counts[s] || 0) + 1;
        }
      });
    });
    return counts;
  }, [dateFilteredItems]);

  const availableFornecedores = useMemo(() => {
    return Object.keys(fornecedorCounts).sort((a, b) => {
      const countDiff = (fornecedorCounts[b] || 0) - (fornecedorCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [fornecedorCounts]);

  const fornecedorOptions = useMemo<MultiSelectOption[]>(() => {
    return availableFornecedores.map(f => ({
      id: f,
      label: f,
      count: fornecedorCounts[f] || 0
    }));
  }, [availableFornecedores, fornecedorCounts]);

  // Items after supplier filter for filial cascading
  const itemsAfterSupplier = useMemo(() => {
    return dateFilteredItems.filter(item => {
      if (selectedFornecedores.length > 0) {
        const matchesAny = selectedFornecedores.some(f => matchItemSupplier(item, f));
        if (!matchesAny) return false;
      }
      return true;
    });
  }, [dateFilteredItems, selectedFornecedores]);

  // Filial counts strictly cascaded from selected suppliers
  const filialCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const filiais = getAvailableFiliais(dateFilteredItems, selectedFornecedores.length > 0 ? selectedFornecedores : 'all');
    filiais.forEach(f => { counts[f] = 0; });
    itemsAfterSupplier.forEach(item => {
      filiais.forEach(f => {
        if (matchItemFilial(item, f)) {
          counts[f] = (counts[f] || 0) + 1;
        }
      });
    });
    return counts;
  }, [dateFilteredItems, selectedFornecedores, itemsAfterSupplier]);

  const availableFiliais = useMemo(() => {
    return Object.keys(filialCounts).sort((a, b) => {
      const countDiff = (filialCounts[b] || 0) - (filialCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [filialCounts]);

  const filialOptions = useMemo<MultiSelectOption[]>(() => {
    return availableFiliais.map(f => ({
      id: f,
      label: f,
      count: filialCounts[f] || 0
    }));
  }, [availableFiliais, filialCounts]);

  // Reset filiais selection if no longer valid
  React.useEffect(() => {
    if (selectedNovosFornecedores.length > 0) {
      const valid = selectedNovosFornecedores.filter(f => availableFiliais.includes(f));
      if (valid.length !== selectedNovosFornecedores.length) {
        setSelectedNovosFornecedores(valid);
      }
    }
  }, [availableFiliais, selectedNovosFornecedores]);

  // 2. Filtered Items by Date + Supplier + Filial (drives charts and KPIs)
  const dashboardFilteredItems = useMemo(() => {
    return itemsAfterSupplier.filter(item => {
      if (selectedNovosFornecedores.length > 0) {
        const matchesAny = selectedNovosFornecedores.some(f => matchItemFilial(item, f));
        if (!matchesAny) return false;
      }
      return true;
    });
  }, [itemsAfterSupplier, selectedNovosFornecedores]);

  // Group by Status Devolução
  const statusSummary = useMemo(() => {
    const map: Record<string, number> = {};
    OFFICIAL_WARRANTY_STATUSES.forEach(st => { map[st] = 0; });

    dashboardFilteredItems.forEach(item => {
      const st = getItemNormalizedStatus(item);
      map[st] = (map[st] || 0) + 1;
    });

    const total = dashboardFilteredItems.length;

    return Object.entries(map)
      .map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
        unifiedLabel: `${count} (${total > 0 ? ((count / total) * 100).toFixed(1) : '0'}%)`
      }))
      .filter(i => i.count > 0 || OFFICIAL_WARRANTY_STATUSES.includes(i.status as any))
      .sort((a, b) => b.count - a.count);
  }, [dashboardFilteredItems]);

  // Chart data for unified Status distribution
  const chartData = useMemo(() => {
    return statusSummary.map((item, index) => ({
      name: item.status,
      value: item.count,
      percentage: item.percentage,
      unifiedLabel: `${item.count} (${item.percentage}%)`,
      color: COLORS[index % COLORS.length]
    }));
  }, [statusSummary]);

  // 3. Dynamic Supplier Distribution for Selected Status (Top 10)
  const drilldownData = useMemo(() => {
    if (!selectedStatusDrilldown) return null;

    const matchingItems = dashboardFilteredItems.filter(item => {
      return matchesStatusFilter(item, selectedStatusDrilldown);
    });

    const map: Record<string, { label: string; count: number; totalQty: number; totalValue: number }> = {};

    matchingItems.forEach(item => {
      const forn = item.fornecedor?.trim() || '';
      const filial = item.novoFornecedorFilial?.trim() || '';
      
      let label = forn;
      if (filial && filial !== forn && !filial.toLowerCase().startsWith(forn.toLowerCase())) {
        label = `${forn} - ${filial}`;
      } else if (filial) {
        label = filial;
      }
      if (!label) label = 'Não Informado';

      if (!map[label]) {
        map[label] = { label, count: 0, totalQty: 0, totalValue: 0 };
      }

      const qty = parseItemQty(item.quantEstoque);
      const unitVal = parseItemValue(item.valorUnitario);
      const totalVal = item.valorTotal ? parseItemValue(item.valorTotal) : unitVal * qty;

      map[label].count += 1;
      map[label].totalQty += qty;
      map[label].totalValue += totalVal;
    });

    const totalStatusItems = matchingItems.length;

    const sortedList = Object.values(map)
      .map(entry => ({
        name: entry.label,
        count: entry.count,
        totalQty: entry.totalQty,
        totalValue: entry.totalValue,
        percentage: totalStatusItems > 0 ? ((entry.count / totalStatusItems) * 100).toFixed(1) : '0',
        unifiedLabel: `${entry.count} (${totalStatusItems > 0 ? ((entry.count / totalStatusItems) * 100).toFixed(1) : '0'}%)`
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      status: selectedStatusDrilldown,
      totalCount: totalStatusItems,
      suppliers: sortedList
    };
  }, [selectedStatusDrilldown, dashboardFilteredItems]);

  // 4. Fixed Real-Time List: "A Negociar" (Top 15 Suppliers)
  // Condition: Status devolução === 'A negociar' + Localidade in ['Mecanizou', 'Mecanizou - Recebimento', 'Mecanizou - Expresso', 'Mecanizou - BH']
  // Fixed in real-time, independent of dashboard date and supplier filters
  const fixedANegociarList = useMemo(() => {
    const matching = items.filter(item => {
      const isANegociar = canonicalizeWarrantyStatus(item.statusDevolucao) === 'A negociar';
      const isTargetLoc = isFixedTargetLocalidade(item.localidade);
      return isANegociar && isTargetLoc;
    });

    const map: Record<string, {
      fornecedorFilial: string;
      idsCount: number;
      totalQty: number;
      totalValue: number;
      items: StockItem[];
    }> = {};

    matching.forEach(item => {
      const forn = item.fornecedor?.trim() || '';
      const filial = item.novoFornecedorFilial?.trim() || '';
      
      let key = forn;
      if (filial && filial !== forn && !filial.toLowerCase().startsWith(forn.toLowerCase())) {
        key = `${forn} - ${filial}`;
      } else if (filial) {
        key = filial;
      }
      if (!key) key = 'Fornecedor Não Informado';

      if (!map[key]) {
        map[key] = {
          fornecedorFilial: key,
          idsCount: 0,
          totalQty: 0,
          totalValue: 0,
          items: []
        };
      }

      const qty = parseItemQty(item.quantEstoque);
      const unitVal = parseItemValue(item.valorUnitario);
      const totVal = item.valorTotal ? parseItemValue(item.valorTotal) : unitVal * qty;

      map[key].idsCount += 1;
      map[key].totalQty += qty;
      map[key].totalValue += totVal;
      map[key].items.push(item);
    });

    return Object.values(map)
      .sort((a, b) => b.totalQty - a.totalQty || b.idsCount - a.idsCount)
      .slice(0, 15);
  }, [items]);

  // 5. Fixed Real-Time List: "Em negociação" (Top 15 Suppliers)
  // Condition: Status devolução === 'Em negociação' + Localidade in ['Mecanizou', 'Mecanizou - Recebimento', 'Mecanizou - Expresso', 'Mecanizou - BH']
  // Fixed in real-time, independent of dashboard date and supplier filters
  const fixedEmNegociacaoList = useMemo(() => {
    const matching = items.filter(item => {
      const isEmNegociacao = canonicalizeWarrantyStatus(item.statusDevolucao) === 'Em negociação';
      const isTargetLoc = isFixedTargetLocalidade(item.localidade);
      return isEmNegociacao && isTargetLoc;
    });

    const map: Record<string, {
      fornecedorFilial: string;
      idsCount: number;
      totalQty: number;
      totalValue: number;
      items: StockItem[];
    }> = {};

    matching.forEach(item => {
      const forn = item.fornecedor?.trim() || '';
      const filial = item.novoFornecedorFilial?.trim() || '';
      
      let key = forn;
      if (filial && filial !== forn && !filial.toLowerCase().startsWith(forn.toLowerCase())) {
        key = `${forn} - ${filial}`;
      } else if (filial) {
        key = filial;
      }
      if (!key) key = 'Fornecedor Não Informado';

      if (!map[key]) {
        map[key] = {
          fornecedorFilial: key,
          idsCount: 0,
          totalQty: 0,
          totalValue: 0,
          items: []
        };
      }

      const qty = parseItemQty(item.quantEstoque);
      const unitVal = parseItemValue(item.valorUnitario);
      const totVal = item.valorTotal ? parseItemValue(item.valorTotal) : unitVal * qty;

      map[key].idsCount += 1;
      map[key].totalQty += qty;
      map[key].totalValue += totVal;
      map[key].items.push(item);
    });

    return Object.values(map)
      .sort((a, b) => b.totalQty - a.totalQty || b.idsCount - a.idsCount)
      .slice(0, 15);
  }, [items]);

  // 6. Ranking of Mecânicas / Clientes (Top 15)
  const topClients = useMemo(() => {
    const map: Record<string, { count: number; items: StockItem[] }> = {};
    dashboardFilteredItems.forEach(item => {
      const clientName = item.cliente?.trim() || 'Cliente Não Informado';
      if (!map[clientName]) {
        map[clientName] = { count: 0, items: [] };
      }
      map[clientName].count += 1;
      map[clientName].items.push(item);
    });

    const total = dashboardFilteredItems.length;

    return Object.entries(map)
      .map(([cliente, data]) => ({
        cliente,
        count: data.count,
        percentage: total > 0 ? ((data.count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [dashboardFilteredItems]);

  // 7. Top 20 Códigos / Peças mais recebidos (Increased from 10 to 20)
  const top20Codes = useMemo(() => {
    const map: Record<string, { code: string; sampleDesc: string; brand: string; count: number; totalQty: number }> = {};
    dashboardFilteredItems.forEach(item => {
      const codeKey = (item.codigo?.trim() || item.descricao?.trim() || 'Sem Código').toUpperCase();
      if (!map[codeKey]) {
        map[codeKey] = {
          code: item.codigo?.trim() || 'S/ CÓDIGO',
          sampleDesc: item.descricao?.trim() || 'Descrição Não Informada',
          brand: item.marca?.trim() || '—',
          count: 0,
          totalQty: 0
        };
      }
      const qty = parseItemQty(item.quantEstoque);
      map[codeKey].count += 1;
      map[codeKey].totalQty += qty;
    });

    const total = dashboardFilteredItems.length;

    return Object.values(map)
      .map(entry => ({
        ...entry,
        percentage: total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
  }, [dashboardFilteredItems]);

  // 8. Top 20 Marcas
  const top20Brands = useMemo(() => {
    const map: Record<string, { brand: string; count: number; totalQty: number }> = {};
    dashboardFilteredItems.forEach(item => {
      const brandKey = item.marca?.trim() || 'Marca Não Informada';
      if (!map[brandKey]) {
        map[brandKey] = {
          brand: brandKey,
          count: 0,
          totalQty: 0
        };
      }
      const qty = parseItemQty(item.quantEstoque);
      map[brandKey].count += 1;
      map[brandKey].totalQty += qty;
    });

    const total = dashboardFilteredItems.length;

    return Object.values(map)
      .map(entry => ({
        ...entry,
        percentage: total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [dashboardFilteredItems]);

  // Theme helper classes
  const cardBg = isLight 
    ? 'bg-white border-slate-200 shadow-sm text-slate-800' 
    : 'bg-slate-900/90 border-slate-800 shadow-2xl text-slate-100';
  const subCardBg = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-700'
    : 'bg-slate-950/80 border-slate-800/80 text-slate-300';
  const borderCol = isLight ? 'border-slate-200' : 'border-slate-800';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const textHead = isLight ? 'text-slate-900 font-bold' : 'text-slate-100 font-bold';

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Filter Panel: Date + Fornecedor + Filial */}
      <div className={`${cardBg} border rounded-2xl p-5 sm:p-6 backdrop-blur-sm`}>
        <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b ${borderCol}`}>
          <div>
            <div className="flex items-center space-x-2 text-indigo-500 dark:text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Painel Geral de Devoluções & Estoque</span>
            </div>
            <h2 className={`text-xl sm:text-2xl ${textHead} tracking-tight`}>
              Dashboard de Status e Indicadores
            </h2>
            <p className={`text-xs ${textMuted} mt-0.5`}>
              Análise comparativa filtrada por data, fornecedor e filial
            </p>
          </div>

          {/* Date Base Toggle Button */}
          <div className={`${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'} p-1 rounded-xl border flex flex-wrap items-center gap-1 self-start lg:self-auto`}>
            <span className={`text-[11px] ${textMuted} font-semibold px-2 uppercase`}>Filtrar por:</span>
            <button
              onClick={() => setDateField('dataIncidencia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataIncidencia'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : `${textMuted} hover:text-indigo-500`
              }`}
            >
              Data de Incidência
            </button>
            <button
              onClick={() => setDateField('dataRecebimento')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataRecebimento'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : `${textMuted} hover:text-indigo-500`
              }`}
            >
              Data de Recebimento
            </button>
            <button
              onClick={() => setDateField('dataSaida')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataSaida'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : `${textMuted} hover:text-indigo-500`
              }`}
            >
              Data de Saída
            </button>
          </div>
        </div>

        {/* Filters Grid: Date Inputs, Presets, Fornecedor and Filial */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Date Inputs */}
          <div className="md:col-span-4 grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-semibold ${textMuted} uppercase tracking-wider mb-1 flex items-center`}>
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-100'} border focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-semibold ${textMuted} uppercase tracking-wider mb-1 flex items-center`}>
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-100'} border focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none`}
              />
            </div>
          </div>

          {/* Fornecedor Multi-Select */}
          <div className="md:col-span-4">
            <MultiSelectFilter
              label="Fornecedor"
              icon={Building2}
              options={fornecedorOptions}
              selectedIds={selectedFornecedores}
              onChange={setSelectedFornecedores}
              allLabel="Todos os Fornecedores"
              totalCount={dateFilteredItems.length}
              theme={theme}
            />
          </div>

          {/* Novo Fornecedor / Filial Multi-Select (Cascading) */}
          <div className="md:col-span-4">
            <MultiSelectFilter
              label="Novo Fornecedor / Filial"
              icon={Layers}
              options={filialOptions}
              selectedIds={selectedNovosFornecedores}
              onChange={setSelectedNovosFornecedores}
              allLabel="Todas as Filiais"
              totalCount={itemsAfterSupplier.length}
              theme={theme}
            />
          </div>

          {/* Quick Date Presets Bar */}
          <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[11px] ${textMuted} font-semibold mr-1`}>Atalhos de Período:</span>
              <button
                onClick={() => setQuickRange('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  !startDate && !endDate
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                }`}
              >
                Todas as Datas
              </button>
              <button
                onClick={() => setQuickRange('this_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                }`}
              >
                Este Mês
              </button>
              <button
                onClick={() => setQuickRange('last_30')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                }`}
              >
                Últimos 30 dias
              </button>
              <button
                onClick={() => setQuickRange('last_90')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                }`}
              >
                Últimos 90 dias
              </button>
              <button
                onClick={() => setQuickRange('this_year')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                }`}
              >
                Este Ano
              </button>
            </div>

            {(selectedFornecedores.length > 0 || selectedNovosFornecedores.length > 0) && (
              <button
                onClick={() => {
                  setSelectedFornecedores([]);
                  setSelectedNovosFornecedores([]);
                }}
                className="text-xs text-indigo-500 hover:underline font-bold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar filtros de Fornecedor ({selectedFornecedores.length + selectedNovosFornecedores.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards per Status Devolução (Clickable for Interactive Drilldown) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textMuted} flex items-center`}>
            <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" />
            Contagem de Itens por Status Devolução ({dashboardFilteredItems.length} itens no período)
          </h3>
          <span className={`text-xs ${textMuted}`}>
            {selectedStatusDrilldown ? (
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Destacando: {selectedStatusDrilldown} (Clique para desmarcar)
              </span>
            ) : (
              <span>Clique em um status para ver a distribuição por fornecedor</span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {statusSummary.map((st, idx) => {
            const isSelected = selectedStatusDrilldown === st.status;
            return (
              <button
                type="button"
                key={`${st.status}-${idx}`}
                onClick={() => {
                  setSelectedStatusDrilldown(prev => prev === st.status ? null : st.status);
                }}
                className={`text-left rounded-xl p-3.5 transition-all shadow-md cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50 scale-[1.02]'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800'
                    : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 text-slate-100'
                }`}
              >
                <div className={`text-[11px] font-bold uppercase truncate mb-1 ${isSelected ? 'text-indigo-100' : textMuted}`}>
                  {st.status}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black">
                    {st.count}
                  </span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                    isSelected 
                      ? 'bg-indigo-950 text-white border-indigo-400' 
                      : isLight
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-indigo-950 text-indigo-400 border-indigo-900'
                  }`}>
                    {st.percentage}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Drilldown Chart: Top 10 Suppliers for Selected Status */}
      {drilldownData && (
        <div className={`${cardBg} border-2 border-indigo-500/80 rounded-2xl p-5 shadow-2xl animate-fadeIn`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b ${borderCol}`}>
            <div>
              <div className="flex items-center space-x-2 text-indigo-500 font-bold uppercase text-xs tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Gráfico Dinâmico por Fornecedor (Top 10)</span>
              </div>
              <h3 className={`text-base sm:text-lg ${textHead} flex items-center gap-2`}>
                <span>Distribuição dos Fornecedores em:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-sm">
                  {drilldownData.status}
                </span>
              </h3>
              <p className={`text-xs ${textMuted} mt-0.5`}>
                Exibindo os 10 maiores fornecedores com peças neste status ({drilldownData.totalCount} itens totais)
              </p>
            </div>

            <button
              onClick={() => setSelectedStatusDrilldown(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 self-start sm:self-auto ${
                isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <X className="w-3.5 h-3.5" /> Fechar Gráfico Dinâmico
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            {drilldownData.suppliers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drilldownData.suppliers} margin={{ top: 20, right: 10, left: -20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke={isLight ? '#64748b' : '#94a3b8'} 
                    fontSize={10} 
                    tickLine={false} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className={`p-3 rounded-xl shadow-xl border text-xs ${
                            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                          }`}>
                            <div className="font-bold text-sm mb-1">{data.name}</div>
                            <div className="text-indigo-400 font-mono font-bold">
                              {data.count} itens ({data.percentage}% do status)
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Quantidade em estoque: {data.totalQty} un.
                            </div>
                            {data.totalValue > 0 && (
                              <div className="text-emerald-400 font-mono text-[11px] mt-0.5">
                                Valor total: {data.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]}>
                    <LabelList 
                      dataKey="unifiedLabel" 
                      position="top" 
                      style={{ 
                        fill: isLight ? '#334155' : '#cbd5e1', 
                        fontSize: '10px', 
                        fontWeight: 'bold' 
                      }} 
                    />
                    {drilldownData.suppliers.map((_, index) => (
                      <Cell key={`drill-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">Nenhum fornecedor registrado neste status.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Visuals Row: Chart & Status Breakdown (Unified Quantity + %) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts Bar Chart showing Status Distribution */}
        <div className={`lg:col-span-8 ${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div className={`flex items-center justify-between mb-4 pb-3 border-b ${borderCol}`}>
            <div>
              <h3 className={`text-sm ${textHead} uppercase tracking-wider flex items-center`}>
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" />
                Gráfico de Distribuição dos Status (Quantidade + %)
              </h3>
              <p className={`text-xs ${textMuted} mt-0.5`}>
                Representação proporcional dos itens no período selecionado
              </p>
            </div>
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
              isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950/80 text-indigo-400 border-indigo-800'
            }`}>
              {dashboardFilteredItems.length} Itens Totais
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke={isLight ? '#64748b' : '#94a3b8'} 
                    fontSize={11} 
                    tickLine={false} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isLight ? '#ffffff' : '#0f172a', 
                      borderColor: isLight ? '#cbd5e1' : '#334155', 
                      borderRadius: '0.75rem', 
                      color: isLight ? '#0f172a' : '#f8fafc', 
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    cursor={{ fill: isLight ? 'rgba(226, 232, 240, 0.5)' : '#1e293b' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <LabelList 
                      dataKey="unifiedLabel" 
                      position="top" 
                      style={{ 
                        fill: isLight ? '#334155' : '#cbd5e1', 
                        fontSize: '10px', 
                        fontWeight: 'bold' 
                      }} 
                    />
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">Nenhum registro encontrado para este filtro.</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Breakdown List */}
        <div className={`lg:col-span-4 ${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${borderCol}`}>
              <h3 className={`text-sm ${textHead} uppercase tracking-wider flex items-center`}>
                <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                Proporção por Status
              </h3>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {statusSummary.map((st, idx) => (
                <div key={`${st.status}-${idx}`} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={`truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{st.status}</span>
                    <span className={`font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{st.count} ({st.percentage}%)</span>
                  </div>
                  <div className={`w-full ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'} h-2 rounded-full overflow-hidden border`}>
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${st.percentage}%`, 
                        backgroundColor: COLORS[idx % COLORS.length] 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t ${borderCol} text-[11px] ${textMuted} flex items-center justify-between`}>
            <span>Filtro ativo no período</span>
            <span className="text-indigo-500 font-bold">{dashboardFilteredItems.length} devoluções</span>
          </div>
        </div>
      </div>

      {/* Two Fixed Real-Time Lists: "A Negociar" and "Em negociação" (Top 15 Each) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* List 1: "A Negociar" (Top 15 Fornecedores, Fixed Real-Time) */}
        <div className={`lg:col-span-6 ${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b ${borderCol}`}>
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/30">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm ${textHead} uppercase tracking-wider flex items-center gap-1.5`}>
                    <span>A Negociar</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.2 rounded-full font-bold border border-amber-500/30">
                      Tempo Real (Top 15)
                    </span>
                  </h3>
                  <p className={`text-[11px] ${textMuted} mt-0.5`}>
                    Status: "A negociar" | Localidades Mecanizou (Mecanizou, Recebimento, Expresso, BH)
                  </p>
                </div>
              </div>
            </div>

            {fixedANegociarList.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                <p className="text-xs">Nenhum item com status "A negociar" nas localidades alvo.</p>
              </div>
            ) : (
              <div className="max-h-[440px] overflow-y-auto overflow-x-auto pr-1 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${borderCol} text-[10px] font-bold uppercase ${textMuted} sticky top-0 ${isLight ? 'bg-white' : 'bg-slate-900'} z-10`}>
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Fornecedor + Filial</th>
                      <th className="py-2 px-2 text-center">IDs (Linhas)</th>
                      <th className="py-2 px-2 text-center">Quantidade</th>
                      <th className="py-2 px-2 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderCol}`}>
                    {fixedANegociarList.map((row, idx) => (
                      <tr 
                        key={`a-neg-${idx}`}
                        className={`transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60`}
                      >
                        <td className="py-2.5 px-2 font-mono font-bold text-slate-400 text-[11px]">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-2 max-w-[200px]">
                          <div className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {row.fornecedorFilial}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-bold rounded ${
                            isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {row.idsCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-indigo-500">
                          {row.totalQty} un.
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {row.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* List 2: "Em negociação" (Top 15 Fornecedores, Fixed Real-Time) */}
        <div className={`lg:col-span-6 ${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b ${borderCol}`}>
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-500/20 text-blue-500 rounded-lg border border-blue-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm ${textHead} uppercase tracking-wider flex items-center gap-1.5`}>
                    <span>Em negociação</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.2 rounded-full font-bold border border-blue-500/30">
                      Tempo Real (Top 15)
                    </span>
                  </h3>
                  <p className={`text-[11px] ${textMuted} mt-0.5`}>
                    Status: "Em negociação" | Localidades Mecanizou (Mecanizou, Recebimento, Expresso, BH)
                  </p>
                </div>
              </div>
            </div>

            {fixedEmNegociacaoList.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                <p className="text-xs">Nenhum item com status "Em negociação" nas localidades alvo.</p>
              </div>
            ) : (
              <div className="max-h-[440px] overflow-y-auto overflow-x-auto pr-1 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${borderCol} text-[10px] font-bold uppercase ${textMuted} sticky top-0 ${isLight ? 'bg-white' : 'bg-slate-900'} z-10`}>
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Fornecedor + Filial</th>
                      <th className="py-2 px-2 text-center">IDs (Linhas)</th>
                      <th className="py-2 px-2 text-center">Quantidade</th>
                      <th className="py-2 px-2 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderCol}`}>
                    {fixedEmNegociacaoList.map((row, idx) => (
                      <tr 
                        key={`em-neg-${idx}`}
                        className={`transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60`}
                      >
                        <td className="py-2.5 px-2 font-mono font-bold text-slate-400 text-[11px]">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-2 max-w-[200px]">
                          <div className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {row.fornecedorFilial}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-bold rounded ${
                            isLight ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {row.idsCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-indigo-500">
                          {row.totalQty} un.
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {row.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 3: Top 20 Códigos Mais Recebidos & Top 20 Marcas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table 3: Top 20 Códigos mais recebidos (Increased from 10 to 20) */}
        <div className={`lg:col-span-6 ${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${borderCol}`}>
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/30">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm ${textHead} uppercase tracking-wider`}>
                    Top 20 Códigos Mais Recebidos (Devolução)
                  </h3>
                  <p className={`text-xs ${textMuted} mt-0.5`}>
                    Códigos com maior frequência de devolução no período
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
              }`}>
                Top 20
              </span>
            </div>

            {top20Codes.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs">Nenhum código registrado no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
                {top20Codes.map((item, rank) => (
                  <div 
                    key={`${item.code}-${rank}`}
                    className={`p-3 ${subCardBg} border rounded-xl flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-emerald-500 text-slate-950' 
                          : rank === 1 
                          ? 'bg-emerald-600 text-white' 
                          : rank === 2 
                          ? 'bg-emerald-700 text-white' 
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                          }`}>
                            {item.code}
                          </span>
                          <span className={`text-[10px] ${textMuted} font-medium truncate`}>
                            {item.brand}
                          </span>
                        </div>
                        <div className={`text-xs font-semibold truncate mt-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {item.sampleDesc}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-500 font-mono">
                        {item.count} {item.count === 1 ? 'item' : 'itens'}
                      </div>
                      <div className={`text-[10px] ${textMuted} font-medium`}>
                        Qtd total: {item.totalQty} | {item.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table 4: Top 20 Marcas mais recebidas */}
        <div className={`lg:col-span-6 ${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${borderCol}`}>
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-500/20 text-indigo-500 rounded-lg border border-indigo-500/30">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm ${textHead} uppercase tracking-wider`}>
                    Top 20 Marcas Mais Recebidas (Devolução)
                  </h3>
                  <p className={`text-xs ${textMuted} mt-0.5`}>
                    Fabricantes / Marcas com maior volume de peças em devolução
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
              }`}>
                Top 20
              </span>
            </div>

            {top20Brands.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs">Nenhuma marca registrada no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
                {top20Brands.map((brandItem, rank) => (
                  <div 
                    key={`${brandItem.brand}-${rank}`}
                    className={`p-3 ${subCardBg} border rounded-xl flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-indigo-500 text-white' 
                          : rank === 1 
                          ? 'bg-indigo-600 text-white' 
                          : rank === 2 
                          ? 'bg-indigo-700 text-white' 
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {brandItem.brand}
                        </div>
                        <div className={`w-28 sm:w-40 ${isLight ? 'bg-slate-200' : 'bg-slate-800'} h-1.5 rounded-full overflow-hidden mt-1 border border-slate-700/40`}>
                          <div 
                            className="bg-indigo-500 h-full rounded-full" 
                            style={{ width: `${brandItem.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-indigo-500 font-mono">
                        {brandItem.count} {brandItem.count === 1 ? 'peça' : 'peças'}
                      </div>
                      <div className={`text-[10px] ${textMuted} font-medium`}>
                        {brandItem.percentage}% do volume total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 4: Ranking of Mecânicas / Clientes */}
      <div className={`${cardBg} border rounded-2xl p-5`}>
        <div className={`flex items-center justify-between mb-4 pb-3 border-b ${borderCol}`}>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-500/20 text-indigo-500 rounded-lg border border-indigo-500/30">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm ${textHead} uppercase tracking-wider`}>
                Mecânicas com Mais Devoluções (Top 15)
              </h3>
              <p className={`text-xs ${textMuted} mt-0.5`}>
                Ranking filtrado pelo período e fornecedores selecionados
              </p>
            </div>
          </div>
        </div>

        {topClients.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-xs">Nenhuma mecânica registrada com devoluções no período.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topClients.map((client, rank) => (
              <div 
                key={`${client.cliente}-${rank}`}
                className={`p-3 ${subCardBg} border rounded-xl flex items-center justify-between gap-3`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    rank === 0 
                      ? 'bg-amber-500 text-slate-950' 
                      : rank === 1 
                      ? 'bg-slate-300 text-slate-950' 
                      : rank === 2 
                      ? 'bg-amber-700 text-white' 
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    #{rank + 1}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {client.cliente}
                    </div>
                    <div className={`w-24 bg-slate-700/40 h-1.5 rounded-full overflow-hidden mt-1`}>
                      <div 
                        className="bg-indigo-500 h-full rounded-full" 
                        style={{ width: `${client.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-indigo-500 font-mono">
                    {client.count}
                  </div>
                  <div className={`text-[10px] ${textMuted} font-medium`}>
                    {client.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
