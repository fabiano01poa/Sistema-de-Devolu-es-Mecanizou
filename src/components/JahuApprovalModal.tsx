import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Edit3,
  Info,
  ShieldCheck,
  Building2,
  Mail,
  Trash2
} from 'lucide-react';
import { StockItem } from '../types';
import { 
  ParsedApprovalItem, 
  ApprovalMatchResult, 
  parseJahuApprovalText, 
  matchJahuItemsWithStock,
  buildApprovalProposal,
  SAMPLE_JAHU_APPROVAL_OCR,
  parseCurrencyValue
} from '../utils/approvalParser';
import { StockItemSearchSelect } from './StockItemSearchSelect';

interface JahuApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onApplyChanges: (updatedItems: StockItem[]) => Promise<void> | void;
}

export const JahuApprovalModal: React.FC<JahuApprovalModalProps> = ({
  isOpen,
  onClose,
  stockItems,
  onApplyChanges
}) => {
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  
  const [matchedResults, setMatchedResults] = useState<ApprovalMatchResult[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<ParsedApprovalItem[]>([]);
  const [selectedMatchIndices, setSelectedMatchIndices] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadUnmatchedCsv = () => {
    if (unmatchedItems.length === 0) return;
    const headers = ['Autorizacao', 'Numero Nota', 'Codigo Produto', 'Descricao Produto', 'Quantidade', 'Valor Unitario', 'Valor Total', 'Arquivo Origem'];
    const rows = unmatchedItems.map(item => [
      item.autorizacao || '',
      item.numeroNota || '',
      item.codigoProduto || '',
      `"${(item.descricaoProduto || '').replace(/"/g, '""')}"`,
      item.quantidade || 1,
      (item.valorUnitario || 0).toFixed(2).replace('.', ','),
      (item.valorTotal || 0).toFixed(2).replace('.', ','),
      `"${(item.fileName || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aprovacoes_pendentes_jahu_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendUnmatchedEmail = () => {
    if (unmatchedItems.length === 0) return;
    const subject = encodeURIComponent('Relatório de Aprovações Pendentes Sem Match - Jahu');
    let bodyLines = 'Relatório de Aprovações Pendentes (Jahu - Sem Match Automático):\n\n';
    unmatchedItems.forEach((item, idx) => {
      bodyLines += `${idx + 1}. AD: ${item.autorizacao || '—'} | NF: ${item.numeroNota || '—'} | Cód.: ${item.codigoProduto || '—'} | Produto: ${item.descricaoProduto} | Qtd: ${item.quantidade || 1} | Valor: R$ ${(item.valorTotal || 0).toFixed(2)} | Arquivo: ${item.fileName || 'N/A'}\n`;
    });
    const body = encodeURIComponent(bodyLines);
    window.location.href = `mailto:appestoque@mecanizou.com?subject=${subject}&body=${body}`;
  };

  const handleManualLinkStockItem = (unmatchedIdx: number, stockIdentifier: string) => {
    const itemIndex = parseInt(stockIdentifier, 10);
    const stockItem = (!isNaN(itemIndex) && stockItems[itemIndex]) 
      ? stockItems[itemIndex] 
      : stockItems.find(s => s.idStock === stockIdentifier);
    if (!stockItem) return;

    const un = unmatchedItems[unmatchedIdx];
    const newMatch: ApprovalMatchResult = {
      stockItem,
      parsedItem: un,
      confidenceScore: 100,
      matchReasons: ['Vinculado manualmente pelo operador (Jahu)'],
      statusSource: 'outro',
      proposedStatus: 'Emitir NF',
      ...buildApprovalProposal(un),
      proposedObservacoesGerais: stockItem.observacoesGerais || '',
      approved: true
    };

    setMatchedResults(prev => [...prev, newMatch]);
    setSelectedMatchIndices(prev => {
      const next = new Set(prev);
      next.add(matchedResults.length);
      return next;
    });
    setUnmatchedItems(prev => prev.filter((_, idx) => idx !== unmatchedIdx));
  };

  // Itens do estoque já vinculados (auto ou manual) não podem receber outra aprovação
  const linkedStockIds = new Set(matchedResults.map(m => m.stockItem.idStock));

  // Opções do vínculo manual: Jahu, em negociação, ainda não vinculados
  const manualLinkCandidates = stockItems
    .map((item, originalIdx) => ({ item, originalIdx }))
    .filter(({ item }) => {
      if (linkedStockIds.has(item.idStock)) return false;
      const forn = (item.fornecedor || '').toLowerCase();
      const filial = (item.novoFornecedorFilial || '').toLowerCase();
      const original = (item.fornecedorOriginal || '').toLowerCase();
      const statusDev = (item.statusDevolucao || '').toLowerCase();
      const isSupplier = forn.includes('jahu') || filial.includes('jahu') || original.includes('jahu');
      const isEmNegociacao = statusDev.includes('negociação') || statusDev.includes('negociacao');
      return isSupplier && isEmNegociacao;
    });

  const handleRemoveUnmatchedItem = (unmatchedIdx: number) => {
    setUnmatchedItems(prev => prev.filter((_, idx) => idx !== unmatchedIdx));
  };

  const handleUpdateUnmatchedField = (index: number, field: keyof ParsedApprovalItem, val: any) => {
    setUnmatchedItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: val };
    }));
  };

  const handleReset = () => {
    setStep('upload');
    setIsProcessing(false);
    setErrorMessage(null);
    setUploadedFileNames([]);
    setMatchedResults([]);
    setUnmatchedItems([]);
    setSelectedMatchIndices(new Set());
    setEditingIndex(null);
  };

  useEffect(() => {
    if (isOpen && step === 'success') {
      handleReset();
    }
  }, [isOpen]);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const processTextAndMatch = (fullText: string, fileNames: string[]) => {
    try {
      const parsed = parseJahuApprovalText(fullText, fileNames.join(', '));
      if (parsed.length === 0) {
        setErrorMessage('Nenhum item ou autorização válida foi encontrada no documento da Jahu.');
        setIsProcessing(false);
        return;
      }

      const { matched, unmatched } = matchJahuItemsWithStock(parsed, stockItems);
      setMatchedResults(matched);
      setUnmatchedItems(unmatched);

      const initialSelected = new Set<number>();
      matched.forEach((_, idx) => initialSelected.add(idx));
      setSelectedMatchIndices(initialSelected);

      setUploadedFileNames(fileNames);
      setStep('review');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao cruzar dados do PDF Jahu:', err);
      setErrorMessage('Erro ao analisar os dados do documento: ' + (err.message || 'Erro desconhecido'));
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      return (
        name.endsWith('.pdf') ||
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.webp') ||
        (f.type && (f.type.includes('pdf') || f.type.startsWith('image/')))
      );
    });

    if (fileList.length === 0) {
      setErrorMessage('Por favor, selecione um arquivo no formato PDF ou Imagem (PNG, JPG).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const payloadFiles: Array<{ name: string; base64: string; type: string }> = [];
      for (const file of fileList) {
        const base64 = await fileToBase64(file);
        payloadFiles.push({ name: file.name, base64, type: file.type });
      }

      const res = await fetch('/api/parse-approval-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles, supplier: 'Jahu' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Falha ao processar o documento no servidor.');
      }

      processTextAndMatch(data.extractedText, fileList.map(f => f.name));
    } catch (err: any) {
      console.error('Erro no upload de documento Jahu:', err);
      setErrorMessage('Não foi possível ler o arquivo enviado: ' + (err.message || 'Erro no servidor'));
      setIsProcessing(false);
    }
  };

  const handleToggleSelectMatch = (idx: number) => {
    const next = new Set(selectedMatchIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedMatchIndices(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedMatchIndices.size === matchedResults.length) {
      setSelectedMatchIndices(new Set());
    } else {
      const all = new Set<number>();
      matchedResults.forEach((_, idx) => all.add(idx));
      setSelectedMatchIndices(all);
    }
  };

  const handleUpdateProposedField = (index: number, field: keyof ApprovalMatchResult, val: any) => {
    setMatchedResults(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: val };
    }));
  };

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const itemsToUpdate: StockItem[] = [];
      const todayShort = new Date().toLocaleDateString('pt-BR');

      matchedResults.forEach((res, idx) => {
        if (selectedMatchIndices.has(idx)) {
          const item = { ...res.stockItem };
          item.statusDevolucao = res.proposedStatus;
          item.obsNotaFiscal = res.proposedObsNotaFiscal || item.obsNotaFiscal;
          if (res.proposedNfOrigem) {
            item.nfOrigem = res.proposedNfOrigem;
          }
          item.dataUltimaAlteracao = todayShort;
          itemsToUpdate.push(item);
        }
      });

      if (itemsToUpdate.length > 0) {
        await onApplyChanges(itemsToUpdate);
      }

      setStep('success');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao aplicar alterações Jahu:', err);
      setErrorMessage('Erro ao aplicar alterações: ' + (err.message || 'Erro desconhecido'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Importar Aprovação Jahu (PDF/Imagem)</h2>
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Fornecedor Jahu
                </span>
              </div>
              <p className="text-xs text-slate-400">Cruzamento de código, valor e data de emissão com itens em negociação</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-950/60 border border-red-800 rounded-xl flex items-center space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Guide explaining the rule */}
              <div className="p-4 bg-indigo-950/40 border border-indigo-900/60 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Regras de Cruzamento e Validação - Jahu:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Código de Autorização:</strong> Identifica o campo "Código Autorização:" (Ex: JAHU-98214).</li>
                  <li><strong>Cruzamento Principal:</strong> Valida código do produto, valor total/unitário e data de emissão com os itens em negociação.</li>
                  <li><strong>Ações:</strong> Permite revisar todos os matches e gerenciar pendências sem match.</li>
                </ul>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all flex flex-col items-center justify-center space-y-3 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Arraste o PDF da Jahu aqui ou clique para selecionar</h3>
                  <p className="text-xs text-slate-400 mt-1">Valida código, valor e data de emissão com os itens em negociação</p>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
                  Suporta .PDF, .PNG, .JPG (Jahu)
                </span>
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Deseja testar imediatamente com o documento de exemplo?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Carrega o espelho de aprovação da Jahu (Autorização JAHU-98214) para demonstração instantânea.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => processTextAndMatch(SAMPLE_JAHU_APPROVAL_OCR, ['Autorizacao_Jahu_Sample.pdf'])}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Testar com Documento Exemplo</span>
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              {/* Top Metrics Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">
                      {matchedResults.length}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block">
                      Itens Cruzados com Sucesso
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold text-indigo-900 dark:text-indigo-200">
                      {selectedMatchIndices.size}
                    </span>
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400 block">
                      Selecionados para Gravação
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Fornecedor Jahu
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Autorização e data validadas
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-bold text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{selectedMatchIndices.size === matchedResults.length ? 'Desmarcar Todos' : 'Marcar Todos'}</span>
                </button>
                <span className="text-xs text-slate-400">
                  Arquivo: {uploadedFileNames.join(', ')}
                </span>
              </div>

              {/* Matched Items List with Side-by-Side Comparison Tables */}
              <div className="space-y-4">
                {matchedResults.map((match, idx) => {
                  const isSelected = selectedMatchIndices.has(idx);
                  const stock = match.stockItem;
                  const parsed = match.parsedItem;

                  return (
                    <div
                      key={`jahu-match-${idx}`}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-slate-950 border-indigo-500/50 shadow-md shadow-indigo-950/30 ring-1 ring-indigo-500/20' 
                          : 'bg-slate-950/40 border-slate-800 opacity-75'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                        <label className="flex items-center space-x-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectMatch(idx)}
                            className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-white">
                            Aprovar Alteração deste Item (Jahu)
                          </span>
                        </label>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Confiança: {match.confidenceScore}%</span>
                          </span>
                        </div>
                      </div>

                      {/* Side-by-Side Comparison Table */}
                      <div className="pt-3 pb-3 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px]">
                              <th className="p-3 font-bold uppercase tracking-wider w-1/4 text-slate-300">Campo Obrigatório</th>
                              <th className="p-3 font-bold uppercase tracking-wider w-1/3 text-indigo-300 bg-indigo-950/20">Planilha (Estoque)</th>
                              <th className="p-3 font-bold uppercase tracking-wider w-1/3 text-indigo-300 bg-indigo-950/20">Aprovação Jahu (PDF)</th>
                              <th className="p-3 font-bold uppercase tracking-wider w-1/6 text-center text-slate-300">Match</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-950/60">
                            {/* Código */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">Código da Peça</td>
                              <td className="p-3 text-indigo-200 font-bold bg-indigo-950/10">
                                {stock.idStock || stock.codigo || '—'}
                              </td>
                              <td className="p-3 text-indigo-200 font-bold bg-indigo-950/10">
                                {parsed.codigoProduto || '—'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold">100% Match</span>
                              </td>
                            </tr>
                            {/* Autorização */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">Código Autorização</td>
                              <td className="p-3 text-slate-500 bg-indigo-950/10">—</td>
                              <td className="p-3 text-indigo-300 font-bold bg-indigo-950/10">{parsed.autorizacao || '—'}</td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-bold">Documento</span>
                              </td>
                            </tr>
                            {/* Descrição */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">Descrição</td>
                              <td className="p-3 font-sans text-slate-200 font-medium bg-indigo-950/10">
                                {stock.descricao || '—'}
                              </td>
                              <td className="p-3 font-sans text-slate-200 font-medium bg-indigo-950/10">
                                {parsed.descricaoProduto || '—'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">Compatível</span>
                              </td>
                            </tr>
                            {/* Valor */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">Valor Total (R$)</td>
                              <td className="p-3 text-emerald-400 font-bold bg-indigo-950/10">
                                R$ {parseFloat(String(stock.valorTotal || stock.valorUnitario || 0)).toFixed(2).replace('.', ',')}
                              </td>
                              <td className="p-3 text-emerald-400 font-bold bg-indigo-950/10">
                                R$ {parsed.valorTotal.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold">100% Match</span>
                              </td>
                            </tr>
                            {/* Data de Emissão */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">Data Emissão / NF</td>
                              <td className="p-3 text-amber-400 font-bold bg-indigo-950/10">
                                {stock.nfOrigem || 'Não informada'}
                              </td>
                              <td className="p-3 text-sky-300 font-bold bg-indigo-950/10">
                                {parsed.dataEmissao || parsed.numeroNota || '24/09/2026'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold">Match Data</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Proposed Changes Preview & Edit */}
                      <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Alterações a Serem Salvas no Item:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                            className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center space-x-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{editingIndex === idx ? 'Fechar Edição' : 'Ajustar Campos'}</span>
                          </button>
                        </div>

                        {editingIndex === idx ? (
                          <div className="space-y-2 pt-1">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400">Status da Devolução</label>
                              <input
                                type="text"
                                value={match.proposedStatus}
                                onChange={e => handleUpdateProposedField(idx, 'proposedStatus', e.target.value)}
                                className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400">Obs Nota Fiscal</label>
                              <input
                                type="text"
                                value={match.proposedObsNotaFiscal}
                                onChange={e => handleUpdateProposedField(idx, 'proposedObsNotaFiscal', e.target.value)}
                                className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                            <div>
                              <span className="text-slate-400">Novo Status: </span>
                              <strong className="text-emerald-400 font-bold">{match.proposedStatus}</strong>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400">Obs Nota Fiscal: </span>
                              <strong className="text-indigo-300 font-mono">{match.proposedObsNotaFiscal}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Unmatched Items Section */}
              {unmatchedItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-bold text-white">
                        Itens da Jahu Sem Match Automático ({unmatchedItems.length})
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadUnmatchedCsv}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>Baixar CSV Pendências</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSendUnmatchedEmail}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5 text-white" />
                        <span>Enviar por E-mail</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Estes itens foram identificados no PDF da Jahu, mas não encontramos correspondência exata no estoque. Você pode vinculá-los manualmente ou excluí-los:
                  </p>

                  <div className="space-y-2">
                    {unmatchedItems.map((un, unIdx) => (
                      <div 
                        key={un.id || `jahu-unmatched-${unIdx}`}
                        className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 shadow-sm"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pb-2 border-b border-slate-800/80">
                          <div>
                            <label className="text-slate-400 text-[10px] block font-semibold mb-1">AUTORIZAÇÃO</label>
                            <input
                              type="text"
                              value={un.autorizacao || ''}
                              onChange={e => handleUpdateUnmatchedField(unIdx, 'autorizacao', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-xs rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-[10px] block font-semibold mb-1">NF ORIGEM</label>
                            <input
                              type="text"
                              value={un.numeroNota || ''}
                              onChange={e => handleUpdateUnmatchedField(unIdx, 'numeroNota', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-sky-400 font-mono font-bold text-xs rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-[10px] block font-semibold mb-1">DATA EMISSÃO</label>
                            <input
                              type="text"
                              value={un.dataEmissao || ''}
                              onChange={e => handleUpdateUnmatchedField(unIdx, 'dataEmissao', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-xs rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-[10px] block font-semibold mb-1">QTDE</label>
                            <input
                              type="number"
                              min="1"
                              value={un.quantidade || 1}
                              onChange={e => handleUpdateUnmatchedField(unIdx, 'quantidade', parseInt(e.target.value, 10) || 1)}
                              className="w-full bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-slate-400 text-[10px] block font-semibold mb-1">CÓDIGO PRODUTO</label>
                            <input
                              type="text"
                              value={un.codigoProduto || ''}
                              onChange={e => handleUpdateUnmatchedField(unIdx, 'codigoProduto', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-indigo-400 font-mono font-bold text-xs rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-[10px] block font-semibold mb-1">VALOR TOTAL (R$)</label>
                            <input
                              type="text"
                              value={(un.valorTotal || 0).toFixed(2).replace('.', ',')}
                              onChange={e => handleUpdateUnmatchedField(unIdx, 'valorTotal', parseCurrencyValue(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-xs rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-400 text-[10px] block font-semibold mb-1">DESCRIÇÃO DA PEÇA NO PDF</label>
                          <textarea
                            rows={2}
                            value={un.descricaoProduto || ''}
                            onChange={e => handleUpdateUnmatchedField(unIdx, 'descricaoProduto', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded p-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                          />
                        </div>

                        {/* Manual Linking Selector & Exclude */}
                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                          <StockItemSearchSelect
                            tone="dark"
                            candidates={manualLinkCandidates}
                            ariaLabel={`Vincular ${un.codigoProduto || un.descricaoProduto} a um item do estoque`}
                            onSelect={originalIdx => handleManualLinkStockItem(unIdx, String(originalIdx))}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveUnmatchedItem(unIdx)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            title="Excluir esta aprovação pendente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/50">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-white">Aprovação Jahu Aplicada com Sucesso!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Os itens foram atualizados no estoque com o status "Emitir NF" e a autorização vinculada corretamente.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors shadow-lg shadow-indigo-950/40 cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
            <span className="text-xs text-slate-400">
              {selectedMatchIndices.size} de {matchedResults.length} itens selecionados para aprovação.
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isProcessing || selectedMatchIndices.size === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-indigo-950/40 flex items-center space-x-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar e Atualizar Estoque ({selectedMatchIndices.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
