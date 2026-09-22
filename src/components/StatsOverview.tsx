import React from 'react';
import { Package, Users, ShieldAlert } from 'lucide-react';
import { StockItem } from '../types';

interface StatsOverviewProps {
  items: StockItem[];
  theme?: 'dark' | 'light';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ items = [], theme = 'dark' }) => {
  const isLight = theme === 'light';
  const safeItems = items || [];
  const totalStockItems = safeItems.length;

  const totalStockQty = safeItems.reduce((acc, item) => {
    const qty = parseInt(item.quantEstoque) || 0;
    return acc + qty;
  }, 0);

  const uniqueClients = new Set(safeItems.map(i => i.cliente).filter(Boolean)).size;
  const urgentDevolucoes = safeItems.filter(i => 
    i.urgente ||
    (i.statusDevolucao && (
      i.statusDevolucao.toLowerCase().includes('urgente') ||
      i.statusDevolucao.toLowerCase().includes('pendente') ||
      i.statusDevolucao.toLowerCase().includes('análise') ||
      i.statusDevolucao.toLowerCase().includes('analise')
    ))
  ).length;

  const cardBg = isLight 
    ? 'bg-white border-slate-200 text-slate-800 shadow-sm' 
    : 'bg-slate-900/80 border-slate-800/90 text-slate-100 backdrop-blur-sm shadow-md';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const subText = isLight ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <div className={`${cardBg} border rounded-xl p-3.5 sm:p-4`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold ${textMuted} uppercase tracking-wider`}>
            Total Devoluções
          </span>
          <Package className="w-4 h-4 text-indigo-500" />
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'} mt-1`}>
          {totalStockItems}
        </div>
        <span className={`text-[10px] ${subText}`}>Devoluções registradas</span>
      </div>

      <div className={`${cardBg} border rounded-xl p-3.5 sm:p-4`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold ${textMuted} uppercase tracking-wider`}>
            Quant. Estoque
          </span>
          <Package className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'} mt-1`}>
          {totalStockQty}
        </div>
        <span className={`text-[10px] ${subText}`}>Unidades em processo</span>
      </div>

      <div className={`${cardBg} border rounded-xl p-3.5 sm:p-4`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold ${textMuted} uppercase tracking-wider`}>
            Clientes
          </span>
          <Users className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'} mt-1`}>
          {uniqueClients}
        </div>
        <span className={`text-[10px] ${subText}`}>Clientes ativos</span>
      </div>

      <div className={`${cardBg} border rounded-xl p-3.5 sm:p-4`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold ${textMuted} uppercase tracking-wider`}>
            Urgentes / Pendentes
          </span>
          <ShieldAlert className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'} mt-1`}>
          {urgentDevolucoes}
        </div>
        <span className={`text-[10px] ${subText}`}>Atenção requerida</span>
      </div>
    </div>
  );
};
