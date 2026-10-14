import React, { useEffect, useState } from 'react';
import { X, Printer, Check, AlertCircle, Trash2, Sparkles, RefreshCw, Plus } from 'lucide-react';
import { StockItem } from '../types';

interface BrotherLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: StockItem[];
  onPrinted?: () => void;
  theme?: 'dark' | 'light';
}

interface LabelRow {
  key: string;
  id: string;
  codigo: string;
  marca: string;
  descricao: string;
  qtd: string;
}

let rowSeq = 0;
const newRow = (partial: Partial<LabelRow> = {}): LabelRow => ({
  key: `row-${++rowSeq}`,
  id: '',
  codigo: '',
  marca: '',
  descricao: '',
  qtd: '1',
  ...partial
});

export const BrotherLabelModal: React.FC<BrotherLabelModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  onPrinted,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [rows, setRows] = useState<LabelRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusResult, setStatusResult] = useState<{ success: boolean; message: string } | null>(null);

  // Rows live only in this form. Items selected in the stock list are just a starting point.
  useEffect(() => {
    if (!isOpen) return;
    setStatusResult(null);
    setRows(
      selectedItems.length > 0
        ? selectedItems.map(item => newRow({
            id: item.idStock || '',
            codigo: item.codigo || '',
            marca: item.marca || '',
            descricao: item.descricao || '',
            qtd: item.quantEstoque || '1'
          }))
        : [newRow()]
    );
  }, [isOpen]);

  if (!isOpen) return null;

  const updateRow = (key: string, field: keyof Omit<LabelRow, 'key'>, value: string) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const filledRows = rows.filter(r => [r.codigo, r.marca, r.descricao].some(v => v.trim() !== ''));

  const handleExportBrother = async () => {
    if (filledRows.length === 0) {
      setStatusResult({ success: false, message: "Preencha ao menos uma linha (Código, Marca ou Descrição)." });
      return;
    }

    setIsSubmitting(true);
    setStatusResult(null);

    try {
      const res = await fetch('/api/export-brother', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: filledRows.map(({ key, ...row }) => row)
        })
      });

      const data = await res.json().catch(() => ({}));
      const success = res.ok && !!data.success;
      setStatusResult({
        success,
        message: data.message || (success ? "CSV enviado para a pasta Brother." : "Erro ao enviar CSV para a pasta Brother.")
      });
      if (success) {
        // Start the next batch from scratch: clear the form and the stock-list selection.
        setRows([newRow()]);
        onPrinted?.();
      }
    } catch (err: any) {
      setStatusResult({
        success: false,
        message: "Erro ao comunicar com o servidor: " + (err.message || err)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-5xl p-6 space-y-6 shadow-2xl animate-fadeIn my-8 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-200 dark:border-sky-800">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Impressão de Etiquetas Brother (CSV para Google Drive)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Revise os dados, ajuste as quantidades e envie o lote selecionado para a pasta do Watcher (Brother)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 bg-sky-50 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-xl text-xs space-y-1 text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Formato do CSV Brother configurado</span>
          </div>
          <p className="leading-relaxed pl-5">
            Colunas geradas: <code className="font-mono text-sky-600 dark:text-sky-400">ID, CODIGO, DESCRICAO ITEM, Qtd., MARCA, FORNECEDOR, Qtd. IMPRESSA</code>. FORNECEDOR e Qtd. IMPRESSA vão vazios (o script da impressora não os usa). ID é opcional: sem ID, o QR Code usa o Código. Qtd. vazia vira 1. Linhas sem Código, Marca e Descrição são ignoradas.
          </p>
        </div>

        {/* Editable rows */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className={`sticky top-0 z-10 ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-300'} border-b border-slate-200 dark:border-slate-800 font-semibold`}>
              <tr>
                <th className="p-3 w-32">ID</th>
                <th className="p-3 w-28">Código</th>
                <th className="p-3">Descrição do Item</th>
                <th className="p-3 w-20">Qtd.</th>
                <th className="p-3 w-32">Marca</th>
                <th className="p-3 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 bg-white' : 'divide-slate-800/60 bg-slate-900'}`}>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhuma linha. Use "Adicionar linha".
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="p-2">
                      <input type="text" value={row.id} placeholder="Opcional" onChange={(e) => updateRow(row.key, 'id', e.target.value)} className={`${inputClass} font-mono`} />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.codigo} onChange={(e) => updateRow(row.key, 'codigo', e.target.value)} className={`${inputClass} font-mono`} />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.descricao} onChange={(e) => updateRow(row.key, 'descricao', e.target.value)} className={inputClass} />
                    </td>
                    <td className="p-2">
                      <input type="number" min={1} value={row.qtd} onChange={(e) => updateRow(row.key, 'qtd', e.target.value)} className={`${inputClass} text-center font-bold`} />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.marca} onChange={(e) => updateRow(row.key, 'marca', e.target.value)} className={inputClass} />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeRow(row.key)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => setRows(prev => [...prev, newRow()])}
          className="px-3 py-1.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar linha</span>
        </button>

        {statusResult && (
          <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center space-x-2 ${
            statusResult.success ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {statusResult.success ? <Check className="w-4 h-4 text-sky-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
            <span>{statusResult.message}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Linhas a imprimir: <strong className="text-slate-900 dark:text-white">{filledRows.length}</strong>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleExportBrother}
              disabled={isSubmitting || filledRows.length === 0}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando para impressão...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Etiquetas</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
