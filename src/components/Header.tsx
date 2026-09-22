import React from 'react';
import { 
  Menu, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  BarChart2, 
  Sun, 
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight
} from 'lucide-react';

interface HeaderProps {
  onSync: () => void;
  isLoading: boolean;
  source: 'google_sheets' | 'fallback_sample' | 'custom_csv';
  message?: string;
  totalItems: number;
  onOpenMobileSidebar: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  activeView: 'consulta' | 'dash' | 'garantias' | 'negociar' | 'inventario' | 'fornecedores';
  onViewChange: (view: 'consulta' | 'dash' | 'garantias' | 'inventario' | 'fornecedores') => void;
  lastSyncedAt?: Date | null;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSync,
  isLoading,
  source,
  totalItems,
  onOpenMobileSidebar,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  activeView,
  onViewChange,
  theme = 'dark',
  onToggleTheme
}) => {
  const isLight = theme === 'light';

  const currentViewDetails = 
    activeView === 'garantias' || activeView === 'negociar'
      ? {
          title: 'Painel de Devoluções',
          subtitle: 'Tratativas completas e fluxo de estoque',
          icon: ShieldCheck,
          color: isLight ? 'text-emerald-700 bg-emerald-100' : 'text-emerald-400 bg-slate-800'
        }
      : activeView === 'dash'
      ? {
          title: 'Dashboard & Métricas',
          subtitle: 'Indicadores de volume, marcas e status',
          icon: BarChart2,
          color: isLight ? 'text-indigo-700 bg-indigo-100' : 'text-indigo-400 bg-slate-800'
        }
      : activeView === 'inventario'
      ? {
          title: 'Inventário de Vagas',
          subtitle: 'Contagem física por vagas e QR Code',
          icon: Search,
          color: isLight ? 'text-blue-700 bg-blue-100' : 'text-blue-400 bg-slate-800'
        }
      : activeView === 'fornecedores'
      ? {
          title: 'Gestão de Fornecedores',
          subtitle: 'Prazos, contatos e regras automáticas',
          icon: Search,
          color: isLight ? 'text-amber-700 bg-amber-100' : 'text-amber-400 bg-slate-800'
        }
      : {
          title: 'Consulta de Itens',
          subtitle: 'Pesquisa detalhada e visualização por cartões',
          icon: Search,
          color: isLight ? 'text-blue-700 bg-blue-100' : 'text-blue-400 bg-slate-800'
        };

  const Icon = currentViewDetails.icon;

  return (
    <header className={`${
      isLight ? 'bg-white/95 border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900/90 border-slate-800/80 text-slate-100'
    } border-b sticky top-0 z-20 backdrop-blur-md`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Left: Sidebar Toggle + Dynamic Breadcrumb/Title */}
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className={`lg:hidden inline-flex items-center p-2 rounded-xl border transition-all active:scale-95 shadow-sm ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/80'
              }`}
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5 text-indigo-500" />
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className={`hidden lg:inline-flex items-center p-2 rounded-xl border transition-all active:scale-95 ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-300' : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/70'
              }`}
              title={isSidebarCollapsed ? "Expandir Barra Lateral" : "Recolher Barra Lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-indigo-500" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Breadcrumb & Section Name */}
            <div className="flex items-center space-x-2 min-w-0">
              <div className={`hidden xl:flex items-center space-x-1.5 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} font-medium`}>
                <span>Mecanizou</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center space-x-2 min-w-0">
                <div className={`p-1.5 rounded-lg border ${isLight ? 'border-slate-200' : 'border-slate-700/70'} flex-shrink-0 ${currentViewDetails.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 hidden md:block">
                  <h1 className={`text-sm font-bold tracking-tight truncate leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {currentViewDetails.title}
                  </h1>
                  <p className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {currentViewDetails.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Quick Screen Switcher Segmented Tabs */}
          <div className={`flex items-center p-1 rounded-xl shadow-inner border ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950/90 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => onViewChange('garantias')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeView === 'garantias' || activeView === 'negociar'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 ring-1 ring-white/20'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Painel de Devoluções & Tratativas"
            >
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Devoluções</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('consulta')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeView === 'consulta'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 ring-1 ring-white/20'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Consulta detalhada de itens"
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Consulta</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('dash')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeView === 'dash'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 ring-1 ring-white/20'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Dashboard & Métricas"
            >
              <BarChart2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Dashboard</span>
            </button>
          </div>

          {/* Right: Quick Status Pill, Fast Sync & Theme Switch */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Connection Status Pill */}
            <div className={`rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center space-x-2 shadow-inner border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950/80 border-slate-800'
            }`}>
              {source === 'google_sheets' ? (
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={`text-xs font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'} hidden md:inline`}>
                    Google Sheets Conectado
                  </span>
                  <span className={`text-xs font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'} md:hidden`}>
                    Conectado
                  </span>
                </div>
              ) : (
                <div className={`flex items-center space-x-1.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Amostra</span>
                </div>
              )}

              <div className={`h-3 w-px ${isLight ? 'bg-slate-300' : 'bg-slate-800'} hidden sm:block`} />

              {/* Total items badge */}
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isLight ? 'bg-white text-slate-800 border-slate-300' : 'text-slate-300 bg-slate-800/90 border-slate-700/60'
              }`}>
                {totalItems.toLocaleString('pt-BR')} itens
              </span>
            </div>

            {/* Quick Sincronizar Button */}
            <button
              type="button"
              onClick={onSync}
              disabled={isLoading}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 transition-all duration-150 disabled:opacity-50 active:scale-95 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              title="Sincronizar planilha em tempo real"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoading ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            {/* Quick Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`p-2 rounded-xl border transition-all duration-150 active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700/80'
                }`}
                title={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
              >
                {isLight ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
