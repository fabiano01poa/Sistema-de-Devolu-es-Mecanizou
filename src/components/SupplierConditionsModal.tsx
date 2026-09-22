import React, { useState, useMemo } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  Clock, 
  FileText, 
  PackageCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Filter, 
  Sparkles, 
  Plus, 
  Trash2,
  ChevronRight,
  Info,
  Calendar,
  ExternalLink,
  Check
} from 'lucide-react';
import { StockItem } from '../types';
import { matchItemSupplier } from '../utils/supplierUtils';

export interface SupplierConditionRule {
  id: string;
  name: string;
  shortTag: string;
  category: 'distribuidor' | 'fabricante' | 'concessionaria' | 'outro';
  maxDaysReturn?: number;
  returnPolicyTitle: string;
  documentationRequired: string[];
  packagingRequirements: string[];
  supportedBranches?: string[];
  resultingStatusDefault: string;
  defaultObservationNote: string;
  notes: string;
  colorTheme: 'sky' | 'blue' | 'slate';
}

export const OFFICIAL_SUPPLIER_RULES: SupplierConditionRule[] = [
  {
    id: 'gb_pecas',
    name: 'G&B Peças',
    shortTag: 'G&B',
    category: 'distribuidor',
    returnPolicyTitle: 'Espelho de Autorização Comercial (Citel)',
    documentationRequired: [
      'Espelho oficial Citel / G&B Peças emitido pelo vendedor',
      'Número de Autorização de Devolução (AD)',
      'Chave de Acesso da NF de Devolução (44 dígitos)',
      'DANFE original de compra arquivada'
    ],
    packagingRequirements: [
      'Embalagem identificada com etiqueta Citel',
      'Peça sem uso com valor correspondente ao espelho'
    ],
    supportedBranches: ['Matriz G&B', 'G&B Peças Distribuidora'],
    resultingStatusDefault: 'Emitir NF',
    defaultObservationNote: 'Aut {AD} / {NF}',
    notes: 'Possui importador inteligente direto de PDF e imagem para conciliação automática com o estoque.',
    colorTheme: 'sky'
  },
  {
    id: 'mercadocar',
    name: 'Mercadocar',
    shortTag: 'MERCADOCAR',
    category: 'distribuidor',
    maxDaysReturn: 30,
    returnPolicyTitle: 'Devolução de Balcão & Filiais (Regra dos 30 Dias)',
    documentationRequired: [
      'DANFE original de compra (NF Origem) obrigatória',
      'Identificação do código da filial de faturamento',
      'Número do ID Stock e código Mercadocar impresso na nota'
    ],
    packagingRequirements: [
      'Caixa original intacta sem rasgos ou manchas de graxa/óleo',
      'Sem fita adesiva colada sobre o código de barras ou logotipo',
      'Etiqueta Mercadocar com código do produto preservada',
      'Peça nova sem qualquer marcação de montagem ou aperto de parafusos'
    ],
    supportedBranches: [
      'Aricanduva',
      'Barra Funda (Linha Leve)',
      'Barra Funda (Linha Pesada)',
      'Guarulhos',
      'Guarulhos Centro',
      'Marechal Tito',
      'Osasco',
      'Pimentas',
      'Santo Amaro',
      'Santo André',
      'Matriz'
    ],
    resultingStatusDefault: 'Em negociação',
    defaultObservationNote: 'Mercadocar 30D - Aguardando validação balcão filial',
    notes: 'Peças com mais de 30 dias da compra exigem autorização prévia por e-mail da gerência da filial compradora.',
    colorTheme: 'sky'
  },
  {
    id: 'cobra',
    name: 'Cobra Automotiva',
    shortTag: 'COBRA',
    category: 'distribuidor',
    maxDaysReturn: 7,
    returnPolicyTitle: 'Devolução Comercial (7D) & Garantia Técnica Fabricante',
    documentationRequired: [
      'DANFE original de faturamento Cobra',
      'Formulário padrão Cobra de solicitação de garantia/devolução',
      'Laudo com quilometragem e foto do hodômetro se peça em garantia técnica'
    ],
    packagingRequirements: [
      'Peça em caixa original preservada para devoluções comerciais',
      'Embalagem identificada com código Cobra e etiqueta do fabricante'
    ],
    supportedBranches: [
      'Guarulhos',
      'Itaquaquecetuba',
      'Matriz',
      'Osasco',
      'Santo Amaro',
      'São Bernardo'
    ],
    resultingStatusDefault: 'Em negociação',
    defaultObservationNote: 'Cobra - Aguardando coleta e conferência de lote',
    notes: 'Rolamentos, tensionadores e cubos de roda possuem garantia técnica de fábrica com coleta programada.',
    colorTheme: 'sky'
  },
  {
    id: 'josecar',
    name: 'Josecar',
    shortTag: 'JOSECAR',
    category: 'distribuidor',
    maxDaysReturn: 15,
    returnPolicyTitle: 'Devolução de Balcão (Prazo Máximo 15 Dias da Entrega)',
    documentationRequired: [
      'Nota fiscal de compra Josecar',
      'Canhoto de recebimento assinado ou comprovante de entrega',
      'Identificação da filial Josecar emissora'
    ],
    packagingRequirements: [
      'Embalagem limpa e lacrada',
      'Selo/etiqueta Josecar íntegra sem rasuras',
      'Componentes e manuais internos intactos'
    ],
    supportedBranches: [
      'Água Fria',
      'Butantã',
      'Freguesia do Ó',
      'Jabaquara',
      'Lapa',
      'Osasco',
      'Regente Feijó',
      'Tatuapé'
    ],
    resultingStatusDefault: 'Em negociação',
    defaultObservationNote: 'Josecar 15D - Devolução balcão filial',
    notes: 'Devoluções após 15 dias são aceitas exclusivamente mediante laudo de defeito de fabricação.',
    colorTheme: 'sky'
  },
  {
    id: 'sk_mobility',
    name: 'SK Mobility (Linha GM)',
    shortTag: 'SK MOBILITY',
    category: 'concessionaria',
    maxDaysReturn: 30,
    returnPolicyTitle: 'Peças Genuínas GM & Linha Pesada Concessionária',
    documentationRequired: [
      'NF de origem de faturamento SK Mobility / GM',
      'Código genuíno da montadora GM gravado na peça',
      'Número de chassi ou pedido de origem'
    ],
    packagingRequirements: [
      'Embalagem genuína GM com selo holográfico ou código de barras intacto',
      'Peça sem nenhum vestígio de instalação elétrica ou mecânica'
    ],
    supportedBranches: [
      'Matriz',
      'Vila Maria (GM)',
      'Zona Oeste',
      'Zona Oeste (Estoque GM)'
    ],
    resultingStatusDefault: 'Em negociação',
    defaultObservationNote: 'SK Mobility GM - Validação peça genuína',
    notes: 'Peças com selo GM violado não são aceitas para devolução comercial por exigência da montadora.',
    colorTheme: 'sky'
  }
];

interface SupplierConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onOpenGbModal?: () => void;
  onFilterBySupplier?: (supplierName: string) => void;
  onBatchUpdateStatus?: (
    items: StockItem[],
    newStatus?: string,
    obsStatusDevolucao?: string,
    obsGerais?: string,
    nfSaida?: string
  ) => void;
  initialSelectedSupplierId?: string;
}

export const SupplierConditionsModal: React.FC<SupplierConditionsModalProps> = ({
  isOpen,
  onClose,
  stockItems,
  onOpenGbModal,
  onFilterBySupplier,
  onBatchUpdateStatus,
  initialSelectedSupplierId
}) => {
  const [rules, setRules] = useState<SupplierConditionRule[]>(() => {
    try {
      const saved = localStorage.getItem('custom_supplier_rules_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...OFFICIAL_SUPPLIER_RULES, ...parsed];
        }
      }
    } catch {}
    return OFFICIAL_SUPPLIER_RULES;
  });

  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    initialSelectedSupplierId || OFFICIAL_SUPPLIER_RULES[0].id
  );

  const [isAddingNewRule, setIsAddingNewRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDays, setNewRuleDays] = useState('30');
  const [newRuleDoc, setNewRuleDoc] = useState('');
  const [newRulePackage, setNewRulePackage] = useState('');
  const [newRuleObs, setNewRuleObs] = useState('');

  const [appliedBatchSuccess, setAppliedBatchSuccess] = useState<string | null>(null);

  const currentRule = rules.find(r => r.id === selectedRuleId) || rules[0];

  // Helper to parse date string (DD/MM/YYYY or YYYY-MM-DD)
  const parseDateStr = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(clean)) {
      const [d, m, y] = clean.split('/').map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      return new Date(clean);
    }
    const parsed = Date.parse(clean);
    return isNaN(parsed) ? null : new Date(parsed);
  };

  // Live stock scan for the current supplier
  const supplierStockAnalysis = useMemo(() => {
    if (!currentRule) {
      return { matchingItems: [], withinTimeItems: [], overdueItems: [], totalValue: 0, withinValue: 0, overdueValue: 0 };
    }

    const matching = stockItems.filter(item => matchItemSupplier(item, currentRule.shortTag || currentRule.name));
    const now = new Date();

    const within: { item: StockItem; elapsedDays: number | null }[] = [];
    const overdue: { item: StockItem; elapsedDays: number | null }[] = [];

    let totalVal = 0;
    let withinVal = 0;
    let overdueVal = 0;

    matching.forEach(item => {
      // Parse numeric value
      const rawVal = String(item.valorTotal || item.valorUnitario || '0')
        .replace(/R\$\s?/, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      const valNum = parseFloat(rawVal) || 0;
      totalVal += valNum;

      const purchaseDate = parseDateStr(item.dataCompra || item.dataRecebimento || item.dataIncidencia);
      let elapsedDays: number | null = null;

      if (purchaseDate) {
        elapsedDays = Math.max(0, Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));
      }

      if (currentRule.maxDaysReturn !== undefined && elapsedDays !== null) {
        if (elapsedDays <= currentRule.maxDaysReturn) {
          within.push({ item, elapsedDays });
          withinVal += valNum;
        } else {
          overdue.push({ item, elapsedDays });
          overdueVal += valNum;
        }
      } else {
        within.push({ item, elapsedDays });
        withinVal += valNum;
      }
    });

    return {
      matchingItems: matching,
      withinTimeItems: within,
      overdueItems: overdue,
      totalValue: totalVal,
      withinValue: withinVal,
      overdueValue: overdueVal
    };
  }, [stockItems, currentRule]);

  if (!isOpen) return null;

  // Handle batch update to 'Em negociação' or supplier default status
  const handleApplySupplierStatus = (itemsToUpdate: StockItem[], statusLabel: string) => {
    if (!onBatchUpdateStatus || itemsToUpdate.length === 0) return;

    const note = currentRule.defaultObservationNote || `Condição ${currentRule.name}`;
    onBatchUpdateStatus(
      itemsToUpdate,
      statusLabel,
      undefined,
      note
    );

    setAppliedBatchSuccess(`${itemsToUpdate.length} item(ns) de ${currentRule.name} atualizados com sucesso para "${statusLabel}"!`);
    setTimeout(() => setAppliedBatchSuccess(null), 4000);
  };

  // Export Romaneio for the supplier as CSV
  const handleExportRomaneio = () => {
    if (supplierStockAnalysis.matchingItems.length === 0) return;

    const headers = [
      'ID Stock',
      'Fornecedor',
      'Filial',
      'Código Peça',
      'Descrição Peça',
      'Marca',
      'Qtd',
      'Valor Total',
      'Status Atual',
      'Data Compra',
      'NF Origem',
      'Dias Decorridos',
      'Elegibilidade Devolução'
    ];

    const rows = supplierStockAnalysis.matchingItems.map(item => {
      const pDate = parseDateStr(item.dataCompra || item.dataRecebimento);
      let elapsedStr = 'N/D';
      let elegivelStr = 'Sim';

      if (pDate) {
        const days = Math.max(0, Math.floor((Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
        elapsedStr = `${days} dias`;
        if (currentRule.maxDaysReturn && days > currentRule.maxDaysReturn) {
          elegivelStr = `Excedeu Prazo (> ${currentRule.maxDaysReturn}d)`;
        } else {
          elegivelStr = `Dentro do Prazo (≤ ${currentRule.maxDaysReturn || 30}d)`;
        }
      }

      return [
        `"${item.idStock || ''}"`,
        `"${item.fornecedor || ''}"`,
        `"${item.novoFornecedorFilial || ''}"`,
        `"${item.codigo || ''}"`,
        `"${(item.descricao || '').replace(/"/g, '""')}"`,
        `"${item.marca || ''}"`,
        `"${item.quantEstoque || '1'}"`,
        `"${item.valorTotal || item.valorUnitario || ''}"`,
        `"${item.statusDevolucao || ''}"`,
        `"${item.dataCompra || ''}"`,
        `"${item.nfOrigem || ''}"`,
        `"${elapsedStr}"`,
        `"${elegivelStr}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Romaneio_Devolucao_${currentRule.shortTag}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add custom rule
  const handleSaveCustomRule = () => {
    if (!newRuleName.trim()) return;

    const newRule: SupplierConditionRule = {
      id: `custom_${Date.now()}`,
      name: newRuleName.trim(),
      shortTag: newRuleName.trim().toUpperCase(),
      category: 'outro',
      maxDaysReturn: parseInt(newRuleDays, 10) || undefined,
      returnPolicyTitle: `Regra de Devolução ${newRuleName.trim()}`,
      documentationRequired: newRuleDoc.trim() ? [newRuleDoc.trim()] : ['DANFE de compra original'],
      packagingRequirements: newRulePackage.trim() ? [newRulePackage.trim()] : ['Embalagem íntegra sem danos'],
      resultingStatusDefault: 'Em negociação',
      defaultObservationNote: newRuleObs.trim() || `Regra ${newRuleName.trim()}`,
      notes: 'Regra personalizada adicionada pelo usuário.',
      colorTheme: 'sky'
    };

    const updated = [...rules, newRule];
    setRules(updated);
    setSelectedRuleId(newRule.id);
    setIsAddingNewRule(false);

    try {
      const customOnly = updated.filter(r => r.id.startsWith('custom_'));
      localStorage.setItem('custom_supplier_rules_v1', JSON.stringify(customOnly));
    } catch {}
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 dark:border-slate-800 bg-sky-50/50 dark:bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Central de Fornecedores & Regras de Devolução
                </h2>
                <span className="bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Políticas Oficiais & Prazos
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Condições de devolução, prazos legais por fornecedor, conferência de embalagem e validação em lote no estoque.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {appliedBatchSuccess && (
          <div className="mx-6 mt-4 p-3 bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 rounded-xl text-sky-900 dark:text-sky-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{appliedBatchSuccess}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Left: Supplier Rules Navigation */}
          <div className="w-full md:w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-sky-100 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Fornecedores Cadastrados
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNewRule(true)}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Regra</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {rules.map(rule => {
                const isSelected = rule.id === selectedRuleId;
                // Count items in stock
                const count = stockItems.filter(i => matchItemSupplier(i, rule.shortTag || rule.name)).length;

                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => {
                      setSelectedRuleId(rule.id);
                      setIsAddingNewRule(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs truncate">{rule.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {rule.maxDaysReturn ? `Prazo: ${rule.maxDaysReturn} dias` : 'Espelho Citel'}
                      </div>
                    </div>
                    {count > 0 && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Supplier Details, Live Stock Analysis & Actions */}
          <div className="flex-1 space-y-6">
            {isAddingNewRule ? (
              /* Add New Rule Form */
              <div className="bg-sky-50/40 dark:bg-slate-950/70 border border-sky-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-sky-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-sky-600" />
                    Cadastrar Nova Regra de Fornecedor
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewRule(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Nome do Fornecedor / Fabricante *
                    </label>
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={e => setNewRuleName(e.target.value)}
                      placeholder="Ex: Amazonas Peças, Nakata, etc."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Prazo Máximo de Devolução (em dias)
                    </label>
                    <input
                      type="number"
                      value={newRuleDays}
                      onChange={e => setNewRuleDays(e.target.value)}
                      placeholder="Ex: 30"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Documentação Obrigatória
                    </label>
                    <input
                      type="text"
                      value={newRuleDoc}
                      onChange={e => setNewRuleDoc(e.target.value)}
                      placeholder="Ex: DANFE de compra original, formulário de devolução"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Exigências de Embalagem & Estado da Peça
                    </label>
                    <input
                      type="text"
                      value={newRulePackage}
                      onChange={e => setNewRulePackage(e.target.value)}
                      placeholder="Ex: Embalagem intacta com código de barras legível, sem marcas de instalação"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Observação Padrão ao Atualizar
                    </label>
                    <input
                      type="text"
                      value={newRuleObs}
                      onChange={e => setNewRuleObs(e.target.value)}
                      placeholder="Ex: Aguardando coleta e validação comercial"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewRule(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomRule}
                    className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    Salvar Fornecedor
                  </button>
                </div>
              </div>
            ) : (
              /* Selected Rule Details */
              <div className="space-y-5">
                {/* Supplier Hero Banner */}
                <div className="p-4 bg-sky-50/60 dark:bg-slate-950/70 border border-sky-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {currentRule.name}
                      </h3>
                      {currentRule.maxDaysReturn && (
                        <span className="bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Prazo: {currentRule.maxDaysReturn} Dias
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {currentRule.returnPolicyTitle}
                    </p>
                  </div>

                  {/* Actions depending on supplier */}
                  <div className="flex flex-wrap items-center gap-2">
                    {currentRule.id === 'gb_pecas' && onOpenGbModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenGbModal();
                        }}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Abrir Importador PDF G&B</span>
                      </button>
                    )}

                    {onFilterBySupplier && (
                      <button
                        type="button"
                        onClick={() => {
                          onFilterBySupplier(currentRule.shortTag || currentRule.name);
                          onClose();
                        }}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filtrar na Tabela</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleExportRomaneio}
                      disabled={supplierStockAnalysis.matchingItems.length === 0}
                      className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-600" />
                      <span>Gerar Romaneio CSV</span>
                    </button>
                  </div>
                </div>

                {/* Live Stock Analysis Card */}
                <div className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-sky-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        Conferência em Tempo Real no Estoque Atual
                      </h4>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {supplierStockAnalysis.matchingItems.length} item(ns) identificados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-sky-50/50 dark:bg-slate-950/60 rounded-xl border border-sky-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 font-medium">Total em Estoque</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        {supplierStockAnalysis.matchingItems.length} un.
                      </div>
                      <div className="text-[11px] text-sky-700 dark:text-sky-400 font-mono font-bold mt-0.5">
                        R$ {supplierStockAnalysis.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-3 bg-sky-50/50 dark:bg-slate-950/60 rounded-xl border border-sky-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between">
                        <span>Dentro do Prazo</span>
                        {currentRule.maxDaysReturn && <span className="font-mono text-[10px]">≤ {currentRule.maxDaysReturn}d</span>}
                      </div>
                      <div className="text-sm font-bold text-sky-800 dark:text-sky-300 font-mono">
                        {supplierStockAnalysis.withinTimeItems.length} un.
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                        R$ {supplierStockAnalysis.withinValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-3 bg-sky-50/50 dark:bg-slate-950/60 rounded-xl border border-sky-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between">
                        <span>Atenção (Excedeu Prazo)</span>
                        {currentRule.maxDaysReturn && <span className="font-mono text-[10px] text-amber-600">&gt; {currentRule.maxDaysReturn}d</span>}
                      </div>
                      <div className="text-sm font-bold text-amber-700 dark:text-amber-400 font-mono">
                        {supplierStockAnalysis.overdueItems.length} un.
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                        R$ {supplierStockAnalysis.overdueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Batch Action Buttons */}
                  {supplierStockAnalysis.matchingItems.length > 0 && onBatchUpdateStatus && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-1">
                        Ações em Lote:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplySupplierStatus(
                          supplierStockAnalysis.withinTimeItems.map(w => w.item),
                          currentRule.resultingStatusDefault
                        )}
                        disabled={supplierStockAnalysis.withinTimeItems.length === 0}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-40 transition-colors shadow-sm"
                      >
                        Atualizar {supplierStockAnalysis.withinTimeItems.length} Aptos para "{currentRule.resultingStatusDefault}"
                      </button>

                      {supplierStockAnalysis.overdueItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleApplySupplierStatus(
                            supplierStockAnalysis.overdueItems.map(o => o.item),
                            'A negociar'
                          )}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                        >
                          Marcar {supplierStockAnalysis.overdueItems.length} Excedidos como "A negociar"
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Condition Requirements Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Documents Required */}
                  <div className="bg-sky-50/30 dark:bg-slate-950/60 border border-sky-100 dark:border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Documentação Obrigatória</span>
                    </div>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                      {currentRule.documentationRequired.map((doc, idx) => (
                        <li key={idx} className="leading-relaxed">{doc}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Packaging Requirements */}
                  <div className="bg-sky-50/30 dark:bg-slate-950/60 border border-sky-100 dark:border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <PackageCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Exigências de Embalagem & Peça</span>
                    </div>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                      {currentRule.packagingRequirements.map((pkg, idx) => (
                        <li key={idx} className="leading-relaxed">{pkg}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Branches List */}
                {currentRule.supportedBranches && currentRule.supportedBranches.length > 0 && (
                  <div className="bg-sky-50/30 dark:bg-slate-950/60 border border-sky-100 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Filiais Suportadas no Sistema ({currentRule.supportedBranches.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {currentRule.supportedBranches.map((branch, idx) => (
                        <span 
                          key={idx}
                          className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] px-2.5 py-0.5 rounded-lg"
                        >
                          {branch}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-sky-100 dark:border-slate-800 bg-sky-50/50 dark:bg-slate-950/70 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-600" />
            <span>Condições e prazos parametrizados para agilizar as tratativas diárias de garantia.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-md cursor-pointer transition-colors"
          >
            Fechar Central
          </button>
        </div>
      </div>
    </div>
  );
};
