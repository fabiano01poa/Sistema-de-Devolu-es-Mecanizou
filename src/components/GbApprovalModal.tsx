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
  ChevronRight, 
  AlertCircle,
  HelpCircle,
  Edit3,
  Info,
  Mail,
  Trash2
} from 'lucide-react';
import { StockItem } from '../types';
import { 
  ParsedApprovalItem, 
  ApprovalMatchResult, 
  parseApprovalText, 
  matchApprovalItemsWithStock,
  SAMPLE_GB_APPROVAL_OCR
} from '../utils/approvalParser';

interface GbApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onApplyChanges: (updatedItems: StockItem[]) => Promise<void> | void;
}

export const GbApprovalModal: React.FC<GbApprovalModalProps> = ({
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
  const [unmatchedSelections, setUnmatchedSelections] = useState<Record<number, string>>({});
  const [reviewTab, setReviewTab] = useState<'matched' | 'unmatched'>('matched');
  
  // Custom manual edit state for a match
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setStep('upload');
    setIsProcessing(false);
    setErrorMessage(null);
    setUploadedFileNames([]);
    setMatchedResults([]);
    setUnmatchedItems([]);
    setSelectedMatchIndices(new Set());
    setUnmatchedSelections({});
    setReviewTab('matched');
    setEditingIndex(null);
  };

  // Whenever modal opens, reset if it was in 'success' state so user can immediately use it again
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
      const parsed = parseApprovalText(fullText, fileNames.join(', '));
      if (parsed.length === 0) {
        setErrorMessage('Nenhum item ou autorização válida foi encontrada no documento. Verifique se o PDF contém o espelho de autorização de devolução.');
        setIsProcessing(false);
        return;
      }

      const { matched, unmatched } = matchApprovalItemsWithStock(parsed, stockItems);
      setMatchedResults(matched);
      setUnmatchedItems(unmatched);
      
      // Select all matched by default
      const initialSelected = new Set<number>();
      matched.forEach((_, idx) => initialSelected.add(idx));
      setSelectedMatchIndices(initialSelected);

      setUploadedFileNames(fileNames);
      setReviewTab(matched.length === 0 && unmatched.length > 0 ? 'unmatched' : 'matched');
      setStep('review');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao cruzar dados do PDF:', err);
      setErrorMessage('Erro ao analisar os dados do documento: ' + (err.message || 'Erro desconhecido'));
      setIsProcessing(false);
    }
  };

  // Convert File to Base64
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
        body: JSON.stringify({ files: payloadFiles, supplier: 'G&B' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Falha ao processar o documento no servidor.');
      }

      processTextAndMatch(data.extractedText, fileList.map(f => f.name));
    } catch (err: any) {
      console.error('Erro no upload de documento:', err);
      setErrorMessage(err.message || 'Não foi possível ler o arquivo. Certifique-se de que o documento é um PDF ou imagem legível.');
      setIsProcessing(false);
    }
  };

  // Handler for direct testing with the sample OCR
  const handleLoadSample = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      processTextAndMatch(SAMPLE_GB_APPROVAL_OCR, ['Espelho_Autorizacao_00082921-AD.pdf']);
    }, 400);
  };

  const handleToggleSelectMatch = (index: number) => {
    setSelectedMatchIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const all = new Set<number>();
      matchedResults.forEach((_, idx) => all.add(idx));
      setSelectedMatchIndices(all);
    } else {
      setSelectedMatchIndices(new Set());
    }
  };

  const handleUpdateProposedField = (
    index: number, 
    field: 'proposedStatus' | 'proposedObsNotaFiscal' | 'proposedObservacoesGerais' | 'proposedMotivo', 
    value: string
  ) => {
    setMatchedResults(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

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
    link.setAttribute('download', `aprovacoes_pendentes_sem_match_${Date.now()}.csv`);
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
        <title>Relatório de Aprovações Pendentes (Sem Match) - G&B</title>
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
        <h2>Relatório de Aprovações Pendentes - G&B Sem Match (${unmatchedItems.length} itens)</h2>
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

  // Manually link an unmatched item to a stock item
  const handleManualLinkStockItem = (unmatchedIdx: number, stockIdentifier: string) => {
    const itemIndex = parseInt(stockIdentifier, 10);
    const stockItem = (!isNaN(itemIndex) && stockItems[itemIndex]) 
      ? stockItems[itemIndex] 
      : stockItems.find(s => s.idStock === stockIdentifier);
    if (!stockItem) return;

    const un = unmatchedItems[unmatchedIdx];
    const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
    const nfClean = cleanNf(un.numeroNota);
    const newObsNFPrefix = `Aut ${un.autorizacao} - NF ${nfClean}`;
    const existingObsNF = stockItem.obsNotaFiscal ? stockItem.obsNotaFiscal.trim() : '';
    const proposedObsNotaFiscal = existingObsNF ? `${newObsNFPrefix} - ${existingObsNF}` : newObsNFPrefix;

    const proposedObservacoesGerais = stockItem.observacoesGerais || '';
    const proposedNfOrigem = nfClean;

    const newMatch: ApprovalMatchResult = {
      parsedItem: un,
      stockItem,
      confidenceScore: 100,
      matchReasons: ['Vinculado manualmente pelo operador'],
      statusSource: 'outro',
      proposedStatus: 'Emitir NF',
      proposedObsNotaFiscal,
      proposedObservacoesGerais,
      proposedMotivo: `NF ${un.numeroNota}`,
      proposedNfOrigem,
      approved: true
    };

    setMatchedResults(prev => [...prev, newMatch]);
    setSelectedMatchIndices(prev => new Set([...prev, matchedResults.length]));
    setUnmatchedItems(prev => prev.filter((_, idx) => idx !== unmatchedIdx));
  };

  const handleRemoveUnmatchedItem = (unmatchedIdx: number) => {
    setUnmatchedItems(prev => prev.filter((_, idx) => idx !== unmatchedIdx));
  };

  // Apply changes to stock items
  const handleApplyChanges = async () => {
    const selectedMatches = matchedResults.filter((_, idx) => selectedMatchIndices.has(idx));
    if (selectedMatches.length === 0) {
      setErrorMessage('Nenhum item selecionado para aplicar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const nowStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
      const updatedStockItems: StockItem[] = selectedMatches.map(m => {
        const item = m.stockItem;
        const history = [...(item.historicoAlteracoes || [])];
        history.unshift({
          data: nowStr,
          acao: 'Aprovação G&B Importada',
          detalhe: `Status alterado para "${m.proposedStatus}". Obs NF: "${m.proposedObsNotaFiscal}" (Aut ${m.parsedItem.autorizacao}, NF ${m.parsedItem.numeroNota})`
        });

        return {
          ...item,
          statusDevolucao: m.proposedStatus,
          obsNotaFiscal: m.proposedObsNotaFiscal,
          observacoesGerais: item.observacoesGerais || '',
          nfOrigem: m.proposedNfOrigem || m.parsedItem.numeroNota,
          motivo: m.proposedMotivo,
          dataUltimaAlteracao: nowStr,
          ultimaInteracao: nowStr,
          historicoAlteracoes: history
        };
      });

      await onApplyChanges(updatedStockItems);
      setStep('success');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erro ao aplicar alterações:', err);
      setErrorMessage('Erro ao salvar alterações: ' + (err.message || 'Erro inesperado'));
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 dark:border-slate-800 bg-sky-50/50 dark:bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-sm">
              G&B
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Importar Autorização de Devolução (PDF)
                </h2>
                <span className="bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Fornecedor G&B Peças
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Leitura automática de espelho de devolução (Citel/G&B), cruzamento com o estoque e conciliação de status.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Atenção</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 1: Upload Files */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drag and drop card */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesSelected(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-sky-300 dark:border-slate-700 hover:border-sky-500 bg-sky-50/40 dark:bg-slate-950/50 hover:bg-sky-50 dark:hover:bg-slate-900/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group space-y-4"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(e.target.files);
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  multiple
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 group-hover:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 transition-transform group-hover:scale-105">
                  <Upload className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Arraste o PDF ou imagem de aprovação aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
                    Suporta arquivos PDF (Citel / G&B) e imagens legíveis (PNG, JPG) com uma ou várias páginas.
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>Formatos suportados: <strong>.PDF, .PNG, .JPG</strong> (Espelho Citel / G&B)</span>
                </div>
              </div>

              {/* Instant Test Sample Box */}
              <div className="bg-sky-50/60 dark:bg-slate-950/80 border border-sky-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
                      Quer testar agora mesmo com o documento enviado?
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Carrega os dados da Autorização <strong>00082921-AD</strong> (Semi Eixo R$ 522,86 / NF 891314).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Carregar Exemplo G&B</span>
                </button>
              </div>

              {/* Rules Explanation Box */}
              <div className="bg-white dark:bg-slate-800/40 rounded-xl p-4 border border-sky-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-slate-200">
                  <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>Regras de Cruzamento e Automação Configuradas:</span>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong>Fornecedor:</strong> Itens cadastrados como <span className="text-sky-700 dark:text-sky-300 font-mono font-bold">G&B PEÇAS</span>.
                  </li>
                  <li>
                    <strong>Prioridade de Status:</strong> Busca primeiro em <span className="text-sky-800 dark:text-sky-300 font-mono font-semibold">Em negociação</span>. Se não encontrar, busca em <span className="text-slate-700 dark:text-slate-300 font-mono">A negociar</span> e solicita confirmação visual.
                  </li>
                  <li>
                    <strong>Critério de Validação:</strong> <span className="text-slate-900 dark:text-white font-semibold">Valor Total Exato</span> + <span className="text-slate-900 dark:text-white font-semibold">Nome Aproximado da Peça</span> + Validação da Chave/NF Origem se disponível.
                  </li>
                  <li>
                    <strong>Campos Atualizados:</strong>
                    <ul className="pl-6 pt-1 space-y-1 text-slate-600 dark:text-slate-300 list-circle">
                      <li>Status ➔ <strong className="text-sky-700 dark:text-sky-300">Emitir NF</strong></li>
                      <li>Obs Nota Fiscal ➔ <span className="font-mono text-sky-700 dark:text-sky-300">Aut 00082921-AD / 891314</span> (acrescentando no início e mantendo o que já existia)</li>
                      <li>Motivo ➔ <span className="font-mono text-sky-700 dark:text-sky-300">NF 891314</span></li>
                      <li>Obs Gerais ➔ <span className="font-mono text-sky-700 dark:text-sky-300">Aut 00082921-AD - NF 891314</span></li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: Review and Verification of Matches */}
          {step === 'review' && (
            <div className="space-y-6">
              {/* Top Action Bar with Apply Button (Encima) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-sky-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-xs font-bold text-white">Revisão de Aprovações G&B</h3>
                    <p className="text-[11px] text-slate-400">Verifique os itens cruzados e clique em Aplicar para atualizar.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyChanges}
                  disabled={isProcessing || selectedMatchIndices.size === 0}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Aplicando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aplicar Alterações ({selectedMatchIndices.size})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Summary Stats Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Itens Encontrados no PDF</span>
                  <p className="text-xl font-extrabold text-white mt-0.5">
                    {matchedResults.length + unmatchedItems.length}
                  </p>
                </div>
                <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-800/60">
                  <span className="text-xs text-emerald-300 font-medium">Correspondências com Estoque (Match)</span>
                  <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
                    {matchedResults.length}
                  </p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Aprovações sem match</span>
                  <p className={`text-xl font-extrabold mt-0.5 ${unmatchedItems.length > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {unmatchedItems.length}
                  </p>
                </div>
              </div>

              {/* Review Tabs Navigation */}
              <div className="flex border-b border-slate-800 space-x-6">
                <button
                  type="button"
                  onClick={() => setReviewTab('matched')}
                  className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    reviewTab === 'matched'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Itens com Match ({matchedResults.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('unmatched')}
                  className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    reviewTab === 'unmatched'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Aprovações sem match ({unmatchedItems.length})</span>
                  {unmatchedItems.length > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full text-[10px]">
                      {unmatchedItems.length}
                    </span>
                  )}
                </button>
              </div>

              {/* SECTION 1: Matched Items Tab */}
              {reviewTab === 'matched' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        Itens com Match ({matchedResults.length})
                      </h3>
                    </div>

                    {matchedResults.length > 0 && (
                      <div className="flex items-center space-x-3 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSelectAll(true)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline"
                        >
                          Marcar Todos
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => handleSelectAll(false)}
                          className="text-slate-400 hover:text-white font-semibold cursor-pointer underline"
                        >
                          Desmarcar Todos
                        </button>
                        <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-full">
                          {selectedMatchIndices.size} selecionado(s)
                        </span>
                      </div>
                    )}
                  </div>

                  {matchedResults.length === 0 ? (
                    <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                      Nenhum item do PDF bateu automaticamente com os itens pendentes da G&B no estoque.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {matchedResults.map((match, idx) => {
                        const isSelected = selectedMatchIndices.has(idx);
                        const stock = match.stockItem;
                        const parsed = match.parsedItem;
                        const isANegociar = match.statusSource === 'a_negociar';

                        return (
                          <div
                            key={`match-card-${idx}`}
                            className={`p-4 rounded-xl border transition-all ${
                              isSelected 
                                ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/20' 
                                : 'bg-slate-950/40 border-slate-800 opacity-75'
                            }`}
                          >
                            {/* Card Top: Checkbox & Status Alerts */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                              <label className="flex items-center space-x-3 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectMatch(idx)}
                                  className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-bold text-white">
                                  Aprovar Alteração deste Item
                                </span>
                              </label>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Status Source Warning */}
                                {isANegociar ? (
                                  <span className="inline-flex items-center space-x-1 text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Item no status 'A negociar' (Favor Confirmar)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Status Estoque: Em negociação</span>
                                  </span>
                                )}

                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                                  Confiança: {match.confidenceScore}%
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
                                    <th className="p-3 font-bold uppercase tracking-wider w-1/3 text-rose-300 bg-rose-950/20">Aprovação (PDF)</th>
                                    <th className="p-3 font-bold uppercase tracking-wider w-1/6 text-center text-slate-300">Match</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-950/60">
                                  {/* Código */}
                                  <tr className="hover:bg-slate-900/40">
                                    <td className="p-3 font-sans font-bold text-slate-300 flex items-center gap-1.5">
                                      <span>Código / ID</span>
                                    </td>
                                    <td className="p-3 text-indigo-200 font-bold bg-indigo-950/10">
                                      {stock.idStock || stock.codigo || '—'}
                                    </td>
                                    <td className="p-3 text-rose-200 font-bold bg-rose-950/10">
                                      {parsed.codigoProduto || 'Não listado'}
                                    </td>
                                    <td className="p-3 text-center">
                                      {match.confidenceScore >= 95 ? (
                                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold shadow-sm inline-block">100% Match</span>
                                      ) : (
                                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold shadow-sm inline-block">Parcial (~80%)</span>
                                      )}
                                    </td>
                                  </tr>
                                  {/* Aprovação (AD) */}
                                  <tr className="hover:bg-slate-900/40">
                                    <td className="p-3 font-sans font-bold text-slate-300">Aprovação (AD)</td>
                                    <td className="p-3 text-slate-500 bg-indigo-950/10">—</td>
                                    <td className="p-3 text-rose-300 font-bold bg-rose-950/10">AD: {parsed.autorizacao || '—'}</td>
                                    <td className="p-3 text-center">
                                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-bold">Documento</span>
                                    </td>
                                  </tr>
                                  {/* Descrição */}
                                  <tr className="hover:bg-slate-900/40">
                                    <td className="p-3 font-sans font-bold text-slate-300">Descrição da Peça</td>
                                    <td className="p-3 font-sans text-slate-200 font-medium bg-indigo-950/10">
                                      {stock.descricao || '—'}
                                    </td>
                                    <td className="p-3 font-sans text-slate-200 font-medium bg-rose-950/10">
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
                                    <td className="p-3 text-emerald-400 font-bold bg-rose-950/10">
                                      R$ {parsed.valorTotal.toFixed(2).replace('.', ',')}
                                    </td>
                                    <td className="p-3 text-center">
                                      {Math.abs(parseFloat(String(stock.valorTotal || stock.valorUnitario || 0)) - parsed.valorTotal) < 0.1 ? (
                                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold shadow-sm inline-block">100% Match</span>
                                      ) : (
                                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold shadow-sm inline-block">Ajuste Valor</span>
                                      )}
                                    </td>
                                  </tr>
                                  {/* NF Origem vs NF Sugerida */}
                                  <tr className="hover:bg-slate-900/40">
                                    <td className="p-3 font-sans font-bold text-slate-300">NF Origem vs. NF Sugerida</td>
                                    <td className="p-3 text-amber-400 font-bold bg-indigo-950/10">
                                      {stock.nfOrigem || stock.nf || 'Não informada'}
                                    </td>
                                    <td className="p-3 text-sky-300 font-bold bg-rose-950/10">
                                      {parsed.numeroNota || 'Não extraída'}
                                    </td>
                                    <td className="p-3 text-center">
                                      {stock.nfOrigem && parsed.numeroNota && (stock.nfOrigem.includes(parsed.numeroNota) || parsed.numeroNota.includes(stock.nfOrigem)) ? (
                                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold shadow-sm inline-block">100% Match</span>
                                      ) : (
                                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold shadow-sm inline-block">Match Parcial</span>
                                      )}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Confidence Badge & Match Color Banner */}
                            <div className="flex items-center justify-between p-3 rounded-xl border text-xs font-bold shadow-sm mb-3"
                              style={{
                                backgroundColor: match.confidenceScore >= 95 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                borderColor: match.confidenceScore >= 95 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                                color: match.confidenceScore >= 95 ? '#34d399' : '#fbbf24'
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                {match.confidenceScore >= 95 ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                                )}
                                <span>
                                  {match.confidenceScore >= 95 ? '✨ 100% Match (Destacado em Verde)' : '⚠️ Match Parcial (~80% - Destacado em Amarelo)'}
                                </span>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border text-white font-mono">
                                Confiança: {match.confidenceScore}%
                              </span>
                            </div>

                            {/* Match Reasons Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 pb-3">
                              <span className="text-[10px] text-slate-500 font-semibold">Motivos do Cruzamento:</span>
                              {match.matchReasons.map((r, rIdx) => (
                                <span key={rIdx} className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                                  {r}
                                </span>
                              ))}
                            </div>

                            {/* Proposed Updates Display & Inline Edit */}
                            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Alterações a Serem Salvas no Item:</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center space-x-1 cursor-pointer"
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
                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-400">Observações Gerais / Motivo</label>
                                    <input
                                      type="text"
                                      value={match.proposedObservacoesGerais}
                                      onChange={e => handleUpdateProposedField(idx, 'proposedObservacoesGerais', e.target.value)}
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
                                    <strong className="text-amber-300 font-mono">{match.proposedObsNotaFiscal}</strong>
                                  </div>
                                  <div className="sm:col-span-3 text-slate-300 truncate">
                                    <span className="text-slate-400">Obs Gerais/Motivo: </span>
                                    <span className="font-mono text-slate-200">{match.proposedObservacoesGerais}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: Aprovações sem match (Unmatched Items Tab) */}
              {reviewTab === 'unmatched' && (
                <div className="space-y-4">
                  {unmatchedItems.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Nenhum item sem match!</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Todas as aprovações deste documento foram cruzadas com sucesso com os itens de estoque da G&B.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-950/40 p-4 rounded-xl border border-amber-800/60">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                          <div>
                            <h3 className="text-sm font-bold text-amber-200">
                              Aprovações sem match ({unmatchedItems.length})
                            </h3>
                            <p className="text-xs text-amber-300/80">
                              Itens do PDF sem correspondência automática no estoque. Escolha na lista de itens do fornecedor e clique em Vincular.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadUnmatchedCsv}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            <span>Baixar CSV</span>
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

                      <div className="space-y-3">
                        {unmatchedItems.map((un, unIdx) => {
                          const selectedStockId = unmatchedSelections[unIdx] || '';
                          return (
                            <div 
                              key={`unmatched-${unIdx}`}
                              className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl space-y-3 shadow-md"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <div>
                                  <span className="text-slate-400 text-[10px] block font-semibold">NÚMERO DA APROVAÇÃO</span>
                                  <strong className="text-rose-400 font-mono text-sm">{un.autorizacao || '—'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block font-semibold">NF SUGERIDA</span>
                                  <strong className="text-amber-300 font-mono">{un.numeroNota || '—'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block font-semibold">DT. EMISSÃO</span>
                                  <strong className="text-emerald-400 font-mono">{un.dataEmissao || '—'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block font-semibold">QTDE</span>
                                  <strong className="text-white font-mono">{un.quantidade || 1}</strong>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                <div>
                                  <span className="text-slate-400 text-[10px] block font-semibold">CÓDIGO DA PEÇA</span>
                                  <strong className="text-indigo-400 font-mono">{un.codigoProduto || '—'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block font-semibold">VALOR UNITÁRIO</span>
                                  <strong className="text-slate-200">R$ {(un.valorUnitario || un.valorTotal || 0).toFixed(2).replace('.', ',')}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block font-semibold">VALOR TOTAL</span>
                                  <strong className="text-emerald-400">R$ {(un.valorTotal || 0).toFixed(2).replace('.', ',')}</strong>
                                </div>
                              </div>

                              <div>
                                <span className="text-slate-400 text-[10px] block font-semibold">DESCRIÇÃO DA PEÇA NO PDF</span>
                                <p className="text-xs text-white font-bold mt-0.5">
                                  {un.descricaoProduto}
                                </p>
                              </div>

                              {/* Manual Linking Selector, Vincular, and Excluir Buttons */}
                              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                                <select
                                  value={selectedStockId}
                                  onChange={e => setUnmatchedSelections(prev => ({ ...prev, [unIdx]: e.target.value }))}
                                  className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                                >
                                  <option value="">Selecione um item do estoque (G&B ou Mecanizou)...</option>
                                  {stockItems
                                    .map((item, originalIdx) => ({ item, originalIdx }))
                                    .filter(({ item }) => {
                                      const forn = (item.fornecedor || '').toLowerCase();
                                      const filial = (item.novoFornecedorFilial || '').toLowerCase();
                                      return forn.includes('g&b') || forn.includes('gb') || filial.includes('g&b') || filial.includes('gb') || forn.includes('mecanizou') || filial.includes('mecanizou');
                                    })
                                    .map(({ item, originalIdx }) => (
                                      <option key={`gb-stock-opt-${item.idStock || 'item'}-${originalIdx}`} value={`${originalIdx}`}>
                                        {item.idStock} - {item.descricao ? item.descricao.slice(0, 40) : ''}... - {item.valorTotal || item.valorUnitario || 'R$ 0,00'} ({item.statusDevolucao || 'Sem status'})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={!selectedStockId}
                                  onClick={() => {
                                    if (selectedStockId) {
                                      handleManualLinkStockItem(unIdx, selectedStockId);
                                    }
                                  }}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Vincular</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUnmatchedItem(unIdx)}
                                  className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow"
                                  title="Excluir esta aprovação pendente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 'success' && (
            <div className="text-center py-10 space-y-5">
              <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Alterações Aplicadas com Sucesso!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Os itens aprovados foram atualizados no sistema com status <strong className="text-sky-700 dark:text-sky-300">Emitir NF</strong>, número da autorização e nota fiscal nos campos de observação.
                </p>
              </div>

              {/* Informative explanation about Google Sheet sync latency */}
              <div className="p-4 bg-sky-50 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-xl text-left max-w-md mx-auto">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      Sincronização com o Google Sheets:
                    </p>
                    <p>
                      As alterações já estão salvas localmente no aplicativo. Para gravar diretamente na sua planilha em tempo real (1-2 segundos), certifique-se de configurar a URL do Webhook nas opções de Sincronização Google.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  Importar Outro Documento
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Concluir e Voltar para a Tabela
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Sticky / Frozen at bottom) */}
        {step === 'review' && (
          <div className="sticky bottom-0 z-30 flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl">
            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              Voltar / Subir Outro PDF
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl border border-slate-700 hover:bg-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleApplyChanges}
                disabled={isProcessing || selectedMatchIndices.size === 0}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-950/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Aplicando Alterações...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aplicar em {selectedMatchIndices.size} {selectedMatchIndices.size === 1 ? 'Item' : 'Itens'}</span>
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
