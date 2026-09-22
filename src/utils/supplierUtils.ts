import { StockItem } from '../types';

export function normalizeSupplierStr(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function cleanAlphaNumeric(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function isAutomaticSupplierItem(item: StockItem): boolean {
  const f = item.fornecedor || '';
  const fil = item.novoFornecedorFilial || '';
  const orig = item.fornecedorOriginal || '';
  const obsG = item.observacoesGerais || '';
  const obsNf = item.obsNotaFiscal || '';

  const cleanF = cleanAlphaNumeric(f);
  const cleanFil = cleanAlphaNumeric(fil);
  const cleanCombined = cleanAlphaNumeric(`${f} ${fil}`);
  const cleanOrig = cleanAlphaNumeric(orig);
  const cleanObsG = cleanAlphaNumeric(obsG);
  const cleanObsNf = cleanAlphaNumeric(obsNf);

  // Compel e Dinpar nunca são automáticos
  if (
    cleanCombined.includes('compel') || cleanF.includes('compel') || cleanFil.includes('compel') || cleanOrig.includes('compel') ||
    cleanCombined.includes('dinpar') || cleanF.includes('dinpar') || cleanFil.includes('dinpar') || cleanOrig.includes('dinpar')
  ) {
    return false;
  }

  // Verificar na tabela de Fornecedores (localStorage)
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('fornecedores_custom_db_v5') : null;
    if (raw) {
      const fornecedoresList = JSON.parse(raw) as Array<{ nome: string; carteira?: string; isAutomatico?: boolean }>;
      for (let i = 0; i < fornecedoresList.length; i++) {
        const forn = fornecedoresList[i];
        const fornNameClean = cleanAlphaNumeric(forn.nome);
        if (!fornNameClean) continue;

        const matchesThisSupplier = 
          cleanF === fornNameClean ||
          cleanCombined.includes(fornNameClean) ||
          cleanFil === fornNameClean ||
          cleanOrig === fornNameClean ||
          cleanObsG.includes(fornNameClean) ||
          cleanObsNf.includes(fornNameClean);

        if (matchesThisSupplier) {
          const carteiraLower = (forn.carteira || '').toLowerCase();
          const isAuto = forn.isAutomatico === true || carteiraLower.includes('aprovação') || carteiraLower.includes('coleta auto');
          return isAuto;
        }
      }
    }
  } catch (e) {
    console.error("Error reading fornecedores config from localStorage:", e);
  }

  return false;
}

/**
 * Checks if a given item belongs to the selected supplier.
 * Checks across:
 * 1. item.fornecedor
 * 2. item.fornecedorOriginal
 * 3. item.novoFornecedorFilial
 * 4. item.observacoesGerais
 * 5. item.obsNotaFiscal
 */
export function matchItemSupplier(item: StockItem, selectedSupplier: string): boolean {
  if (!selectedSupplier || selectedSupplier === 'all') return true;
  const target = normalizeSupplierStr(selectedSupplier);
  if (!target) return true;

  // Direct match on fornecedor
  const f = normalizeSupplierStr(item.fornecedor);
  if (f === target || f.includes(target) || target.includes(f)) {
    return true;
  }

  // Check novoFornecedorFilial
  const fil = normalizeSupplierStr(item.novoFornecedorFilial);
  if (fil.startsWith(target) || fil.includes(target)) {
    return true;
  }

  // Check fornecedorOriginal if present
  const orig = normalizeSupplierStr(item.fornecedorOriginal);
  if (orig.startsWith(target) || orig.includes(target)) {
    return true;
  }

  return false;
}

/**
 * Checks if a given item belongs to the selected filial/branch.
 */
export function matchItemFilial(item: StockItem, selectedFilial: string): boolean {
  if (!selectedFilial || selectedFilial === 'all') return true;
  const target = normalizeSupplierStr(selectedFilial);
  if (!target) return true;

  const fil = normalizeSupplierStr(item.novoFornecedorFilial);
  if (fil === target || fil.includes(target)) {
    return true;
  }

  const orig = normalizeSupplierStr(item.fornecedorOriginal);
  if (orig === target || orig.includes(target)) {
    return true;
  }

  return false;
}

/**
 * Extracts a list of unique supplier options from items.
 */
export function getAvailableSuppliers(items: StockItem[] = []): string[] {
  const supplierSet = new Set<string>();

  // Primary pass: collect from item.fornecedor
  (items || []).forEach(i => {
    const f = i.fornecedor?.trim();
    if (f && f.length >= 2) {
      supplierSet.add(f);
    }
  });

  return Array.from(supplierSet);
}

/**
 * Extracts available filiais for selected suppliers strictly from matching items.
 */
export function getAvailableFiliais(items: StockItem[] = [], selectedSupplier: string | string[] = 'all'): string[] {
  const filialSet = new Set<string>();

  const safeItems = items || [];
  let matching = safeItems;
  if (Array.isArray(selectedSupplier) && selectedSupplier.length > 0) {
    matching = safeItems.filter(i => selectedSupplier.some(s => matchItemSupplier(i, s)));
  } else if (typeof selectedSupplier === 'string' && selectedSupplier !== 'all' && selectedSupplier.trim() !== '') {
    matching = safeItems.filter(i => matchItemSupplier(i, selectedSupplier));
  }

  matching.forEach(i => {
    const filial = i.novoFornecedorFilial?.trim();
    if (filial && filial.length >= 2) {
      filialSet.add(filial);
    }
  });

  return Array.from(filialSet);
}
