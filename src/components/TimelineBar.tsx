import React from 'react';

interface TimelineBarProps {
  days: number | null;
  label?: string;
  showTicks?: boolean;
  compact?: boolean;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  days,
  label,
  showTicks = true,
  compact = false,
}) => {
  if (days === null || isNaN(days)) {
    return (
      <div className="text-[11px] text-slate-500 italic">
        {label ? `${label}: Sem data` : 'Sem data para linha do tempo'}
      </div>
    );
  }

  // Calculate position percentage on scale 0 to 120 days
  // 0-30 days = 0% to 25%
  // 30-60 days = 25% to 50%
  // 60-90 days = 50% to 75%
  // 90+ days = 75% to 100%
  const effectiveDays = Math.max(0, days);
  let percentage = 0;
  if (effectiveDays <= 30) {
    percentage = (effectiveDays / 30) * 25;
  } else if (effectiveDays <= 60) {
    percentage = 25 + ((effectiveDays - 30) / 30) * 25;
  } else if (effectiveDays <= 90) {
    percentage = 50 + ((effectiveDays - 60) / 30) * 25;
  } else {
    // 90 to 120+ days maps to 75% to 100%
    percentage = Math.min(100, 75 + ((effectiveDays - 90) / 30) * 25);
  }

  // Determine indicator color based on age
  let pinBg = 'bg-emerald-500 border-emerald-300 text-slate-950';
  let statusLabel = '0-30d (Normal)';
  if (effectiveDays > 90) {
    pinBg = 'bg-red-800 border-red-400 text-white';
    statusLabel = '>90d (Crítico - Vermelho Escuro)';
  } else if (effectiveDays > 60) {
    pinBg = 'bg-rose-500 border-rose-300 text-white';
    statusLabel = '60-90d (Atrasado - Vermelho Claro)';
  } else if (effectiveDays > 30) {
    pinBg = 'bg-amber-400 border-amber-200 text-slate-950';
    statusLabel = '30-60d (Atenção - Amarelo)';
  }

  if (compact) {
    return (
      <div className="space-y-1 w-full max-w-[200px]">
        {label && (
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span>{label}</span>
            <span className="font-mono text-slate-200">{days}d</span>
          </div>
        )}
        <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
          <div className="w-1/4 h-full bg-emerald-500/80" title="0 a 30 dias (Verde)" />
          <div className="w-1/4 h-full bg-amber-500/80" title="30 a 60 dias (Amarelo)" />
          <div className="w-1/4 h-full bg-rose-500/80" title="60 a 90 dias (Vermelho Claro)" />
          <div className="w-1/4 h-full bg-red-900/90" title="+90 dias (Vermelho Escuro)" />
          
          {/* Current Days Marker Line */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] z-10 -ml-0.5 transition-all duration-300"
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>{label}</span>
          <span className="font-mono text-indigo-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {days} {days === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      )}

      {/* Progress Track with 4 Color Zones */}
      <div className="relative pt-6 pb-2">
        {/* Floating Pin Indicator */}
        <div 
          className="absolute top-0 transform -translate-x-1/2 z-20 flex flex-col items-center transition-all duration-300"
          style={{ left: `${percentage}%` }}
        >
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight shadow-lg border flex items-center gap-1 ${pinBg}`}>
            <span>{days}d</span>
          </div>
          <div className="w-0.5 h-2 bg-white" />
        </div>

        {/* Segmented Color Bar */}
        <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex relative shadow-inner">
          {/* 0 - 30: Verde */}
          <div 
            className="w-1/4 h-full bg-emerald-500 hover:brightness-110 transition-all border-r border-slate-950/50 flex items-center justify-center text-[9px] font-bold text-slate-950" 
            title="0 a 30 dias: Verde"
          >
            0-30
          </div>
          {/* 30 - 60: Amarelo */}
          <div 
            className="w-1/4 h-full bg-amber-400 hover:brightness-110 transition-all border-r border-slate-950/50 flex items-center justify-center text-[9px] font-bold text-slate-950" 
            title="30 a 60 dias: Amarelo"
          >
            30-60
          </div>
          {/* 60 - 90: Vermelho Claro */}
          <div 
            className="w-1/4 h-full bg-rose-500 hover:brightness-110 transition-all border-r border-slate-950/50 flex items-center justify-center text-[9px] font-bold text-white" 
            title="60 a 90 dias: Vermelho Claro"
          >
            60-90
          </div>
          {/* +90: Vermelho Escuro */}
          <div 
            className="w-1/4 h-full bg-red-900 hover:brightness-110 transition-all flex items-center justify-center text-[9px] font-bold text-red-200" 
            title="Acima de 90 dias: Vermelho Escuro"
          >
            +90
          </div>

          {/* Pin Marker Vertical Line */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,1)] z-10 -ml-0.5 pointer-events-none"
            style={{ left: `${percentage}%` }}
          />
        </div>

        {/* Ticks & Labels */}
        {showTicks && (
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 px-0.5">
            <span className="text-emerald-400 font-bold">0d</span>
            <span className="text-amber-300 font-bold">30d</span>
            <span className="text-rose-400 font-bold">60d</span>
            <span className="text-red-400 font-bold">90d+</span>
          </div>
        )}
      </div>
    </div>
  );
};
