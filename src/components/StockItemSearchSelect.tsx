import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { StockItem } from '../types';
import { normalizeText, normalizeProductCode } from '../utils/approvalParser';

interface StockItemSearchSelectProps {
  candidates: Array<{ item: StockItem; originalIdx: number }>;
  onSelect: (originalIdx: number) => void;
  ariaLabel: string;
  // 'auto' segue o tema do app; 'dark' para modais que são sempre escuros
  tone?: 'auto' | 'dark';
}

const MAX_VISIBLE_OPTIONS = 50;

const TONES = {
  auto: {
    input: 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100',
    list: 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700',
    option: 'border-slate-100 dark:border-slate-800',
    active: 'bg-amber-50 dark:bg-amber-950/40',
    code: 'text-slate-900 dark:text-slate-100',
    desc: 'text-slate-700 dark:text-slate-200',
    muted: 'text-slate-500 dark:text-slate-400',
    footer: 'bg-slate-50 dark:bg-slate-900'
  },
  dark: {
    input: 'bg-slate-900 border-slate-700 text-slate-100',
    list: 'bg-slate-950 border-slate-700',
    option: 'border-slate-800',
    active: 'bg-indigo-950/60',
    code: 'text-slate-100',
    desc: 'text-slate-200',
    muted: 'text-slate-400',
    footer: 'bg-slate-900'
  }
};

// Campo de busca para o vínculo manual: filtra por código, descrição, ID, NF origem, status ou fornecedor
export const StockItemSearchSelect: React.FC<StockItemSearchSelectProps> = ({ candidates, onSelect, ariaLabel, tone = 'auto' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useMemo(() => `stock-search-${Math.random().toString(36).slice(2)}`, []);
  const t = TONES[tone];

  const indexed = useMemo(() => candidates.map(c => ({
    ...c,
    text: normalizeText([
      c.item.idStock, c.item.codigo, c.item.codigoAlternativo, c.item.descricao,
      c.item.nfOrigem, c.item.statusDevolucao, c.item.fornecedor, c.item.novoFornecedorFilial
    ].filter(Boolean).join(' ')),
    codes: [c.item.codigo, c.item.codigoAlternativo].map(normalizeProductCode).filter(Boolean)
  })), [candidates]);

  const filtered = useMemo(() => {
    const terms = normalizeText(query).split(' ').filter(Boolean);
    if (terms.length === 0) return indexed;
    // Todos os termos precisam aparecer; código também casa sem hífen/ponto (SCT-68 = SCT68)
    return indexed.filter(c => terms.every(term =>
      c.text.includes(term) || c.codes.some(code => code.includes(normalizeProductCode(term)))
    ));
  }, [indexed, query]);

  const visible = filtered.slice(0, MAX_VISIBLE_OPTIONS);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const choose = (originalIdx: number) => {
    setIsOpen(false);
    setQuery('');
    onSelect(originalIdx);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIdx(i => Math.min(i + 1, visible.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && isOpen && visible[activeIdx]) {
      e.preventDefault();
      choose(visible[activeIdx].originalIdx);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(0); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={`Buscar no estoque por código, descrição ou NF (${candidates.length} itens em negociação)...`}
          className={`w-full border text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${t.input}`}
        />
      </div>

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-20 mt-1 w-full max-h-64 overflow-y-auto border rounded-lg shadow-lg text-xs ${t.list}`}
        >
          {visible.length === 0 ? (
            <li className={`px-3 py-2 ${t.muted}`}>Nenhum item do estoque encontrado para "{query}".</li>
          ) : visible.map(({ item, originalIdx }, i) => (
            <li
              key={`stock-opt-${item.idStock || 'item'}-${originalIdx}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={e => { e.preventDefault(); choose(originalIdx); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-3 py-2 cursor-pointer border-b last:border-b-0 ${t.option} ${i === activeIdx ? t.active : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${t.code}`}>{item.codigo || 'sem cód.'}</span>
                <span className={`truncate ${t.desc}`}>{item.descricao}</span>
              </div>
              <div className={`text-[11px] mt-0.5 ${t.muted}`}>
                {[
                  `ID ${item.idStock}`,
                  item.nfOrigem ? `NF ${item.nfOrigem}` : '',
                  item.valorTotal || item.valorUnitario || 'R$ 0,00',
                  item.statusDevolucao || 'Sem status'
                ].filter(Boolean).join(' · ')}
              </div>
            </li>
          ))}
          {filtered.length > MAX_VISIBLE_OPTIONS && (
            <li className={`px-3 py-1.5 text-[11px] ${t.muted} ${t.footer}`}>
              Mostrando {MAX_VISIBLE_OPTIONS} de {filtered.length}. Digite mais para refinar.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
