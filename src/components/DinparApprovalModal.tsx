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
  ShieldCheck,
  Building2,
  Mail
} from 'lucide-react';
import { StockItem } from '../types';
import { 
  ParsedApprovalItem, 
  ApprovalMatchResult, 
  parseDinparApprovalText, 
  matchDinparWithStock,
  SAMPLE_DINPAR_APPROVAL_OCR
} from '../utils/approvalParser';

interface DinparApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onApplyChanges: (updatedItems: StockItem[]) => Promise<void> | void;
}

export const DinparApprovalModal: React.FC<DinparApprovalModalProps> = ({
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
    const headers = ['Autorizacao', 'Numero Nota', 'Descricao Produto', 'Quantidade', 'Valor Total', 'Arquivo Origem'];
    const rows = unmatchedItems.map(item => [
      item.autorizacao || '',
      item.numeroNota || '',
      `"${(item.descricaoProduto || '').replace(/"/g, '""')}"`,
      item.quantidade || 1,
      (item.valorTotal || 0).toFixed(2),
      `"${(item.fileName || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aprovacoes_pendentes_dinpar_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendUnmatchedEmail = () => {
    if (unmatchedItems.length === 0) return;
    const subject = encodeURIComponent('Relatório de Aprovações Pendentes Sem Match - Dinpar');
    let bodyLines = 'Relatório de Aprovações Pendentes (Dinpar - Sem Match Automático):\n\n';
    unmatchedItems.forEach((item, idx) => {
      bodyLines += `${idx + 1}. AD: ${item.autorizacao} | NF: ${item.numeroNota} | Produto: ${item.descricaoProduto} | Valor: R$ ${(item.valorTotal || 0).toFixed(2)} | Arquivo: ${item.fileName || 'N/A'}\n`;
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
      matchReasons: ['Vinculado manualmente pelo operador (Dinpar)'],
      statusSource: 'outro',
      proposedStatus: 'Emitir NF',
      proposedObsNotaFiscal: `Nro Autorização: ${un.autorizacao} - NF ${un.numeroNota}`,
      proposedObservacoesGerais: stockItem.observacoesGerais || '',
      proposedMotivo: `NF ${un.numeroNota}`,
      proposedNfOrigem: un.numeroNota || '',
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
      const parsed = parseDinparApprovalText(fullText, fileNames.join(', '));
      if (parsed.length === 0) {
        setErrorMessage('Nenhum item ou autorização válida da Dinpar foi encontrada no documento.');
        setIsProcessing(false);
        return;
      }

      const { matched, unmatched } = matchDinparWithStock(parsed, stockItems);
      setMatchedResults(matched);
      setUnmatchedItems(unmatched);
      
      const initialSelected = new Set<number>();
      matched.forEach((_, idx) => initialSelected.add(idx));
      setSelectedMatchIndices(initialSelected);

      setUploadedFileNames(fileNames);
      setStep('review');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao cruzar dados da Dinpar:', err);
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
      setErrorMessage('Por favor, selecione um arquivo no formato PDF ou Imagem.');
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
        body: JSON.stringify({ files: payloadFiles, supplier: 'Dinpar' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Falha ao processar o documento no servidor.');
      }

      processTextAndMatch(data.extractedText, fileList.map(f => f.name));
    } catch (err: any) {
      setErrorMessage('Não foi possível ler o arquivo enviado: ' + (err.message || 'Erro no servidor'));
      setIsProcessing(false);
    }
  };

  const handleLoadSample = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      processTextAndMatch(SAMPLE_DINPAR_APPROVAL_OCR, ['Espelho_Dinpar_00018765_Exemplo.pdf']);
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
      const aut = res.parsedItem.autorizacao || '00018765-AD';
      const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
      const nf = cleanNf(res.parsedItem.numeroNota || '61141');

      const interacaoLinha = `${todayShort} - Status: "${statusAntigo}" ➔ "${novoStatus}" | Aut: ${aut} | NF: ${nf}`;
      const existingInteracao = orig.ultimaInteracao ? orig.ultimaInteracao.trim() : '';
      const finalInteracao = existingInteracao 
        ? `${interacaoLinha}\n${existingInteracao}`
        : interacaoLinha;

      const updated: StockItem = {
        ...orig,
        statusDevolucao: novoStatus,
        obsNotaFiscal: res.proposedObsNotaFiscal || `Nro Autorização: ${aut} - NF ${nf}`,
        observacoesGerais: orig.observacoesGerais || '',
        nfOrigem: res.proposedNfOrigem || nf,
        motivo: res.proposedMotivo || `NF ${nf}`,
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
      setErrorMessage('Erro ao salvar as alterações: ' + (err.message || 'Erro'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fadeIn my-auto text-slate-800 dark:text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-300 dark:border-sky-700/60">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Aprovação Automática - Dinpar
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  Dinpar Peças
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Conciliação de espelhos de devolução Dinpar, cruzamento de código, NF e mudança para "Emitir NF"
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
            <div className="p-4 bg-sky-50/70 dark:bg-slate-950/80 border border-sky-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300">
                <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Regras de Extração e Cruzamento da Dinpar:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-slate-700 dark:text-slate-300">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800">
                  <div className="font-bold text-sky-600 dark:text-sky-400 mb-1">
                    <span>Autorização (AD)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Extrai o número da autorização (ex: <strong>00018765-AD</strong>) e preenche automaticamente a <strong>Obs Nota Fiscal</strong>.
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800">
                  <div className="font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                    <span>NF de Origem</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Extrai a nota fiscal referenciada no rodapé e preenche no <strong>Motivo</strong>.
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span>Status "Emitir NF"</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Cruza o código do produto (ex: 36160) e altera o status para <strong>"Emitir NF"</strong>.
                  </p>
                </div>
              </div>
            </div>

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
              className="border-2 border-dashed border-sky-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500/80 bg-sky-50/20 dark:bg-slate-950/40 hover:bg-sky-50/50 dark:hover:bg-slate-950/80 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
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
              
              <div className="p-4 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-full">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Clique para selecionar ou arraste o PDF / Imagem de Espelho da Dinpar
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Formatos aceitos: PDF, PNG, JPG
                </p>
              </div>

              {isProcessing && (
                <div className="flex items-center space-x-2 text-xs font-bold text-sky-600 dark:text-sky-400 pt-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando e cruzando informações da Dinpar...</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Deseja testar com o documento de exemplo da Dinpar?
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Carrega o espelho Dinpar (Autorização 00018765-AD, 36160) para demonstração instantânea.
                </span>
              </div>

              <button
                onClick={handleLoadSample}
                disabled={isProcessing}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Testar com Exemplo Dinpar</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW */}
        {step === 'review' && (
          <div className="p-6 space-y-5">
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

              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl flex items-center space-x-3">
                <div className="p-2 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-extrabold text-sky-900 dark:text-sky-200">
                    {selectedMatchIndices.size}
                  </span>
                  <span className="text-xs font-medium text-sky-700 dark:text-sky-400 block">
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
                    Fornecedor
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dinpar Peças
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5 cursor-pointer"
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

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {matchedResults.map((result, idx) => {
                const isSelected = selectedMatchIndices.has(idx);
                const isEditing = editingIndex === idx;
                const orig = result.stockItem;

                return (
                  <div 
                    key={`dinpar-match-${orig.idStock || idx}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-sky-50/40 dark:bg-slate-900 border-sky-300 dark:border-sky-800/80 shadow-sm' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectMatch(idx)}
                        className="mt-1 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />

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
                              Fornecedor: {orig.fornecedor || 'Dinpar'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {result.confidenceScore}% compatível
                            </span>
                            <button
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              className="p-1 text-slate-400 hover:text-sky-600 rounded"
                              title="Editar campos"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

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

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-200 dark:border-slate-800">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">
                              Status Devolução
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="line-through text-slate-400 text-[11px] truncate max-w-[80px]">
                                {orig.statusDevolucao || '—'}
                              </span>
                              <ArrowRight className="w-3 h-3 text-sky-500 shrink-0" />
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                {result.proposedStatus}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 block">
                              Obs Nota Fiscal
                            </span>
                            {isEditing ? (
                              <input 
                                type="text"
                                value={result.proposedObsNotaFiscal}
                                onChange={(e) => handleUpdateProposed(idx, 'proposedObsNotaFiscal', e.target.value)}
                                className="w-full text-[11px] p-1 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              />
                            ) : (
                              <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 block truncate">
                                {result.proposedObsNotaFiscal}
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-yellow-600 dark:text-yellow-400 block">
                              Motivo (NF)
                            </span>
                            {isEditing ? (
                              <input 
                                type="text"
                                value={result.proposedMotivo}
                                onChange={(e) => handleUpdateProposed(idx, 'proposedMotivo', e.target.value)}
                                className="w-full text-[11px] p-1 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              />
                            ) : (
                              <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 block truncate">
                                {result.proposedMotivo}
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">
                              Obs. Gerais
                            </span>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 block truncate">
                              {result.proposedObservacoesGerais || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {unmatchedItems.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Itens Dinpar Sem Match Automático ({unmatchedItems.length})
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
                      <span>Enviar por E-mail</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {unmatchedItems.map((un, unIdx) => (
                    <div 
                      key={`dinpar-unmatched-${unIdx}`}
                      className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div>
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">AD: {un.autorizacao}</span>
                          <span className="mx-2 text-slate-400">•</span>
                          <span className="text-amber-600 dark:text-amber-300 font-semibold">NF: {un.numeroNota || '—'}</span>
                          <span className="mx-2 text-slate-400">•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">R$ {un.valorTotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-900 dark:text-slate-100 font-semibold">
                        {un.descricaoProduto}
                      </p>

                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                        <span className="text-slate-700 dark:text-slate-300 font-medium shrink-0">Vincular manualmente ao estoque:</span>
                        <select
                          onChange={e => {
                            if (e.target.value) {
                              handleManualLinkStockItem(unIdx, e.target.value);
                            }
                          }}
                          defaultValue=""
                          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1.5"
                        >
                          <option value="">Selecione um item do estoque...</option>
                          {stockItems
                            .map((item, originalIdx) => ({ item, originalIdx }))
                            .filter(({ item }) => item.fornecedor?.toLowerCase().includes('dinpar'))
                            .map(({ item, originalIdx }) => (
                              <option key={`dinpar-stock-opt-${item.idStock}-${originalIdx}`} value={`${originalIdx}`}>
                                {item.idStock} - {item.descricao ? item.descricao.slice(0, 35) : ''}... - {item.valorTotal || item.valorUnitario || 'R$ 0,00'}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Aprovações da Dinpar aplicadas com sucesso!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Os itens selecionados foram atualizados para o status "Emitir NF" com o número da autorização e nota fiscal de origem.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Concluir
            </button>
          </div>
        )}

        {/* Footer actions for review */}
        {step === 'review' && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
            >
              ← Enviar outro arquivo
            </button>

            <button
              onClick={handleApply}
              disabled={selectedMatchIndices.size === 0 || isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Aplicar Alterações em {selectedMatchIndices.size} item(ns)</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
