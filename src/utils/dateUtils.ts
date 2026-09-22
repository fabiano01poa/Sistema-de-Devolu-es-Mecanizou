import { StockItem } from '../types';

export interface DateDaysInfo {
  days: number | null;
  formattedText: string;
  badgeColorClass: string;
}

export function parseDateString(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const cleanStr = dateStr.trim();

  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  } else if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (!isNaN(d.getTime())) return d;
      } else { // DD-MM-YYYY
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  
  const fallback = new Date(cleanStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function isDateInRange(dateStr: string | undefined, startDateStr?: string, endDateStr?: string): boolean {
  if (!startDateStr && !endDateStr) return true;
  const itemDate = parseDateString(dateStr);
  if (!itemDate) return false;

  itemDate.setHours(0, 0, 0, 0);

  if (startDateStr) {
    const start = parseDateString(startDateStr);
    if (start) {
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }
  }

  if (endDateStr) {
    const end = parseDateString(endDateStr);
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }
  }

  return true;
}

export function getDaysFromDate(dateStr?: string): number | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parsed = parseDateString(dateStr);
  if (!parsed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - parsed.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateDaysInStock(dataRecebimentoStr?: string): DateDaysInfo {
  const days = getDaysFromDate(dataRecebimentoStr);
  if (days === null) {
    return {
      days: null,
      formattedText: 'Sem data de recebimento',
      badgeColorClass: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  if (days === 0) {
    return {
      days: 0,
      formattedText: 'Recebido hoje (0 dias)',
      badgeColorClass: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    };
  } else if (days > 0) {
    return {
      days,
      formattedText: `Em estoque há ${days} ${days === 1 ? 'dia' : 'dias'}`,
      badgeColorClass: days > 60 
        ? 'bg-red-950 text-red-300 border-red-800'
        : days > 30
        ? 'bg-amber-950 text-amber-300 border-amber-800' 
        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
    };
  } else {
    const futureDays = Math.abs(days);
    return {
      days,
      formattedText: `Recebimento em ${futureDays} ${futureDays === 1 ? 'dia' : 'dias'}`,
      badgeColorClass: 'bg-purple-950 text-purple-300 border-purple-800'
    };
  }
}

const itemTimestampCache = new WeakMap<StockItem, number>();

export function getItemPrimaryTimestamp(item: StockItem): number {
  if (!item) return 0;
  const cached = itemTimestampCache.get(item);
  if (cached !== undefined) return cached;

  let val = 0;
  const dates = [
    item.dataRecebimento,
    item.dataSolicitacao,
    item.dataCompra,
    item.dataSaida,
    item.dataUltimaAlteracao
  ];
  for (const dStr of dates) {
    if (dStr) {
      const parsed = parseDateString(dStr);
      if (parsed) {
        val = parsed.getTime();
        break;
      }
    }
  }
  if (!val && item.idStock) {
    const num = parseInt(item.idStock.replace(/\D/g, ''), 10);
    if (!isNaN(num)) val = num;
  }

  itemTimestampCache.set(item, val);
  return val;
}

export function calculateDaysSinceDeparture(dataSaidaStr?: string): DateDaysInfo {
  if (!dataSaidaStr || !dataSaidaStr.trim()) {
    return {
      days: null,
      formattedText: 'Sem data de saída',
      badgeColorClass: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  const departureDate = parseDateString(dataSaidaStr);

  if (!departureDate) {
    return {
      days: null,
      formattedText: dataSaidaStr.trim(),
      badgeColorClass: 'bg-slate-800 text-slate-300 border-slate-700'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  departureDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - departureDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      days: 0,
      formattedText: 'Enviada hoje (0 dias)',
      badgeColorClass: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    };
  } else if (diffDays > 0) {
    return {
      days: diffDays,
      formattedText: `Enviada há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
      badgeColorClass: diffDays > 15 
        ? 'bg-amber-950 text-amber-300 border-amber-800' 
        : 'bg-blue-950 text-blue-300 border-blue-800'
    };
  } else {
    const futureDays = Math.abs(diffDays);
    return {
      days: diffDays,
      formattedText: `Envio em ${futureDays} ${futureDays === 1 ? 'dia' : 'dias'}`,
      badgeColorClass: 'bg-purple-950 text-purple-300 border-purple-800'
    };
  }
}
