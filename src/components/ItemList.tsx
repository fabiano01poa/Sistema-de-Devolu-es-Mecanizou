import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  ChevronRight, 
  Eye, 
  Boxes, 
  ChevronLeft, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Sparkles
} from 'lucide-react';
import { StockItem } from '../types';
import { 
  cleanNotaFiscal, 
  getItemQualityCondition 
} from '../utils/statusUtils';
import { 
  calculateDaysSincePurchase, 
  getItemTotalValue 
} from './NegociarView';
import { isAutomaticSupplierItem } from '../utils/supplierUtils';

interface ResultsTableProps {
  items: StockItem[];
  selectedItem: StockItem | null;
  onSelectItem: (item: StockItem, contextItems?: StockItem[], contextLabel?: string) => void;
  theme?: 'dark' | 'light';
  selectedBrotherIds?: Set<string>;
  onToggleBrotherSelect?: (idStock: string) => void;
  onToggleSelectAllPage?: (ids: string[], select: boolean) => void;
}

type SortColumn = 'condicao' | 'dias' | 'idStock' | 'descricao' | 'fornecedor' | 'valorTotal' | 'dataCompra' | 'protocolo' | null;
type SortDirection = 'asc' | 'desc';

export const ItemList: React.FC<ResultsTableProps> = ({
  items = [],
  selectedItem,
  onSelectItem,
  theme = 'dark',
  selectedBrotherIds = new Set(),
  onToggleBrotherSelect,
  onToggleSelectAllPage,
}) => {
  const isLight = theme === 'light';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const safeItems = items || [];

  // Reset to page 1 if items list length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [safeItems.length]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedItems = useMemo(() => {
    if (!sortColumn) return safeItems;

    return [...safeItems].sort((a, b) => {
      let res = 0;
      switch (sortColumn) {
        case 'condicao': {
          const qA = getItemQualityCondition(a).label;
          const qB = getItemQualityCondition(b).label;
          res = qA.localeCompare(qB);
          break;
        }
        case 'dias': {
          const dA = calculateDaysSincePurchase(a.dataCompra) ?? -1;
          const dB = calculateDaysSincePurchase(b.dataCompra) ?? -1;
          res = dA - dB;
          break;
        }
        case 'idStock': {
          const idA = (a.idStock || '').toString();
          const idB = (b.idStock || '').toString();
          res = idA.localeCompare(idB, undefined, { numeric: true });
          break;
        }
        case 'descricao': {
          res = (a.descricao || '').localeCompare(b.descricao || '');
          break;
        }
        case 'fornecedor': {
          res = (a.fornecedor || '').localeCompare(b.fornecedor || '');
          break;
        }
        case 'valorTotal': {
          const vA = getItemTotalValue(a).rawNum;
          const vB = getItemTotalValue(b).rawNum;
          res = vA - vB;
          break;
        }
        case 'dataCompra': {
          const dA = a.dataCompra || '';
          const dB = b.dataCompra || '';
          res = dA.localeCompare(dB);
          break;
        }
        case 'protocolo': {
          const pA = (a.protocolo || '').toString();
          const pB = (b.protocolo || '').toString();
          res = pA.localeCompare(pB, undefined, { numeric: true });
          break;
        }
      }
      return sortDirection === 'asc' ? res : -res;
    });
  }, [safeItems, sortColumn, sortDirection]);

  if (safeItems.length === 0) {
    return (
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'} border rounded-2xl p-8 text-center my-6 shadow-sm`}>
        <Package className={`w-12 h-12 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'} mb-3`} />
        <h3 className={`text-base font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
          Nenhum item encontrado
        </h3>
        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-1`}>
          Tente ajustar os filtros de ID STOCK, Endereçamento, Cliente ou termos de pesquisa acima.
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedItems.length);
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  const containerBg = isLight 
    ? 'bg-white border-slate-200 shadow-sm text-slate-800' 
    : 'bg-slate-900/90 border-slate-800/90 shadow-2xl text-slate-100 backdrop-blur-sm';
  const headerBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800';
  const theadBg = isLight ? 'bg-slate-100/90 border-slate-200 text-slate-600' : 'bg-slate-950/90 border-slate-800 text-slate-400';
  const rowBorder = isLight ? 'divide-slate-200' : 'divide-slate-800/60';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`${containerBg} border rounded-2xl overflow-hidden mb-8`}>
      {/* Table Header Controls & Pagination Summary */}
      <div className={`px-5 py-3.5 ${headerBg} border-b flex items-center justify-between flex-wrap gap-3`}>
        <div className="flex items-center space-x-2">
          <Boxes className="w-4 h-4 text-indigo-500" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            Tabela de Consulta ({safeItems.length.toLocaleString('pt-BR')} itens no total)
          </h3>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className={`flex items-center space-x-1 text-xs ${textMuted}`}>
            <span>Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`border text-xs rounded-lg px-2 py-1 outline-none font-medium ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <option value={20}>20 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-xs ${textMuted} font-mono`}>
              {startIndex + 1}–{endIndex} de {safeItems.length}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={`p-1 disabled:opacity-40 rounded-lg border transition-colors ${
                  isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                }`}
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-xs font-bold px-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                {validCurrentPage} / {totalPages}
              </span>
              <button
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={`p-1 disabled:opacity-40 rounded-lg border transition-colors ${
                  isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                }`}
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
          <thead className={`${theadBg} text-[10px] font-bold uppercase tracking-wider border-b`}>
            <tr>
              {/* Checkbox for Brother Label Printing */}
              <th className="py-2.5 px-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedBrotherIds.has(i.idStock))}
                  onChange={(e) => {
                    const ids = paginatedItems.map(i => i.idStock);
                    onToggleSelectAllPage?.(ids, e.target.checked);
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  title="Selecionar página atual para etiquetas Brother"
                />
              </th>

              {/* 1. Condição da Peça */}
              <th 
                className="py-2.5 px-2 text-center cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('condicao')}
                title="Ordenar por Condição"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Condição</span>
                  {sortColumn === 'condicao' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              {/* 2. Dias (Today - Data Compra) - Sem cores */}
              <th 
                className="py-2.5 px-2 text-center cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('dias')}
                title="Dias desde a compra (Hoje - Data de Compra)"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Dias</span>
                  {sortColumn === 'dias' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              {/* 3. ID STOCK - Sem cores */}
              <th 
                className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('idStock')}
                title="Ordenar por ID STOCK"
              >
                <div className="flex items-center space-x-1">
                  <span>ID STOCK</span>
                  {sortColumn === 'idStock' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              {/* 4. Descrição / Peça */}
              <th 
                className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('descricao')}
                title="Ordenar por Descrição"
              >
                <div className="flex items-center space-x-1">
                  <span>Descrição / Peça</span>
                  {sortColumn === 'descricao' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              <th className="py-2.5 px-2">Código</th>
              <th className="py-2.5 px-2">Marca</th>
              <th className="py-2.5 px-1.5 text-center">Qtd</th>
              <th className="py-2.5 px-2">Endereçamento</th>

              {/* Fornecedor */}
              <th 
                className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('fornecedor')}
                title="Ordenar por Fornecedor"
              >
                <div className="flex items-center space-x-1">
                  <span>Fornecedor</span>
                  {sortColumn === 'fornecedor' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              <th className="py-2.5 px-2">Novo Forn. / Filial</th>

              {/* Valor Total */}
              <th 
                className="py-2.5 px-2 text-right cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('valorTotal')}
                title="Ordenar por Valor Total"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Valor Total</span>
                  {sortColumn === 'valorTotal' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              {/* Data Compra */}
              <th 
                className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('dataCompra')}
                title="Ordenar por Data de Compra"
              >
                <div className="flex items-center space-x-1">
                  <span>Data Compra</span>
                  {sortColumn === 'dataCompra' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              <th className="py-2.5 px-2">NF Origem</th>
              <th className="py-2.5 px-2">Obs Nota Fiscal</th>

              {/* Protocolo */}
              <th 
                className="py-2.5 px-2 cursor-pointer select-none hover:text-white transition-colors group/sort"
                onClick={() => handleSort('protocolo')}
                title="Ordenar por Protocolo"
              >
                <div className="flex items-center space-x-1">
                  <span>Protocolo</span>
                  {sortColumn === 'protocolo' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover/sort:opacity-100" />
                  )}
                </div>
              </th>

              <th className="py-2.5 px-2 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${rowBorder} font-sans`}>
            {paginatedItems.map((item, idx) => {
              const valInfo = getItemTotalValue(item);
              const quality = getItemQualityCondition(item);
              const daysSince = calculateDaysSincePurchase(item.dataCompra);
              const isSelected = selectedItem?.idStock === item.idStock;

              return (
                <tr
                  key={`consulta-row-${item.idStock || idx}-${idx}`}
                  onClick={() => onSelectItem(item, sortedItems)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected 
                      ? isLight 
                        ? 'bg-indigo-50/80 border-l-4 border-indigo-600 text-slate-900' 
                        : 'bg-indigo-950/50 border-l-4 border-indigo-500 text-indigo-100'
                      : isLight 
                        ? 'hover:bg-slate-50 text-slate-800' 
                        : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  {/* Checkbox for Brother Label Selection */}
                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedBrotherIds.has(item.idStock)}
                      onChange={() => onToggleBrotherSelect?.(item.idStock)}
                      className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </td>

                  {/* 1. Condição Item (at start) */}
                  <td className="py-2 px-2 text-center whitespace-nowrap">
                    <span 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] tracking-wide ${quality.badgeClass}`} 
                      title={`Embalagem: ${item.embalagem || 'N/A'} | Condição da Peça: ${item.condicaoPeca || 'N/A'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${quality.dotColor}`} />
                      {quality.label}
                    </span>
                  </td>

                  {/* 2. Dias (Today - Data Compra) - Sem cores */}
                  <td className={`py-2 px-2 text-center font-mono font-medium whitespace-nowrap ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {daysSince !== null ? `${daysSince}d` : <span className={textMuted}>—</span>}
                  </td>

                  {/* 3. ID STOCK - Sem cores */}
                  <td className={`py-2 px-2 font-mono font-bold whitespace-nowrap ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {item.idStock || '—'}
                  </td>

                  {/* 4. Descrição */}
                  <td className={`py-2 px-2 font-semibold max-w-[200px] truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`} title={item.descricao}>
                    {item.descricao || '—'}
                  </td>

                  {/* Código */}
                  <td className={`py-2 px-2 font-mono whitespace-nowrap ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    {item.codigo || '—'}
                  </td>

                  {/* Marca */}
                  <td className={`py-2 px-2 font-medium whitespace-nowrap ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {item.marca || '—'}
                  </td>

                  {/* Qtd */}
                  <td className={`py-2 px-1.5 text-center font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {item.quantEstoque || '1'}
                  </td>

                  {/* Endereçamento */}
                  <td className="py-2 px-2 font-mono text-cyan-500 dark:text-cyan-300 font-semibold whitespace-nowrap">
                    {item.enderecamento || '—'}
                  </td>

                  {/* Fornecedor */}
                  <td className={`py-2 px-2 max-w-[140px] truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`} title={item.fornecedor}>
                    {item.fornecedor || '—'}
                  </td>

                  {/* Novo Fornecedor / Filial */}
                  <td className="py-2 px-2 text-indigo-600 dark:text-indigo-300 max-w-[160px]" title={item.novoFornecedorFilial}>
                    <div className="flex items-center space-x-1">
                      <span className="truncate">{item.novoFornecedorFilial || '—'}</span>
                      {isAutomaticSupplierItem(item) && (
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold shrink-0 border ${
                          isLight 
                            ? 'bg-amber-100 text-amber-800 border-amber-300' 
                            : 'bg-amber-950 text-amber-300 border-amber-800/80'
                        }`} title="Fornecedor / Filial com processo Automático">
                          ⚡ Auto
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Valor Total */}
                  <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {valInfo.formatted}
                  </td>

                  {/* Data Compra */}
                  <td className={`py-2 px-2 font-mono whitespace-nowrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {item.dataCompra || '—'}
                  </td>

                  {/* NF Origem */}
                  <td className="py-2 px-2 font-mono text-amber-600 dark:text-amber-300 whitespace-nowrap">
                    {cleanNotaFiscal(item.nfOrigem) || '—'}
                  </td>

                  {/* Obs Nota Fiscal */}
                  <td className={`py-2 px-2 max-w-[160px] truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title={item.obsNotaFiscal || item.observacoesGerais}>
                    {item.obsNotaFiscal || item.observacoesGerais || '—'}
                  </td>

                  {/* Protocolo */}
                  <td className={`py-2 px-2 font-mono font-bold whitespace-nowrap ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {item.protocolo || '—'}
                  </td>

                  {/* Ação */}
                  <td className="py-2 px-2 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item, sortedItems);
                      }}
                      className={`p-1 transition-colors rounded-lg border ${
                        isLight 
                          ? 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border-slate-200' 
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-500 group-hover:text-white border-slate-800'
                      }`}
                      title="Ver Detalhes do Item"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Footer Pagination Bar */}
      <div className={`px-5 py-3.5 ${headerBg} border-t flex items-center justify-between flex-wrap gap-2 text-xs ${textMuted}`}>
        <div>
          Mostrando <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{startIndex + 1}</span> a <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{endIndex}</span> de <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{safeItems.length.toLocaleString('pt-BR')}</span> registros
        </div>
        <div className="flex items-center space-x-2">
          <button
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className={`px-3 py-1.5 disabled:opacity-40 rounded-lg border font-semibold transition-colors flex items-center ${
              isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
          </button>
          <span className={`font-bold px-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            {validCurrentPage} / {totalPages}
          </span>
          <button
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className={`px-3 py-1.5 disabled:opacity-40 rounded-lg border font-semibold transition-colors flex items-center ${
              isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
            }`}
          >
            Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
