import React, { useState } from 'react';
import { 
  RefreshCw, 
  AlertCircle, 
  Copy, 
  Check, 
  Package, 
  User, 
  Tag, 
  Boxes, 
  Truck, 
  Building2, 
  FileText, 
  MessageSquare,
  ShieldCheck,
  History,
  Info,
  Calendar,
  Clock,
  Flame,
  X,
  Edit3,
  Save,
  CheckCircle2,
  DollarSign,
  MapPin,
  ListFilter
} from 'lucide-react';
import { StockItem, HistoryEntry } from '../types';
import { calculateDaysSinceDeparture, calculateDaysInStock, getDaysFromDate } from '../utils/dateUtils';
import { OFFICIAL_WARRANTY_STATUSES, OFFICIAL_OBS_STATUS_DEVOLUCAO, isFinalizedStatus, isItemUrgent, cleanNotaFiscal, getItemQualityCondition } from '../utils/statusUtils';
import { isAutomaticSupplierItem } from '../utils/supplierUtils';
import { UnifiedProcessTimeline } from './UnifiedProcessTimeline';
import { getItemTotalValue } from './NegociarView';

interface DetailCardProps {
  item: StockItem;
  itemIndex?: number;
  totalMatching?: number;
  contextLabel?: string;
  availableStatuses?: string[];
  availableObsStatuses?: string[];
  onNextItem?: () => void;
  onPrevItem?: () => void;
  onClose?: () => void;
  onUpdateItem?: (updatedItem: StockItem) => void;
  theme?: 'dark' | 'light';
}

export const DetailCard: React.FC<DetailCardProps> = ({
  item,
  itemIndex,
  totalMatching,
  contextLabel,
  availableStatuses,
  availableObsStatuses,
  onNextItem,
  onPrevItem,
  onClose,
  onUpdateItem,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  
  // Local edit form state
  const [editStatus, setEditStatus] = useState<string>(item.statusDevolucao || 'A negociar');
  const [editObsStatusDevolucao, setEditObsStatusDevolucao] = useState<string>(item.obsStatusDevolucao || '');
  const [editObs, setEditObs] = useState<string>(item.observacoesGerais || '');
  const [editObsNf, setEditObsNf] = useState<string>(item.obsNotaFiscal || '');
  const [editNfSaida, setEditNfSaida] = useState<string>(item.notaFiscalSaida || '');
  const [editNfOrigem, setEditNfOrigem] = useState<string>(item.nfOrigem || '');
  const [editUrgent, setEditUrgent] = useState<boolean>(isItemUrgent(item));
  const [editUltimaInteracao, setEditUltimaInteracao] = useState<string>(item.ultimaInteracao || '');
  const [editNota, setEditNota] = useState<string>('');

  // 1. Status Devolução Options
  const statusOptions = React.useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_WARRANTY_STATUSES.forEach(st => set.add(st));
    if (availableStatuses && availableStatuses.length > 0) {
      availableStatuses.forEach(st => {
        if (st && st.trim()) set.add(st.trim());
      });
    }
    if (item.statusDevolucao && item.statusDevolucao.trim()) {
      set.add(item.statusDevolucao.trim());
    }
    return Array.from(set).sort();
  }, [availableStatuses, item.statusDevolucao]);

  // 2. Observação do Status de Devolução Options
  // Prioritizes what has already been used across items, keeping official/available as fallback options, plus allowing custom input
  const obsStatusOptions = React.useMemo(() => {
    const set = new Set<string>();
    
    // Gather all already used obsStatusDevolucao values from available items or availableObsStatuses
    if (availableObsStatuses && availableObsStatuses.length > 0) {
      availableObsStatuses.forEach(obs => {
        if (obs && obs.trim()) set.add(obs.trim());
      });
    }

    if (item.obsStatusDevolucao && item.obsStatusDevolucao.trim()) {
      set.add(item.obsStatusDevolucao.trim());
    }

    return Array.from(set).sort();
  }, [availableObsStatuses, item.obsStatusDevolucao]);

  React.useEffect(() => {
    setEditStatus(item.statusDevolucao || 'A negociar');
    setEditObsStatusDevolucao(item.obsStatusDevolucao || '');
    setEditObs(item.observacoesGerais || '');
    setEditObsNf(item.obsNotaFiscal || '');
    setEditNfSaida(item.notaFiscalSaida || '');
    setEditNfOrigem(item.nfOrigem || '');
    setEditUrgent(isItemUrgent(item));
    setEditUltimaInteracao(item.ultimaInteracao || '');
  }, [item]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isFinalized = isFinalizedStatus(item.statusDevolucao);
  const isUrgent = isItemUrgent(item);

  const daysInfo = isFinalized 
    ? { days: 0, formattedText: 'Finalizado (0 dias em aberto)', badgeColorClass: 'bg-emerald-950 text-emerald-200 border-emerald-700' }
    : calculateDaysSinceDeparture(item.dataSaida);
  
  const stockDaysInfo = isFinalized 
    ? { days: 0, formattedText: 'Finalizado (0 dias em aberto)', badgeColorClass: 'bg-emerald-950 text-emerald-200 border-emerald-700' }
    : calculateDaysInStock(item.dataRecebimento);

  const isExchange = item.statusDevolucao?.toLowerCase().includes('troca') || 
                     item.observacoesGerais?.toLowerCase().includes('troca');

  const handleToggleUrgent = () => {
    const newUrgent = !isUrgent;
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    const actionText = newUrgent ? 'Item marcado como URGENTE 🔥' : 'Urgência removida do item';
    const newHistory: HistoryEntry = {
      data: nowStr,
      acao: actionText,
      detalhe: 'Alteração rápida de marcação de urgência'
    };

    let newStatus = item.statusDevolucao;
    if (!newUrgent && newStatus?.toLowerCase().includes('urgente')) {
      newStatus = 'A negociar';
    }

    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const interacaoText = `${todayShort} - ${actionText}`;

    const updatedItem: StockItem = {
      ...item,
      urgente: newUrgent,
      statusDevolucao: newStatus,
      dataUltimaAlteracao: nowStr,
      ultimaInteracao: interacaoText,
      historicoAlteracoes: [newHistory, ...(item.historicoAlteracoes || [])]
    };

    setEditUrgent(newUrgent);
    setEditUltimaInteracao(interacaoText);
    if (newStatus) setEditStatus(newStatus);

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
  };

  // Direct Change for Status Devolução
  const handleDirectStatusChange = (newStatus: string) => {
    if (newStatus === item.statusDevolucao) return;
    
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const actionText = `Status Devolução: "${item.statusDevolucao || 'N/A'}" ➔ "${newStatus}"`;
    const interacaoText = `${todayShort} - ${actionText}`;

    const newHistory: HistoryEntry = {
      data: nowStr,
      acao: actionText,
      detalhe: 'Alteração direta via menu suspenso de Status Devolução'
    };

    const updatedItem: StockItem = {
      ...item,
      statusDevolucao: newStatus,
      dataUltimaAlteracao: nowStr,
      ultimaInteracao: interacaoText,
      historicoAlteracoes: [newHistory, ...(item.historicoAlteracoes || [])]
    };

    setEditStatus(newStatus);
    setEditUltimaInteracao(interacaoText);

    setStatusFeedback(`Status Devolução atualizado para "${newStatus}"`);
    setTimeout(() => {
      setStatusFeedback(null);
    }, 3500);

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
  };

  // Direct Change for Observação do Status de Devolução
  const handleDirectObsStatusChange = (newObsStatus: string) => {
    if (newObsStatus === item.obsStatusDevolucao) return;
    
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const actionText = `Obs Status: "${item.obsStatusDevolucao || 'N/A'}" ➔ "${newObsStatus}"`;
    const interacaoText = `${todayShort} - ${actionText}`;

    const newHistory: HistoryEntry = {
      data: nowStr,
      acao: actionText,
      detalhe: 'Alteração direta via menu suspenso de Observação do Status de Devolução'
    };

    const updatedItem: StockItem = {
      ...item,
      obsStatusDevolucao: newObsStatus,
      dataUltimaAlteracao: nowStr,
      ultimaInteracao: interacaoText,
      historicoAlteracoes: [newHistory, ...(item.historicoAlteracoes || [])]
    };

    setEditObsStatusDevolucao(newObsStatus);
    setEditUltimaInteracao(interacaoText);

    setStatusFeedback(`Observação do status atualizada para "${newObsStatus}"`);
    setTimeout(() => {
      setStatusFeedback(null);
    }, 3500);

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
  };

  const handleSaveInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const changes: string[] = [];
    if (editStatus !== item.statusDevolucao) {
      changes.push(`Status: "${item.statusDevolucao || 'N/A'}" ➔ "${editStatus}"`);
    }
    if (editObsStatusDevolucao !== (item.obsStatusDevolucao || '')) {
      changes.push(`Obs Status: "${item.obsStatusDevolucao || 'N/A'}" ➔ "${editObsStatusDevolucao}"`);
    }
    if (editObs !== item.observacoesGerais) {
      changes.push(`Obs gerais alteradas`);
    }
    if (editObsNf !== (item.obsNotaFiscal || '')) {
      changes.push(`Obs NF alterada`);
    }
    if (editNfSaida !== (item.notaFiscalSaida || '')) {
      changes.push(`NF Saída: "${editNfSaida}"`);
    }
    if (editNfOrigem !== (item.nfOrigem || '')) {
      changes.push(`NF Origem: "${editNfOrigem}"`);
    }
    if (editUrgent !== isUrgent) {
      changes.push(editUrgent ? 'Marcado Urgente' : 'Desmarcado Urgente');
    }
    if (editNota.trim()) {
      changes.push(`Nota: "${editNota.trim()}"`);
    }

    const actionText = changes.length > 0 ? changes.join(' | ') : 'Interação registrada';
    
    const finalInteracao = editUltimaInteracao && editUltimaInteracao !== item.ultimaInteracao 
      ? editUltimaInteracao 
      : `${todayShort} - ${actionText}`;

    const newHistory: HistoryEntry = {
      data: nowStr,
      acao: actionText,
      detalhe: editNota.trim() || editObs || editObsNf || editObsStatusDevolucao || undefined
    };

    const updatedItem: StockItem = {
      ...item,
      statusDevolucao: editStatus,
      obsStatusDevolucao: editObsStatusDevolucao,
      observacoesGerais: editObs,
      obsNotaFiscal: editObsNf,
      notaFiscalSaida: editNfSaida,
      nfOrigem: editNfOrigem,
      urgente: editUrgent,
      dataUltimaAlteracao: nowStr,
      ultimaInteracao: finalInteracao,
      historicoAlteracoes: [newHistory, ...(item.historicoAlteracoes || [])]
    };

    setEditUltimaInteracao(finalInteracao);

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }

    setEditNota('');
    setIsEditing(false);
  };

  const qualityInfo = getItemQualityCondition(item);

  return (
    <div className={`rounded-2xl border shadow-2xl overflow-hidden transition-all ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0b1329] border-slate-700/90 text-slate-100'
    }`}>
      {/* Top Header Card Title & Controls */}
      <div className={`border-b px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1d3a] border-slate-700'
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className={`p-2.5 rounded-xl border shadow-inner ${
            isLight ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
          }`}>
            <Package className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`} />
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 flex-wrap ${
              isLight ? 'text-slate-600' : 'text-slate-200'
            }`}>
              <span className={isLight ? 'text-indigo-700 font-extrabold' : 'text-indigo-300'}>Ficha Completa do Item</span>
              {isUrgent && (
                <span className="bg-red-600 text-white border border-red-500 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-white fill-white" /> URGENTE
                </span>
              )}
              {isFinalized && (
                <span className="bg-emerald-600 text-white border border-emerald-500 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" /> FINALIZADO
                </span>
              )}
            </div>
            <h2 className={`text-base sm:text-lg font-extrabold uppercase truncate max-w-xl mt-0.5 tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {item.descricao || 'Sem descrição'}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          {/* Quick Urgency Toggle Button */}
          <button
            onClick={handleToggleUrgent}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 shadow-md ${
              isUrgent 
                ? (isLight ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'bg-red-800 hover:bg-red-700 text-white border-red-400')
                : (isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600 hover:border-slate-500')
            }`}
            title="Marcar / Desmarcar como Urgente"
          >
            <Flame className={`w-4 h-4 ${isUrgent ? 'text-white fill-white' : (isLight ? 'text-slate-500' : 'text-slate-300')}`} />
            {isUrgent ? 'Urgência Ativada' : 'Marcar Urgência'}
          </button>

          {/* Edit / Interaction Toggle Button */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg border ${
              isLight 
                ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600' 
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/50'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {isEditing ? 'Cancelar Edição' : 'Registrar Interação'}
          </button>

          {/* Counter controls if multiple items matched */}
          {totalMatching && totalMatching > 1 && (
            <div className={`flex items-center space-x-2 text-xs pl-2.5 border-l ${
              isLight ? 'border-slate-300 text-slate-700' : 'border-slate-700 text-slate-200'
            }`}>
              <span className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
                <span>Item {(itemIndex ?? 0) + 1} de {totalMatching}</span>
                {contextLabel && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isLight 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-indigo-950 text-indigo-300 border border-indigo-800/80'
                  }`}>
                    {contextLabel}
                  </span>
                )}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={onPrevItem}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isLight 
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                  }`}
                  title="Anterior"
                >
                  ‹
                </button>
                <button
                  onClick={onNextItem}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isLight 
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                  }`}
                  title="Próximo"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-600'
              }`}
              title="Fechar Detalhes"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Interactive Editing Form Box */}
        {isEditing && (
          <form onSubmit={handleSaveInteraction} className={`border-2 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-fadeIn ${
            isLight ? 'bg-slate-50 border-indigo-300' : 'bg-slate-900 border-indigo-500/80'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 ${
              isLight ? 'border-indigo-200' : 'border-indigo-900/90'
            }`}>
              <div className="flex items-center space-x-2.5 text-indigo-500">
                <Edit3 className="w-5 h-5" />
                <h3 className={`text-sm font-extrabold uppercase tracking-wider ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Painel de Atualização do Item (Edição dos Status & Interações)
                </h3>
              </div>
              <span className={`text-xs font-mono px-2.5 py-1 rounded-md border ${
                isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'text-indigo-200 bg-indigo-950 border-indigo-800'
              }`}>
                A data da última alteração será atualizada automaticamente
              </span>
            </div>

            {/* TWO STATUS DROPDOWNS SIDE BY SIDE */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl border shadow-inner ${
              isLight ? 'bg-white border-indigo-200' : 'bg-slate-950/90 border-indigo-800/80'
            }`}>
              {/* 1. Status Devolução */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
                  isLight ? 'text-indigo-700' : 'text-indigo-300'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" /> Status Devolução
                  </span>
                  <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>(Coluna 1)</span>
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className={`w-full text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-400 shadow-sm border-2 ${
                    isLight 
                      ? 'bg-white border-indigo-400 text-slate-900' 
                      : 'bg-slate-900 border-indigo-600 text-white'
                  }`}
                >
                  {statusOptions.map(st => (
                    <option key={`edit-status-opt-${st}`} value={st} className={isLight ? 'bg-white text-slate-900 py-1' : 'bg-slate-900 text-white py-1'}>
                      {st}
                    </option>
                  ))}
                </select>
                <p className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  Selecione o status do processo de devolução da peça.
                </p>
              </div>

              {/* 2. Observação do Status de Devolução */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
                  isLight ? 'text-cyan-700' : 'text-cyan-300'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <ListFilter className="w-4 h-4 text-cyan-500" /> Observação do status de devolução
                  </span>
                  <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>(Coluna 2)</span>
                </label>
                <select
                  value={editObsStatusDevolucao}
                  onChange={(e) => setEditObsStatusDevolucao(e.target.value)}
                  className={`w-full text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-cyan-400 shadow-sm border-2 ${
                    isLight 
                      ? 'bg-white border-cyan-400 text-slate-900' 
                      : 'bg-slate-900 border-cyan-600 text-white'
                  }`}
                >
                  <option value="" className={isLight ? 'bg-white text-slate-500 font-semibold' : 'bg-slate-900 text-slate-400 font-semibold'}>
                    -- Selecionar Observação de Status --
                  </option>
                  {obsStatusOptions.map(obs => (
                    <option key={`edit-obs-status-opt-${obs}`} value={obs} className={isLight ? 'bg-white text-slate-900 py-1' : 'bg-slate-900 text-white py-1'}>
                      {obs}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editObsStatusDevolucao}
                    onChange={(e) => setEditObsStatusDevolucao(e.target.value)}
                    placeholder="Ou digite uma observação de status personalizada..."
                    className={`w-full border text-xs rounded-lg px-2.5 py-1.5 outline-none font-sans ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nota Fiscal Origem */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                  Nota Fiscal Origem
                </label>
                <input
                  type="text"
                  value={editNfOrigem}
                  onChange={(e) => setEditNfOrigem(e.target.value)}
                  placeholder="Ex: NF 123456..."
                  className={`w-full border text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none font-mono focus:border-amber-400 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* Nota Fiscal de Saída */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  Nota Fiscal de Saída
                </label>
                <input
                  type="text"
                  value={editNfSaida}
                  onChange={(e) => setEditNfSaida(e.target.value)}
                  placeholder="Ex: NF-e 10923..."
                  className={`w-full border text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none font-mono focus:border-indigo-400 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              {/* Urgência Check */}
              <div>
                <label className={`flex items-center space-x-3 cursor-pointer px-4 py-2.5 rounded-xl border transition-colors w-full ${
                  isLight ? 'bg-white border-slate-300 hover:border-red-500' : 'bg-slate-950 border-slate-700 hover:border-red-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={editUrgent}
                    onChange={(e) => setEditUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-100 border-slate-300"
                  />
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                    <Flame className={`w-4 h-4 ${editUrgent ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                    Marcar Item como Urgente
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Obs Nota Fiscal */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                  Obs Nota Fiscal
                </label>
                <textarea
                  rows={2}
                  value={editObsNf}
                  onChange={(e) => setEditObsNf(e.target.value)}
                  placeholder="Anotações referentes à nota fiscal de origem ou envio..."
                  className={`w-full border text-xs sm:text-sm rounded-xl p-3 outline-none font-sans focus:border-amber-400 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* Observações Gerais */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  Observações Gerais do Item / Motivo
                </label>
                <textarea
                  rows={2}
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                  placeholder="Descreva o motivo, laudo do fabricante ou observações gerais..."
                  className={`w-full border text-xs sm:text-sm rounded-xl p-3 outline-none font-sans focus:border-indigo-400 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Adicionar Nova Nota / Interação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>
                  Campo "Última Interação" (Será sincronizado na planilha)
                </label>
                <input
                  type="text"
                  value={editUltimaInteracao}
                  onChange={(e) => setEditUltimaInteracao(e.target.value)}
                  placeholder="Ex: 31/07 - registro feito no campo obs..."
                  className={`w-full border text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none font-mono focus:border-indigo-400 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>
                  Nova Interação / Comentário para o Histórico (opcional)
                </label>
                <input
                  type="text"
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  placeholder="Ex: Cobrado fornecedor sobre laudo técnico..."
                  className={`w-full border text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${
                  isLight 
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-xl border border-indigo-400"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações & Atualizar Data</span>
              </button>
            </div>
          </form>
        )}

        {/* GROUPED INFORMATION BLOCKS */}
        <div className="space-y-6">

          {/* BLOCK 1: DADOS DO PRODUTO */}
          <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-700'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-700/80'
            }`}>
              <div className={`flex items-center space-x-2 ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
                <Package className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Dados do Produto & Estoque
                </h3>
              </div>
              <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-lg border flex items-center gap-1.5 shadow-xs ${
                isLight 
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200' 
                  : 'bg-indigo-950/80 text-indigo-200 border-indigo-800'
              }`}>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                ID STOCK: {item.idStock || '—'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ID Stock */}
              <div id={`detail-id-stock-card-${item.idStock || 'item'}`} className={`space-y-2 p-4 rounded-xl border transition-all ${
                isLight 
                  ? 'bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 border-indigo-200 shadow-sm' 
                  : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-indigo-800/80 shadow-md'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5 ${
                    isLight ? 'text-indigo-900' : 'text-indigo-300'
                  }`}>
                    <Tag className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                    <span>ID STOCK</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isLight 
                      ? 'bg-indigo-100/80 text-indigo-700 border-indigo-200' 
                      : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                  }`}>
                    Chave Primária
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                  isLight 
                    ? 'bg-white border-slate-300/80 text-slate-900 shadow-inner' 
                    : 'bg-slate-950 border-slate-700 text-white shadow-inner'
                }`}>
                  <span className="text-base sm:text-lg font-black tracking-wider font-mono select-all">
                    {item.idStock || '—'}
                  </span>
                  
                  <button
                    onClick={() => copyToClipboard(item.idStock, 'idStock')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      copiedField === 'idStock'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                    title="Copiar ID STOCK para a Área de Transferência"
                  >
                    {copiedField === 'idStock' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status de Negociação */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-950/70 border-indigo-700/80'
              }`}>
                <div className={`text-xs font-extrabold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-indigo-800' : 'text-indigo-300'
                }`}>
                  <ShieldCheck className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`} /> STATUS DE NEGOCIAÇÃO
                </div>
                <div className={`text-sm sm:text-base font-extrabold ${
                  isLight ? 'text-indigo-950' : 'text-indigo-100'
                }`}>
                  {item.statusDevolucao || 'A negociar'}
                </div>
              </div>

              {/* Valor do Item */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-950/70 border-emerald-600/80'
              }`}>
                <div className={`text-xs font-extrabold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-emerald-800' : 'text-emerald-300'
                }`}>
                  <DollarSign className={`w-4 h-4 mr-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} /> VALOR DO ITEM
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base sm:text-lg font-black font-mono ${
                    isLight ? 'text-emerald-900' : 'text-emerald-200'
                  }`}>
                    {getItemTotalValue(item).formatted}
                  </span>
                  {item.valorUnitario && (
                    <span className={`text-xs font-mono font-semibold ${
                      isLight ? 'text-emerald-700' : 'text-emerald-300'
                    }`}>
                      Unit: {item.valorUnitario}
                    </span>
                  )}
                </div>
              </div>

              {/* ENDEREÇAMENTO */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-cyan-50 border-cyan-300' : 'bg-cyan-950/70 border-cyan-600/80'
              }`}>
                <div className={`text-xs font-extrabold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-cyan-800' : 'text-cyan-300'
                }`}>
                  <MapPin className={`w-4 h-4 mr-1.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} /> ENDEREÇAMENTO NO ESTOQUE
                </div>
                <div className={`text-sm sm:text-base font-extrabold font-mono ${
                  isLight ? 'text-cyan-950' : 'text-cyan-100'
                }`}>
                  {item.enderecamento || 'Não cadastrado'}
                </div>
              </div>

              {/* Localidade */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Building2 className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> LOCALIDADE
                </div>
                <div className={`text-sm font-bold ${isLight ? 'text-indigo-800' : 'text-indigo-200'}`}>
                  {item.localidade || 'Mecanizou'}
                </div>
              </div>

              {/* Condição do Item (Virtual) */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center justify-between ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <span className="flex items-center"><ShieldCheck className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> CONDIÇÃO DO ITEM</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold tracking-wide ${qualityInfo.badgeClass}`}>
                    <span className={`w-2 h-2 rounded-full ${qualityInfo.dotColor}`} />
                    {qualityInfo.label}
                  </span>
                  <div className={`text-xs text-right font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <div>Emb: <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.embalagem || 'N/A'}</span></div>
                    <div>Peça: <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.condicaoPeca || 'N/A'}</span></div>
                  </div>
                </div>
              </div>

              {/* Nome da Peça / Descrição */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm md:col-span-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Package className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> NOME DA PEÇA / DESCRIÇÃO
                </div>
                <div className={`text-sm sm:text-base font-bold uppercase tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {item.descricao || '—'}
                </div>
              </div>

              {/* Marca & Código */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Tag className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> MARCA - CÓDIGO DE FÁBRICA
                </div>
                <div className={`text-sm font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {item.marca ? `${item.marca} - ` : ''}{item.codigo || '—'}
                </div>
              </div>

              {/* Quantidade em Estoque */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm md:col-span-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Boxes className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> QUANT. EM ESTOQUE
                </div>
                <div className={`text-sm font-bold flex items-center ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <span>{item.quantEstoque || '0'} {parseInt(item.quantEstoque) === 1 ? 'unidade' : 'unidades'}</span>
                  <span className={`ml-2.5 px-2 py-0.5 text-xs rounded border font-semibold ${
                    isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950 text-indigo-200 border-indigo-700'
                  }`}>
                    Em estoque físico
                  </span>
                </div>
              </div>

              {/* Obs Nota Fiscal (Placed below Quant. em Estoque) */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm md:col-span-3 ${
                isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/40 border-amber-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-amber-800' : 'text-amber-300'
                }`}>
                  <FileText className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} /> OBS NOTA FISCAL
                </div>
                <div className={`text-xs sm:text-sm font-medium leading-relaxed font-mono ${
                  isLight ? 'text-amber-950' : 'text-amber-100'
                }`}>
                  {item.obsNotaFiscal || 'Nenhuma observação de Nota Fiscal cadastrada.'}
                </div>
              </div>
            </div>
          </div>

          {/* BLOCK 3: DADOS DO FORNECEDOR (Moved up right after Block 1) */}
          <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-700'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b flex-wrap gap-2 ${
              isLight ? 'border-slate-200' : 'border-slate-700/80'
            }`}>
              <div className={`flex items-center space-x-2 ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
                <Truck className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Dados de Fornecedor & Processo
                </h3>
              </div>
              {isAutomaticSupplierItem(item) && (
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold border shadow-sm ${
                  isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950 text-amber-200 border-amber-600'
                }`}>
                  ⚡ Processo Automático
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fornecedor */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Truck className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> FORNECEDOR
                </div>
                <div className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`} title={item.fornecedor}>
                  {item.fornecedor || '—'}
                </div>
              </div>

              {/* Novo Fornecedor / Filial */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Building2 className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> NOVO FORNECEDOR / FILIAL
                </div>
                <div className={`text-sm font-bold flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`} title={item.novoFornecedorFilial}>
                  <span>{item.novoFornecedorFilial || '—'}</span>
                  {isAutomaticSupplierItem(item) && (
                    <span className={`text-[10px] border px-2 py-0.5 rounded font-extrabold ${
                      isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950 text-amber-200 border-amber-700'
                    }`}>
                      Auto
                    </span>
                  )}
                </div>
              </div>

              {/* Fornecedor Original */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Truck className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} /> FORNECEDOR ORIGINAL
                </div>
                <div className={`text-sm font-bold ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                  {item.fornecedorOriginal || 'Mesmo da compra'}
                </div>
              </div>
            </div>
          </div>

          {/* BLOCK 5: OBSERVAÇÕES & INTERAÇÃO */}
          <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-700'
          }`}>
            <div className={`flex items-center space-x-2 pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-700/80'
            }`}>
              <MessageSquare className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Observações & Interações Registradas
              </h3>
            </div>

            {/* ÚLTIMA INTERAÇÃO */}
            <div className={`space-y-1.5 p-4 rounded-xl border-2 shadow-md ${
              isLight ? 'bg-indigo-50/80 border-indigo-300' : 'bg-indigo-950/60 border-indigo-700'
            }`}>
              <div className={`text-xs font-extrabold tracking-wider uppercase flex items-center justify-between flex-wrap gap-1 ${
                isLight ? 'text-indigo-900' : 'text-indigo-200'
              }`}>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> ÚLTIMA INTERAÇÃO (REGISTRADA NA PLANILHA)
                </span>
                {item.dataUltimaAlteracao && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${
                    isLight ? 'bg-white text-indigo-800 border-indigo-300' : 'text-indigo-300 bg-indigo-900/80 border-indigo-700'
                  }`}>
                    {item.dataUltimaAlteracao}
                  </span>
                )}
              </div>
              <div className={`text-xs sm:text-sm font-bold p-3.5 rounded-lg border font-mono leading-relaxed mt-1 ${
                isLight ? 'bg-white text-slate-900 border-indigo-200' : 'text-white bg-slate-950 border-indigo-800'
              }`}>
                {item.ultimaInteracao || 'Nenhuma interação registrada até o momento.'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OBSERVAÇÕES GERAIS */}
              <div className="space-y-1.5">
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}>
                  <MessageSquare className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> OBSERVAÇÕES GERAIS DO ITEM
                </div>
                <div className={`text-xs sm:text-sm font-medium leading-relaxed font-mono p-3.5 rounded-xl border min-h-[75px] ${
                  isLight ? 'bg-white border-slate-200 text-slate-800' : 'text-slate-100 bg-slate-950 border-slate-700'
                }`}>
                  {item.observacoesGerais || 'Sem observações gerais registradas.'}
                </div>
              </div>

              {/* OBS NOTA FISCAL */}
              <div className="space-y-1.5">
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center justify-between ${
                  isLight ? 'text-amber-800' : 'text-amber-300'
                }`}>
                  <span className="flex items-center font-bold">
                    <FileText className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} /> OBS NOTA FISCAL
                  </span>
                </div>
                <div className={`text-xs sm:text-sm font-medium leading-relaxed font-mono p-3.5 rounded-xl border min-h-[75px] ${
                  isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'text-amber-100 bg-amber-950/40 border-amber-700'
                }`}>
                  {item.obsNotaFiscal || 'Nenhuma observação de Nota Fiscal cadastrada.'}
                </div>
              </div>
            </div>
          </div>

          {/* BLOCK 2: DADOS DO CLIENTE */}
          <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-700'
          }`}>
            <div className={`flex items-center space-x-2 pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-700/80'
            }`}>
              <User className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Dados do Cliente & Solicitação
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <User className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> CLIENTE / MECÂNICA
                </div>
                <div className={`text-sm sm:text-base font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`} title={item.cliente}>
                  {item.cliente || '—'}
                </div>
              </div>

              {/* Prioridade */}
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Flame className="w-3.5 h-3.5 mr-1.5 text-red-500" /> PRIORIDADE DO ATENDIMENTO
                </div>
                <div className="text-sm font-bold">
                  {isUrgent ? (
                    <span className="text-red-600 flex items-center gap-1 font-extrabold">
                      🔥 Item Marcado como Urgente
                    </span>
                  ) : (
                    <span className={isLight ? 'text-slate-600 font-semibold' : 'text-slate-300 font-semibold'}>Normal</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Protocolo (Below Dados do Cliente) */}
          <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-700'
          }`}>
            <div className={`flex items-center space-x-2 pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-700/80'
            }`}>
              <FileText className={`w-5 h-5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Protocolo do Atendimento
              </h3>
            </div>
            <div className={`p-3.5 rounded-xl border shadow-sm flex items-center justify-between ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
            }`}>
              <span className={`text-sm sm:text-base font-extrabold font-mono ${
                isLight ? 'text-amber-700' : 'text-amber-300'
              }`}>
                {item.protocolo || 'Nenhum protocolo informado'}
              </span>
              {item.protocolo && (
                <button
                  onClick={() => copyToClipboard(item.protocolo!, 'protocolo')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    copiedField === 'protocolo'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Copiar Protocolo"
                >
                  {copiedField === 'protocolo' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>



          {/* BLOCK 6: DATAS, TIMELINE & HISTÓRICO */}
          <div className={`border rounded-2xl p-4 sm:p-5 space-y-5 shadow-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-700'
          }`}>
            <div className={`flex items-center space-x-2 pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-700/80'
            }`}>
              <History className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Cronograma, Processo & Histórico de Alterações
              </h3>
            </div>

            {/* 3 DATAS EM LINHA (INCIDÊNCIA -> RECEBIMENTO -> SAÍDA) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Calendar className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} /> DATA DE INCIDÊNCIA
                </div>
                <div className={`text-sm sm:text-base font-extrabold font-mono ${
                  isLight ? 'text-purple-700' : 'text-purple-300'
                }`}>
                  {item.dataIncidencia || 'Não informada'}
                </div>
                <div className={`text-xs mt-1 font-medium ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
                  {item.dataIncidencia ? `Registrado em ${item.dataIncidencia}` : 'Sem data de incidência'}
                </div>
              </div>

              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Calendar className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> DATA RECEBIMENTO
                </div>
                <div className={`text-sm sm:text-base font-extrabold font-mono ${
                  isLight ? 'text-emerald-700' : 'text-emerald-300'
                }`}>
                  {item.dataRecebimento || 'Não informada'}
                </div>
                <div className={`text-xs mt-1 font-medium ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
                  {stockDaysInfo.formattedText}
                </div>
              </div>

              <div className={`space-y-1 p-3.5 rounded-xl border shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700/80'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase flex items-center ${
                  isLight ? 'text-slate-600' : 'text-slate-200'
                }`}>
                  <Calendar className={`w-3.5 h-3.5 mr-1.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} /> DATA SAÍDA
                </div>
                <div className={`text-sm sm:text-base font-extrabold font-mono ${
                  isLight ? 'text-blue-700' : 'text-blue-300'
                }`}>
                  {item.dataSaida || 'Não informada'}
                </div>
                <div className={`text-xs mt-1 font-medium ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
                  {daysInfo.formattedText}
                </div>
              </div>
            </div>

            {/* CENTRALIZED TIMELINE: INCIDÊNCIA -> RECEBIDA -> ENVIADA -> FINALIZADA */}
            <div>
              <UnifiedProcessTimeline item={item} theme={theme} />
            </div>

            {/* LINHA DO TEMPO DE INTERAÇÕES E HISTÓRICO */}
            <div className={`space-y-3 border-t pt-4 ${isLight ? 'border-slate-200' : 'border-slate-700/80'}`}>
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center space-x-2">
                  <History className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                  <h4 className={`text-xs font-extrabold uppercase tracking-wider ${
                    isLight ? 'text-slate-800' : 'text-slate-100'
                  }`}>
                    Histórico de Alterações Manuais
                  </h4>
                </div>
                <span className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
                  {(item.historicoAlteracoes?.length || 0)} registros
                </span>
              </div>

              {(!item.historicoAlteracoes || item.historicoAlteracoes.length === 0) ? (
                <div className={`rounded-xl p-4 border text-xs flex items-center justify-between flex-wrap gap-2 ${
                  isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}>
                  <span>Nenhuma alteração manual registrada nesta ficha até o momento.</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-indigo-600 hover:text-indigo-500 font-extrabold underline text-xs"
                  >
                    Adicionar primeira interação
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {item.historicoAlteracoes.map((hist, hIdx) => (
                    <div 
                      key={`hist-${hIdx}`}
                      className={`border rounded-xl p-3.5 flex items-start space-x-3 text-xs ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg border mt-0.5 ${
                        isLight ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-indigo-950 text-indigo-300 border-indigo-700'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className={`font-extrabold text-xs sm:text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{hist.acao}</span>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            isLight ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'text-indigo-200 bg-indigo-950 border-indigo-700'
                          }`}>
                            {hist.data}
                          </span>
                        </div>
                        {hist.detalhe && (
                          <p className={`text-xs mt-1.5 font-mono leading-relaxed p-2.5 rounded-lg border ${
                            isLight ? 'text-slate-700 bg-slate-50 border-slate-200' : 'text-slate-200 bg-slate-900 border-slate-700'
                          }`}>
                            {hist.detalhe}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
