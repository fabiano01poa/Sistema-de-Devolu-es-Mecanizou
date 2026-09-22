import React, { useState, useMemo, useEffect } from 'react';
import { 
  Handshake, 
  RotateCcw,
  Download, 
  Search, 
  Filter, 
  X, 
  Building2, 
  Calendar, 
  DollarSign, 
  Package, 
  Tag, 
  FileSpreadsheet,
  ChevronRight,
  Flame,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Check,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem } from '../types';
import { GbApprovalModal } from './GbApprovalModal';
import { GrupoRealApprovalModal } from './GrupoRealApprovalModal';
import { CompelApprovalModal } from './CompelApprovalModal';
import { DinparApprovalModal } from './DinparApprovalModal';
import { isGrupoRealItem } from '../utils/approvalParser';
import { SupplierConditionsModal, OFFICIAL_SUPPLIER_RULES } from './SupplierConditionsModal';
import { 
  isItemUrgent, 
  OFFICIAL_WARRANTY_STATUSES, 
  OFFICIAL_DEVOLUCAO_STATUSES, 
  OFFICIAL_OBS_STATUS_DEVOLUCAO,
  isWarrantyItem, 
  isDevolucaoItem, 
  matchesStatusFilter, 
  cleanNotaFiscal, 
  getItemNormalizedStatus, 
  getItemQualityCondition 
} from '../utils/statusUtils';
import { isDateInRange, parseDateString } from '../utils/dateUtils';
import { matchItemSupplier, matchItemFilial, getAvailableSuppliers, getAvailableFiliais, isAutomaticSupplierItem } from '../utils/supplierUtils';
import { MultiSelectFilter, MultiSelectOption } from './MultiSelectFilter';

interface NegociarViewProps {
  items: StockItem[];
  onSelectItem: (item: StockItem, contextItems?: StockItem[], contextLabel?: string) => void;
  onBatchUpdateStatus?: (updatedItems: StockItem[]) => void;
  mode?: 'garantias' | 'devolucoes';
  theme?: 'dark' | 'light';
}

export function calculateDaysSincePurchase(dataCompra?: string): number | null {
  if (!dataCompra || !dataCompra.trim()) return null;
  const parsed = parseDateString(dataCompra.trim());
  if (!parsed || isNaN(parsed.getTime())) return null;
  const today = new Date();
  const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dPurchase = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const diffDays = Math.floor((dToday - dPurchase) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

export function getItemTotalValue(item: StockItem): { rawNum: number; formatted: string } {
  // 1. Check item.valorTotal
  if (item.valorTotal && item.valorTotal.trim()) {
    const clean = item.valorTotal.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const parsed = parseFloat(clean);
    if (!isNaN(parsed) && parsed > 0) {
      return {
        rawNum: parsed,
        formatted: parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      };
    }
  }

  // 2. Check item.valorUnitario * quantEstoque
  if (item.valorUnitario && item.valorUnitario.trim()) {
    const cleanUnit = item.valorUnitario.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const unitPrice = parseFloat(cleanUnit);
    if (!isNaN(unitPrice) && unitPrice > 0) {
      const qtyNum = parseInt(item.quantEstoque || '1', 10) || 1;
      const total = unitPrice * qtyNum;
      return {
        rawNum: total,
        formatted: total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      };
    }
  }

  return {
    rawNum: 0,
    formatted: 'R$ 0,00'
  };
}

export const NegociarView: React.FC<NegociarViewProps> = ({ items = [], onSelectItem, onBatchUpdateStatus, mode = 'devolucoes', theme = 'dark' }) => {
  const isDevolucaoMode = true;
  const isLight = theme === 'light';

  const [searchTerm, setSearchTerm] = useState('');
  const [obsSearchTerm, setObsSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([]);
  const [selectedFornecedores, setSelectedFornecedores] = useState<string[]>([]);
  const [selectedNovosFornecedores, setSelectedNovosFornecedores] = useState<string[]>([]);
  
  // Date Filtering State
  const [dateType, setDateType] = useState<'dataIncidencia' | 'dataSaida' | 'dataRecebimento' | 'dataCompra' | 'dataSolicitacao'>('dataIncidencia');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [apenasUrgentes, setApenasUrgentes] = useState<boolean>(false);

  // Pagination State for Instant Smooth Rendering with 65k+ records
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Reset to page 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, obsSearchTerm, selectedStatuses, selectedLocalidades, selectedFornecedores, selectedNovosFornecedores, startDate, endDate, dateType, apenasUrgentes, items]);

  // Items are passed from App.tsx pre-filtered by start row threshold and mode
  const viewBaseItems = useMemo(() => {
    return (items || []).filter(i => isDevolucaoItem(i));
  }, [items]);

  // Selection & Bulk Action State
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<string>('Em negociação');
  const [targetObsStatusDevolucao, setTargetObsStatusDevolucao] = useState<string>(OFFICIAL_OBS_STATUS_DEVOLUCAO[0] || 'Aguardando aprovação fornecedor');
  const [customObsStatusDevolucao, setCustomObsStatusDevolucao] = useState<string>('');
  const [isCustomObsStatusDevolucao, setIsCustomObsStatusDevolucao] = useState<boolean>(false);
  const [updateObsStatusDevolucao, setUpdateObsStatusDevolucao] = useState<boolean>(false);

  useEffect(() => {
    setTargetStatus('Em negociação');
  }, []);

  const [updateStatus, setUpdateStatus] = useState<boolean>(true);
  
  const [bulkObsNf, setBulkObsNf] = useState<string>('');
  const [updateObsNf, setUpdateObsNf] = useState<boolean>(false);

  const [bulkObsGerais, setBulkObsGerais] = useState<string>('');
  const [updateObsGerais, setUpdateObsGerais] = useState<boolean>(false);

  const [bulkSuccessBanner, setBulkSuccessBanner] = useState<string | null>(null);

  // Supplier automation state (G&B approval modal & Grupo Real modal & retractable toolbar)
  const [isGbModalOpen, setIsGbModalOpen] = useState<boolean>(false);
  const [isGrupoRealModalOpen, setIsGrupoRealModalOpen] = useState<boolean>(false);
  const [isCompelModalOpen, setIsCompelModalOpen] = useState<boolean>(false);
  const [isDinparModalOpen, setIsDinparModalOpen] = useState<boolean>(false);
  const [isAutomationsBarVisible, setIsAutomationsBarVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('automations_bar_visible');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleAutomationsBar = () => {
    setIsAutomationsBarVisible(prev => {
      const next = !prev;
      try {
        localStorage.setItem('automations_bar_visible', String(next));
      } catch {}
      return next;
    });
  };

  const handleGbApplyChanges = (updatedItems: StockItem[]) => {
    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(updatedItems);
    }
    setBulkSuccessBanner(`Automação G&B: ${updatedItems.length} item(ns) atualizado(s) com sucesso para "Emitir NF"!`);
    setIsGbModalOpen(false);
    setTimeout(() => setBulkSuccessBanner(null), 6000);
  };

  const handleGrupoRealApplyChanges = (updatedItems: StockItem[]) => {
    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(updatedItems);
    }
    setBulkSuccessBanner(`Automação Grupo Real (Leste/Norte): ${updatedItems.length} item(ns) atualizado(s) com sucesso para "Emitir NF"!`);
    setIsGrupoRealModalOpen(false);
    setTimeout(() => setBulkSuccessBanner(null), 6000);
  };

  const handleCompelApplyChanges = (updatedItems: StockItem[]) => {
    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(updatedItems);
    }
    setBulkSuccessBanner(`Automação Compel: ${updatedItems.length} item(ns) atualizado(s) com sucesso para "Emitir NF"!`);
    setIsCompelModalOpen(false);
    setTimeout(() => setBulkSuccessBanner(null), 6000);
  };

  const handleDinparApplyChanges = (updatedItems: StockItem[]) => {
    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(updatedItems);
    }
    setBulkSuccessBanner(`Automação Dinpar: ${updatedItems.length} item(ns) atualizado(s) com sucesso para "Emitir NF"!`);
    setIsDinparModalOpen(false);
    setTimeout(() => setBulkSuccessBanner(null), 6000);
  };

  // Supplier conditions modal state
  const [isSupplierConditionsModalOpen, setIsSupplierConditionsModalOpen] = useState<boolean>(false);
  const [supplierConditionsInitialId, setSupplierConditionsInitialId] = useState<string | undefined>(undefined);

  const openSupplierModal = (supplierId?: string) => {
    setSupplierConditionsInitialId(supplierId);
    setIsSupplierConditionsModalOpen(true);
  };

  const handleSupplierBatchUpdate = (
    itemsToUpdate: StockItem[],
    newStatus?: string,
    obsStatusDevolucao?: string,
    obsGerais?: string,
    nfSaida?: string
  ) => {
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const finalBatch = itemsToUpdate.map(item => {
      const updated = { ...item, dataUltimaAlteracao: nowStr };
      if (newStatus) updated.statusDevolucao = newStatus;
      if (obsStatusDevolucao) updated.obsStatusDevolucao = obsStatusDevolucao;
      if (obsGerais) {
        updated.observacoesGerais = updated.observacoesGerais 
          ? `${obsGerais} | ${updated.observacoesGerais}` 
          : obsGerais;
      }
      if (nfSaida) updated.notaFiscalSaida = nfSaida;
      updated.ultimaInteracao = `${todayShort} - Regra de fornecedor aplicada em lote`;
      return updated;
    });

    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(finalBatch);
    }
    setBulkSuccessBanner(`${finalBatch.length} itens atualizados com base nas regras do fornecedor!`);
    setTimeout(() => setBulkSuccessBanner(null), 6000);
  };

  // Supplier item counts for quick action buttons
  const supplierCounts = useMemo(() => {
    return {
      gb: viewBaseItems.filter(i => matchItemSupplier(i, 'G&B')).length,
      grupoReal: viewBaseItems.filter(i => isGrupoRealItem(i)).length,
      mercadocar: viewBaseItems.filter(i => matchItemSupplier(i, 'MERCADOCAR')).length,
      cobra: viewBaseItems.filter(i => matchItemSupplier(i, 'COBRA')).length,
      josecar: viewBaseItems.filter(i => matchItemSupplier(i, 'JOSECAR')).length,
      sk: viewBaseItems.filter(i => matchItemSupplier(i, 'SK MOBILITY')).length,
    };
  }, [viewBaseItems]);

  // 1. Status List from items (official + all dynamic statuses from sheet)
  const statusList = useMemo(() => {
    const set = new Set<string>(OFFICIAL_DEVOLUCAO_STATUSES);
    viewBaseItems.forEach(i => {
      const st = getItemNormalizedStatus(i);
      if (st) set.add(st);
    });
    return Array.from(set);
  }, [viewBaseItems]);

  // Count items per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    statusList.forEach(st => {
      counts[st] = 0;
    });
    let totalUrgentes = 0;
    let totalAutomaticos = 0;
    let totalANegociarPrazo = 0;
    let totalEmNegociacaoPrazo = 0;

    for (let idx = 0; idx < viewBaseItems.length; idx++) {
      const i = viewBaseItems[idx];
      const isUrg = isItemUrgent(i);
      const isAuto = matchesStatusFilter(i, 'A negociar') && isAutomaticSupplierItem(i);
      const isANegPrazo = matchesStatusFilter(i, 'A negociar');
      const isEmNegPrazo = matchesStatusFilter(i, 'Em negociação');

      if (apenasUrgentes && !isUrg) continue;
      if (isUrg) totalUrgentes++;
      if (isAuto) totalAutomaticos++;
      if (isANegPrazo) totalANegociarPrazo++;
      if (isEmNegPrazo) totalEmNegociacaoPrazo++;

      const st = getItemNormalizedStatus(i);
      counts[st] = (counts[st] || 0) + 1;
    }

    return { counts, totalUrgentes, totalAutomaticos, totalANegociarPrazo, totalEmNegociacaoPrazo };
  }, [viewBaseItems, statusList, apenasUrgentes]);

  // Status MultiSelect Options sorted by count descending
  const statusOptions = useMemo<MultiSelectOption[]>(() => {
    const list: MultiSelectOption[] = [];
    if (statusCounts.totalANegociarPrazo > 0) {
      list.push({
        id: 'a_negociar_prazo',
        label: '⏳ A Negociar - Prazo',
        count: statusCounts.totalANegociarPrazo,
        isSpecial: true
      });
    }
    if (statusCounts.totalEmNegociacaoPrazo > 0) {
      list.push({
        id: 'em_negociacao_prazo',
        label: '⏳ Em Negociação - Prazo',
        count: statusCounts.totalEmNegociacaoPrazo,
        isSpecial: true
      });
    }
    if (statusCounts.totalAutomaticos > 0) {
      list.push({
        id: 'automaticos',
        label: '⚡ Automáticos - A negociar',
        count: statusCounts.totalAutomaticos,
        isSpecial: true
      });
    }
    if (statusCounts.totalUrgentes > 0) {
      list.push({
        id: 'urgente',
        label: '🔥 Apenas Urgentes',
        count: statusCounts.totalUrgentes,
        isSpecial: true
      });
    }
    const sorted = [...statusList].sort((a, b) => {
      const diff = (statusCounts.counts[b] || 0) - (statusCounts.counts[a] || 0);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });
    sorted.forEach(st => {
      list.push({
        id: st,
        label: st,
        count: statusCounts.counts[st] || 0
      });
    });
    return list;
  }, [statusList, statusCounts]);

  // 2. Filter items by Status & Urgencia / Automáticos for Cascading Supplier options
  const itemsAfterStatus = useMemo(() => {
    return viewBaseItems.filter(item => {
      if (selectedStatuses.length > 0) {
        const matchesAny = selectedStatuses.some(st => {
          if (st === 'urgente') return isItemUrgent(item);
          if (st === 'automaticos') return matchesStatusFilter(item, 'A negociar') && isAutomaticSupplierItem(item);
          if (st === 'a_negociar_prazo') return matchesStatusFilter(item, 'A negociar');
          if (st === 'em_negociacao_prazo') return matchesStatusFilter(item, 'Em negociação');
          return matchesStatusFilter(item, st);
        });
        if (!matchesAny) return false;
      }
      if (apenasUrgentes && !isItemUrgent(item)) return false;
      return true;
    });
  }, [viewBaseItems, selectedStatuses, apenasUrgentes]);

  // Count items per Fornecedor based on current Status filter
  const fornecedorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const suppliers = getAvailableSuppliers(itemsAfterStatus);
    suppliers.forEach(s => { counts[s] = 0; });
    itemsAfterStatus.forEach(item => {
      suppliers.forEach(s => {
        if (matchItemSupplier(item, s)) {
          counts[s] = (counts[s] || 0) + 1;
        }
      });
    });
    return counts;
  }, [itemsAfterStatus]);

  // Available Fornecedores based on selected Status, sorted by deadline (shortest first) when prazo mode is active, else count descending
  const supplierMinDays = useMemo(() => {
    const minDaysMap: Record<string, number> = {};
    const suppliers = Object.keys(fornecedorCounts);
    
    suppliers.forEach(supp => {
      const suppItems = itemsAfterStatus.filter(i => matchItemSupplier(i, supp));
      let min = 99999;
      suppItems.forEach(i => {
        const days = calculateDaysSincePurchase(i.dataCompra);
        if (days !== null && days < min) {
          min = days;
        }
      });
      minDaysMap[supp] = min === 99999 ? 0 : min;
    });

    return minDaysMap;
  }, [itemsAfterStatus, fornecedorCounts]);

  const availableFornecedores = useMemo(() => {
    const isPrazoMode = selectedStatuses.includes('a_negociar_prazo') || selectedStatuses.includes('em_negociacao_prazo');

    return Object.keys(fornecedorCounts).sort((a, b) => {
      if (isPrazoMode) {
        const daysA = supplierMinDays[a] ?? 9999;
        const daysB = supplierMinDays[b] ?? 9999;
        if (daysA !== daysB) {
          return daysA - daysB; // Shortest deadline first
        }
      }
      const countDiff = (fornecedorCounts[b] || 0) - (fornecedorCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [fornecedorCounts, supplierMinDays, selectedStatuses]);

  // Fornecedor MultiSelect Options
  const fornecedorOptions = useMemo<MultiSelectOption[]>(() => {
    return availableFornecedores.map(f => ({
      id: f,
      label: f,
      count: fornecedorCounts[f] || 0
    }));
  }, [availableFornecedores, fornecedorCounts]);

  // Auto-reset selectedFornecedores if no longer valid for the selected status
  useEffect(() => {
    if (selectedFornecedores.length > 0) {
      const valid = selectedFornecedores.filter(f => availableFornecedores.includes(f));
      if (valid.length !== selectedFornecedores.length) {
        setSelectedFornecedores(valid);
      }
    }
  }, [availableFornecedores, selectedFornecedores]);

  // 3. Filter items by Status AND Supplier for Cascading Filial options
  const itemsAfterFornecedor = useMemo(() => {
    return itemsAfterStatus.filter(item => {
      if (selectedFornecedores.length > 0) {
        const matchesAny = selectedFornecedores.some(f => matchItemSupplier(item, f));
        if (!matchesAny) return false;
      }
      return true;
    });
  }, [itemsAfterStatus, selectedFornecedores]);

  // Count items per Filial based on selected Status AND Fornecedor
  const filialCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const filiais = getAvailableFiliais(itemsAfterStatus, selectedFornecedores.length > 0 ? selectedFornecedores : 'all');
    filiais.forEach(f => { counts[f] = 0; });
    itemsAfterFornecedor.forEach(item => {
      filiais.forEach(f => {
        if (matchItemFilial(item, f)) {
          counts[f] = (counts[f] || 0) + 1;
        }
      });
    });
    return counts;
  }, [itemsAfterStatus, selectedFornecedores, itemsAfterFornecedor]);

  // Available Filiais based on selected Status AND selected Fornecedor, sorted by count descending
  const availableNovosFornecedores = useMemo(() => {
    return Object.keys(filialCounts).sort((a, b) => {
      const countDiff = (filialCounts[b] || 0) - (filialCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [filialCounts]);

  // Novo Fornecedor / Filial MultiSelect Options
  const filialOptions = useMemo<MultiSelectOption[]>(() => {
    return availableNovosFornecedores.map(ff => ({
      id: ff,
      label: ff,
      count: filialCounts[ff] || 0
    }));
  }, [availableNovosFornecedores, filialCounts]);

  // Auto-reset selectedNovosFornecedores if no longer valid for the selected supplier
  useEffect(() => {
    if (selectedNovosFornecedores.length > 0) {
      const valid = selectedNovosFornecedores.filter(ff => availableNovosFornecedores.includes(ff));
      if (valid.length !== selectedNovosFornecedores.length) {
        setSelectedNovosFornecedores(valid);
      }
    }
  }, [availableNovosFornecedores, selectedNovosFornecedores]);

  // Defined Target Localidades for quick multi-select buttons
  const targetLocalidades = useMemo(() => [
    'Mecanizou',
    'Mecanizou - Descarte',
    'Mecanizou - Recebimento',
    'Mecanizou - Expresso',
    'Mecanizou - Validação',
    'Mecanizou - BH',
    'Futura-Revenda'
  ], []);

  const handleToggleLocalidade = (loc: string) => {
    setSelectedLocalidades(prev => {
      if (prev.includes(loc)) {
        return prev.filter(l => l !== loc);
      } else {
        return [...prev, loc];
      }
    });
  };

  // Count items per Localidade (calculated on current status filter items)
  const localidadeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    targetLocalidades.forEach(loc => {
      counts[loc] = 0;
    });
    itemsAfterStatus.forEach(item => {
      const iLoc = (item.localidade || '').trim().toLowerCase();
      targetLocalidades.forEach(loc => {
        const targetClean = loc.trim().toLowerCase();
        if (iLoc === targetClean) {
          counts[loc] = (counts[loc] || 0) + 1;
        }
      });
    });
    return counts;
  }, [itemsAfterStatus, targetLocalidades]);

  const availableLocalidadesList = useMemo(() => {
    const set = new Set<string>([
      "Mecanizou",
      "Mecanizou - Descarte",
      "Mecanizou - Recebimento",
      "Mecanizou - Expresso",
      "Mecanizou - Validação",
      "Mecanizou - BH",
      "Futura-Revenda"
    ]);
    viewBaseItems.forEach(i => {
      if (i.localidade && i.localidade.trim()) {
        set.add(i.localidade.trim());
      }
    });
    return Array.from(set);
  }, [viewBaseItems]);

  // Helper date field picker
  const getItemDateField = (item: StockItem, field: 'dataIncidencia' | 'dataCompra' | 'dataSaida' | 'dataRecebimento' | 'dataSolicitacao'): string | undefined => {
    switch (field) {
      case 'dataIncidencia': return item.dataIncidencia;
      case 'dataSaida': return item.dataSaida;
      case 'dataRecebimento': return item.dataRecebimento;
      case 'dataCompra': return item.dataCompra;
      case 'dataSolicitacao': return item.dataSolicitacao;
      default: return item.dataIncidencia || item.dataSaida || item.dataRecebimento;
    }
  };

  // Preset Date Range Handler
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

  // Final Filtered Items for Display & Export
  const filteredItems = useMemo(() => {
    return itemsAfterFornecedor.filter(item => {
      // Filter Localidade (Multi-select buttons - only active in Devoluções mode)
      if (isDevolucaoMode && selectedLocalidades.length > 0) {
        const cleanLoc = (item.localidade || '').trim().toLowerCase();
        const matchesAny = selectedLocalidades.some(loc => {
          const cleanTarget = loc.trim().toLowerCase();
          return cleanLoc === cleanTarget;
        });
        if (!matchesAny) return false;
      }

      // Filter Novo Fornecedor / Filial (Multi-select)
      if (selectedNovosFornecedores.length > 0) {
        const matchesAny = selectedNovosFornecedores.some(ff => matchItemFilial(item, ff));
        if (!matchesAny) return false;
      }

      // Filter Date Range using selected dateType
      if (startDate || endDate) {
        const dateVal = getItemDateField(item, dateType);
        if (!isDateInRange(dateVal, startDate, endDate)) {
          return false;
        }
      }

      // Filter 1: General Search Term (ID Stock, Peça, Código, Marca, Fornecedor, Localidade, NF Origem, etc.)
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          (item.protocolo && item.protocolo.toLowerCase().includes(term)) ||
          (item.idStock && item.idStock.toLowerCase().includes(term)) ||
          (item.descricao && item.descricao.toLowerCase().includes(term)) ||
          (item.codigo && item.codigo.toLowerCase().includes(term)) ||
          (item.marca && item.marca.toLowerCase().includes(term)) ||
          (item.cliente && item.cliente.toLowerCase().includes(term)) ||
          (item.fornecedor && item.fornecedor.toLowerCase().includes(term)) ||
          (item.fornecedorOriginal && item.fornecedorOriginal.toLowerCase().includes(term)) ||
          (item.novoFornecedorFilial && item.novoFornecedorFilial.toLowerCase().includes(term)) ||
          (item.localidade && item.localidade.toLowerCase().includes(term)) ||
          (item.statusDevolucao && item.statusDevolucao.toLowerCase().includes(term)) ||
          (item.nfOrigem && item.nfOrigem.toLowerCase().includes(term)) ||
          (item.embalagem && item.embalagem.toLowerCase().includes(term)) ||
          (item.condicaoPeca && item.condicaoPeca.toLowerCase().includes(term)) ||
          (item.enderecamento && item.enderecamento.toLowerCase().includes(term)) ||
          (item.notaFiscalSaida && item.notaFiscalSaida.toLowerCase().includes(term));

        if (!matches) return false;
      }

      // Filter 2: Unified Search in Observations (OBS NOTA FISCAL + Observações Gerais + Motivo)
      if (obsSearchTerm && obsSearchTerm.trim()) {
        const obsTerm = obsSearchTerm.toLowerCase().trim();
        const matchesObs =
          (item.obsNotaFiscal && item.obsNotaFiscal.toLowerCase().includes(obsTerm)) ||
          (item.observacoesGerais && item.observacoesGerais.toLowerCase().includes(obsTerm)) ||
          (item.motivo && item.motivo.toLowerCase().includes(obsTerm));

        if (!matchesObs) return false;
      }

      return true;
    });
  }, [itemsAfterFornecedor, selectedLocalidades, selectedNovosFornecedores, dateType, startDate, endDate, searchTerm, obsSearchTerm]);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sorted Filtered Items
  const sortedFilteredItems = useMemo(() => {
    let list = filteredItems;
    if (!sortColumn && (selectedStatuses.includes('a_negociar_prazo') || selectedStatuses.includes('em_negociacao_prazo'))) {
      return [...list].sort((a, b) => {
        const daysA = calculateDaysSincePurchase(a.dataCompra) ?? 9999;
        const daysB = calculateDaysSincePurchase(b.dataCompra) ?? 9999;
        return daysA - daysB;
      });
    }

    if (!sortColumn) return list;
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'dataCompra') {
        const parsedA = parseDateString(a.dataCompra);
        const parsedB = parseDateString(b.dataCompra);
        const timeA = parsedA ? parsedA.getTime() : 0;
        const timeB = parsedB ? parsedB.getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortColumn === 'dias') {
        const daysA = calculateDaysSincePurchase(a.dataCompra) ?? -1;
        const daysB = calculateDaysSincePurchase(b.dataCompra) ?? -1;
        comparison = daysA - daysB;
      } else if (sortColumn === 'protocolo') {
        comparison = (a.protocolo || '').localeCompare(b.protocolo || '');
      } else if (sortColumn === 'idStock') {
        comparison = (a.idStock || '').localeCompare(b.idStock || '', undefined, { numeric: true });
      } else if (sortColumn === 'condicao') {
        comparison = (a.condicaoPeca || '').localeCompare(b.condicaoPeca || '');
      } else if (sortColumn === 'descricao') {
        comparison = (a.descricao || '').localeCompare(b.descricao || '');
      } else if (sortColumn === 'fornecedor') {
        comparison = (a.fornecedor || '').localeCompare(b.fornecedor || '');
      } else if (sortColumn === 'valorTotal') {
        comparison = getItemTotalValue(a).rawNum - getItemTotalValue(b).rawNum;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortColumn, sortDirection, selectedStatuses]);

  // Paginated slice for instant DOM rendering performance
  const totalPages = Math.max(1, Math.ceil(sortedFilteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedFilteredItems.slice(startIdx, startIdx + pageSize);
  }, [sortedFilteredItems, currentPage, pageSize]);

  // Unique item key generator for selections
  const getItemKey = (item: StockItem, idx: number): string => {
    return item.idStock ? `stk-${item.idStock}` : `idx-${item.codigo || 'item'}-${idx}`;
  };

  // Selected items subset
  const selectedItems = useMemo(() => {
    return sortedFilteredItems.filter((item, idx) => selectedKeys.has(getItemKey(item, idx)));
  }, [sortedFilteredItems, selectedKeys]);

  // Contextual items list for navigation inside DetailCard
  const navigationContext = useMemo(() => {
    if (selectedItems.length > 0) {
      return {
        list: selectedItems,
        label: 'Marcados'
      };
    }
    const supplierLabel = selectedFornecedores.length > 0 
      ? (selectedFornecedores.length === 1 ? selectedFornecedores[0] : `${selectedFornecedores.length} Fornecedores`)
      : undefined;
    return {
      list: sortedFilteredItems,
      label: supplierLabel
    };
  }, [selectedItems, sortedFilteredItems, selectedFornecedores]);

  // Calculate totals
  const totalValor = useMemo(() => {
    return sortedFilteredItems.reduce((acc, item) => {
      const valInfo = getItemTotalValue(item);
      return acc + valInfo.rawNum;
    }, 0);
  }, [sortedFilteredItems]);

  const selectedTotalValor = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const valInfo = getItemTotalValue(item);
      return acc + valInfo.rawNum;
    }, 0);
  }, [selectedItems]);

  // Selection Toggle Handlers
  const isAllFilteredSelected = useMemo(() => {
    if (sortedFilteredItems.length === 0) return false;
    return sortedFilteredItems.every((item, idx) => selectedKeys.has(getItemKey(item, idx)));
  }, [sortedFilteredItems, selectedKeys]);

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedKeys(new Set());
    } else {
      const nextKeys = new Set<string>();
      filteredItems.forEach((item, idx) => nextKeys.add(getItemKey(item, idx)));
      setSelectedKeys(nextKeys);
    }
  };

  const toggleSelectItem = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Items to export: strictly export selected items if any selected, otherwise all filtered
  const itemsToExport = useMemo(() => {
    if (selectedItems.length > 0) return selectedItems;
    return filteredItems;
  }, [selectedItems, filteredItems]);

  const hasActiveFilters = selectedStatuses.length > 0 || 
                           selectedLocalidades.length > 0 ||
                           selectedFornecedores.length > 0 || 
                           selectedNovosFornecedores.length > 0 || 
                           startDate !== '' || 
                           endDate !== '' || 
                           apenasUrgentes || 
                           searchTerm !== '' ||
                           obsSearchTerm !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setObsSearchTerm('');
    setSelectedStatuses([]);
    setSelectedLocalidades([]);
    setSelectedFornecedores([]);
    setSelectedNovosFornecedores([]);
    setStartDate('');
    setEndDate('');
    setApenasUrgentes(false);
  };

  // Batch Status & Notes Change Handler
  const handleApplyBulkStatus = () => {
    if (selectedItems.length === 0) return;
    if (!updateStatus && !updateObsStatusDevolucao && !updateObsNf && !updateObsGerais) return;

    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const effectiveObsStatus = isCustomObsStatusDevolucao ? customObsStatusDevolucao.trim() : targetObsStatusDevolucao;

    const changes: string[] = [];
    if (updateStatus && targetStatus) changes.push(`Status: "${targetStatus}"`);
    if (updateObsStatusDevolucao && effectiveObsStatus) changes.push(`Obs Status: "${effectiveObsStatus}"`);
    if (updateObsNf) changes.push(`Obs NF alterada`);
    if (updateObsGerais) changes.push(`Obs gerais alteradas`);

    const interacaoSummary = `${todayShort} - ${changes.join(' | ')} em lote`;

    const updatedBatch = selectedItems.map(item => {
      const updated = { ...item, dataUltimaAlteracao: nowStr, ultimaInteracao: interacaoSummary };
      if (updateStatus && targetStatus) {
        updated.statusDevolucao = targetStatus;
      }
      if (updateObsStatusDevolucao && effectiveObsStatus) {
        updated.obsStatusDevolucao = effectiveObsStatus;
      }
      if (updateObsNf && bulkObsNf) {
        const existingObs = item.obsNotaFiscal || '';
        if (existingObs.trim()) {
          const needsSpace = !/[\s/\-:;.,]$/.test(bulkObsNf) && !/^\s/.test(existingObs);
          updated.obsNotaFiscal = `${bulkObsNf}${needsSpace ? ' ' : ''}${existingObs}`;
        } else {
          updated.obsNotaFiscal = bulkObsNf;
        }
      }
      if (updateObsGerais && bulkObsGerais) {
        const existingObs = item.observacoesGerais || '';
        if (existingObs.trim()) {
          const needsSpace = !/[\s/\-:;.,]$/.test(bulkObsGerais) && !/^\s/.test(existingObs);
          updated.observacoesGerais = `${bulkObsGerais}${needsSpace ? ' ' : ''}${existingObs}`;
        } else {
          updated.observacoesGerais = bulkObsGerais;
        }
      }
      return updated;
    });

    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(updatedBatch);
    }

    const appliedFields: string[] = [];
    if (updateStatus) appliedFields.push('Status Devolução');
    if (updateObsStatusDevolucao) appliedFields.push('Obs do Status');
    if (updateObsNf) appliedFields.push('Obs Nota Fiscal');
    if (updateObsGerais) appliedFields.push('Observações Gerais');

    setBulkSuccessBanner(`Edição em massa realizada (${appliedFields.join(', ')}) em ${selectedItems.length} itens com sucesso!`);
    setIsBulkModalOpen(false);
    setTimeout(() => setBulkSuccessBanner(null), 5000);
  };

  // Helper to generate dynamic file names containing Supplier, Branch (if filtered or unique), and Date
  const getExportFileName = (extension: 'csv' | 'pdf') => {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10);

    // Determine Fornecedor
    let supplierName = '';
    if (selectedFornecedores.length === 1) {
      supplierName = selectedFornecedores[0];
    } else if (selectedFornecedores.length > 1) {
      supplierName = `${selectedFornecedores.length}_fornecedores`;
    } else if (itemsToExport.length > 0) {
      const firstForn = itemsToExport[0].fornecedor?.trim();
      if (firstForn && itemsToExport.every(item => (item.fornecedor?.trim() || '') === firstForn)) {
        supplierName = firstForn;
      }
    }

    // Determine Filial
    let branchName = '';
    if (selectedNovosFornecedores.length === 1) {
      branchName = selectedNovosFornecedores[0];
    } else if (selectedNovosFornecedores.length > 1) {
      branchName = `${selectedNovosFornecedores.length}_filiais`;
    } else if (itemsToExport.length > 0) {
      const firstBranch = itemsToExport[0].novoFornecedorFilial?.trim();
      if (firstBranch && itemsToExport.every(item => (item.novoFornecedorFilial?.trim() || '') === firstBranch)) {
        branchName = firstBranch;
      }
    }

    const sanitize = (str: string) => 
      str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-zA-Z0-9_\-]/g, '_') // keep letters, numbers, _, -
        .replace(/_+/g, '_') // collapse consecutive underscores
        .replace(/^_+|_+$/g, ''); // trim leading/trailing underscores

    const parts: string[] = [];
    if (selectedItems.length > 0) {
      parts.push('Selecionados');
    }

    parts.push(extension === 'pdf' 
      ? (isDevolucaoMode ? 'Relatorio_Devolucoes' : 'Relatorio_Garantias') 
      : (isDevolucaoMode ? 'Devolucoes_Pecas' : 'Negociacao_Garantias')
    );

    if (supplierName) {
      const cleanSupplier = sanitize(supplierName);
      if (cleanSupplier) parts.push(cleanSupplier);
    }

    if (branchName) {
      const cleanBranch = sanitize(branchName);
      if (cleanBranch) parts.push(cleanBranch);
    }

    parts.push(dateStamp);

    return `${parts.join('_')}.${extension}`;
  };

  // Download Excel / CSV Handler
  const handleExportExcel = () => {
    if (itemsToExport.length === 0) return;

    // Build array of objects with requested exact headers (Condicao removed as requested)
    const dataToExport = itemsToExport.map(item => {
      const valInfo = getItemTotalValue(item);
      const days = calculateDaysSincePurchase(item.dataCompra);
      return {
        'ID STOCK': item.idStock || '',
        'Dias': days !== null ? days : '',
        'Descrição': item.descricao || '',
        'Código': item.codigo || '',
        'Marca': item.marca || '',
        'Quant. em Estoque': item.quantEstoque || '1',
        'Endereçamento': item.enderecamento || '',
        'Fornecedor': item.fornecedor || '',
        'Novo Fornecedor/Filial': item.novoFornecedorFilial || '',
        'Valor total em estoque': valInfo.formatted,
        'Data compra': item.dataCompra || '',
        'NF Origem': cleanNotaFiscal(item.nfOrigem) || '',
        'Obs Nota Fiscal': item.obsNotaFiscal || item.observacoesGerais || ''
      };
    });

    // Convert to CSV using PapaParse with ';' delimiter (standard for Excel in PT/BR locale)
    const csvString = Papa.unparse(dataToExport, {
      delimiter: ';'
    });

    // Company Header Top Row for Excel/CSV
    const companyHeader = '"MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA";"CNPJ 37.199.406/0001-55"\n\n';

    // Add UTF-8 BOM so Microsoft Excel renders Portuguese characters correctly
    const blob = new Blob(['\uFEFF' + companyHeader + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const fileName = getExportFileName('csv');
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download PDF Handler
  const handleExportPDF = () => {
    if (itemsToExport.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Company Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA | CNPJ 37.199.406/0001-55', 14, 12);

    // Document Header Title
    doc.setFontSize(14);
    doc.setTextColor(isDevolucaoMode ? 99 : 16, isDevolucaoMode ? 102 : 185, isDevolucaoMode ? 241 : 129);
    doc.text(
      selectedItems.length > 0 
        ? (isDevolucaoMode ? 'Relatório de Devoluções de Peças (Itens Selecionados)' : 'Relatório de Garantias (Itens Selecionados)')
        : (isDevolucaoMode ? 'Relatório de Devoluções de Peças' : 'Relatório de Negociação de Garantias'), 
      14, 18
    );

    const exportTotalVal = itemsToExport.reduce((acc, item) => acc + getItemTotalValue(item).rawNum, 0);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Gerado em: ${dateStr} | Total de Itens: ${itemsToExport.length} | Valor Total: ${exportTotalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 23);

    // Active Filters Summary
    const filterSummary: string[] = [];
    if (selectedItems.length > 0) filterSummary.push(`Exportando apenas os ${selectedItems.length} itens marcados`);
    if (selectedStatuses.length > 0) filterSummary.push(`Status: ${selectedStatuses.join(', ')}`);
    if (selectedFornecedores.length > 0) filterSummary.push(`Fornecedores: ${selectedFornecedores.join(', ')}`);
    if (selectedNovosFornecedores.length > 0) filterSummary.push(`Filiais: ${selectedNovosFornecedores.join(', ')}`);
    if (startDate || endDate) filterSummary.push(`Período (${dateType}): ${startDate || 'Início'} até ${endDate || 'Hoje'}`);
    if (apenasUrgentes) filterSummary.push('Apenas Urgentes: Sim');
    if (searchTerm) filterSummary.push(`Busca Geral: "${searchTerm}"`);
    if (obsSearchTerm) filterSummary.push(`Busca Obs NF / Motivo: "${obsSearchTerm}"`);

    let startTableY = 27;
    if (filterSummary.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Filtros: ${filterSummary.join(' | ')}`, 14, 28);
      startTableY = 32;
    }

    // Build PDF table rows (Condicao removed as requested)
    const tableData = itemsToExport.map(item => {
      const valInfo = getItemTotalValue(item);
      const days = calculateDaysSincePurchase(item.dataCompra);
      return [
        item.idStock || '—',
        days !== null ? `${days}` : '—',
        item.descricao || '—',
        item.codigo || '—',
        item.marca || '—',
        item.quantEstoque || '1',
        item.fornecedor || '—',
        item.novoFornecedorFilial || '—',
        valInfo.formatted,
        item.dataCompra || '—',
        cleanNotaFiscal(item.nfOrigem) || '—',
        item.obsNotaFiscal || item.observacoesGerais || '—'
      ];
    });

    autoTable(doc, {
      startY: startTableY,
      head: [[
        'ID STOCK', 'Dias', 'Descrição', 'Código', 'Marca', 'Qtd', 
        'Fornecedor', 'Filial', 'Valor Total', 'Data Compra', 'NF Origem', 'Observações'
      ]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 18 },
        1: { halign: 'center', cellWidth: 12 },
        2: { cellWidth: 48 },
        3: { cellWidth: 16 },
        4: { cellWidth: 16 },
        5: { halign: 'center', cellWidth: 9 },
        6: { cellWidth: 28 },
        7: { cellWidth: 26 },
        8: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        9: { cellWidth: 16 },
        10: { cellWidth: 16 },
        11: { cellWidth: 28 }
      },
      didDrawPage: (data) => {
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 8);
      }
    });

    const fileName = getExportFileName('pdf');
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800/90 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl border ${isDevolucaoMode ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'}`}>
              {isDevolucaoMode ? <RotateCcw className="w-6 h-6" /> : <Handshake className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {isDevolucaoMode ? 'Painel de Devoluções de Peças' : 'Painel de Negociação de Garantias'}
                </h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${isDevolucaoMode ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isDevolucaoMode 
                  ? 'Gestão de devoluções com filtros encadeados, busca especializada e exportação direta na tabela.'
                  : 'Filtros encadeados (Status → Fornecedor → Filial) e exportação em Excel ou PDF.'}
              </p>
            </div>
          </div>

          {/* Quick Reset Filters in Top Header if active */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors bg-slate-800/90 hover:bg-slate-750 px-3 py-2 rounded-xl border border-slate-700/80 self-end md:self-auto cursor-pointer shadow-sm"
            >
              <X className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Limpar Filtros
            </button>
          )}
        </div>

        {bulkSuccessBanner && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{bulkSuccessBanner}</span>
            </div>
            <button onClick={() => setBulkSuccessBanner(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Retractable Supplier Automations & PDF Import Bar */}
        <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-md">
          <div className="px-4 py-3 flex items-center justify-between bg-slate-950/90 border-b border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white tracking-tight">
                    Automações & Importações de Fornecedores
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.2 rounded-full">
                    G&B Ativo
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Importe espelhos de aprovação em PDF para conciliação automática de autorizações, NF e status.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleAutomationsBar}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition-colors cursor-pointer shadow-sm"
              title={isAutomationsBarVisible ? "Ocultar botões de automação" : "Exibir botões de automação"}
            >
              {isAutomationsBarVisible ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ocultar Barra</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exibir Automações</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
            </button>
          </div>

          {isAutomationsBarVisible && (
            <div className="p-4 bg-sky-50/40 dark:bg-slate-900/40 border-t border-sky-100 dark:border-slate-800 animate-fadeIn">
              <div className="flex flex-wrap items-center gap-3">
                {/* Central de Fornecedores Button */}
                <button
                  type="button"
                  onClick={() => openSupplierModal()}
                  className="group relative flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-950/20 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white font-bold text-xs group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">
                        Central de Fornecedores
                      </span>
                      <span className="text-[10px] bg-white/20 text-white px-2 py-0.2 rounded-full font-semibold">
                        Regras & Prazos
                      </span>
                    </div>
                    <p className="text-[10px] text-sky-100">
                      Políticas comerciais, prazos legais e lote por fornecedor
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* G&B PDF Approval Import Button */}
                <button
                  type="button"
                  onClick={() => setIsGbModalOpen(true)}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-xs group-hover:scale-105 transition-transform">
                    G&B
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        G&B Peças
                      </span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Espelho PDF
                      </span>
                      {supplierCounts.gb > 0 && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono text-slate-600 dark:text-slate-400">
                          {supplierCounts.gb}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Importar autorização Citel
                    </p>
                  </div>
                </button>

                {/* Grupo Real PDF Approval Import Button (Consolidated Leste + Norte) */}
                <button
                  type="button"
                  id="btn-grupo-real-automacao"
                  onClick={() => setIsGrupoRealModalOpen(true)}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-amber-50/60 dark:hover:bg-slate-800 border border-amber-300 dark:border-amber-700/70 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-xs group-hover:scale-105 transition-transform">
                    REAL
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Grupo Real
                      </span>
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Leste & Norte (1 Botão)
                      </span>
                      {supplierCounts.grupoReal > 0 && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono text-slate-600 dark:text-slate-400">
                          {supplierCounts.grupoReal}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      RMPR1660 / Cód. Prod. x NF
                    </p>
                  </div>
                </button>

                {/* Compel PDF Approval Import Button */}
                <button
                  type="button"
                  id="btn-compel-automacao"
                  onClick={() => setIsCompelModalOpen(true)}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-300 dark:border-sky-700/70 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-xs group-hover:scale-105 transition-transform">
                    COMP
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Compel
                      </span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Espelho PDF
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Autorização Compel x NF
                    </p>
                  </div>
                </button>

                {/* Dinpar PDF Approval Import Button */}
                <button
                  type="button"
                  id="btn-dinpar-automacao"
                  onClick={() => setIsDinparModalOpen(true)}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-300 dark:border-sky-700/70 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-xs group-hover:scale-105 transition-transform">
                    DIN
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Dinpar
                      </span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Espelho PDF
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Autorização Dinpar x NF
                    </p>
                  </div>
                </button>

                {/* Mercadocar Button (Regra dos 30 Dias) */}
                <button
                  type="button"
                  onClick={() => openSupplierModal('mercadocar')}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-700 dark:text-sky-300 font-black text-xs group-hover:scale-105 transition-transform">
                    MC
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Mercadocar
                      </span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Regra 30D
                      </span>
                      {supplierCounts.mercadocar > 0 && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono text-slate-600 dark:text-slate-400">
                          {supplierCounts.mercadocar}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Prazos e filiais de devolução
                    </p>
                  </div>
                </button>

                {/* Cobra Automotiva Button (Regra 7D) */}
                <button
                  type="button"
                  onClick={() => openSupplierModal('cobra')}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-700 dark:text-sky-300 font-black text-xs group-hover:scale-105 transition-transform">
                    CO
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Cobra
                      </span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Regra 7D
                      </span>
                      {supplierCounts.cobra > 0 && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono text-slate-600 dark:text-slate-400">
                          {supplierCounts.cobra}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Garantia técnica & comercial
                    </p>
                  </div>
                </button>

                {/* Josecar Button (Regra 15D) */}
                <button
                  type="button"
                  onClick={() => openSupplierModal('josecar')}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-700 dark:text-sky-300 font-black text-xs group-hover:scale-105 transition-transform">
                    JC
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Josecar
                      </span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Regra 15D
                      </span>
                      {supplierCounts.josecar > 0 && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono text-slate-600 dark:text-slate-400">
                          {supplierCounts.josecar}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Devolução balcão filial
                    </p>
                  </div>
                </button>

                {/* SK Mobility (GM) Button */}
                <button
                  type="button"
                  onClick={() => openSupplierModal('sk_mobility')}
                  className="group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-700 dark:text-sky-300 font-black text-xs group-hover:scale-105 transition-transform">
                    GM
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        SK Mobility
                      </span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                        Genuína GM
                      </span>
                      {supplierCounts.sk > 0 && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono text-slate-600 dark:text-slate-400">
                          {supplierCounts.sk}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Linha GM Concessionária
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters Controls Grid */}
        <div className="pt-4 space-y-4">
          {/* Localidade Multi-select Button Bar (Only shown in Devoluções mode) */}
          {isDevolucaoMode && (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Filtro por Localidade</span>
                  {selectedLocalidades.length > 0 && (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      {selectedLocalidades.length} selecionada(s)
                    </span>
                  )}
                </div>
                {selectedLocalidades.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedLocalidades([])}
                    className="text-[10px] text-slate-400 hover:text-emerald-400 underline font-medium cursor-pointer"
                  >
                    Limpar seleção (Ver todas)
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {/* Option "Todas" */}
                <button
                  type="button"
                  onClick={() => setSelectedLocalidades([])}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-1.5 cursor-pointer ${
                    selectedLocalidades.length === 0
                      ? 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200 font-medium'
                  }`}
                >
                  <span>Todas as Localidades</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedLocalidades.length === 0 ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'}`}>
                    {itemsAfterStatus.length}
                  </span>
                </button>

                {/* Target Localidades Toggle Buttons */}
                {targetLocalidades.map((loc, lIdx) => {
                  const isSelected = selectedLocalidades.includes(loc);
                  const count = localidadeCounts[loc] || 0;
                  return (
                    <button
                      key={`loc-btn-${loc}-${lIdx}`}
                      type="button"
                      onClick={() => handleToggleLocalidade(loc)}
                      className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200 font-medium'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      <span>{loc}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Filters Bar (Automáticos + Urgentes) */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Atalhos Rápidos de Seleção</span>
              </div>
              {(selectedStatuses.length > 0 || apenasUrgentes) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatuses([]);
                    setApenasUrgentes(false);
                  }}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 underline font-medium cursor-pointer"
                >
                  Limpar atalhos (Ver todos)
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {/* All Statuses Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatuses([]);
                  setApenasUrgentes(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-1.5 cursor-pointer ${
                  selectedStatuses.length === 0 && !apenasUrgentes
                    ? 'bg-slate-700 text-white font-bold border-slate-600 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200 font-medium'
                }`}
              >
                <span>Todos os Status</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatuses.length === 0 && !apenasUrgentes ? 'bg-slate-800 text-slate-100' : 'bg-slate-800 text-slate-400'}`}>
                  {viewBaseItems.length}
                </span>
              </button>

              {/* Automáticos Button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedStatuses.includes('automaticos')) {
                    setSelectedStatuses(prev => prev.filter(s => s !== 'automaticos'));
                  } else {
                    setSelectedStatuses(prev => [...prev, 'automaticos']);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-2 cursor-pointer font-bold ${
                  selectedStatuses.includes('automaticos')
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/50 ring-2 ring-amber-400/40'
                    : 'bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-900/50'
                }`}
                title="Filtrar fornecedores da lista Automáticos com Status A Negociar"
              >
                <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span>⚡ Automáticos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  selectedStatuses.includes('automaticos') ? 'bg-slate-950 text-amber-300' : 'bg-amber-900/80 text-amber-200'
                }`}>
                  {statusCounts.totalAutomaticos}
                </span>
              </button>

              {/* A Negociar - Prazo Button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedStatuses.includes('a_negociar_prazo')) {
                    setSelectedStatuses(prev => prev.filter(s => s !== 'a_negociar_prazo'));
                  } else {
                    setSelectedStatuses(prev => [...prev.filter(s => s !== 'em_negociacao_prazo'), 'a_negociar_prazo']);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-2 cursor-pointer font-bold ${
                  selectedStatuses.includes('a_negociar_prazo')
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-950/50 ring-2 ring-cyan-400/40'
                    : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/80 hover:bg-cyan-900/50'
                }`}
                title="Filtrar A Negociar ordenado por prazo mais curto"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>⏳ A Negociar - Prazo</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  selectedStatuses.includes('a_negociar_prazo') ? 'bg-cyan-950 text-white' : 'bg-cyan-900/80 text-cyan-200'
                }`}>
                  {statusCounts.totalANegociarPrazo}
                </span>
              </button>

              {/* Em Negociação - Prazo Button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedStatuses.includes('em_negociacao_prazo')) {
                    setSelectedStatuses(prev => prev.filter(s => s !== 'em_negociacao_prazo'));
                  } else {
                    setSelectedStatuses(prev => [...prev.filter(s => s !== 'a_negociar_prazo'), 'em_negociacao_prazo']);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-2 cursor-pointer font-bold ${
                  selectedStatuses.includes('em_negociacao_prazo')
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-950/50 ring-2 ring-indigo-400/40'
                    : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/50'
                }`}
                title="Filtrar Em Negociação ordenado por prazo mais curto"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>⏳ Em Negociação - Prazo</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  selectedStatuses.includes('em_negociacao_prazo') ? 'bg-indigo-950 text-white' : 'bg-indigo-900/80 text-indigo-200'
                }`}>
                  {statusCounts.totalEmNegociacaoPrazo}
                </span>
              </button>

              {/* Urgentes Button */}
              <button
                type="button"
                onClick={() => setApenasUrgentes(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-2 cursor-pointer font-bold ${
                  apenasUrgentes
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/50 ring-2 ring-red-400/40'
                    : 'bg-red-950/40 text-red-300 border-red-800/80 hover:bg-red-900/50'
                }`}
              >
                <Flame className="w-3.5 h-3.5 fill-current text-red-400" />
                <span>🔥 Urgentes</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  apenasUrgentes ? 'bg-red-950 text-white' : 'bg-red-900/80 text-red-200'
                }`}>
                  {statusCounts.totalUrgentes}
                </span>
              </button>
            </div>
          </div>

          {/* 1. Date Filter Section (MOVED UP: sitting right below Quick Selection Shortcuts) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Filtro de Período por Tipo de Data</span>
              </div>

              {/* Quick Preset Date Buttons */}
              <div className="flex items-center space-x-1 text-[11px] flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuickRange('all')}
                  className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    !startDate && !endDate ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Tudo
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('this_month')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last_30')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  Últimos 30d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last_90')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  Últimos 90d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('this_year')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  Este Ano
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Date Type Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Filtrar por Campo de Data
                </label>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
                >
                  <option value="dataIncidencia">⚡ Data de Incidência (Coluna Q)</option>
                  <option value="dataSaida">🚚 Data de Saída / Envio</option>
                  <option value="dataRecebimento">📦 Data de Recebimento (Estoque)</option>
                  <option value="dataCompra">📅 Data de Compra (NF Origem)</option>
                  <option value="dataSolicitacao">📝 Data de Solicitação</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Multi-Select Dropdown Filters: Status, Fornecedor e Filial (Ordered Highest to Lowest) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
              <span className="flex items-center text-slate-300">
                <Filter className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Filtros de Múltipla Seleção (Status, Fornecedor e Filial)
              </span>
              {(selectedStatuses.length > 0 || selectedFornecedores.length > 0 || selectedNovosFornecedores.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatuses([]);
                    setSelectedFornecedores([]);
                    setSelectedNovosFornecedores([]);
                  }}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 underline font-medium cursor-pointer"
                >
                  Resetar seletores
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Filter 1: Status */}
              <div>
                <MultiSelectFilter
                  label="1. Status da Devolução"
                  allLabel={`Todos os Status (${viewBaseItems.length})`}
                  options={statusOptions}
                  selectedIds={selectedStatuses}
                  onChange={setSelectedStatuses}
                  theme={theme}
                />
              </div>

              {/* Filter 2: Fornecedor (Sorted highest to lowest) */}
              <div>
                <MultiSelectFilter
                  label="2. Fornecedor"
                  allLabel={`Todos os Fornecedores (${itemsAfterStatus.length})`}
                  options={fornecedorOptions}
                  selectedIds={selectedFornecedores}
                  onChange={setSelectedFornecedores}
                  badge={selectedStatuses.length > 0 ? "Filtrado p/ Status" : undefined}
                  theme={theme}
                />
              </div>

              {/* Filter 3: Novo Fornecedor / Filial (Sorted highest to lowest) */}
              <div>
                <MultiSelectFilter
                  label="3. Novo Fornecedor / Filial"
                  allLabel={`Todas as Filiais (${itemsAfterFornecedor.length})`}
                  options={filialOptions}
                  selectedIds={selectedNovosFornecedores}
                  onChange={setSelectedNovosFornecedores}
                  badge={selectedFornecedores.length > 0 ? "Filtrado p/ Fornecedor" : undefined}
                  theme={theme}
                />
              </div>
            </div>
          </div>

          {/* 3. Dual Search Rows & Urgentes Toggle (Campos de Busca) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Campos de Busca Especializada</span>
              </div>
              {(searchTerm || obsSearchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setObsSearchTerm('');
                  }}
                  className="text-[10px] text-slate-400 hover:text-indigo-400 underline font-medium cursor-pointer"
                >
                  Limpar buscas
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search 1: General Info Search */}
              <div className="md:col-span-5 relative">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center">
                    <Search className="w-3 h-3 mr-1 text-indigo-400" /> 1. Busca Geral (Peça / Fornecedor / ID / NF)
                  </span>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-[9px] text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ID Stock, Peça, Código, Marca, Fornecedor, Local, NF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search 2: Unified Observations & Motivo Search */}
              <div className="md:col-span-5 relative">
                <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="w-3 h-3 mr-1 text-emerald-400" /> 2. Busca Obs NF + Obs Gerais / Motivo
                  </span>
                  {obsSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setObsSearchTerm('')}
                      className="text-[9px] text-emerald-400/80 hover:text-emerald-300 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar em Obs. Nota Fiscal e Observações Gerais / Motivo..."
                    value={obsSearchTerm}
                    onChange={(e) => setObsSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-800/60 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-2 text-xs text-emerald-200 outline-none placeholder:text-slate-500 font-medium"
                  />
                  <FileText className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                  {obsSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setObsSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Urgentes Toggle Button */}
              <div className="md:col-span-2 flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setApenasUrgentes(!apenasUrgentes)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    apenasUrgentes 
                      ? 'bg-red-950 text-red-300 border-red-700 shadow-md ring-1 ring-red-500/50' 
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Exibir somente devoluções marcadas como Urgentes"
                >
                  <Flame className={`w-3.5 h-3.5 ${apenasUrgentes ? 'text-red-400 fill-red-400' : 'text-slate-500'}`} />
                  <span>{apenasUrgentes ? 'Apenas Urgentes' : 'Filtro Urgentes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary for Negotiation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Itens Filtrados</div>
            <div className="text-xl font-bold text-white font-mono">{filteredItems.length} unidades</div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Valor Total em Negociação</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3.5">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Fornecedores Filtrados</div>
            <div className="text-xl font-bold text-purple-300 font-mono">
              {new Set(filteredItems.map(i => i.fornecedor).filter(Boolean)).size} parceiros
            </div>
          </div>
        </div>
      </div>

      {/* Table Preview of Negotiable Items */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden">
        {/* Table Action Bar: Features the requested Export & Bulk Action Buttons directly above the table */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800/90 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider flex-wrap gap-y-1">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Colunas da Tabela de Negociação</span>
            </div>
            {selectedItems.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
                {selectedItems.length} selecionado{selectedItems.length > 1 ? 's' : ''} ({selectedTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
              </span>
            )}
          </div>

          {/* Action buttons from print (Trocar Status, Baixar Excel, Baixar PDF) + Select controls */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-wrap gap-y-2">
            {/* Trocar Status Button (from print: purple pill) */}
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all duration-150 active:scale-95 shadow-lg shadow-indigo-950/40 animate-pulse cursor-pointer ring-1 ring-white/20"
                title="Alterar o status de todos os itens selecionados em massa"
              >
                <Tag className="w-4 h-4 mr-1.5" />
                <span>Trocar Status ({selectedItems.length})</span>
              </button>
            )}

            {/* Baixar Excel Button (from print: green pill) */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all duration-150 active:scale-95 shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ring-1 ring-white/20"
              title="Exportar planilha para Excel (CSV / UTF-8)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              <span>
                {selectedItems.length > 0 ? `Baixar Excel (${selectedItems.length})` : 'Baixar Excel'}
              </span>
            </button>

            {/* Baixar PDF Button (from print: red pill) */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all duration-150 active:scale-95 shadow-lg shadow-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ring-1 ring-white/20"
              title="Exportar relatório formatado em PDF"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              <span>
                {selectedItems.length > 0 ? `Baixar PDF (${selectedItems.length})` : 'Baixar PDF'}
              </span>
            </button>

            {/* Select/Deselect All filtered items */}
            <div className="flex items-center space-x-1.5 pl-1 border-l border-slate-800">
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold border border-slate-700/80 transition-all cursor-pointer shadow-sm"
              >
                {isAllFilteredSelected ? 'Desmarcar Todos' : `Marcar Todos (${filteredItems.length})`}
              </button>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedKeys(new Set())}
                  className="text-xs px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium border border-slate-800 transition-all cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Package className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p className="text-sm font-semibold">Nenhum item encontrado com os filtros selecionados.</p>
            <p className="text-xs text-slate-600">Tente limpar ou alterar os filtros acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-300 border-collapse">
              <thead className="bg-slate-950/90 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                      title={isAllFilteredSelected ? "Desmarcar todos" : "Marcar todos os itens visíveis"}
                    />
                  </th>
                  {/* 1. Condição da Peça (Moved to the start) */}
                  <th 
                    className="py-2.5 px-2 text-center cursor-pointer select-none hover:text-white transition-colors group/sort"
                    onClick={() => handleSort('condicao')}
                    title="Ordenar por Condição"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Condição</span>
                      {sortColumn === 'condicao' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-40 group-hover/sort:opacity-100" />
                      )}
                    </div>
                  </th>
                  {/* 2. Dias (Today - Data Compra) */}
                  <th 
                    className="py-2.5 px-2 text-center cursor-pointer select-none hover:text-white transition-colors group/sort"
                    onClick={() => handleSort('dias')}
                    title="Dias desde a compra (Hoje - Data de Compra)"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Dias</span>
                      {sortColumn === 'dias' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-40 group-hover/sort:opacity-100" />
                      )}
                    </div>
                  </th>
                  {/* 3. ID STOCK */}
                  <th 
                    className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                    onClick={() => handleSort('idStock')}
                    title="Ordenar por ID STOCK"
                  >
                    <div className="flex items-center space-x-1">
                      <span>ID STOCK</span>
                      {sortColumn === 'idStock' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-40 group-hover/sort:opacity-100" />
                      )}
                    </div>
                  </th>
                  {/* 4. Descrição / Peça */}
                  <th 
                    className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                    onClick={() => handleSort('descricao')}
                    title="Ordenar por Descrição"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Descrição / Peça</span>
                      {sortColumn === 'descricao' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-40 group-hover/sort:opacity-100" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-2">Código</th>
                  <th className="py-2.5 px-2">Marca</th>
                  <th className="py-2.5 px-1.5 text-center">Qtd</th>
                  <th className="py-2.5 px-2">Endereçamento</th>
                  {/* Fornecedor */}
                  <th 
                    className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                    onClick={() => handleSort('fornecedor')}
                    title="Ordenar por Fornecedor"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Fornecedor</span>
                      {sortColumn === 'fornecedor' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-40 group-hover/sort:opacity-100" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-2">Novo Forn. / Filial</th>
                  {/* Valor Total */}
                  <th 
                    className="py-2.5 px-2 text-right cursor-pointer select-none hover:text-white transition-colors group/sort"
                    onClick={() => handleSort('valorTotal')}
                    title="Ordenar por Valor Total"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Valor Total</span>
                      {sortColumn === 'valorTotal' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-40 group-hover/sort:opacity-100" />
                      )}
                    </div>
                  </th>
                  {/* Data Compra */}
                  <th 
                    className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort bg-indigo-950/40 border-x border-indigo-900/50"
                    onClick={() => handleSort('dataCompra')}
                    title="Ordenar por Data de Compra"
                  >
                    <div className="flex items-center space-x-1 text-indigo-300 group-hover/sort:text-white">
                      <span className="font-extrabold">Data Compra</span>
                      {sortColumn === 'dataCompra' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-300" /> : <ArrowDown className="w-3 h-3 text-indigo-300" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-indigo-400/70 group-hover/sort:text-indigo-200" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-2">NF Origem</th>
                  <th className="py-2.5 px-2">Obs Nota Fiscal</th>
                  {/* Protocolo (Moved to the end of initial table view) */}
                  <th 
                    className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                    onClick={() => handleSort('protocolo')}
                    title="Ordenar por Protocolo"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Protocolo</span>
                      {sortColumn === 'protocolo' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-40 group-hover/sort:opacity-100" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {paginatedItems.map((item, idx) => {
                  const absoluteIdx = (currentPage - 1) * pageSize + idx;
                  const valInfo = getItemTotalValue(item);
                  const key = getItemKey(item, absoluteIdx);
                  const isRowSelected = selectedKeys.has(key);
                  const quality = getItemQualityCondition(item);
                  const daysSince = calculateDaysSincePurchase(item.dataCompra);

                  return (
                    <tr
                      key={`neg-row-${item.idStock || absoluteIdx}-${absoluteIdx}`}
                      onClick={() => onSelectItem(item, navigationContext.list, navigationContext.label)}
                      className={`cursor-pointer transition-colors group ${
                        isRowSelected 
                          ? 'bg-emerald-950/30 text-emerald-100 border-l-4 border-l-emerald-500' 
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-2 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleSelectItem(key)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                        />
                      </td>
                      {/* 1. Condição Item (at start) */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] tracking-wide ${quality.badgeClass}`} title={`Embalagem: ${item.embalagem || 'N/A'} | Condição da Peça: ${item.condicaoPeca || 'N/A'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${quality.dotColor}`} />
                          {quality.label}
                        </span>
                      </td>
                      {/* 2. Dias (Today - Data Compra) */}
                      <td className="py-2 px-2 text-center font-mono font-medium text-slate-300 whitespace-nowrap">
                        {daysSince !== null ? `${daysSince}d` : <span className="text-slate-600">—</span>}
                      </td>
                      {/* 3. ID STOCK */}
                      <td className="py-2 px-2 font-mono font-bold text-slate-200 whitespace-nowrap">
                        {item.idStock || '—'}
                      </td>
                      {/* 4. Descrição */}
                      <td className="py-2 px-2 font-semibold text-slate-100 max-w-[200px] truncate" title={item.descricao}>
                        {item.descricao || '—'}
                      </td>
                      {/* Código */}
                      <td className="py-2 px-2 font-mono text-slate-300 whitespace-nowrap">
                        {item.codigo || '—'}
                      </td>
                      {/* Marca */}
                      <td className="py-2 px-2 font-medium text-slate-300 whitespace-nowrap">
                        {item.marca || '—'}
                      </td>
                      {/* Qtd */}
                      <td className="py-2 px-1.5 text-center font-bold text-slate-200">
                        {item.quantEstoque || '1'}
                      </td>
                      {/* Endereçamento */}
                      <td className="py-2 px-2 font-mono text-cyan-300 font-semibold whitespace-nowrap">
                        {item.enderecamento || '—'}
                      </td>
                      {/* Fornecedor */}
                      <td className="py-2 px-2 text-slate-300 max-w-[140px] truncate" title={item.fornecedor}>
                        {item.fornecedor || '—'}
                      </td>
                      {/* Novo Fornecedor / Filial */}
                      <td className="py-2 px-2 text-indigo-300 max-w-[160px]" title={item.novoFornecedorFilial}>
                        <div className="flex items-center space-x-1">
                          <span className="truncate">{item.novoFornecedorFilial || '—'}</span>
                          {isAutomaticSupplierItem(item) && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-amber-950 text-amber-300 border border-amber-800/80 shrink-0" title="Fornecedor / Filial com processo Automático">
                              ⚡ Auto
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Valor Total */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {valInfo.formatted}
                      </td>
                      {/* Data Compra */}
                      <td className="py-2 px-2 font-mono text-slate-400 whitespace-nowrap">
                        {item.dataCompra || '—'}
                      </td>
                      {/* NF Origem */}
                      <td className="py-2 px-2 font-mono text-amber-300 whitespace-nowrap">
                        {cleanNotaFiscal(item.nfOrigem) || '—'}
                      </td>
                      {/* Obs Nota Fiscal */}
                      <td className="py-2 px-2 text-slate-400 max-w-[160px] truncate" title={item.obsNotaFiscal || item.observacoesGerais}>
                        {item.obsNotaFiscal || item.observacoesGerais || '—'}
                      </td>
                      {/* Protocolo (Moved to the end) */}
                      <td className="py-2 px-2 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {item.protocolo || '—'}
                      </td>
                      {/* Ação */}
                      <td className="py-2 px-2 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(item, navigationContext.list, navigationContext.label);
                          }}
                          className="p-1 text-slate-500 group-hover:text-white transition-colors bg-slate-950 rounded-lg border border-slate-800"
                          title="Abrir Detalhes"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar for Fast Navigation */}
        {filteredItems.length > 0 && (
          <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span>Exibindo</span>
              <span className="font-bold text-slate-200">
                {((currentPage - 1) * pageSize + 1).toLocaleString('pt-BR')}–{Math.min(currentPage * pageSize, filteredItems.length).toLocaleString('pt-BR')}
              </span>
              <span>de</span>
              <span className="font-bold text-slate-200">{filteredItems.length.toLocaleString('pt-BR')}</span>
              <span>devoluções encontradas</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-500">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-semibold cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-slate-200 font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Primeira página"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-slate-200 font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 font-mono text-slate-200 font-bold bg-slate-900/60 py-1 rounded-lg border border-slate-800/80">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-slate-200 font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-slate-200 font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Última página"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Status & Notes Update Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-fadeIn text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Editar Itens Selecionados em Massa</h3>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl space-y-1">
              <div className="text-xs font-bold text-indigo-300">
                {selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </div>
              <div className="text-xs text-indigo-200 font-mono">
                Valor Total acumulado: {selectedTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="text-[11px] text-indigo-300/90 font-medium italic pt-1 border-t border-indigo-500/20 mt-1">
                💡 As informações digitadas em observações serão adicionadas à frente do texto já existente, preservando o histórico de cada item.
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Option 1: Update Status Devolução */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Alterar Status Devolução
                  </span>
                </label>
                {updateStatus && (
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-medium mt-1"
                  >
                    {OFFICIAL_WARRANTY_STATUSES.map((st, sIdx) => (
                      <option key={`bulk-opt-${st}-${sIdx}`} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Option 2: Update Observação do Status de Devolução (NEW) */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsStatusDevolucao}
                    onChange={(e) => setUpdateObsStatusDevolucao(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Alterar "Observação do status de devolução"
                  </span>
                </label>
                {updateObsStatusDevolucao && (
                  <div className="space-y-2 mt-1">
                    <select
                      value={isCustomObsStatusDevolucao ? '__custom__' : targetObsStatusDevolucao}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomObsStatusDevolucao(true);
                        } else {
                          setIsCustomObsStatusDevolucao(false);
                          setTargetObsStatusDevolucao(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-medium"
                    >
                      {OFFICIAL_OBS_STATUS_DEVOLUCAO.map((obs, oIdx) => (
                        <option key={`bulk-obs-st-${obs}-${oIdx}`} value={obs}>
                          {obs}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Outra observação personalizada...</option>
                    </select>
                    {isCustomObsStatusDevolucao && (
                      <input
                        type="text"
                        value={customObsStatusDevolucao}
                        onChange={(e) => setCustomObsStatusDevolucao(e.target.value)}
                        placeholder="Digite a observação do status personalizada..."
                        className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-sans"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Option 3: Update Obs Nota Fiscal */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsNf}
                    onChange={(e) => setUpdateObsNf(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Atualizar "Obs Nota Fiscal"
                  </span>
                </label>
                {updateObsNf && (
                  <textarea
                    rows={2}
                    value={bulkObsNf}
                    onChange={(e) => setBulkObsNf(e.target.value)}
                    placeholder="Digite a observação da nota fiscal para aplicar a todos os selecionados..."
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-sans mt-1"
                  />
                )}
              </div>

              {/* Option 4: Update Observações Gerais */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsGerais}
                    onChange={(e) => setUpdateObsGerais(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Atualizar "Observações gerais do item"
                  </span>
                </label>
                {updateObsGerais && (
                  <textarea
                    rows={2}
                    value={bulkObsGerais}
                    onChange={(e) => setBulkObsGerais(e.target.value)}
                    placeholder="Digite as observações gerais/motivo para aplicar a todos os selecionados..."
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-sans mt-1"
                  />
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyBulkStatus}
                disabled={!updateStatus && !updateObsStatusDevolucao && !updateObsNf && !updateObsGerais}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                Aplicar Alterações a {selectedItems.length} Itens
              </button>
            </div>
          </div>
        </div>
      )}

      {/* G&B PDF Approval Import & Automation Modal */}
      <GbApprovalModal
        isOpen={isGbModalOpen}
        onClose={() => setIsGbModalOpen(false)}
        stockItems={items}
        onApplyChanges={handleGbApplyChanges}
      />

      {/* Grupo Real PDF Approval Import & Automation Modal (Consolidated Leste & Norte) */}
      <GrupoRealApprovalModal
        isOpen={isGrupoRealModalOpen}
        onClose={() => setIsGrupoRealModalOpen(false)}
        stockItems={items}
        onApplyChanges={handleGrupoRealApplyChanges}
      />

      {/* Compel PDF Approval Import & Automation Modal */}
      <CompelApprovalModal
        isOpen={isCompelModalOpen}
        onClose={() => setIsCompelModalOpen(false)}
        stockItems={items}
        onApplyChanges={handleCompelApplyChanges}
      />

      {/* Dinpar PDF Approval Import & Automation Modal */}
      <DinparApprovalModal
        isOpen={isDinparModalOpen}
        onClose={() => setIsDinparModalOpen(false)}
        stockItems={items}
        onApplyChanges={handleDinparApplyChanges}
      />

      {/* Supplier Conditions & Policies Modal */}
      <SupplierConditionsModal
        isOpen={isSupplierConditionsModalOpen}
        onClose={() => setIsSupplierConditionsModalOpen(false)}
        stockItems={items}
        initialSelectedSupplierId={supplierConditionsInitialId}
        onOpenGbModal={() => setIsGbModalOpen(true)}
        onFilterBySupplier={(supp) => {
          setSelectedFornecedores([supp]);
        }}
        onBatchUpdateStatus={handleSupplierBatchUpdate}
      />
    </div>
  );
};
