import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, CheckSquare, Square, Filter } from 'lucide-react';

export interface MultiSelectOption {
  id: string;
  label: string;
  count?: number;
  badgeColor?: string;
  isSpecial?: boolean;
  icon?: React.ReactNode;
}

export interface MultiSelectFilterProps {
  label: string;
  subLabel?: React.ReactNode;
  allLabel?: string;
  totalCount?: number;
  totalItemsCount?: number;
  options?: MultiSelectOption[];
  selectedIds?: string[];
  selectedValues?: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  colorTheme?: 'indigo' | 'emerald' | 'cyan' | 'amber';
  maxDisplayTags?: number;
  theme?: 'dark' | 'light';
  badge?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  subLabel,
  allLabel,
  totalCount,
  totalItemsCount,
  options = [],
  selectedIds,
  selectedValues,
  onChange,
  placeholder,
  searchPlaceholder = 'Buscar opções...',
  colorTheme = 'indigo',
  maxDisplayTags = 1,
  theme = 'dark',
  badge,
  icon
}) => {
  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Safe normalized values
  const safeOptions = options || [];
  const safeSelectedIds = selectedIds ?? selectedValues ?? [];
  const effectiveAllLabel = allLabel || placeholder || 'Todos';
  const effectiveTotalCount = totalCount ?? totalItemsCount;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return safeOptions;
    const term = searchTerm.toLowerCase().trim();
    return safeOptions.filter(opt => (opt.label || '').toLowerCase().includes(term));
  }, [safeOptions, searchTerm]);

  // Check if all options are selected
  const isAllSelected = safeSelectedIds.length === 0;
  const hasActiveSelection = safeSelectedIds.length > 0;

  // Toggle single option
  const toggleOption = (id: string) => {
    if (safeSelectedIds.includes(id)) {
      const next = safeSelectedIds.filter(item => item !== id);
      onChange(next);
    } else {
      onChange([...safeSelectedIds, id]);
    }
  };

  // Select all visible options
  const handleSelectAllVisible = () => {
    const allFilteredIds = filteredOptions.map(opt => opt.id);
    const combined = Array.from(new Set([...safeSelectedIds, ...allFilteredIds]));
    onChange(combined);
  };

  // Clear all selections (revert to "All")
  const handleClearAll = () => {
    onChange([]);
    setSearchTerm('');
  };

  // Calculate sum of counts of selected options if available
  const selectedCountSum = useMemo(() => {
    if (!hasActiveSelection) return effectiveTotalCount ?? 0;
    return safeOptions
      .filter(opt => safeSelectedIds.includes(opt.id))
      .reduce((sum, opt) => sum + (opt.count || 0), 0);
  }, [safeOptions, safeSelectedIds, hasActiveSelection, effectiveTotalCount]);

  // Color theme classes for button highlights
  const themeClasses = {
    indigo: {
      border: 'focus:border-indigo-500',
      activeRing: 'ring-indigo-500/30',
      badge: isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-indigo-950 text-indigo-300 border-indigo-800',
      highlight: isLight ? 'text-indigo-600' : 'text-indigo-400',
      button: 'bg-indigo-600 hover:bg-indigo-500 text-white'
    },
    emerald: {
      border: 'focus:border-emerald-500',
      activeRing: 'ring-emerald-500/30',
      badge: isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-800',
      highlight: isLight ? 'text-emerald-600' : 'text-emerald-400',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white'
    },
    cyan: {
      border: 'focus:border-cyan-500',
      activeRing: 'ring-cyan-500/30',
      badge: isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-950 text-cyan-300 border-cyan-800',
      highlight: isLight ? 'text-cyan-600' : 'text-cyan-400',
      button: 'bg-cyan-600 hover:bg-cyan-500 text-white'
    },
    amber: {
      border: 'focus:border-amber-500',
      activeRing: 'ring-amber-500/30',
      badge: isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950 text-amber-300 border-amber-800',
      highlight: isLight ? 'text-amber-700' : 'text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-500 text-slate-950'
    }
  }[colorTheme];

  // Helper to render icon prop
  const renderHeaderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-3.5 h-3.5 mr-1 text-indigo-500" />;
    }
    return null;
  };

  // Render trigger text
  const renderTriggerContent = () => {
    if (isAllSelected) {
      return (
        <span className={`truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          {effectiveAllLabel} {effectiveTotalCount !== undefined ? `(${effectiveTotalCount} itens)` : ''}
        </span>
      );
    }

    if (safeSelectedIds.length === 1) {
      const selectedOpt = safeOptions.find(opt => opt.id === safeSelectedIds[0]);
      const labelText = selectedOpt ? selectedOpt.label : safeSelectedIds[0];
      const countText = selectedOpt?.count !== undefined ? ` (${selectedOpt.count} ${selectedOpt.count === 1 ? 'item' : 'itens'})` : '';
      return (
        <span className={`truncate font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {selectedOpt?.icon}
          <span className="truncate">{labelText}{countText}</span>
        </span>
      );
    }

    // Multiple selected: e.g. "2 selecionados (74 itens)"
    return (
      <div className="flex items-center space-x-1.5 min-w-0 truncate">
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${themeClasses.badge}`}>
          {safeSelectedIds.length} selecionados
        </span>
        <span className={`text-xs truncate font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          ({selectedCountSum} {selectedCountSum === 1 ? 'item' : 'itens'})
        </span>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Label and SubLabel / Badge Header */}
      <div className="flex items-center justify-between mb-1">
        <label className={`block text-[10px] font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'} flex items-center`}>
          {renderHeaderIcon()}
          <span>{label}</span>
        </label>
        <div className="flex items-center space-x-1.5">
          {badge && (
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
              isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-950 text-indigo-300'
            }`}>
              {badge}
            </span>
          )}
          {subLabel && (
            <div className="text-[9px] font-normal">
              {subLabel}
            </div>
          )}
        </div>
      </div>

      {/* Main Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`w-full border ${
            isLight
              ? hasActiveSelection
                ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20 text-slate-900'
                : 'bg-slate-50 hover:bg-white border-slate-300 hover:border-slate-400 text-slate-800'
              : hasActiveSelection
              ? 'bg-slate-900 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/20 text-slate-200'
              : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-200'
          } text-xs rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer font-semibold outline-none`}
        >
          <div className="flex items-center space-x-1.5 min-w-0 flex-1 truncate">
            {renderTriggerContent()}
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {hasActiveSelection && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Limpar seleção"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
              isLight ? (isOpen ? 'rotate-180 text-slate-900' : 'text-slate-500') : (isOpen ? 'rotate-180 text-white' : 'text-slate-400')
            }`} />
          </div>
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute z-50 left-0 right-0 mt-1.5 border rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-fadeIn min-w-[280px] ${
          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
        }`}>
          
          {/* Search bar inside Dropdown */}
          <div className={`p-2.5 border-b space-y-2 ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full border rounded-lg pl-8 pr-7 py-1.5 text-xs outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400'
                    : 'bg-slate-900 border-slate-800 focus:border-indigo-500 text-slate-200 placeholder:text-slate-500'
                }`}
              />
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`} />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                    isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions (Select All / Clear) */}
            <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className={`font-bold hover:underline cursor-pointer flex items-center gap-1 ${
                  isLight ? 'text-indigo-600 hover:text-indigo-800' : 'text-indigo-400 hover:text-indigo-300'
                }`}
              >
                <CheckSquare className="w-3 h-3" />
                <span>Marcar todos ({filteredOptions.length})</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className={`font-medium hover:underline cursor-pointer flex items-center gap-1 ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-3 h-3" />
                <span>Ver todos (Limpar)</span>
              </button>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {/* Option "Todos" item */}
            {!searchTerm && (
              <button
                type="button"
                onClick={handleClearAll}
                className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isAllSelected
                    ? isLight
                      ? 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-300'
                      : 'bg-indigo-600/20 text-white font-bold border border-indigo-500/40'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isAllSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : isLight
                      ? 'border-slate-300 bg-white'
                      : 'border-slate-600 bg-slate-800'
                  }`}>
                    {isAllSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate font-bold">{effectiveAllLabel}</span>
                </div>
                {effectiveTotalCount !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {effectiveTotalCount}
                  </span>
                )}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className={`p-4 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Nenhuma opção encontrada para "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = safeSelectedIds.includes(opt.id);
                return (
                  <button
                    key={`opt-${opt.id}`}
                    type="button"
                    onClick={() => toggleOption(opt.id)}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-indigo-100 text-indigo-950 font-bold border border-indigo-300'
                          : 'bg-indigo-600/20 text-white font-bold border border-indigo-500/40'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : isLight
                          ? 'border-slate-300 bg-white'
                          : 'border-slate-600 bg-slate-800'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}

                      <span className={`truncate ${
                        isSelected 
                          ? (isLight ? 'text-indigo-950 font-bold' : 'text-white font-bold') 
                          : (isLight ? 'text-slate-800' : 'text-slate-200')
                      }`}>
                        {opt.label}
                      </span>
                    </div>

                    {opt.count !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
                        isSelected
                          ? isLight
                            ? 'bg-indigo-200 text-indigo-900 border border-indigo-300'
                            : 'bg-indigo-950 text-indigo-200 border border-indigo-800'
                          : isLight
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {opt.count} {opt.count === 1 ? 'item' : 'itens'}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with selection summary */}
          <div className={`p-2 border-t flex items-center justify-between text-[11px] ${
            isLight ? 'bg-slate-100/90 border-slate-200 text-slate-600' : 'bg-slate-950/80 border-slate-800 text-slate-400'
          }`}>
            <span>
              {hasActiveSelection ? `${safeSelectedIds.length} selecionado(s)` : 'Exibindo todos'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


