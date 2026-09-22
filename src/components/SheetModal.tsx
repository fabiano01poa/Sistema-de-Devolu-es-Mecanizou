import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { StockItem } from '../types';

interface SheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSyncCustomUrl: (url: string) => void;
  onLoadCustomData: (data: StockItem[]) => void;
  isLoading: boolean;
}

export const SheetModal: React.FC<SheetModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSyncCustomUrl,
  onLoadCustomData,
  isLoading,
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [csvError, setCsvError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onSyncCustomUrl(inputUrl.trim());
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const keys = Object.keys(results.data[0] as object);
          const getVal = (row: any, ...names: string[]) => {
            for (const name of names) {
              const matchKey = keys.find(k => {
                const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                return cleanK.includes(cleanN) || cleanN.includes(cleanK);
              });
              if (matchKey && row[matchKey] !== undefined) {
                return String(row[matchKey]).trim();
              }
            }
            return "";
          };

          const parsedItems: StockItem[] = results.data.map((row: any) => ({
            idStock: getVal(row, "ID STOCK", "ID_STOCK", "IDSTOCK", "STOCK", "ID"),
            cliente: getVal(row, "Cliente", "CLIENTE", "Nome Cliente"),
            descricao: getVal(row, "Descrição", "DESCRICAO", "Descrição do Item", "Nome da Peça"),
            codigo: getVal(row, "Código", "CODIGO", "Código da Peça"),
            marca: getVal(row, "Marca", "MARCA"),
            quantEstoque: getVal(row, "Quant. em Estoque", "Quant em Estoque", "Estoque", "Quantidade"),
            fornecedor: getVal(row, "Fornecedor", "FORNECEDOR"),
            novoFornecedorFilial: getVal(row, "Novo Fornecedor/Filial", "Novo Fornecedor", "Filial"),
            statusDevolucao: getVal(row, "Status Devolução", "Status Devolucao", "Status"),
            obsNotaFiscal: getVal(row, "Obs Nota Fiscal", "Obs NF", "Observação Nota Fiscal"),
            observacoesGerais: getVal(row, "Observações gerais do item", "Observações Gerais", "Obs Gerais", "Observação")
          })).filter(i => i.idStock || i.cliente || i.descricao);

          if (parsedItems.length > 0) {
            onLoadCustomData(parsedItems);
            onClose();
          } else {
            setCsvError("Nenhuma coluna válida foi reconhecida no arquivo CSV enviado.");
          }
        }
      },
      error: (err) => {
        setCsvError(`Erro ao ler CSV: ${err.message}`);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">
              Gerenciar Fonte de Dados
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Option 1: Sync with Google Sheets URL */}
          <form onSubmit={handleSubmitUrl} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              URL da Planilha Google Sheets
            </label>
            <div className="space-y-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/ID_PLANILHA/edit#gid=NUMERO_DA_ABA"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none font-mono"
              />
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-xl text-xs text-indigo-200 space-y-1">
                <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
                  Como selecionar uma Aba (Página) específica?
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No Google Sheets, cada aba possui um identificador chamado <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300 font-mono">gid</code> no final do link. Para mudar de aba:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5 pl-1">
                  <li>Abra a planilha no Google Sheets e clique na <strong>aba/página desejada</strong> na parte inferior.</li>
                  <li>Copie o link completo da barra de endereços do seu navegador (ele incluirá algo como <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300 font-mono">#gid=123456789</code>).</li>
                  <li>Cole o link acima e clique em <strong>Carregar da Planilha</strong>.</li>
                </ol>
              </div>
              <div className="flex items-center justify-between pt-1">
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir no Google Sheets
                </a>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  {isLoading ? 'Carregando...' : 'Carregar da Planilha'}
                </button>
              </div>
            </div>
          </form>

          <div className="relative border-t border-slate-800 my-4">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-semibold">
              Ou envie um arquivo CSV
            </span>
          </div>

          {/* Option 2: Upload CSV */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Importar arquivo CSV local
            </label>
            <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-950/60 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
              <span className="text-xs font-medium text-slate-300">
                Clique para selecionar o arquivo .csv
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Colunas suportadas: ID STOCK, Cliente, Descrição, Código, Marca, Quant. em Estoque, Fornecedor, etc.
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {csvError && (
              <p className="text-xs text-red-400 mt-2 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> {csvError}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
