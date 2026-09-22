import React from 'react';
import { 
  X, 
  Search, 
  BarChart2, 
  ShieldCheck, 
  RefreshCw, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Sun, 
  Moon, 
  Layers, 
  ChevronRight,
  ExternalLink,
  ChevronLeft,
  Clock,
  Sparkles,
  Link2,
  QrCode,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  // Mobile drawer controls
  isMobileOpen: boolean;
  onMobileClose: () => void;
  
  // Desktop collapse controls
  isCollapsed: boolean;
  onToggleCollapse: () => void;

  // View state
  activeView: 'consulta' | 'dash' | 'garantias' | 'negociar' | 'inventario' | 'fornecedores';
  onViewChange: (view: 'consulta' | 'dash' | 'garantias' | 'inventario' | 'fornecedores') => void;

  // Data & sync state
  onSync: () => void;
  isLoading: boolean;
  source: 'google_sheets' | 'fallback_sample' | 'custom_csv';
  message?: string;
  totalItems: number;
  lastSyncedAt?: Date | null;

  // Modals
  onOpenSheetModal: () => void;
  onOpenSyncModal?: () => void;
  onOpenDocModal?: () => void;
  hasWebhookConfigured?: boolean;

  // Theme
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
  activeView,
  onViewChange,
  onSync,
  isLoading,
  source,
  totalItems,
  lastSyncedAt,
  onOpenSheetModal,
  onOpenSyncModal,
  onOpenDocModal,
  hasWebhookConfigured,
  theme = 'dark',
  onToggleTheme
}) => {
  const isLight = theme === 'light';

  const navItems = [
    {
      id: 'garantias' as const,
      label: 'Painel de Devoluções',
      shortLabel: 'Devoluções',
      desc: 'Tratativas completas & status',
      icon: ShieldCheck,
      badge: 'Principal',
      badgeColor: 'emerald'
    },
    {
      id: 'consulta' as const,
      label: 'Consulta de Itens',
      shortLabel: 'Consulta',
      desc: 'Pesquisa detalhada & cartões',
      icon: Search
    },
    {
      id: 'dash' as const,
      label: 'Dashboard & Métricas',
      shortLabel: 'Dashboard',
      desc: 'Gráficos e volumetria',
      icon: BarChart2
    },
    {
      id: 'inventario' as const,
      label: 'Inventário de Vagas',
      shortLabel: 'Inventário',
      desc: 'Contagem física por vaga',
      icon: QrCode,
      badge: 'Novo',
      badgeColor: 'indigo'
    },
    {
      id: 'fornecedores' as const,
      label: 'Gestão de Fornecedores',
      shortLabel: 'Fornecedores',
      desc: 'Regras, prazos e automática',
      icon: Truck,
      badge: 'Regras',
      badgeColor: 'amber'
    }
  ];

  // Render Sidebar Content (shared between Desktop and Mobile)
  const renderSidebarContent = (mobile = false) => {
    const collapsed = !mobile && isCollapsed;

    const bgContainer = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800/90 text-slate-100';
    const bgHeader = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800';
    const bgCard = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800';
    const borderCol = isLight ? 'border-slate-200' : 'border-slate-800';
    const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';

    return (
      <div className={`flex flex-col h-full ${bgContainer} border-r select-none`}>
        {/* Brand & App Title */}
        <div className={`p-4 border-b ${bgHeader} flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} min-w-0`}>
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl text-white shadow-lg shadow-indigo-900/30 ring-1 ring-white/10 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h2 className={`text-sm font-bold tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Mecanizou
                  </h2>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border font-mono ${
                    isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'text-indigo-400 bg-indigo-950/80 border-indigo-800/60'
                  }`}>
                    Devoluções
                  </span>
                </div>
                <p className={`text-[11px] ${textMuted} truncate`}>
                  Gestão & Tratativas
                </p>
              </div>
            )}
          </div>

          {mobile ? (
            <button
              type="button"
              onClick={onMobileClose}
              className={`p-1.5 rounded-lg transition-colors border ${
                isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200 border-slate-300' : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent hover:border-slate-700'
              }`}
              title="Fechar menu lateral"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg transition-colors border ${
                isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200 border-slate-300' : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent hover:border-slate-700'
              } ${collapsed ? 'hidden' : 'block'}`}
              title="Recolher menu lateral"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Status Card */}
        {!collapsed && (
          <div className={`p-3 border-b ${borderCol} ${isLight ? 'bg-slate-100/60' : 'bg-slate-900/60'}`}>
            <div className={`${bgCard} rounded-xl p-2.5 border`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${textMuted}`}>
                  Google Sheets
                </span>
                <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-200 border-slate-700/80'
                }`}>
                  {totalItems.toLocaleString('pt-BR')} itens
                </span>
              </div>

              {source === 'google_sheets' ? (
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    <span className="truncate">Conexão Ativa & Estável</span>
                  </div>
                  <div className={`flex items-center text-[10px] ${textMuted} font-mono pl-5`}>
                    <Clock className="w-3 h-3 mr-1 flex-shrink-0 opacity-70" />
                    <span className="truncate">
                      Auto-sync 15m {lastSyncedAt ? `(${lastSyncedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})` : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <span>Modo Amostra Local</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation & Menu Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-4">
          {/* Main Navigation Group */}
          <div>
            {!collapsed && (
              <div className={`text-[10px] font-bold uppercase tracking-wider ${textMuted} px-2 mb-1.5 flex items-center justify-between`}>
                <span>Navegação</span>
                <Layers className="w-3 h-3 opacity-60" />
              </div>
            )}
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = (item.id === 'garantias' && (activeView === 'garantias' || activeView === 'negociar')) || activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onViewChange(item.id);
                      if (mobile) onMobileClose();
                    }}
                    title={collapsed ? `${item.label}: ${item.desc}` : undefined}
                    className={`w-full text-left rounded-xl transition-all flex items-center group relative cursor-pointer ${
                      collapsed 
                        ? 'flex-col justify-center py-2 px-1 text-center' 
                        : 'p-2.5 justify-between'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50 font-bold ring-1 ring-white/20'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-300'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700/60'
                    }`}
                  >
                    {/* Active vertical line on collapsed */}
                    {collapsed && isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full shadow-sm" />
                    )}

                    <div className={`flex items-center ${collapsed ? 'flex-col justify-center' : 'space-x-2.5'} min-w-0`}>
                      <div className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                        isActive 
                          ? 'bg-indigo-700 text-white' 
                          : isLight
                          ? 'bg-slate-100 text-slate-700 group-hover:text-indigo-600 group-hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-300 group-hover:text-white group-hover:bg-slate-700'
                      }`}>
                        <Icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                      </div>
                      
                      {collapsed ? (
                        <span className={`text-[10px] font-bold tracking-tight text-center leading-tight mt-1 truncate max-w-full px-0.5 ${
                          isActive ? 'text-white' : isLight ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-300 group-hover:text-white'
                        }`}>
                          {item.shortLabel}
                        </span>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono flex-shrink-0 ${
                                isActive 
                                  ? 'bg-emerald-400 text-slate-950 font-black' 
                                  : isLight
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className={`text-[11px] truncate ${
                            isActive ? 'text-indigo-100' : textMuted
                          }`}>
                            {item.desc}
                          </div>
                        </div>
                      )}
                    </div>

                    {!collapsed && (
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                        isActive ? 'text-white translate-x-0.5' : isLight ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-500 group-hover:text-slate-300'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tools & Integrations Group */}
          <div>
            {!collapsed && (
              <div className={`text-[10px] font-bold uppercase tracking-wider ${textMuted} px-2 mb-1.5 flex items-center justify-between`}>
                <span>Ferramentas & Ações</span>
                <Sparkles className="w-3 h-3 text-indigo-500" />
              </div>
            )}

            <div className="space-y-1.5">
              {/* Sincronizar Agora */}
              <button
                type="button"
                onClick={() => {
                  onSync();
                  if (mobile) onMobileClose();
                }}
                disabled={isLoading}
                title={collapsed ? (isLoading ? 'Sincronizando...' : 'Sincronizar Planilha') : undefined}
                className={`w-full flex items-center rounded-xl border text-xs font-bold transition-all disabled:opacity-50 group cursor-pointer shadow-sm ${
                  collapsed ? 'flex-col justify-center py-2 px-1 text-center' : 'p-2.5 justify-between'
                } ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                    : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700/80 text-white'
                }`}
              >
                <div className={`flex items-center ${collapsed ? 'flex-col justify-center' : 'space-x-2.5'}`}>
                  <div className={`p-1 rounded-lg border transition-colors flex-shrink-0 ${
                    isLight 
                      ? 'bg-indigo-100 border-indigo-200 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white' 
                      : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-300 group-hover:text-white group-hover:bg-indigo-600'
                  }`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
                  </div>
                  <span className={`truncate font-semibold ${isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-100 group-hover:text-white'} ${collapsed ? 'text-[9px] mt-1' : 'text-xs'}`}>
                    {isLoading ? 'Sincronizando...' : (collapsed ? 'Sincronizar' : 'Sincronizar Planilha')}
                  </span>
                </div>
                {!collapsed && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                    isLight ? 'bg-white text-slate-600 border-slate-300' : 'text-slate-300 bg-slate-900/90 border-slate-700'
                  }`}>
                    Online
                  </span>
                )}
              </button>

              {/* Vincular Gravação */}
              {onOpenSyncModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSyncModal();
                    if (mobile) onMobileClose();
                  }}
                  title={collapsed ? (hasWebhookConfigured ? 'Gravação Ativa (Webhook)' : 'Vincular Gravação') : undefined}
                  className={`w-full flex items-center rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    collapsed ? 'flex-col justify-center py-2 px-1 text-center' : 'p-2.5 justify-between'
                  } ${
                    hasWebhookConfigured
                      ? isLight
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border-emerald-700/80'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-slate-800/90 hover:bg-slate-750 text-slate-100 border-slate-700/80'
                  }`}
                >
                  <div className={`flex items-center ${collapsed ? 'flex-col justify-center' : 'space-x-2.5'}`}>
                    <div className={`p-1 rounded-lg flex-shrink-0 border ${
                      hasWebhookConfigured
                        ? isLight ? 'bg-emerald-200 text-emerald-800 border-emerald-300' : 'bg-emerald-900 text-emerald-300 border-emerald-700'
                        : isLight ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60'
                    }`}>
                      <Link2 className="w-3.5 h-3.5" />
                    </div>
                    <span className={`truncate font-semibold ${
                      hasWebhookConfigured ? (isLight ? 'text-emerald-900' : 'text-emerald-100') : (isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-100 group-hover:text-white')
                    } ${collapsed ? 'text-[9px] mt-1' : 'text-xs'}`}>
                      {hasWebhookConfigured ? 'Gravação Ativa' : (collapsed ? 'Gravação' : 'Vincular Gravação')}
                    </span>
                  </div>
                  {!collapsed && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                      hasWebhookConfigured 
                        ? isLight ? 'bg-emerald-200 text-emerald-800 border-emerald-300' : 'bg-emerald-900 text-emerald-200 border border-emerald-700' 
                        : isLight ? 'bg-white text-slate-600 border-slate-300' : 'bg-slate-900/90 text-slate-300 border border-slate-700'
                    }`}>
                      Webhook
                    </span>
                  )}
                </button>
              )}

              {/* Configurar Planilha */}
              {onOpenSheetModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSheetModal();
                    if (mobile) onMobileClose();
                  }}
                  title={collapsed ? 'Configurar Planilha Google' : undefined}
                  className={`w-full flex items-center rounded-xl border text-xs font-bold transition-all group cursor-pointer shadow-sm ${
                    collapsed ? 'flex-col justify-center py-2 px-1 text-center' : 'p-2.5 justify-between'
                  } ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                      : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700/80 text-slate-100 hover:text-white'
                  }`}
                >
                  <div className={`flex items-center ${collapsed ? 'flex-col justify-center' : 'space-x-2.5'}`}>
                    <div className={`p-1 rounded-lg border transition-colors flex-shrink-0 ${
                      isLight 
                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white' 
                        : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-300 group-hover:text-white group-hover:bg-indigo-600'
                    }`}>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <span className={`truncate font-semibold ${isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-100 group-hover:text-white'} ${collapsed ? 'text-[9px] mt-1' : 'text-xs'}`}>
                      {collapsed ? 'Planilha' : 'Configurar Planilha'}
                    </span>
                  </div>
                  {!collapsed && <ExternalLink className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500 group-hover:text-slate-800' : 'text-slate-400 group-hover:text-white'}`} />}
                </button>
              )}

              {/* Documentação */}
              {onOpenDocModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenDocModal();
                    if (mobile) onMobileClose();
                  }}
                  title={collapsed ? 'Manual & Documentação' : undefined}
                  className={`w-full flex items-center rounded-xl border text-xs font-bold transition-all group cursor-pointer shadow-sm ${
                    collapsed ? 'flex-col justify-center py-2 px-1 text-center' : 'p-2.5 justify-between'
                  } ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                      : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700/80 text-slate-100 hover:text-white'
                  }`}
                >
                  <div className={`flex items-center ${collapsed ? 'flex-col justify-center' : 'space-x-2.5'}`}>
                    <div className={`p-1 rounded-lg border transition-colors flex-shrink-0 ${
                      isLight 
                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white' 
                        : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-300 group-hover:text-white group-hover:bg-indigo-600'
                    }`}>
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span className={`truncate font-semibold ${isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-100 group-hover:text-white'} ${collapsed ? 'text-[9px] mt-1' : 'text-xs'}`}>
                      {collapsed ? 'Manual' : 'Manual & Guia'}
                    </span>
                  </div>
                  {!collapsed && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                      isLight ? 'bg-white text-slate-600 border-slate-300' : 'bg-slate-900/90 text-slate-300 group-hover:text-white border-slate-700'
                    }`}>
                      PDF
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Controls (Theme & Collapse) */}
        <div className={`p-2.5 border-t ${borderCol} ${isLight ? 'bg-slate-50' : 'bg-slate-950'} space-y-2`}>
          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
              className={`w-full flex items-center rounded-xl border text-xs font-bold transition-all ${
                collapsed ? 'p-2.5 justify-center' : 'p-2.5 justify-between'
              } ${
                theme === 'light'
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-850 text-amber-300 border-slate-800'
              }`}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2'}`}>
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600 flex-shrink-0" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                )}
                {!collapsed && <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>}
              </div>
              {!collapsed && (
                <span className="text-[9px] font-mono opacity-80 uppercase">
                  {theme === 'light' ? 'Claro' : 'Escuro'}
                </span>
              )}
            </button>
          )}

          {/* Desktop Expand Button when collapsed */}
          {!mobile && collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir Menu Lateral"
              className={`w-full flex items-center justify-center p-2 rounded-xl border transition-all ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 transition-all duration-300 ease-in-out z-30 flex-shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (Overlay + Drawer Sidebar) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] z-50 lg:hidden shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
