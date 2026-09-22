import { isAutomaticSupplierItem } from './supplierUtils';

export const OFFICIAL_WARRANTY_STATUSES = [
  "A negociar",
  "Aprovado",
  "Aprovado - Validar",
  "Em negociação",
  "Emitir NF",
  "Não negociado",
  "Recusado"
] as const;

export const OFFICIAL_DEVOLUCAO_STATUSES = [
  "A negociar",
  "Aprovado",
  "Aprovado - Validar",
  "Em negociação",
  "Emitir NF",
  "Não negociado",
  "Recusado"
] as const;

export const OFFICIAL_OBS_STATUS_DEVOLUCAO = [
  "Aguardando aprovação fornecedor",
  "Aguardando envio de NF",
  "Aguardando autorização de coleta",
  "Coleta solicitada",
  "Coleta agendada",
  "Em trânsito para fornecedor",
  "Entregue ao fornecedor",
  "Peça em análise no fornecedor",
  "Crédito aprovado / Aguardando abatimento",
  "Crédito lançado em conta",
  "Troca em garantia aprovada",
  "Devolução recusada pelo fornecedor",
  "Peça sem cobertura de garantia",
  "Laudo técnico pendente",
  "Processo concluído",
  "Sem pendências"
] as const;

export const FINALIZED_WARRANTY_STATUSES = [
  "Não negociado",
  "Recusado"
] as const;

const normalizeCache = new Map<string, string>();
const strippedCache = new Map<string, string>();

export function normalizeStatusStr(s?: string): string {
  if (!s) return "";
  let cached = normalizeCache.get(s);
  if (cached !== undefined) return cached;

  cached = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizeCache.size < 5000) {
    normalizeCache.set(s, cached);
  }
  return cached;
}

export function getStrippedStatus(s?: string): string {
  if (!s) return "";
  let cached = strippedCache.get(s);
  if (cached !== undefined) return cached;

  const clean = normalizeStatusStr(s);
  cached = clean.startsWith("garantia:") ? clean.slice(9).trim() : clean;

  if (strippedCache.size < 5000) {
    strippedCache.set(s, cached);
  }
  return cached;
}

export function canonicalizeWarrantyStatus(rawStatus?: string): string {
  if (!rawStatus || !rawStatus.trim()) return "A negociar";
  let clean = rawStatus.trim();
  // Strip "Garantia:" or "Garantia -" or "Garantia " prefix case-insensitively
  clean = clean.replace(/^garantia\s*[:\-]?\s*/i, "").trim();
  return clean || "A negociar";
}

/**
 * Returns the exact standardized status for an item.
 * Strictly resolves to the exact cleaned status (e.g. "A negociar", "Em negociação", "Emitir NF", etc.)
 * without fuzzy approximations.
 */
export function getItemNormalizedStatus(item?: {
  statusDevolucao?: string;
  fornecedor?: string;
  novoFornecedorFilial?: string;
  fornecedorOriginal?: string;
  observacoesGerais?: string;
  obsNotaFiscal?: string;
}): string {
  if (!item) return "A negociar";

  const raw = item.statusDevolucao || "";
  const canonical = canonicalizeWarrantyStatus(raw);
  const normClean = normalizeStatusStr(canonical);

  for (const official of OFFICIAL_DEVOLUCAO_STATUSES) {
    if (normalizeStatusStr(official) === normClean) {
      return official;
    }
  }

  return canonical || "A negociar";
}

export const ALLOWED_LOCALIDADES = [
  "Mecanizou",
  "Mecanizou - Descarte",
  "Mecanizou - Recebimento",
  "Mecanizou - Expresso",
  "Mecanizou - Validação",
  "Mecanizou - BH",
  "Futura-Revenda"
] as const;

export function isAllowedWarrantyStatus(statusStr?: string): boolean {
  return true;
}

export function isWarrantyItem(item?: { statusDevolucao?: string; localidade?: string }): boolean {
  return !isDevolucaoItem(item);
}

export function isDevolucaoItem(item?: { localidade?: string }): boolean {
  if (!item || !item.localidade) return false;
  const locClean = item.localidade.trim();
  const normClean = locClean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

  return ALLOWED_LOCALIDADES.some(allowed => {
    const normAllowed = allowed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
    if (normClean === normAllowed) return true;
    if (normClean.replace(/\s*-\s*/g, "-") === normAllowed.replace(/\s*-\s*/g, "-")) return true;
    return false;
  });
}

export function matchesStatusFilter(item: any, filterStatus?: string): boolean {
  if (!filterStatus || filterStatus === 'all') return true;

  const rawStatus = typeof item === 'object' && item !== null
    ? (item.statusDevolucao || 'A negociar')
    : (typeof item === 'string' ? item : 'A negociar');

  const cleanStatus = canonicalizeWarrantyStatus(rawStatus);
  const normClean = normalizeStatusStr(cleanStatus);

  if (filterStatus === 'automaticos' || filterStatus === 'Automáticos') {
    return normClean === 'a negociar' && isAutomaticSupplierItem(item);
  }

  return normClean === normalizeStatusStr(filterStatus);
}

export function isFinalizedStatus(statusStr?: string): boolean {
  if (!statusStr) return false;
  const cleanInput = normalizeStatusStr(statusStr);
  return cleanInput.includes("recusad") || cleanInput.includes("negad") || cleanInput.includes("nao negociad");
}

export function cleanNotaFiscal(nfStr?: string): string {
  if (!nfStr) return '';
  return nfStr.replace(/\./g, '').trim();
}

export function isItemUrgent(item?: { urgente?: boolean; statusDevolucao?: string }): boolean {
  if (!item) return false;
  if (item.urgente === true) return true;
  if (item.statusDevolucao && normalizeStatusStr(item.statusDevolucao).includes("urgente")) return true;
  return false;
}

export interface QualityConditionInfo {
  status: 'boa' | 'analisar' | 'impropria';
  label: 'Peça Boa' | 'Analisar' | 'Imprópria';
  badgeClass: string;
  idBadgeClass: string;
  dotColor: string;
}

export function getItemQualityCondition(item?: { embalagem?: string; condicaoPeca?: string }): QualityConditionInfo {
  if (!item) {
    return {
      status: 'boa',
      label: 'Peça Boa',
      badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
      idBadgeClass: 'border-blue-500/50 text-blue-300 bg-blue-950/40',
      dotColor: 'bg-blue-400'
    };
  }

  const emb = (item.embalagem || '').trim().toLowerCase();
  const cond = (item.condicaoPeca || '').trim().toLowerCase();

  // Priority 1: Check for "3. Danificada" (or "danificad") in either column
  if (emb.includes('3.') || emb.includes('danificad') || cond.includes('3.') || cond.includes('danificad')) {
    return {
      status: 'impropria',
      label: 'Imprópria',
      badgeClass: 'bg-red-950/90 text-red-300 border-red-800/80 shadow-sm shadow-red-950/50 font-bold',
      idBadgeClass: 'border-red-500/60 text-red-300 bg-red-950/40 font-bold',
      dotColor: 'bg-red-500'
    };
  }

  // Priority 2: Check for "2. Pequeno sinal" (or "pequeno sinal" / "sinal") in either column
  if (emb.includes('2.') || emb.includes('sinal') || cond.includes('2.') || cond.includes('sinal')) {
    return {
      status: 'analisar',
      label: 'Analisar',
      badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-800/80 shadow-sm shadow-amber-950/50 font-bold',
      idBadgeClass: 'border-amber-500/60 text-amber-300 bg-amber-950/40 font-bold',
      dotColor: 'bg-amber-400'
    };
  }

  // Priority 3: Default / Both "Ok" -> Peça Boa
  return {
    status: 'boa',
    label: 'Peça Boa',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-800/80 shadow-sm shadow-blue-950/50 font-bold',
    idBadgeClass: 'border-blue-500/50 text-blue-300 bg-blue-950/40 font-bold',
    dotColor: 'bg-blue-400'
  };
}


