import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, User, Hash, X, Filter, Sparkles, Flame, FileText, MapPin, ChevronDown } from 'lucide-react';
import { FilterState, StockItem } from '../types';

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  clients: string[];
  stockIds: string[];
  itemsCount: number;
  totalItems: number;
  allItems: StockItem[];
  onSelectItemById: (idStock: string) => void;
  theme?: 'dark' | 'light';
}

export const Filters: React.FC<FiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  clients = [],
  stockIds = [],
  itemsCount,
  totalItems,
  allItems = [],
  onSelectItemById,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [isEnderecamentoOpen, setIsEnderecamentoOpen] = useState(false);
  const enderecamentoContainerRef = useRef<HTMLDivElement>(null);

  const isFiltered = 
    filters.idStock !== '' || 
    filters.cliente !== '' || 
    filters.searchTerm !== '' || 
    (filters.obsSearchTerm && filters.obsSearchTerm !== '') || 
    (filters.enderecamento && filters.enderecamento !== '') || 
    !!filters.apenasUrgentes;

  // Extract unique available enderecamentos with item counts
  const availableEnderecamentos = useMemo(() => {
    const counts = new Map<string, number>();
    (allItems || []).forEach(i => {
      if (i && i.enderecamento && i.enderecamento.trim()) {
        const key = i.enderecamento.trim();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [allItems]);

  // Filtered list based on what the user types
  const filteredEnderecamentos = useMemo(() => {
    const query = (filters.enderecamento || '').trim().toLowerCase();
    if (!query) return availableEnderecamentos;
    return availableEnderecamentos.filter(item => 
      item.label.toLowerCase().includes(query)
    );
  }, [availableEnderecamentos, filters.enderecamento]);

  // Handle outside click for Endereçamento dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        enderecamentoContainerRef.current && 
        !enderecamentoContainerRef.current.contains(event.target as Node)
      ) {
        setIsEnderecamentoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const cardBg = isLight 
    ? 'bg-white border-slate-200 shadow-sm text-slate-800' 
    : 'bg-slate-900/90 border-slate-800/90 shadow-xl text-slate-100 backdrop-blur-sm';
  const inputBg = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
    : 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const borderCol = isLight ? 'border-slate-200' : 'border-slate-800/80';

  return (
    <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border mb-6`}>
      <div className={`flex items-center justify-between pb-3 mb-4 border-b ${borderCol} flex-wrap gap-2`}>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            Filtros de Pesquisa & Consulta
          </h2>
        </div>
        <div className="flex items-center space-x-2.5 text-xs">
          {/* Urgent Toggle Button */}
          <button
            onClick={() => onFilterChange({ apenasUrgentes: !filters.apenasUrgentes })}
            className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
              filters.apenasUrgentes
                ? isLight
                  ? 'bg-red-100 text-red-800 border-red-300 shadow-sm'
                  : 'bg-red-950 text-red-300 border-red-700 shadow-lg shadow-red-950/50'
                : isLight
                ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 mr-1.5 ${filters.apenasUrgentes ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
            {filters.apenasUrgentes ? 'Exibindo Apenas Urgentes' : 'Filtro: Urgentes'}
          </button>

          <span className={`${textMuted} font-mono font-semibold`}>
            {itemsCount} de {totalItems} itens
          </span>
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                isLight 
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300' 
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
              }`}
            >
              <X className="w-3 h-3 mr-1" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* ID STOCK Filter */}
        <div className="relative">
          <label className={`block text-xs font-semibold ${textMuted} uppercase tracking-wider mb-1.5 flex items-center justify-between`}>
            <span className="flex items-center">
              <Hash className="w-3.5 h-3.5 mr-1 text-indigo-500" /> ID STOCK
            </span>
            {filters.idStock && (
              <button
                onClick={() => onFilterChange({ idStock: '' })}
                className="text-[10px] text-indigo-500 hover:underline"
              >
                Limpar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.idStock}
              onChange={(e) => onFilterChange({ idStock: e.target.value })}
              placeholder="Digite o ID STOCK..."
              className={`w-full ${inputBg} border focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none`}
            />
            {filters.idStock && (
              <button
                onClick={() => onFilterChange({ idStock: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Quick ID Badges */}
          {(stockIds || []).length > 0 && !filters.idStock && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[10px] ${textMuted} self-center`}>Sugestões:</span>
              {(stockIds || []).slice(0, 2).map((id, idx) => (
                <button
                  key={`id-sug-${id}-${idx}`}
                  onClick={() => onSelectItemById(id)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cliente Filter */}
        <div className="relative">
          <label className={`block text-xs font-semibold ${textMuted} uppercase tracking-wider mb-1.5 flex items-center justify-between`}>
            <span className="flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Cliente / Mecânica
            </span>
            {filters.cliente && (
              <button
                onClick={() => onFilterChange({ cliente: '' })}
                className="text-[10px] text-indigo-500 hover:underline"
              >
                Limpar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.cliente}
              onChange={(e) => onFilterChange({ cliente: e.target.value })}
              placeholder="Digite o cliente..."
              className={`w-full ${inputBg} border focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none`}
            />
            {filters.cliente && (
              <button
                onClick={() => onFilterChange({ cliente: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dynamic matching suggestions dropdown */}
          {filters.cliente.trim() !== '' && (
            <div className={`absolute z-20 left-0 right-0 mt-1 ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700/80 text-slate-200'} border rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y ${borderCol} text-xs`}>
              {(clients || [])
                .filter(c => c && c.toLowerCase().includes(filters.cliente.toLowerCase()))
                .slice(0, 8)
                .map((client, idx) => (
                  <button
                    key={`client-sug-${client}-${idx}`}
                    type="button"
                    onClick={() => onFilterChange({ cliente: client })}
                    className={`w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center justify-between`}
                  >
                    <span>{client}</span>
                    {filters.cliente.toLowerCase() === client.toLowerCase() && (
                      <span className="text-[10px] text-indigo-500 font-bold uppercase">Selecionado</span>
                    )}
                  </button>
                ))}
              {(clients || []).filter(c => c && c.toLowerCase().includes(filters.cliente.toLowerCase())).length === 0 && (
                <div className={`px-3.5 py-2 ${textMuted} italic`}>
                  Filtrando por termo digitado...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Endereçamento Filter (Lista Suspensa Dinâmica com Busca) */}
        <div className="relative" ref={enderecamentoContainerRef}>
          <label className={`block text-xs font-semibold ${textMuted} uppercase tracking-wider mb-1.5 flex items-center justify-between`}>
            <span className="flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Endereçamento
            </span>
            {filters.enderecamento && (
              <button
                onClick={() => onFilterChange({ enderecamento: '' })}
                className="text-[10px] text-indigo-500 hover:underline"
              >
                Limpar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.enderecamento || ''}
              onChange={(e) => {
                onFilterChange({ enderecamento: e.target.value });
                setIsEnderecamentoOpen(true);
              }}
              onFocus={() => setIsEnderecamentoOpen(true)}
              placeholder="Digite ou selecione..."
              className={`w-full ${inputBg} border focus:ring-1 focus:ring-indigo-500/50 rounded-xl pl-3.5 pr-14 py-2.5 text-sm transition-all outline-none`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {filters.enderecamento ? (
                <button
                  type="button"
                  onClick={() => onFilterChange({ enderecamento: '' })}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Limpar endereçamento"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsEnderecamentoOpen(prev => !prev)}
                className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                title="Abrir lista suspensa de endereçamentos"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isEnderecamentoOpen ? 'rotate-180 text-indigo-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Endereçamento Suggestions / Dropdown List */}
          {isEnderecamentoOpen && (
            <div className={`absolute z-30 left-0 right-0 mt-1.5 ${
              isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xl' : 'bg-slate-900 border-slate-700/90 text-slate-200 shadow-2xl backdrop-blur-md'
            } border rounded-xl max-h-56 overflow-y-auto divide-y ${borderCol} text-xs animate-in fade-in zoom-in-95 duration-100`}>
              {availableEnderecamentos.length > 0 && !filters.enderecamento && (
                <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-950 text-slate-400'}`}>
                  Lista de Endereçamentos ({availableEnderecamentos.length})
                </div>
              )}
              {filteredEnderecamentos.length > 0 ? (
                filteredEnderecamentos.map((item, idx) => {
                  const isSelected = (filters.enderecamento || '').trim().toLowerCase() === item.label.toLowerCase();
                  return (
                    <button
                      key={`end-sug-${item.label}-${idx}`}
                      type="button"
                      onClick={() => {
                        onFilterChange({ enderecamento: item.label });
                        setIsEnderecamentoOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 transition-colors flex items-center justify-between ${
                        isSelected 
                          ? isLight ? 'bg-indigo-50 text-indigo-600 font-bold' : 'bg-indigo-950/70 text-indigo-300 font-bold' 
                          : isLight ? 'hover:bg-slate-50 hover:text-indigo-600' : 'hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <span className="font-mono">{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.count} {item.count === 1 ? 'item' : 'itens'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className={`px-3.5 py-3 ${textMuted} text-center italic`}>
                  Nenhum endereçamento encontrado para "{filters.enderecamento}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global / General Search Filter */}
        <div className="relative">
          <label className={`block text-xs font-semibold ${textMuted} uppercase tracking-wider mb-1.5 flex items-center justify-between`}>
            <span className="flex items-center">
              <Search className="w-3.5 h-3.5 mr-1 text-indigo-500" /> 1. Busca Geral (Peça, Código)
            </span>
            {filters.searchTerm && (
              <button
                onClick={() => onFilterChange({ searchTerm: '' })}
                className="text-[10px] text-indigo-500 hover:underline"
              >
                Limpar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
              placeholder="Descrição, código, NF..."
              className={`w-full ${inputBg} border focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none`}
            />
            {filters.searchTerm ? (
              <button
                onClick={() => onFilterChange({ searchTerm: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Unified Search in Observations (Obs NF + Obs Gerais / Motivo) */}
        <div className="relative">
          <label className={`block text-xs font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'} uppercase tracking-wider mb-1.5 flex items-center justify-between`}>
            <span className="flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1" /> 2. Obs NF + Motivo
            </span>
            {filters.obsSearchTerm && (
              <button
                onClick={() => onFilterChange({ obsSearchTerm: '' })}
                className="text-[10px] text-emerald-600 hover:underline"
              >
                Limpar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.obsSearchTerm || ''}
              onChange={(e) => onFilterChange({ obsSearchTerm: e.target.value })}
              placeholder="Buscar em Obs. NF e Motivo..."
              className={`w-full ${
                isLight 
                  ? 'bg-emerald-50/50 border-emerald-300 text-slate-800 placeholder-slate-400 focus:border-emerald-500' 
                  : 'bg-slate-950/80 border-emerald-800/60 text-emerald-200 placeholder-slate-500 focus:border-emerald-500'
              } border focus:ring-1 focus:ring-emerald-500/50 rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none`}
            />
            {filters.obsSearchTerm && (
              <button
                onClick={() => onFilterChange({ obsSearchTerm: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
