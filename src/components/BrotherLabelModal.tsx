import React, { useState } from 'react';
import { X, Printer, Check, AlertCircle, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { StockItem } from '../types';

interface BrotherLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: StockItem[];
  onUpdateQuantity: (idStock: string, newQtd: string) => void;
  onRemoveItem: (idStock: string) => void;
  webhookUrl: string;
  theme?: 'dark' | 'light';
}

export const BrotherLabelModal: React.FC<BrotherLabelModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  onUpdateQuantity,
  onRemoveItem,
  webhookUrl,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [qtdImpressaMap, setQtdImpressaMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusResult, setStatusResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleQtyChange = (idStock: string, val: string) => {
    setQuantities(prev => ({ ...prev, [idStock]: val }));
    onUpdateQuantity(idStock, val);
  };

  const handleQtdImpressaChange = (idStock: string, val: string) => {
    setQtdImpressaMap(prev => ({ ...prev, [idStock]: val }));
  };

  const handleExportBrother = async () => {
    if (!webhookUrl || !webhookUrl.trim()) {
      setStatusResult({
        success: false,
        message: "URL do Webhook do Google Apps Script não configurada. Configure no botão 'Sincronização Google'."
      });
      return;
    }

    if (selectedItems.length === 0) {
      setStatusResult({ success: false, message: "Nenhum item selecionado para impressão." });
      return;
    }

    setIsSubmitting(true);
    setStatusResult(null);

    try {
      // Prepare items with edited quantities
      const itemsPayload = selectedItems.map(item => ({
        idStock: item.idStock || '',
        codigo: item.codigo || '',
        descricao: item.descricao || '',
        quantEstoque: quantities[item.idStock] !== undefined ? quantities[item.idStock] : (item.quantEstoque || '1'),
        marca: item.marca || '',
        fornecedor: item.fornecedor || '',
        qtdImpressa: qtdImpressaMap[item.idStock] || ''
      }));

      const res = await fetch('/api/export-brother', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          items: itemsPayload
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusResult({
          success: true,
          message: data.message || `CSV gerado com sucesso (${selectedItems.length} itens) e enviado para a pasta Brother no Google Drive!`
        });
      } else {
        setStatusResult({
          success: false,
          message: data.message || "Erro ao exportar para a pasta Brother no Google Drive."
        });
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
            Colunas geradas automaticamente: <code className="font-mono text-sky-600 dark:text-sky-400">ID, CODIGO, DESCRICAO ITEM, Qtd., MARCA, FORNECEDOR, Qtd. IMPRESSA</code>. Você pode editar a quantidade <code className="font-mono text-sky-600">Qtd.</code> diretamente na tabela abaixo antes de confirmar o envio.
          </p>
        </div>

        {/* Selected Items Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className={`sticky top-0 z-10 ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-300'} border-b border-slate-200 dark:border-slate-800 font-semibold`}>
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição do Item</th>
                <th className="p-3 w-28">Qtd.</th>
                <th className="p-3">Marca</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3 w-32">Qtd. Impressa</th>
                <th className="p-3 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 bg-white' : 'divide-slate-800/60 bg-slate-900'}`}>
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhum item selecionado para impressão.
                  </td>
                </tr>
              ) : (
                selectedItems.map((item, idx) => {
                  const currentQtd = quantities[item.idStock] !== undefined ? quantities[item.idStock] : (item.quantEstoque || '1');
                  const currentImp = qtdImpressaMap[item.idStock] || '';
                  return (
                    <tr key={`brother-modal-${item.idStock || idx}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="p-3 font-mono text-slate-900 dark:text-slate-100 font-bold whitespace-nowrap">{item.idStock}</td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{item.codigo}</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium max-w-xs truncate" title={item.descricao}>{item.descricao}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={currentQtd}
                          onChange={(e) => handleQtyChange(item.idStock, e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{item.marca}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{item.fornecedor || '-'}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={currentImp}
                          onChange={(e) => handleQtdImpressaChange(item.idStock, e.target.value)}
                          placeholder="Opcional"
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onRemoveItem(item.idStock)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Remover da lista"
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
            Total selecionado: <strong className="text-slate-900 dark:text-white">{selectedItems.length}</strong> itens
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
              disabled={isSubmitting || selectedItems.length === 0}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando CSV...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Enviar CSV para Pasta Brother</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
