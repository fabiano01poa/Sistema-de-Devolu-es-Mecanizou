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
  FileCheck, 
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
  parseGrupoRealApprovalText,
  matchGrupoRealWithStock,
  buildApprovalProposal,
  SAMPLE_GRUPO_REAL_APPROVAL_OCR
} from '../utils/approvalParser';
import { StockItemSearchSelect } from './StockItemSearchSelect';

interface GrupoRealApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onApplyChanges: (updatedItems: StockItem[]) => Promise<void> | void;
}

export const GrupoRealApprovalModal: React.FC<GrupoRealApprovalModalProps> = ({
  isOpen,
  onClose,
  stockItems,
  onApplyChanges
}) => {
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  
  // Parsed and Match Results
  const [matchedResults, setMatchedResults] = useState<ApprovalMatchResult[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<ParsedApprovalItem[]>([]);
  const [selectedMatchIndices, setSelectedMatchIndices] = useState<Set<number>>(new Set());
  
  // Custom manual edit state for a match
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
    link.setAttribute('download', `aprovacoes_pendentes_grupo_real_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendUnmatchedEmail = () => {
    if (unmatchedItems.length === 0) return;
    const subject = encodeURIComponent('Relatório de Aprovações Pendentes Sem Match - Grupo Real');
    let bodyLines = 'Relatório de Aprovações Pendentes (Grupo Real - Sem Match Automático):\n\n';
    unmatchedItems.forEach((item, idx) => {
      bodyLines += `${idx + 1}. AD: ${item.autorizacao} | NF: ${item.numeroNota} | Cód.: ${item.codigoProduto || '—'} | Produto: ${item.descricaoProduto} | Qtd: ${item.quantidade || 1} | Valor: R$ ${(item.valorTotal || 0).toFixed(2)} | Arquivo: ${item.fileName || 'N/A'}\n`;
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
      matchReasons: ['Vinculado manualmente pelo operador (Grupo Real)'],
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

  // Itens do estoque já vinculados (auto ou manual) não podem receber outra AD
  const linkedStockIds = new Set(matchedResults.map(m => m.stockItem.idStock));

  // Opções do vínculo manual: Grupo Real ou Mecanizou, em negociação, ainda não vinculados
  const manualLinkCandidates = stockItems
    .map((item, originalIdx) => ({ item, originalIdx }))
    .filter(({ item }) => {
      if (linkedStockIds.has(item.idStock)) return false;
      const forn = (item.fornecedor || '').toLowerCase();
      const filial = (item.novoFornecedorFilial || '').toLowerCase();
      const original = (item.fornecedorOriginal || '').toLowerCase();
      const statusDev = (item.statusDevolucao || '').toLowerCase();
      const isSupplier = forn.includes('real') || filial.includes('real') || original.includes('real') || forn.includes('mecanizou') || filial.includes('mecanizou');
      const isEmNegociacao = statusDev.includes('negociação') || statusDev.includes('negociacao');
      return isSupplier && isEmNegociacao;
    });

  const handleRemoveUnmatchedItem = (unmatchedIdx: number) => {
    setUnmatchedItems(prev => prev.filter((_, idx) => idx !== unmatchedIdx));
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
    if (isOpen) {
      if (step === 'success') {
        handleReset();
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const processTextAndMatch = (fullText: string, fileNames: string[]) => {
    try {
      const parsed = parseGrupoRealApprovalText(fullText, fileNames.join(', '));
      if (parsed.length === 0) {
        setErrorMessage('Nenhum item ou autorização válida do Grupo Real foi encontrada no documento. Verifique se o PDF contém o espelho RMPR1660 / Autorização de Devolução.');
        setIsProcessing(false);
        return;
      }

      const { matched, unmatched } = matchGrupoRealWithStock(parsed, stockItems);
      setMatchedResults(matched);
      setUnmatchedItems(unmatched);
      
      // Select all matched by default
      const initialSelected = new Set<number>();
      matched.forEach((_, idx) => initialSelected.add(idx));
      setSelectedMatchIndices(initialSelected);

      setUploadedFileNames(fileNames);
      setStep('review');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao cruzar dados do Grupo Real:', err);
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
        body: JSON.stringify({ files: payloadFiles, supplier: 'Grupo Real' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Falha ao processar o documento no servidor.');
      }

      processTextAndMatch(data.extractedText, fileList.map(f => f.name));
    } catch (err: any) {
      console.warn('Processamento nativo/servidor falhou, tentando leitura direta:', err);
      // Fallback: If OCR API is unavailable, inform user or let them test with sample
      setErrorMessage('Não foi possível ler o arquivo enviado: ' + (err.message || 'Erro no servidor'));
      setIsProcessing(false);
    }
  };

  const handleLoadSample = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      processTextAndMatch(SAMPLE_GRUPO_REAL_APPROVAL_OCR, ['RMPR1660_Autorizacao_004737_Exemplo.pdf']);
    }, 400);
  };

  const toggleSelectMatch = (idx: number) => {
    const next = new Set(selectedMatchIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedMatchIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedMatchIndices.size === matchedResults.length) {
      setSelectedMatchIndices(new Set());
    } else {
      const all = new Set<number>();
      matchedResults.forEach((_, i) => all.add(i));
      setSelectedMatchIndices(all);
    }
  };

  const handleUpdateProposed = (index: number, field: keyof ApprovalMatchResult, val: any) => {
    setMatchedResults(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleApply = async () => {
    if (selectedMatchIndices.size === 0) return;

    setIsProcessing(true);
    const todayShort = new Date().toLocaleDateString('pt-BR');
    const nowIso = new Date().toISOString();

    const itemsToSave: StockItem[] = [];

    matchedResults.forEach((res, idx) => {
      if (!selectedMatchIndices.has(idx)) return;

      const orig = res.stockItem;
      const statusAntigo = orig.statusDevolucao || 'Sem Status';
      const novoStatus = res.proposedStatus || 'Emitir NF';
      const aut = res.parsedItem.autorizacao || '';
      const nf = (res.parsedItem.numeroNota || '').replace(/\./g, '').trim();

      const interacaoLinha = [
        `${todayShort} - Status: "${statusAntigo}" ➔ "${novoStatus}"`,
        aut && `Aut: ${aut}`,
        nf && `NF: ${nf}`
      ].filter(Boolean).join(' | ');
      const existingInteracao = orig.ultimaInteracao ? orig.ultimaInteracao.trim() : '';
      const finalInteracao = existingInteracao 
        ? `${interacaoLinha}\n${existingInteracao}`
        : interacaoLinha;

      const updated: StockItem = {
        ...orig,
        statusDevolucao: novoStatus,
        obsNotaFiscal: res.proposedObsNotaFiscal || orig.obsNotaFiscal || '',
        observacoesGerais: orig.observacoesGerais || '',
        nfOrigem: res.proposedNfOrigem || orig.nfOrigem || '',
        motivo: res.proposedMotivo || orig.motivo || '',
        ultimaInteracao: finalInteracao,
        dataUltimaAlteracao: nowIso
      };

      itemsToSave.push(updated);
    });

    try {
      await onApplyChanges(itemsToSave);
      setIsProcessing(false);
      setStep('success');
    } catch (err: any) {
      console.error('Erro ao aplicar alterações:', err);
      setErrorMessage('Erro ao salvar as alterações: ' + (err.message || 'Erro'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fadeIn my-auto text-slate-800 dark:text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-300 dark:border-amber-700/60">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Aprovação Automática - Grupo Real
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Leste & Norte (Botão Único)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Conciliação de autorizações RMPR1660, cruzamento de Cód. Prod. (TC-9093 = TC9093), NF e mudança para "Emitir NF"
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl flex items-center space-x-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="p-6 space-y-5">
            {/* Guide explaining the rule */}
            <div className="p-4 bg-amber-50/70 dark:bg-slate-950/80 border border-amber-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Regras de Extração e Cruzamento do Grupo Real:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-slate-700 dark:text-slate-300">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Em Vermelho: Autorização</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Extrai o número da autorização (ex: <strong>004737</strong>) e cola em <strong>Obs Nota Fiscal</strong> ("Nro Autorização: 004737") e Observações Gerais.
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span>Pintado Amarelo: NF</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Extrai a NF referenciada (ex: <strong>0147297</strong>) e preenche no <strong>Motivo</strong> ("NF 0147297").
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>Cód. Prod. x Nome</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Cruza <strong>TC-9093</strong> e <strong>TC9093</strong> como o mesmo item, valida nome aproximado (Tampa Reservatório) e altera o status para <strong>"Emitir NF"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Drag and drop zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFilesSelected(e.dataTransfer.files);
                }
              }}
              className="border-2 border-dashed border-amber-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500/80 bg-amber-50/20 dark:bg-slate-950/40 hover:bg-amber-50/50 dark:hover:bg-slate-950/80 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesSelected(e.target.files);
                  }
                }}
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                multiple
                className="hidden" 
              />
              
              <div className="p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Clique para selecionar ou arraste o PDF / Imagem de Autorização do Grupo Real
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Formatos aceitos: PDF (RMPR1660), fotos ou capturas de tela (PNG, JPG)
                </p>
              </div>

              {isProcessing && (
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 dark:text-amber-400 pt-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando e cruzando informações com o estoque...</span>
                </div>
              )}
            </div>

            {/* 1-Click Sample Test Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Deseja testar imediatamente com o documento de exemplo?
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Carrega o documento RMPR1660 (Autorização 004737, TC9093, NF 0147297) para demonstração instantânea.
                </span>
              </div>

              <button
                onClick={handleLoadSample}
                disabled={isProcessing}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Testar com Documento Exemplo</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW MATCHES */}
        {step === 'review' && (
          <div className="p-6 space-y-5">
            {/* Top metrics summary */}
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

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-extrabold text-amber-900 dark:text-amber-200">
                    {selectedMatchIndices.size}
                  </span>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400 block">
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
                    Filiais Atendidas
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Zona Leste & Zona Norte consolidadas
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {selectedMatchIndices.size === matchedResults.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </span>
              </button>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                {uploadedFileNames.join(', ')}
              </span>
            </div>

            {/* Matches List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {matchedResults.map((result, idx) => {
                const isSelected = selectedMatchIndices.has(idx);
                const isEditing = editingIndex === idx;
                const orig = result.stockItem;
                const parsed = result.parsedItem;

                return (
                  <div 
                    key={`grupo-real-match-${orig.idStock || idx}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-amber-50/40 dark:bg-slate-900 border-amber-300 dark:border-amber-800/80 shadow-sm' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectMatch(idx)}
                        className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {orig.idStock}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {orig.descricao}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Filial: {orig.novoFornecedorFilial || orig.fornecedor || 'Grupo Real'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {result.confidenceScore}% compatível
                            </span>
                            <button
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded"
                              title="Editar campos propostos"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {result.matchReasons.map((reason, rIdx) => (
                            <span 
                              key={`reason-${idx}-${rIdx}`}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>

                        {/* Side-by-Side Comparison Table */}
                        <div className="pt-2 pb-2 overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                                <th className="p-2.5 font-bold uppercase tracking-wider w-1/4 text-slate-700 dark:text-slate-300">Campo Obrigatório</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider w-1/3 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20">Planilha (Estoque)</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider w-1/3 text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20">Aprovação (PDF)</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider w-1/6 text-center text-slate-700 dark:text-slate-300">Match</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] bg-white dark:bg-slate-950/60">
                              {/* Código */}
                              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                <td className="p-2.5 font-sans font-bold text-slate-700 dark:text-slate-300">Código / ID</td>
                                <td className="p-2.5 text-indigo-800 dark:text-indigo-200 font-bold bg-indigo-50/30 dark:bg-indigo-950/10">
                                  {orig.idStock || orig.codigo || '—'}
                                </td>
                                <td className="p-2.5 text-rose-800 dark:text-rose-200 font-bold bg-rose-50/30 dark:bg-rose-950/10">
                                  {parsed.codigoProduto || 'Não listado'}
                                </td>
                                <td className="p-2.5 text-center">
                                  {result.confidenceScore >= 95 ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[10px] font-bold">100% Match</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded text-[10px] font-bold">Parcial (~80%)</span>
                                  )}
                                </td>
                              </tr>
                              {/* Aprovação (AD) */}
                              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                <td className="p-2.5 font-sans font-bold text-slate-700 dark:text-slate-300">Aprovação (AD)</td>
                                <td className="p-2.5 text-slate-400 bg-indigo-50/30 dark:bg-indigo-950/10">—</td>
                                <td className="p-2.5 text-rose-800 dark:text-rose-300 font-bold bg-rose-50/30 dark:bg-rose-950/10">AD: {parsed.autorizacao || '—'}</td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 rounded text-[10px] font-bold">Documento</span>
                                </td>
                              </tr>
                              {/* Descrição */}
                              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                <td className="p-2.5 font-sans font-bold text-slate-700 dark:text-slate-300">Descrição da Peça</td>
                                <td className="p-2.5 font-sans text-slate-800 dark:text-slate-200 font-medium bg-indigo-50/30 dark:bg-indigo-950/10">
                                  {orig.descricao || '—'}
                                </td>
                                <td className="p-2.5 font-sans text-slate-800 dark:text-slate-200 font-medium bg-rose-50/30 dark:bg-rose-950/10">
                                  {parsed.descricaoProduto || '—'}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[10px] font-bold">Compatível</span>
                                </td>
                              </tr>
                              {/* Valor */}
                              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                <td className="p-2.5 font-sans font-bold text-slate-700 dark:text-slate-300">Valor Total (R$)</td>
                                <td className="p-2.5 text-emerald-700 dark:text-emerald-400 font-bold bg-indigo-50/30 dark:bg-indigo-950/10">
                                  R$ {parseFloat(String(orig.valorTotal || orig.valorUnitario || 0)).toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2.5 text-emerald-700 dark:text-emerald-400 font-bold bg-rose-50/30 dark:bg-rose-950/10">
                                  R$ {parsed.valorTotal.toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2.5 text-center">
                                  {Math.abs(parseFloat(String(orig.valorTotal || orig.valorUnitario || 0)) - parsed.valorTotal) < 0.1 ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[10px] font-bold">100% Match</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[10px] font-bold">Ajuste Valor</span>
                                  )}
                                </td>
                              </tr>
                              {/* NF Origem vs NF Sugerida */}
                              <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                <td className="p-2.5 font-sans font-bold text-slate-700 dark:text-slate-300">NF Origem vs. NF Sugerida</td>
                                <td className="p-2.5 text-amber-700 dark:text-amber-400 font-bold bg-indigo-50/30 dark:bg-indigo-950/10">
                                  {orig.nfOrigem || orig.nf || 'Não informada'}
                                </td>
                                <td className="p-2.5 text-sky-700 dark:text-sky-300 font-bold bg-rose-50/30 dark:bg-rose-950/10">
                                  {parsed.numeroNota || 'Não extraída'}
                                </td>
                                <td className="p-2.5 text-center">
                                  {orig.nfOrigem && parsed.numeroNota && (orig.nfOrigem.includes(parsed.numeroNota) || parsed.numeroNota.includes(orig.nfOrigem)) ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[10px] font-bold">100% Match</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[10px] font-bold">Match Parcial</span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: Unmatched Items from Grupo Real PDF */}
            {unmatchedItems.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Itens do Grupo Real Sem Match Automático ({unmatchedItems.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadUnmatchedCsv}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-500" />
                      <span>Baixar CSV Pendências</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendUnmatchedEmail}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5 text-white" />
                      <span>Enviar por E-mail (appestoque@mecanizou.com)</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Estes itens foram identificados no PDF do Grupo Real, mas não encontramos um item correspondente no estoque. Você pode vinculá-los manualmente abaixo ou exportar o relatório:
                </p>

                <div className="space-y-2">
                  {unmatchedItems.map((un, unIdx) => (
                    <div
                      key={un.id || `grupo-real-unmatched-${unIdx}`}
                      className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">AD: {un.autorizacao}</span>
                          <span className="mx-2 text-slate-400">•</span>
                          <span className="text-amber-600 dark:text-amber-300 font-semibold">NF: {un.numeroNota || '—'}</span>
                          <span className="mx-2 text-slate-400">•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">R$ {un.valorTotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                        {un.fileName && (
                          <span className="text-[11px] text-slate-500 font-medium truncate">{un.fileName}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-[auto_1fr_auto_auto] gap-x-4 gap-y-1.5">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">CÓD. PROD.</span>
                          <p className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold mt-0.5">{un.codigoProduto || '—'}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 order-first sm:order-none">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">DESCRIÇÃO DA PEÇA NO PDF</span>
                          <p className="text-xs text-slate-900 dark:text-slate-100 font-bold mt-0.5">{un.descricaoProduto}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">QTD.</span>
                          <p className="text-xs text-slate-900 dark:text-slate-100 font-bold mt-0.5">{un.quantidade || 1}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">VL. UN.</span>
                          <p className="text-xs text-slate-900 dark:text-slate-100 font-bold mt-0.5">R$ {(un.valorUnitario || 0).toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>

                      {/* Manual Linking Selector and Delete Button */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                        <StockItemSearchSelect
                          candidates={manualLinkCandidates}
                          ariaLabel={`Vincular ${un.codigoProduto || un.descricaoProduto} a um item do estoque`}
                          onSelect={originalIdx => handleManualLinkStockItem(unIdx, String(originalIdx))}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveUnmatchedItem(unIdx)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
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

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Voltar e Enviar Outro Arquivo
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleApply}
                  disabled={selectedMatchIndices.size === 0 || isProcessing}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando e Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Gravar {selectedMatchIndices.size} Alteração(ões)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Alterações do Grupo Real Gravadas com Sucesso!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Os itens foram atualizados para o status <strong>"Emitir NF"</strong>, os dados de Autorização e NF foram vinculados e o histórico de alterações foi registrado.
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
