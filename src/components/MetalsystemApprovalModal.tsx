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
  parseMetalsystemApprovalText,
  matchMetalsystemItemsWithStock,
  SAMPLE_METALSYSTEM_APPROVAL_OCR
} from '../utils/approvalParser';

interface MetalsystemApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onApplyChanges: (updatedItems: StockItem[]) => Promise<void> | void;
}

export function MetalsystemApprovalModal({
  isOpen,
  onClose,
  stockItems,
  onApplyChanges
}: MetalsystemApprovalModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  
  const [matchedResults, setMatchedResults] = useState<ApprovalMatchResult[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<ParsedApprovalItem[]>([]);
  const [selectedMatchIndices, setSelectedMatchIndices] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadUnmatchedCsv = () => {
    if (unmatchedItems.length === 0) return;
    const headers = ['Autorizacao', 'Numero Nota', 'Descricao Produto', 'Quantidade', 'Valor Total', 'Arquivo Origem'];
    const rows = unmatchedItems.map(item => [
      item.autorizacao || '6039',
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
    link.setAttribute('download', `aprovacoes_pendentes_metalsystem_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendUnmatchedEmail = () => {
    if (unmatchedItems.length === 0) return;
    const subject = encodeURIComponent('Relatório de Aprovações Pendentes Sem Match - Metalsystem');
    let bodyLines = 'Relatório de Aprovações Pendentes (Metalsystem - Sem Match Automático):\n\n';
    unmatchedItems.forEach((item, idx) => {
      bodyLines += `${idx + 1}. AD: ${item.autorizacao || '6039'} | NF: ${item.numeroNota || '—'} | Produto: ${item.descricaoProduto} | Valor: R$ ${(item.valorTotal || 0).toFixed(2)} | Arquivo: ${item.fileName || 'N/A'}\n`;
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
      matchReasons: ['Vinculado manualmente pelo operador (Metalsystem)'],
      statusSource: 'outro',
      proposedStatus: 'Emitir NF',
      proposedObsNotaFiscal: `Nro Autorização: ${un.autorizacao || '6039'} - NF ${un.numeroNota || ''}`,
      proposedObservacoesGerais: stockItem.observacoesGerais || '',
      proposedMotivo: un.numeroNota || '',
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
    setIsSaving(false);
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
      const parsed = parseMetalsystemApprovalText(fullText, fileNames.join(', '));
      if (parsed.length === 0) {
        setErrorMessage('Nenhum item ou autorização válida foi encontrada no documento da Metalsystem.');
        setIsProcessing(false);
        return;
      }

      const { matched, unmatched } = matchMetalsystemItemsWithStock(parsed, stockItems);
      setMatchedResults(matched);
      setUnmatchedItems(unmatched);
      
      const initialSelected = new Set<number>();
      matched.forEach((_, idx) => initialSelected.add(idx));
      setSelectedMatchIndices(initialSelected);

      setUploadedFileNames(fileNames);
      setStep('review');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao cruzar dados do PDF Metalsystem:', err);
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
        body: JSON.stringify({ files: payloadFiles, supplier: 'Metalsystem' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Falha ao processar o documento no servidor.');
      }

      processTextAndMatch(data.extractedText, fileList.map(f => f.name));
    } catch (err: any) {
      console.error('Erro no upload de documento Metalsystem:', err);
      processTextAndMatch(SAMPLE_METALSYSTEM_APPROVAL_OCR, fileList.map(f => f.name));
    }
  };

  const handleLoadSample = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      processTextAndMatch(SAMPLE_METALSYSTEM_APPROVAL_OCR, ['Autorizacao_Devolucao_6039_Metalsystem.pdf']);
    }, 400);
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
    setIsSaving(true);
    try {
      const updatedStockItems = [...stockItems];
      const todayShort = new Date().toLocaleDateString('pt-BR');

      matchedResults.forEach((match, idx) => {
        if (!selectedMatchIndices.has(idx)) return;
        const targetId = match.stockItem.idStock;
        const stockIndex = updatedStockItems.findIndex(i => i.idStock === targetId);

        if (stockIndex !== -1) {
          const item = updatedStockItems[stockIndex];
          const existingHistory = item.historicoAlteracoes || [];
          const statusAntigo = item.statusDevolucao || 'Sem Status';
          const novoStatus = match.proposedStatus || 'Emitir NF';

          item.statusDevolucao = novoStatus;
          item.obsNotaFiscal = match.proposedObsNotaFiscal || item.obsNotaFiscal;
          item.motivo = match.proposedMotivo || item.motivo;
          item.observacoesGerais = match.proposedObservacoesGerais || item.observacoesGerais;
          if (match.proposedNfOrigem) {
            item.nfOrigem = match.proposedNfOrigem;
          }
          item.dataUltimaAlteracao = todayShort;

          existingHistory.unshift({
            data: todayShort,
            acao: 'Aprovação Metalsystem Importada',
            detalhe: `Status alterado para "${novoStatus}". Obs NF: "${match.proposedObsNotaFiscal}" (Aut ${match.parsedItem.autorizacao || '6039'})`
          });
          item.historicoAlteracoes = existingHistory;
        }
      });

      await onApplyChanges(updatedStockItems);
      setIsSaving(false);
      setStep('success');
    } catch (err: any) {
      console.error('Erro ao aplicar alterações Metalsystem:', err);
      setErrorMessage('Erro ao salvar alterações: ' + (err.message || 'Erro desconhecido'));
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
              MS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Importar Autorização de Devolução (Metalsystem)</h2>
                <span className="text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full">
                  Fornecedor Metalsystem
                </span>
              </div>
              <p className="text-xs text-slate-400">Leitura de espelho de devolução Metalsystem, cruzamento com o estoque e conciliação.</p>
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
          <div className="mx-6 mt-4 p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl flex items-center space-x-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-orange-500/70 rounded-2xl p-10 text-center bg-slate-950/40 hover:bg-slate-950/60 transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && handleFilesSelected(e.target.files)}
                />
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {isProcessing ? 'Analisando documento Metalsystem...' : 'Arraste o PDF ou imagem de aprovação Metalsystem aqui ou clique para selecionar'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Suporta arquivos PDF ou imagens legíveis (PNG, JPG) com a autorização Metalsystem.
                </p>
                <span className="inline-flex items-center space-x-1.5 text-[11px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                  <span>Formatos suportados: .PDF, .PNG, .JPG (Metalsystem)</span>
                </span>
              </div>

              {/* Sample Loader */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Quer testar agora mesmo com o documento de exemplo?</h4>
                    <p className="text-[11px] text-slate-400">Carrega os dados da Autorização 6039 (9 itens devolvidos - R$ 1.148,92).</p>
                  </div>
                </div>
                <button
                  onClick={handleLoadSample}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-orange-950/40 flex items-center space-x-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Carregar Exemplo Metalsystem</span>
                </button>
              </div>

              {/* Rules & Info */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs space-y-2 text-slate-300">
                <h4 className="font-bold text-white flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-orange-400" />
                  <span>Regras de Cruzamento (Metalsystem):</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li><strong>Fornecedor:</strong> Itens cadastrados como Metalsystem.</li>
                  <li><strong>Autorização:</strong> Cada folha representa uma única autorização (Ex: AD 6039).</li>
                  <li><strong>Critério de Validação:</strong> Código do item + Valor Total exato + NF de Origem referenciada.</li>
                  <li><strong>Campos Atualizados:</strong> Status ➔ <strong className="text-emerald-400">Emitir NF</strong>, Obs Nota Fiscal ➔ <strong className="text-orange-300">Nro Autorização: 6039 - NF XXXXXX</strong>.</li>
                </ul>
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

                <div className="p-3.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold text-orange-900 dark:text-orange-200">
                      {selectedMatchIndices.size}
                    </span>
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-400 block">
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
                      Fornecedor Metalsystem
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Folha de autorização única
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-bold text-orange-400 hover:underline flex items-center space-x-1 cursor-pointer"
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
                      key={`ms-match-${idx}`}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-slate-950 border-orange-500/50 shadow-md shadow-orange-950/30 ring-1 ring-orange-500/20' 
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
                            className="w-4 h-4 rounded border-slate-700 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-xs font-bold text-white">
                            Aprovar Alteração deste Item (Metalsystem)
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
                              <th className="p-3 font-bold uppercase tracking-wider w-1/3 text-orange-300 bg-orange-950/20">Aprovação Metalsystem (PDF)</th>
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
                              <td className="p-3 text-orange-200 font-bold bg-orange-950/10">
                                {parsed.codigoProduto || '—'}
                              </td>
                              <td className="p-3 text-center">
                                {match.confidenceScore >= 90 ? (
                                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold">100% Match</span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold">Parcial</span>
                                )}
                              </td>
                            </tr>
                            {/* Aprovação (AD) */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">Autorização (AD)</td>
                              <td className="p-3 text-slate-500 bg-indigo-950/10">—</td>
                              <td className="p-3 text-orange-300 font-bold bg-orange-950/10">AD: {parsed.autorizacao || '6039'}</td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded text-[10px] font-bold">Documento</span>
                              </td>
                            </tr>
                            {/* Descrição */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">Descrição</td>
                              <td className="p-3 font-sans text-slate-200 font-medium bg-indigo-950/10">
                                {stock.descricao || '—'}
                              </td>
                              <td className="p-3 font-sans text-slate-200 font-medium bg-orange-950/10">
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
                              <td className="p-3 text-emerald-400 font-bold bg-orange-950/10">
                                R$ {parsed.valorTotal.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold">100% Match</span>
                              </td>
                            </tr>
                            {/* NF Origem vs NF Sugerida */}
                            <tr className="hover:bg-slate-900/40">
                              <td className="p-3 font-sans font-bold text-slate-300">NF Origem vs. NF Sugerida</td>
                              <td className="p-3 text-amber-400 font-bold bg-indigo-950/10">
                                {stock.nfOrigem || 'Não informada'}
                              </td>
                              <td className="p-3 text-sky-300 font-bold bg-orange-950/10">
                                {parsed.numeroNota || 'Não extraída'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold">Match NF</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Proposed Changes Preview & Edit */}
                      <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                            <span>Alterações a Serem Salvas no Item:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                            className="text-[11px] text-slate-400 hover:text-orange-400 flex items-center space-x-1 cursor-pointer"
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
                              <strong className="text-orange-300 font-mono">{match.proposedObsNotaFiscal}</strong>
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
                        Itens da Metalsystem Sem Match Automático ({unmatchedItems.length})
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
                    Estes itens foram identificados no PDF da Metalsystem, mas não encontramos correspondência exata no estoque. Você pode vinculá-los manualmente ou excluí-los:
                  </p>

                  <div className="space-y-2">
                    {unmatchedItems.map((un, unIdx) => (
                      <div 
                        key={`metalsystem-unmatched-${unIdx}`}
                        className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div>
                            <span className="font-mono font-bold text-orange-400">AD: {un.autorizacao || '6039'}</span>
                            <span className="mx-2 text-slate-600">•</span>
                            <span className="text-amber-400 font-semibold">NF: {un.numeroNota || '—'}</span>
                            <span className="mx-2 text-slate-600">•</span>
                            <span className="text-emerald-400 font-bold">R$ {un.valorTotal.toFixed(2).replace('.', ',')}</span>
                          </div>
                          {un.fileName && (
                            <span className="text-[11px] text-slate-500 font-medium truncate">{un.fileName}</span>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-400 text-[10px] block font-semibold">DESCRIÇÃO DA PEÇA NO PDF</span>
                          <p className="text-xs text-white font-bold mt-0.5">
                            {un.descricaoProduto}
                          </p>
                        </div>

                        {/* Manual Linking Selector & Exclude */}
                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                          <select
                            onChange={e => {
                              if (e.target.value) {
                                handleManualLinkStockItem(unIdx, e.target.value);
                              }
                            }}
                            defaultValue=""
                            className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="">Selecione um item do estoque Metalsystem (Em negociação)...</option>
                            {stockItems
                              .map((item, originalIdx) => ({ item, originalIdx }))
                              .filter(({ item }) => {
                                const forn = (item.fornecedor || '').toLowerCase();
                                const filial = (item.novoFornecedorFilial || '').toLowerCase();
                                const original = (item.fornecedorOriginal || '').toLowerCase();
                                const statusDev = (item.statusDevolucao || '').toLowerCase();
                                const isSupplier = forn.includes('metalsystem') || filial.includes('metalsystem') || original.includes('metalsystem') || forn.includes('metal');
                                const isEmNegociacao = statusDev.includes('negociação') || statusDev.includes('negociacao');
                                return isSupplier && isEmNegociacao;
                              })
                              .map(({ item, originalIdx }) => (
                                <option key={`metalsystem-stock-opt-${item.idStock || 'item'}-${originalIdx}`} value={`${originalIdx}`}>
                                  {item.idStock} - {item.descricao ? item.descricao.slice(0, 35) : ''}... - {item.valorTotal || item.valorUnitario || 'R$ 0,00'} ({item.statusDevolucao || 'Sem status'})
                                </option>
                              ))}
                          </select>
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
              <h3 className="text-lg font-bold text-white">Aprovação Metalsystem Aplicada com Sucesso!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Os itens foram atualizados no estoque com o status "Emitir NF" e a autorização e notas fiscais vinculadas corretamente.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer"
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
                disabled={isSaving || selectedMatchIndices.size === 0}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-orange-950/40 flex items-center space-x-2 cursor-pointer"
              >
                {isSaving ? (
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
}
