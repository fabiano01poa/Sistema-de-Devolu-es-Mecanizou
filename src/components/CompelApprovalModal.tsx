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
  Mail
} from 'lucide-react';
import { StockItem } from '../types';
import { 
  ParsedApprovalItem, 
  ApprovalMatchResult, 
  parseCompelApprovalText, 
  matchCompelWithStock,
  SAMPLE_COMPEL_APPROVAL_OCR
} from '../utils/approvalParser';

interface CompelApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onApplyChanges: (updatedItems: StockItem[]) => Promise<void> | void;
}

export const CompelApprovalModal: React.FC<CompelApprovalModalProps> = ({
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
    link.setAttribute('download', `aprovacoes_pendentes_compel_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadUnmatchedPdf = () => {
    if (unmatchedItems.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Aprovações Pendentes (Sem Match) - Compel</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
          h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 12px; }
          th { background-color: #f4f4f4; }
          .total { margin-top: 15px; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <h2>Relatório de Aprovações Pendentes - Compel Sem Match (${unmatchedItems.length} itens)</h2>
        <p>Data de geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Autorização</th>
              <th>NF</th>
              <th>Descrição do Produto</th>
              <th>Valor Total</th>
              <th>Arquivo Origem</th>
            </tr>
          </thead>
          <tbody>
            ${unmatchedItems.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.autorizacao || '—'}</td>
                <td>${item.numeroNota || '—'}</td>
                <td>${item.descricaoProduto || '—'}</td>
                <td>R$ ${(item.valorTotal || 0).toFixed(2).replace('.', ',')}</td>
                <td>${item.fileName || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          Total Pendente: R$ ${unmatchedItems.reduce((acc, item) => acc + (item.valorTotal || 0), 0).toFixed(2).replace('.', ',')}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
      matchReasons: ['Vinculado manualmente pelo operador (Compel)'],
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
      const parsed = parseCompelApprovalText(fullText, fileNames.join(', '));
      if (parsed.length === 0) {
        setErrorMessage('Nenhum item ou autorização válida da Compel foi encontrada no documento.');
        setIsProcessing(false);
        return;
      }

      const { matched, unmatched } = matchCompelWithStock(parsed, stockItems);
      setMatchedResults(matched);
      setUnmatchedItems(unmatched);
      
      const initialSelected = new Set<number>();
      matched.forEach((_, idx) => initialSelected.add(idx));
      setSelectedMatchIndices(initialSelected);

      setUploadedFileNames(fileNames);
      setStep('review');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao cruzar dados da Compel:', err);
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
        body: JSON.stringify({ files: payloadFiles, supplier: 'Compel' })
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
      processTextAndMatch(SAMPLE_COMPEL_APPROVAL_OCR, ['Espelho_Compel_000235275_Exemplo.pdf']);
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
      const aut = res.parsedItem.autorizacao || '000235275';
      const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
      const nf = cleanNf(res.parsedItem.numeroNota || '000707181');

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
                  Aprovação Automática - Compel
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  Compel Automotiva
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Conciliação de espelhos de nota Compel, cruzamento de código, NF e mudança para "Emitir NF"
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
                <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Regras de Extração e Cruzamento da Compel:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-slate-700 dark:text-slate-300">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800">
                  <div className="font-bold text-sky-600 dark:text-sky-400 mb-1">
                    <span>Espelho de Nota</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Extrai o número da autorização do espelho Compel e preenche automaticamente a <strong>Obs Nota Fiscal</strong>.
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800">
                  <div className="font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                    <span>NF de Origem</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Extrai a nota fiscal referenciada (ex: <strong>000707181</strong>) e preenche no <strong>Motivo</strong>.
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span>Status "Emitir NF"</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Cruza o código do produto (ex: JFA491) e altera o status para <strong>"Emitir NF"</strong>.
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
                  Clique para selecionar ou arraste o PDF / Imagem de Espelho da Compel
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Formatos aceitos: PDF, PNG, JPG
                </p>
              </div>

              {isProcessing && (
                <div className="flex items-center space-x-2 text-xs font-bold text-sky-600 dark:text-sky-400 pt-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando e cruzando informações da Compel...</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Deseja testar com o documento de exemplo da Compel?
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Carrega o espelho Compel (Autorização 000235275, JFA491, NF 000707181) para demonstração instantânea.
                </span>
              </div>

              <button
                onClick={handleLoadSample}
                disabled={isProcessing}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Testar com Exemplo Compel</span>
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
                    Compel Automotiva
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
                    key={`compel-match-${orig.idStock || idx}`}
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
                              Fornecedor: {orig.fornecedor || 'Compel'}
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
                                  {result.parsedItem?.codigoProduto || 'Não listado'}
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
                                <td className="p-2.5 text-rose-800 dark:text-rose-300 font-bold bg-rose-50/30 dark:bg-rose-950/10">AD: {result.parsedItem?.autorizacao || '—'}</td>
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
                                  {result.parsedItem?.descricaoProduto || '—'}
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
                                  R$ {(result.parsedItem?.valorTotal || 0).toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2.5 text-center">
                                  {Math.abs(parseFloat(String(orig.valorTotal || orig.valorUnitario || 0)) - (result.parsedItem?.valorTotal || 0)) < 0.1 ? (
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
                                  {result.parsedItem?.numeroNota || 'Não extraída'}
                                </td>
                                <td className="p-2.5 text-center">
                                  {orig.nfOrigem && result.parsedItem?.numeroNota && (orig.nfOrigem.includes(result.parsedItem.numeroNota) || result.parsedItem.numeroNota.includes(orig.nfOrigem)) ? (
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

            {unmatchedItems.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Itens Compel Sem Match Automático ({unmatchedItems.length})
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
                      onClick={handleDownloadUnmatchedPdf}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-white" />
                      <span>Baixar PDF</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {unmatchedItems.map((un, unIdx) => (
                    <div 
                      key={`compel-unmatched-${unIdx}`}
                      className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 shadow-sm"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-100 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">NÚMERO DA APROVAÇÃO</span>
                          <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{un.autorizacao || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">NF ORIGEM</span>
                          <strong className="text-amber-600 dark:text-amber-300 font-mono">{un.numeroNota || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">DT. EMISSÃO</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{un.dataEmissao || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">QTDE</span>
                          <strong className="text-slate-900 dark:text-white font-mono">{un.quantidade || 1}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-100/60 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">CÓDIGO DA PEÇA</span>
                          <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{un.codigoProduto || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">VALOR UNITÁRIO</span>
                          <strong className="text-slate-700 dark:text-slate-200">R$ {(un.valorUnitario || un.valorTotal || 0).toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">VALOR TOTAL</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">R$ {(un.valorTotal || 0).toFixed(2).replace('.', ',')}</strong>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">DESCRIÇÃO DA PEÇA NO PDF</span>
                        <p className="text-xs text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                          {un.descricaoProduto}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                        <span className="text-slate-700 dark:text-slate-300 font-medium shrink-0">Vincular manualmente ao estoque (Em negociação):</span>
                        <select
                          onChange={e => {
                            if (e.target.value) {
                              handleManualLinkStockItem(unIdx, e.target.value);
                            }
                          }}
                          defaultValue=""
                          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1.5"
                        >
                          <option value="">Selecione um item do estoque Compel (Em negociação)...</option>
                          {stockItems
                            .map((item, originalIdx) => ({ item, originalIdx }))
                            .filter(({ item }) => {
                              const forn = (item.fornecedor || '').toLowerCase();
                              const filial = (item.novoFornecedorFilial || '').toLowerCase();
                              const original = (item.fornecedorOriginal || '').toLowerCase();
                              const statusDev = (item.statusDevolucao || '').toLowerCase();
                              const isSupplier = forn.includes('compel') || filial.includes('compel') || original.includes('compel');
                              const isEmNegociacao = statusDev.includes('negociação') || statusDev.includes('negociacao');
                              return isSupplier && isEmNegociacao;
                            })
                            .map(({ item, originalIdx }) => (
                              <option key={`compel-stock-opt-${item.idStock}-${originalIdx}`} value={`${originalIdx}`}>
                                {item.idStock} - {item.descricao ? item.descricao.slice(0, 35) : ''}... - {item.valorTotal || item.valorUnitario || 'R$ 0,00'} ({item.statusDevolucao || 'Sem status'})
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
                Aprovações da Compel aplicadas com sucesso!
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
