import React, { useEffect, useMemo, useState } from 'react';
import { X, Truck, Printer, Check, AlertCircle, Trash2, Sparkles, RefreshCw, Plus } from 'lucide-react';
import { StockItem } from '../types';
import { getAvailableSuppliers, getAvailableFiliais } from '../utils/supplierUtils';

interface SupplierLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  theme?: 'dark' | 'light';
}

interface SupplierRow {
  key: string;
  fornecedor: string;
  filial: string;
}

let rowSeq = 0;
const newRow = (partial: Partial<SupplierRow> = {}): SupplierRow => ({
  key: `forn-row-${++rowSeq}`,
  fornecedor: '',
  filial: '',
  ...partial
});

export const SupplierLabelModal: React.FC<SupplierLabelModalProps> = ({
  isOpen,
  onClose,
  items,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusResult, setStatusResult] = useState<{ success: boolean; message: string } | null>(null);

  const suppliers = useMemo(
    () => getAvailableSuppliers(items).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [items]
  );

  useEffect(() => {
    if (!isOpen) return;
    setStatusResult(null);
    setRows([newRow()]);
  }, [isOpen]);

  if (!isOpen) return null;

  const updateRow = (key: string, field: 'fornecedor' | 'filial', value: string) => {
    setRows(prev => prev.map(r => {
      if (r.key !== key) return r;
      // Changing the supplier invalidates the branch picked for the previous one
      return field === 'fornecedor' ? { ...r, fornecedor: value, filial: '' } : { ...r, filial: value };
    }));
  };

  // New volume goes to the same destination as the previous one by default
  const addRow = () => {
    setRows(prev => {
      const last = prev[prev.length - 1];
      return [...prev, newRow({ fornecedor: last?.fornecedor || '', filial: last?.filial || '' })];
    });
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const volumeOf = (idx: number) => `${idx + 1}/${rows.length}`;
  const missing = rows.some(r => !r.fornecedor.trim() || !r.filial.trim());

  const handlePrint = async () => {
    if (rows.length === 0 || missing) {
      setStatusResult({ success: false, message: "Preencha Fornecedor e Filial em todas as linhas." });
      return;
    }

    setIsSubmitting(true);
    setStatusResult(null);

    try {
      // Reuses the Brother label layout: Fornecedor -> ID/QR, Volume -> CODIGO, Filial -> DESCRICAO ITEM
      const res = await fetch('/api/export-brother', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'fornecedor',
          rows: rows.map((r, idx) => ({
            id: r.fornecedor.trim(),
            codigo: volumeOf(idx),
            descricao: r.filial.trim(),
            marca: '',
            qtd: '1'
          }))
        })
      });

      const data = await res.json().catch(() => ({}));
      const success = res.ok && !!data.success;
      setStatusResult({
        success,
        message: data.message || (success ? "Etiquetas de fornecedor enviadas para impressão." : "Erro ao enviar etiquetas de fornecedor.")
      });
      if (success) {
        setRows([newRow()]);
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
      <div className={`border rounded-2xl w-full max-w-4xl p-6 space-y-6 shadow-2xl animate-fadeIn my-8 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-200 dark:border-sky-800">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Etiquetas de Fornecedor (Brother)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uma etiqueta por volume, com fornecedor, filial de destino e numeração do volume
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

        <div className="p-3.5 bg-sky-50 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-xl text-xs space-y-1 text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Como funciona</span>
          </div>
          <p className="leading-relaxed pl-5">
            Cada linha é um volume. A filial lista só as filiais do fornecedor escolhido. A numeração (1/2, 2/2…) é recalculada automaticamente ao adicionar ou remover linhas.
          </p>
        </div>

        <datalist id="supplier-label-fornecedores">
          {suppliers.map(s => <option key={s} value={s} />)}
        </datalist>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className={`sticky top-0 z-10 ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-300'} border-b border-slate-200 dark:border-slate-800 font-semibold`}>
              <tr>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Filial</th>
                <th className="p-3 w-24 text-center">Volume</th>
                <th className="p-3 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 bg-white' : 'divide-slate-800/60 bg-slate-900'}`}>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Nenhuma linha. Use "Adicionar linha".
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const filiais = row.fornecedor.trim() ? getAvailableFiliais(items, row.fornecedor.trim()) : [];
                  const filialListId = `supplier-label-filiais-${row.key}`;
                  return (
                    <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="p-2">
                        <input
                          type="text"
                          list="supplier-label-fornecedores"
                          value={row.fornecedor}
                          placeholder="Digite ou escolha"
                          onChange={(e) => updateRow(row.key, 'fornecedor', e.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          list={filialListId}
                          value={row.filial}
                          placeholder={row.fornecedor.trim() ? 'Digite ou escolha' : 'Escolha o fornecedor'}
                          onChange={(e) => updateRow(row.key, 'filial', e.target.value)}
                          className={inputClass}
                        />
                        <datalist id={filialListId}>
                          {filiais.map(f => <option key={f} value={f} />)}
                        </datalist>
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                        {volumeOf(idx)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={addRow}
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

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Volumes: <strong className="text-slate-900 dark:text-white">{rows.length}</strong>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handlePrint}
              disabled={isSubmitting || rows.length === 0 || missing}
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
