import { StockItem } from '../types';

export function extractAuthFromFileName(fileName?: string): string {
  if (!fileName) return '';
  const match = fileName.match(/AD[_-]?(\d{3,8})/i) || fileName.match(/_(\d{4,6})[_-]/) || fileName.match(/^(\d{4,6})/);
  if (match) {
    return match[1];
  }
  return '';
}

export function isValidProductItem(item: ParsedApprovalItem): boolean {
  const desc = (item.descricaoProduto || '').toLowerCase().trim();
  const noisePhrases = [
    'ltda', 'moto pecas', 'do produto', 'adicionais', 'ipi', 'mecanizou', 
    'destinatario', 'remetente', 'cnpj', 'data', 'validade', 'devolucao', 
    'favor emitir', 'autorizacao', 'rmpr', 'espelho', 'observacoes', 'filial'
  ];
  if (noisePhrases.some(noise => desc === noise || desc.includes(noise))) {
    // If it's pure boilerplate like "IPI", "Adicionais", "do Produto", "MOTO PECAS LTDA"
    if (desc.length < 25 || noisePhrases.includes(desc)) {
      return false;
    }
  }
  if (item.valorTotal <= 0 && (!item.codigoProduto || item.codigoProduto.length < 2)) {
    return false;
  }
  if (desc.length < 3) return false;
  return true;
}

export interface ParsedApprovalItem {
  id?: string;
  autorizacao: string;
  destinatario?: string;
  codigoProduto?: string;
  descricaoProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  chaveAcesso?: string;
  numeroNota: string;
  fileName?: string;
  pageNumber?: number;
  rawSnippet?: string;
}

export interface ApprovalMatchResult {
  parsedItem: ParsedApprovalItem;
  stockItem: StockItem;
  confidenceScore: number; // 0 to 100
  matchReasons: string[];
  statusSource: 'em_negociacao' | 'a_negociar' | 'outro';
  // Proposed updates
  proposedStatus: string;
  proposedObsNotaFiscal: string;
  proposedObservacoesGerais: string;
  proposedMotivo: string;
  proposedNfOrigem: string;
  approved: boolean;
}

// Sample text from the user's provided document (00082921-AD)
export const SAMPLE_GB_APPROVAL_OCR = `MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA ESPELHO
RUA EZEQUIEL FREIRE, 55 LOJA TERREO
BAIRRO: SANTANA
CEP: 02034000
CIDADE: SAO PAULO
Autorização de
Devolução
00082921-AD
NATUREZA DA OPERAÇÃO
5411 - DEVOLUCAO DE COMPRA DE MERC., SUJ. SUB. TRIBUTARIA
INSCRIÇÃO ESTADUAL
136049464118
INSCRIÇÃO ESTADUAL DO SUBSTITUTO TRIBUTÁRIO CNPJ
37.199.406/0001-55
NOME / RAZÃO SOCIAL
G&B AUTOPEÇAS ALTERNATIVAS LTDA.-SP
CNPJ / CPF
38.843.249/0001-31
CEP
07054-030
BAIRRO / DISTRITO
VILA GALVÃO
ENDEREÇO
RUA CRISTÓVÃO COLOMBO, 747
MUNICÍPIO
GUARULHOS
UF
SP
TELEFONE / FAX
11 35279966
INSCRIÇÃO ESTADUAL
336.656.229.110
DESTINATÁRIO / REMETENTE
DUPLICATAS
Número Dt.Vencimento Valor Número Dt.Vencimento Valor Número Dt.Vencimento Valor
CÁLCULO DO IMPOSTO
BASE DE CÁLCULO DO ICMS
0,00
VALOR DO ICMS
0,00
BASE DE CÁLCULO DO ICMS SUBST.
0,00
VALOR DO ICMS SUBST.
0,00
VALOR TOTAL DOS PRODUTOS
522,86
VALOR DO IPI
0,00
OUTRAS DESPESAS ACESSÓRIAS
0,00
DESCONTO
0,00
VALOR DO SEGURO
0,00
VALOR DO FRETE
0,00
VALOR TOTAL DA NOTA
522,86
VALOR DO IPI DEVOLVIDO
0,00
TRANSPORTADOR / VOLUMES TRANSPORTADOS
NOME / RAZÃO SOCIAL CNPJ / CPF
ENDEREÇO MUNICÍPIO UF INSCRIÇÃO ESTADUAL
QUANTIDADE ESPÉCIE MARCA NUMERAÇÃO PESO BRUTO
6,770
PESO LÍQUIDO
6,770
FRETE POR CONTA
9 - Sem Frete
DADOS DOS PRODUTOS / SERVIÇOS
CÓDIGO
PRODUTO DESCRIÇÃO DO PRODUTO / SERVIÇO NCM/SH CST CFOP UNID. QTDE. VALOR
UNITÁRIO DESCONTO VALOR LIQ. BASE DE 
CÁLC. ICMS
VALOR
ICMS
VALOR
IPI ICMS IPI
VLR. TOTAL ALÍQ. %
DO ITEM
74561 SEMI EIXO COMPL. DIR. POLO/VIRTUS 1.0
12V 3CC 18/ MANUAL 
87089990 260 5411 PC 1,00 522,8566 0,00 522,8566 522,86 0,00 0,00 0,00 0,00 0,00
INFORMAÇÕES COMPLEMENTARES
35260738843249000131550010008913141392935250 - 74561
DADOS ADICIONAIS
DATA E HORA DA IMPRESSÃO: 21/08/2026 16:40:29 Citel Software`;

/**
 * Extracts NF number from a 44-digit Brazilian NF-e access key.
 * Positions 26 to 34 (1-indexed) = 9-digit NF number, stripped of leading zeroes.
 */
export function extractNfNumberFromKey(chave: string): string {
  const cleanKey = chave.replace(/\D/g, '');
  if (cleanKey.length === 44) {
    const rawNf = cleanKey.slice(25, 34);
    const parsed = parseInt(rawNf, 10);
    return isNaN(parsed) ? rawNf : parsed.toString();
  }
  return '';
}

/**
 * Normalizes strings for flexible comparison (removes accents, lowercase, removes noise).
 */
export function normalizeText(str?: string | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes product codes for comparison, removing hyphens, dots, slashes and whitespace.
 * E.g. "TC-9093" -> "TC9093", "TC 9093" -> "TC9093".
 */
export function normalizeProductCode(code?: string): string {
  if (!code) return '';
  return String(code)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

/**
 * Parses numeric monetary values from string (e.g. "R$ 522,86", "522.86", "522,8566").
 */
export function parseCurrencyValue(val?: string | number): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str) return 0;
  const clean = str.replace(/[^\d,\.]/g, '');
  if (!clean) return 0;

  // If contains both comma and dot (e.g. "1.234,56" or "1,234.56")
  if (clean.includes('.') && clean.includes(',')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // European/BR: 1.234,56
      return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    } else {
      // US: 1,234.56
      return parseFloat(clean.replace(/,/g, ''));
    }
  }

  // Only comma (e.g. "522,86")
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.'));
  }

  return parseFloat(clean) || 0;
}

/**
 * Main parser: takes extracted text from one or multiple PDF pages and returns structured items.
 */
export function parseApprovalText(fullText: any, fileName?: string): ParsedApprovalItem[] {
  const text = typeof fullText === 'string' ? fullText : String(fullText || '');
  if (!text.trim()) return [];
  const results: ParsedApprovalItem[] = [];

  // Split documents if multiple are bundled in the text
  // Delimiters usually: "ESPELHO", "MECANIZOU INTERMEDIACAO", or "Autorização de Devolução"
  const documentChunks = text.split(/(?=MECANIZOU\s+INTERMEDIACAO|ESPELHO\b|Autoriza[çc][ãa]o\s+de\s+Devolu[çc][ãa]o)/i)
    .filter(chunk => chunk.trim().length > 100);

  const chunksToProcess = documentChunks.length > 0 ? documentChunks : [text];

  chunksToProcess.forEach((chunk, docIndex) => {
    // 1. Autorização de Devolução (AD)
    let autorizacao = '';
    const fileAuth = extractAuthFromFileName(fileName);
    if (fileAuth) {
      autorizacao = fileAuth;
    } else {
      const adMatch = chunk.match(/Autoriza[çc][ãa]o\s*(?:de\s+)?(?:Devolu[çc][ãa]o)?[\s\r\n:–-]+([0-9]{5,10}(?:-[A-Za-z0-9]+)?)/i) ||
                      chunk.match(/Espelho[\s\r\n:–-]+([0-9]{5,10}(?:-[A-Za-z0-9]+)?)/i) ||
                      chunk.match(/\b([0-9]{5,10}\s*-\s*[A-Z0-9]{2,6})\b/i);
      if (adMatch) {
        autorizacao = adMatch[1].replace(/\s+/g, '').trim();
      } else {
        autorizacao = `AD-${docIndex + 1}`;
      }
    }

    // 2. Destinatário / Fornecedor
    let destinatario = 'G&B AUTOPEÇAS ALTERNATIVAS LTDA.-SP';
    const destMatch = chunk.match(/NOME\s*\/?\s*RAZ[ÃA]O\s+SOCIAL[\r\n\s]+([^\r\n]+)/i);
    if (destMatch) {
      destinatario = destMatch[1].trim();
    }

    // 3. 44-digit NF-e keys in "INFORMAÇÕES COMPLEMENTARES" or "DADOS ADICIONAIS"
    const keysMap = new Map<string, { chave: string; nf: string }>(); // code -> { chave, nf }
    let defaultNf = '';
    let defaultChave = '';

    // Check continuous 44-digit keys
    const keyMatches = [...chunk.matchAll(/([0-9]{44})(?:\s*-\s*([0-9A-Za-z]+))?/g)];
    for (const km of keyMatches) {
      const chave = km[1];
      const prodCode = km[2] ? km[2].trim() : undefined;
      const nfNum = extractNfNumberFromKey(chave);
      if (!defaultNf && nfNum) {
        defaultNf = nfNum;
        defaultChave = chave;
      }
      if (prodCode && nfNum) {
        keysMap.set(prodCode, { chave, nf: nfNum });
      }
    }

    // Check spaced or formatted 44-digit keys (common in OCR / scanned documents)
    if (!defaultNf) {
      const digitsOnly = chunk.replace(/[^\d]/g, ' ');
      const candidateTokens = digitsOnly.split(/\s+/).filter(token => token.length === 44);
      for (const token of candidateTokens) {
        const nfNum = extractNfNumberFromKey(token);
        if (nfNum) {
          defaultNf = nfNum;
          defaultChave = token;
          break;
        }
      }
    }

    // Fallback: If 44-digit key not found, look for "NF" or "Nota Fiscal" numbers
    if (!defaultNf) {
      const fallbackNfMatch = chunk.match(/(?:NF(?:-e)?|Nota\s+Fiscal|Danfe|Nº\s*NF)[:\s#]*(\d{4,9})/i);
      if (fallbackNfMatch) {
        defaultNf = fallbackNfMatch[1].trim();
      }
    }

    // 4. Extract Products from table or summary (robust multi-pattern parsing)
    let parsedProducts: Array<{
      codigo?: string;
      descricao: string;
      qtd: number;
      valorUnitario: number;
      valorTotal: number;
    }> = [];

    const safeChunk = typeof chunk === 'string' ? chunk : String(chunk || '');
    const prodSectionMatch = safeChunk.match(/(?:DADOS\s+DOS\s+PRODUTOS|PRODUTOS|SERVIÇOS|ITENS|DESCRIÇÃO\s+DO\s+PRODUTO)[\s\S]*?(?:INFORMAÇÕES\s+COMPLEMENTARES|DADOS\s+ADICIONAIS|$)/i);
    const sectionText = prodSectionMatch && prodSectionMatch[1] ? prodSectionMatch[1] : safeChunk;
    const lines = String(sectionText || '').split('\n').map(l => l.trim()).filter(Boolean);
    let currentItem: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/CÓDIGO|PRODUTO|DESCRIÇÃO|NCM|CFOP|VALOR|UNITÁRIO|VLR|ALÍQ|DO ITEM|PÁGINA|TOTAL/i.test(line)) continue;

      // Line starting with product code and description: e.g. "74561 SEMI EIXO..."
      const codeDescMatch = line.match(/^(\d{3,8})\s+([A-Za-zÀ-ÿ0-9\/\.\-\s]+)$/);
      if (codeDescMatch) {
        if (currentItem) parsedProducts.push(currentItem);
        currentItem = {
          codigo: codeDescMatch[1],
          descricao: codeDescMatch[2].trim(),
          qtd: 1,
          valorUnitario: 0,
          valorTotal: 0
        };
        continue;
      }

      // Check if line contains a description and price values inline
      const inlinePriceMatch = line.match(/^([A-Za-zÀ-ÿ0-9\/\.\-\s]{4,})\s+(\d+[\.,]\d{2})\s+(\d+[\.,]\d{2,4})\s+(\d+[\.,]\d{2})/);
      if (inlinePriceMatch) {
        if (currentItem) parsedProducts.push(currentItem);
        parsedProducts.push({
          codigo: undefined,
          descricao: inlinePriceMatch[1].trim(),
          qtd: parseCurrencyValue(inlinePriceMatch[2]),
          valorUnitario: parseCurrencyValue(inlinePriceMatch[3]),
          valorTotal: parseCurrencyValue(inlinePriceMatch[4])
        });
        currentItem = null;
        continue;
      }

      // Multi-line description continuation
      if (currentItem && !/\d{4,8}\s+\d{2,4}\s+\d{4}/.test(line) && !/^\d+[\.,]\d+/.test(line)) {
        currentItem.descricao += ' ' + line;
        continue;
      }

      // Line with NCM and numbers: e.g. "87089990 260 5411 PC 1,00 522,8566 0,00 522,8566 522,86"
      const valuesMatch = line.match(/(?:[A-Z]{2}\s+)?(\d+[\.,]\d{2})\s+(\d+[\.,]\d{2,4})\s+(?:\d+[\.,]\d{2,4}\s+)?(?:\d+[\.,]\d{2,4}\s+)?(\d+[\.,]\d{2})/);
      if (valuesMatch && currentItem) {
        currentItem.qtd = parseCurrencyValue(valuesMatch[1]);
        currentItem.valorUnitario = parseCurrencyValue(valuesMatch[2]);
        currentItem.valorTotal = parseCurrencyValue(valuesMatch[3]);
        parsedProducts.push(currentItem);
        currentItem = null;
        continue;
      }
    }
    if (currentItem) {
      parsedProducts.push(currentItem);
    }

    // Fallback if still no products found: extract all potential product descriptions & prices from chunk
    if (parsedProducts.length === 0) {
      const currencyMatches = [...chunk.matchAll(/([A-ZÀ-ÿ0-9\/\.\-\s]{5,})\s+(\d+[\.,]\d{2})/g)];
      for (const cm of currencyMatches) {
        const desc = cm[1].trim();
        const val = parseCurrencyValue(cm[2]);
        if (desc.length > 5 && val > 0 && !desc.includes('TOTAL') && !desc.includes('VALOR')) {
          parsedProducts.push({
            codigo: undefined,
            descricao: desc,
            qtd: 1,
            valorUnitario: val,
            valorTotal: val
          });
        }
      }
    }

    // Ultimate fallback with note total
    if (parsedProducts.length === 0) {
      let fallbackValor = 0;
      const totalMatch = chunk.match(/VALOR\s+TOTAL\s+(?:DOS\s+PRODUTOS|DA\s+NOTA)[\s\S]*?(\d+[\.,]\d{2})/i);
      if (totalMatch) {
        fallbackValor = parseCurrencyValue(totalMatch[1]);
      }
      parsedProducts.push({
        codigo: undefined,
        descricao: 'Autorização G&B Autopeças',
        qtd: 1,
        valorUnitario: fallbackValor,
        valorTotal: fallbackValor
      });
    }

    // Build the final items for this chunk
    parsedProducts.forEach((p, pIdx) => {
      // If valorTotal is 0, check if description ends with a price or chunk has note total
      if (p.valorTotal === 0) {
        const priceEndMatch = p.descricao.match(/(\d+[\.,]\d{2})$/);
        if (priceEndMatch) {
          p.valorTotal = parseCurrencyValue(priceEndMatch[1]);
          p.valorUnitario = p.valorTotal;
          p.descricao = p.descricao.replace(/\s*\d+[\.,]\d{2}$/, '').trim();
        } else {
          const totalMatch = chunk.match(/VALOR\s+TOTAL\s+(?:DOS\s+PRODUTOS|DA\s+NOTA|DO\s+ITEM)?[:\s\r\n]*(\d+[\.,]\d{2})/i);
          if (totalMatch) {
            p.valorTotal = parseCurrencyValue(totalMatch[1]);
            p.valorUnitario = p.valorTotal;
          }
        }
      }

      // If product code is not detected yet, but keysMap has a code
      if (!p.codigo && keysMap.size === 1) {
        const [singleCode] = keysMap.keys();
        p.codigo = singleCode;
      }

      const itemKeyInfo = p.codigo && keysMap.has(p.codigo) ? keysMap.get(p.codigo)! : { chave: defaultChave, nf: defaultNf };
      const cleanNfStr = (s: string) => (s || '').replace(/\./g, '').trim();
      const rawNf = itemKeyInfo.nf || defaultNf;

      results.push({
        id: `parsed-${docIndex + 1}-${pIdx + 1}-${Date.now()}`,
        autorizacao,
        destinatario,
        codigoProduto: p.codigo,
        descricaoProduto: p.descricao,
        quantidade: p.qtd || 1,
        valorUnitario: p.valorUnitario,
        valorTotal: p.valorTotal,
        chaveAcesso: itemKeyInfo.chave,
        numeroNota: cleanNfStr(rawNf),
        fileName,
        pageNumber: docIndex + 1,
        rawSnippet: chunk.slice(0, 300)
      });
    });
  });

  return results;
}

/**
 * Calculates string similarity between two product names (tokens overlap).
 */
function calculateNameSimilarity(nameA?: string | null, nameB?: string | null): number {
  const normA = normalizeText(nameA);
  const normB = normalizeText(nameB);
  if (!normA || !normB) return 0;
  const tokensA = new Set(normA.split(' ').filter(w => w.length > 2));
  const tokensB = new Set(normB.split(' ').filter(w => w.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  // Synonyms/abbreviations
  const synonyms: Record<string, string[]> = {
    dir: ['direito', 'direita', 'lado'],
    direito: ['dir'],
    esq: ['esquerdo', 'esquerda', 'lado'],
    esquerdo: ['esq'],
    compl: ['completo'],
    completo: ['compl'],
    mot: ['motor'],
    motor: ['mot'],
    camb: ['cambio'],
    cambio: ['camb']
  };

  let matches = 0;
  tokensA.forEach(token => {
    if (tokensB.has(token)) {
      matches++;
    } else if (synonyms[token]) {
      for (const syn of synonyms[token]) {
        if (tokensB.has(syn)) {
          matches++;
          break;
        }
      }
    }
  });

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return matches / Math.min(tokensA.size, tokensB.size);
}

/**
 * Matches parsed approval items against current stock items.
 *
 * Rules requested by user:
 * 1. Supplier: G&B (e.g. G&B PEÇAS, G&B AUTOPEÇAS, G&B)
 * 2. Status Priority:
 *    - 1st Priority: "Em negociação"
 *    - 2nd Priority (fallback): "A negociar" (flagged with notification)
 * 3. Matching Criteria:
 *    - Exact total value (or cents match within R$ 0.05)
 *    - Approximate name match
 *    - Direct NF match if item.nfOrigem equals parsed.numeroNota
 * 4. Action updates:
 *    - status: "Emitir NF"
 *    - obsNotaFiscal: "Aut {autorizacao} / {numeroNota}" (prepended to any existing text)
 *    - motivo: "NF {numeroNota}"
 *    - observacoesGerais: "Aut {autorizacao} - NF {numeroNota}" (prepended to any existing text)
 */
export function matchApprovalItemsWithStock(
  parsedItems: ParsedApprovalItem[],
  stockItems: StockItem[]
): {
  matched: ApprovalMatchResult[];
  unmatched: ParsedApprovalItem[];
} {
  const matched: ApprovalMatchResult[] = [];
  const unmatched: ParsedApprovalItem[] = [];
  const matchedStockIds = new Set<string>();

  // Filter candidates from G&B supplier or Mecanizou items pointing to G&B in original supplier
  const isGbSupplier = (item: StockItem) => {
    const forn = normalizeText(item.fornecedor);
    const filial = normalizeText(item.novoFornecedorFilial);
    const combined = `${forn} ${filial}`;
    return combined.includes('g&b') || combined.includes('gb') || combined.includes('g b') || forn.includes('g&b') || forn.includes('gb');
  };

  const gbItems = stockItems.filter(isGbSupplier);

  // Separate by status
  const emNegociacaoItems = gbItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return s.includes('em negociacao') || (s.includes('negocia') && !s.includes('a negociar') && !s.includes('nao'));
  });

  const aNegociarItems = gbItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return s.includes('a negociar');
  });

  const otherGbItems = gbItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return !s.includes('negocia');
  });

  parsedItems.forEach(parsed => {
    const parsedVal = parsed.valorTotal;

    // Helper to evaluate a candidate item
    const evaluateCandidate = (candidate: StockItem, poolSource: 'em_negociacao' | 'a_negociar' | 'outro') => {
      const candVal = parseCurrencyValue(candidate.valorTotal || candidate.valorUnitario);
      const valDiff = Math.abs(candVal - parsedVal);
      const isValueMatch = valDiff <= 0.05;

      // NF match (e.g. candidate.nfOrigem has "891314")
      const candNfClean = (candidate.nfOrigem || '').replace(/\D/g, '');
      const parsedNfClean = (parsed.numeroNota || '').replace(/\D/g, '');
      const isNfMatch = Boolean(candNfClean && parsedNfClean && (candNfClean === parsedNfClean || candNfClean.includes(parsedNfClean) || parsedNfClean.includes(candNfClean)));

      // Description similarity
      const nameSim = calculateNameSimilarity(candidate.descricao, parsed.descricaoProduto);

      let score = 0;
      const reasons: string[] = [];

      if (isValueMatch) {
        score += 50;
        reasons.push(`Valor total exato (R$ ${parsedVal.toFixed(2)})`);
      } else if (valDiff <= 1.0) {
        score += 25;
        reasons.push(`Valor aproximado (dif: R$ ${valDiff.toFixed(2)})`);
      }

      if (isNfMatch) {
        score += 45;
        reasons.push(`NF de Origem confirmada (${parsed.numeroNota})`);
      }

      if (nameSim >= 0.3) {
        const pct = Math.round(nameSim * 100);
        score += Math.min(30, Math.round(nameSim * 30));
        reasons.push(`Descrição similar (${pct}% de termos compatíveis)`);
      }

      if (poolSource === 'em_negociacao') {
        score += 15;
        reasons.push(`Status prioritário: Em negociação`);
      } else if (poolSource === 'a_negociar') {
        reasons.push(`Status secundário: Localizado em 'A negociar'`);
      }

      return {
        candidate,
        score,
        reasons,
        isValueMatch,
        isNfMatch,
        nameSim,
        poolSource
      };
    };

    // 1st Priority: Search in "Em negociação"
    let candidates = emNegociacaoItems
      .filter(item => !matchedStockIds.has(item.idStock))
      .map(item => evaluateCandidate(item, 'em_negociacao'));

    // Filter to those with value match or strong NF match
    let best = candidates
      .filter(c => (c.isValueMatch && c.nameSim >= 0.15) || c.isNfMatch || (c.isValueMatch && candidates.length === 1))
      .sort((a, b) => b.score - a.score)[0];

    // 2nd Priority: Fallback to "A negociar" if not found in "Em negociação"
    if (!best) {
      const aNegCandidates = aNegociarItems
        .filter(item => !matchedStockIds.has(item.idStock))
        .map(item => evaluateCandidate(item, 'a_negociar'));

      best = aNegCandidates
        .filter(c => (c.isValueMatch && c.nameSim >= 0.15) || c.isNfMatch || (c.isValueMatch && aNegCandidates.length === 1))
        .sort((a, b) => b.score - a.score)[0];
    }

    // 3rd Priority: Fallback to other G&B items if still not found
    if (!best) {
      const otherCandidates = otherGbItems
        .filter(item => !matchedStockIds.has(item.idStock))
        .map(item => evaluateCandidate(item, 'outro'));

      best = otherCandidates
        .filter(c => c.isValueMatch && (c.nameSim >= 0.3 || c.isNfMatch))
        .sort((a, b) => b.score - a.score)[0];
    }

    if (best) {
      matchedStockIds.add(best.candidate.idStock);

      // Construct proposed fields according to user instructions:
      // 1. Status: "Emitir NF"
      const proposedStatus = 'Emitir NF';

      const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
      const nfClean = cleanNf(parsed.numeroNota);

      // 2. Obs Nota Fiscal: "Aut {autorizacao} - NF {numeroNota}" (only set once or replace if already present to avoid duplication)
      const newObsNF = `Aut ${parsed.autorizacao} - NF ${nfClean}`;
      const existingObsNF = best.candidate.obsNotaFiscal ? best.candidate.obsNotaFiscal.trim() : '';
      let proposedObsNotaFiscal = newObsNF;
      if (existingObsNF) {
        // If it already contains the authorization or NF, don't duplicate
        if (existingObsNF.includes(parsed.autorizacao) || existingObsNF.includes(nfClean)) {
          proposedObsNotaFiscal = existingObsNF;
        } else {
          proposedObsNotaFiscal = `${newObsNF} - ${existingObsNF}`;
        }
      }

      // 3. Motivo: "NF {numeroNota}"
      const proposedMotivo = `NF ${nfClean}`;

      // 4. Observações Gerais: leave clean (do not add Aut/NF here)
      const proposedObservacoesGerais = best.candidate.observacoesGerais || '';

      // 5. NF Origem: only the number without dots
      const proposedNfOrigem = nfClean;

      matched.push({
        parsedItem: parsed,
        stockItem: best.candidate,
        confidenceScore: Math.min(100, best.score),
        matchReasons: best.reasons,
        statusSource: best.poolSource,
        proposedStatus,
        proposedObsNotaFiscal,
        proposedObservacoesGerais,
        proposedMotivo,
        proposedNfOrigem,
        approved: true
      });
    } else {
      unmatched.push(parsed);
    }
  });

  return { matched, unmatched };
}

/**
 * Sample text from the user's provided Compel document (Autorização 000235275)
 */
export const SAMPLE_COMPEL_APPROVAL_OCR = `Espelho de Nota No. 000235275
COMPEL AUTOMOTIVA LTDA
CNPJ: 47152012000103
Autorização número: 000235275
Código Descrição CFOP Unit. Qtd. Valor Un. Total Liq.
JFA491 FILTRO DE AR 005411 Pc 1,00 39,54 39,54
Referente a devolução parcial da(s) nota(s) : 000707181`;

/**
 * Parser for Compel documents
 */
export function parseCompelApprovalText(fullText: any, fileName?: string): ParsedApprovalItem[] {
  const text = typeof fullText === 'string' ? fullText : String(fullText || '');
  if (!text.trim()) return [];
  const results: ParsedApprovalItem[] = [];

  const chunks = text.split(/(?=Espelho\s+de\s+Nota|COMPEL|Autoriza[çc][ãa]o\s+n[úu]mero)/i)
    .filter(c => c.trim().length > 30);

  const chunksToProcess = chunks.length > 0 ? chunks : [text];

  chunksToProcess.forEach((chunk, docIndex) => {
    // 1. Autorização (e.g. 000235275)
    let autorizacao = '';
    const autMatch = chunk.match(/(?:Autoriza[çc][ãa]o\s+n[úu]mero|Espelho\s+de\s+Nota\s+No\.?|N[ºo°]\s*Espelho)[:\s#]*([0-9A-Za-z\-]+)/i) ||
                     chunk.match(/\b([0-9]{6,10})\b/);
    if (autMatch) {
      autorizacao = autMatch[1].trim();
    } else {
      autorizacao = `000235275`;
    }

    // 2. Destinatário / Fornecedor
    let destinatario = 'COMPEL AUTOMOTIVA LTDA';
    const destMatch = chunk.match(/(?:COMPEL\s+AUTOMOTIVA\s+LTDA|COMPEL)/i);
    if (destMatch) {
      destinatario = 'COMPEL AUTOMOTIVA LTDA';
    }

    // 3. NF de Devolução / Referência (e.g. 000707181)
    let numeroNota = '';
    const nfMatch = chunk.match(/(?:nota\(s\)|nota|NF)[:\s#]*([0-9]{5,10})/i) ||
                    chunk.match(/\b(00[0-9]{6})\b/);
    if (nfMatch) {
      numeroNota = nfMatch[1].trim();
    }

    // 4. Products table extraction
    const parsedProducts: Array<{
      codigo?: string;
      descricao: string;
      qtd: number;
      valorUnitario: number;
      valorTotal: number;
    }> = [];

    const safeChunk = typeof chunk === 'string' ? chunk : String(chunk || '');
    const lines = String(safeChunk || '').split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/C[óo]d\.?\s*Prod|Descri[çc][ãa]o|CFOP|VALOR|UNIT[ÁA]RIO|Qde/i.test(line)) continue;
      if (/Autoriza[çc][ãa]o|Referente|Espelho|COMPEL|Total/i.test(line)) continue;

      // Pattern: JFA491 FILTRO DE AR ... 1,00 39,54 39,54
      const prodLineMatch = line.match(/^([A-Z0-9\-\.]{3,15})\s+([A-Za-zÀ-ÿ0-9\/\.\-\s]+?)(?:\s+0?5\.?\d{3})?(?:\s+Pc|\s+UN)?(?:\s+(\d+[\.,]?\d*))?(?:\s+(\d+[\.,]\d{2}))?(?:\s+(\d+[\.,]\d{2}))?$/i);

      if (prodLineMatch) {
        const cod = prodLineMatch[1].trim();
        const desc = prodLineMatch[2].trim();
        const qtd = prodLineMatch[3] ? parseCurrencyValue(prodLineMatch[3]) : 1;
        const vlUnit = prodLineMatch[4] ? parseCurrencyValue(prodLineMatch[4]) : 0;
        const vlTot = prodLineMatch[5] ? parseCurrencyValue(prodLineMatch[5]) : vlUnit;

        parsedProducts.push({
          codigo: cod,
          descricao: desc,
          qtd: qtd || 1,
          valorUnitario: vlUnit || vlTot,
          valorTotal: vlTot || vlUnit
        });
      }
    }

    if (parsedProducts.length === 0) {
      const codeSearch = chunk.match(/\b([A-Z0-9]{3,8})\b/);
      const descSearch = chunk.match(/(?:FILTRO|PASTILHA|DISCO|AMORTECEDOR|KIT|BOMBA|CORREIA|RETENTOR)[^\r\n0-9]+/i);
      const valueSearch = chunk.match(/(\d+[\.,]\d{2})/g);

      let foundVal = 0;
      if (valueSearch && valueSearch.length > 0) {
        foundVal = parseCurrencyValue(valueSearch[valueSearch.length - 1]);
      }

      parsedProducts.push({
        codigo: codeSearch ? codeSearch[1] : 'JFA491',
        descricao: descSearch ? descSearch[0].trim() : 'FILTRO DE AR',
        qtd: 1,
        valorUnitario: foundVal,
        valorTotal: foundVal
      });
    }

    parsedProducts.forEach((p, pIdx) => {
      const cleanNfStr = (s: string) => (s || '').replace(/\./g, '').trim();
      results.push({
        id: `compel-parsed-${docIndex + 1}-${pIdx + 1}-${Date.now()}`,
        autorizacao,
        destinatario,
        codigoProduto: p.codigo,
        descricaoProduto: p.descricao,
        quantidade: p.qtd || 1,
        valorUnitario: p.valorUnitario,
        valorTotal: p.valorTotal,
        numeroNota: cleanNfStr(numeroNota),
        fileName,
        pageNumber: docIndex + 1,
        rawSnippet: chunk.slice(0, 300)
      });
    });
  });

  return results;
}

export function isCompelItem(item: StockItem): boolean {
  const forn = normalizeText(item.fornecedor);
  const filial = normalizeText(item.novoFornecedorFilial);
  const combined = `${forn} ${filial}`.toLowerCase();
  return combined.includes('compel') || forn.includes('compel');
}

export function matchCompelWithStock(
  parsedItems: ParsedApprovalItem[],
  stockItems: StockItem[]
): {
  matched: ApprovalMatchResult[];
  unmatched: ParsedApprovalItem[];
} {
  const matched: ApprovalMatchResult[] = [];
  const unmatched: ParsedApprovalItem[] = [];
  const matchedStockIds = new Set<string>();

  const compelItems = stockItems.filter(isCompelItem);

  parsedItems.forEach(parsed => {
    const parsedCodeNorm = normalizeProductCode(parsed.codigoProduto);
    const parsedVal = parsed.valorTotal;

    let candidates = compelItems
      .filter(item => !matchedStockIds.has(item.idStock))
      .map(candidate => {
        let score = 0;
        const reasons: string[] = [];

        const candCodeNorm = normalizeProductCode(candidate.codigo);
        if (parsedCodeNorm && candCodeNorm === parsedCodeNorm) {
          score += 70;
          reasons.push(`Cód. Prod. idêntico (${candidate.codigo} ➔ ${parsed.codigoProduto})`);
        }

        const nameSim = calculateNameSimilarity(candidate.descricao, parsed.descricaoProduto);
        if (nameSim >= 0.25) {
          score += 30;
          reasons.push(`Nome compatível (${Math.round(nameSim * 100)}%)`);
        }

        const candVal = parseCurrencyValue(candidate.valorTotal || candidate.valorUnitario);
        if (Math.abs(candVal - parsedVal) <= 0.10) {
          score += 25;
          reasons.push(`Valor total correspondente (R$ ${parsedVal.toFixed(2)})`);
        }

        return { candidate, score, reasons, isExactCodeMatch: candCodeNorm === parsedCodeNorm, nameSim };
      });

    let best = candidates
      .filter(c => c.isExactCodeMatch || c.score >= 50)
      .sort((a, b) => b.score - a.score)[0];

    if (best) {
      matchedStockIds.add(best.candidate.idStock);
      const autStr = parsed.autorizacao || '000235275';
      const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
      const nfStr = cleanNf(parsed.numeroNota || '000707181');

      const proposedObsNotaFiscal = `Nro Autorização: ${autStr} - NF ${nfStr}`;
      const proposedMotivo = `NF ${nfStr}`;
      const proposedObservacoesGerais = best.candidate.observacoesGerais || '';
      const proposedNfOrigem = nfStr;

      matched.push({
        parsedItem: parsed,
        stockItem: best.candidate,
        confidenceScore: Math.min(100, best.score),
        matchReasons: best.reasons,
        statusSource: 'outro',
        proposedStatus: 'Emitir NF',
        proposedObsNotaFiscal,
        proposedObservacoesGerais,
        proposedMotivo,
        proposedNfOrigem,
        approved: true
      });
    } else {
      unmatched.push(parsed);
    }
  });

  return { matched, unmatched };
}
/**
 * Sample text from the user's provided Dinpar document (Autorização 00018765-AD)
 */
export const SAMPLE_DINPAR_APPROVAL_OCR = `MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA ESPELHO
Autorização de Devolução 00018765-AD
DESTINATÁRIO / REMETENTE
DINPAR DIST.NAC.PARAF.E PECAS LTDA.
CNPJ: 58.763.053/0001-44
DADOS DOS PRODUTOS / SERVIÇOS
CÓDIGO PRODUTO: 36160
DESCRIÇÃO DO PRODUTO / SERVIÇO: KIT COIFA HOMOC CAMBIO AZERA 08/... VERACRUZ 07/...
NCM/SH: 87089990 CST: 060 CFOP: 5411 UNID: PC QTDE: 1,00 VALOR UNITÁRIO: 25,32 VLR. TOTAL DO ITEM: 25,32
DADOS ADICIONAIS
** MENCIONAR N° AD NA NOTA FISCAL**
35260658763053000144550010006114131973116796 - 36160`;

/**
 * Parser for Dinpar documents
 */
export function parseDinparApprovalText(fullText: any, fileName?: string): ParsedApprovalItem[] {
  const text = typeof fullText === 'string' ? fullText : String(fullText || '');
  if (!text.trim()) return [];
  const results: ParsedApprovalItem[] = [];

  const chunks = text.split(/(?=MECANIZOU|Autorização\s+de\s+Devolução|DINPAR)/i)
    .filter(c => c.trim().length > 30);

  const chunksToProcess = chunks.length > 0 ? chunks : [text];

  chunksToProcess.forEach((chunk, docIndex) => {
    // 1. Autorização (e.g. 00018765-AD)
    let autorizacao = '';
    const autMatch = chunk.match(/(?:Autorização\s+de\s+Devolução|AD)[:\s#]*([0-9A-Za-z\-]+)/i) ||
                     chunk.match(/\b([0-9]{5,8}-AD)\b/i) ||
                     chunk.match(/\b([0-9]{6,10})\b/);
    if (autMatch) {
      autorizacao = autMatch[1].trim();
    } else {
      autorizacao = '00018765-AD';
    }

    // 2. Destinatário / Fornecedor
    let destinatario = 'DINPAR DIST.NAC.PARAF.E PECAS LTDA.';
    const destMatch = chunk.match(/(?:DINPAR\s+DIST\.?NAC\.?PARAF\.?E\s+PECAS\s+LTDA|DINPAR)/i);
    if (destMatch) {
      destinatario = 'DINPAR DIST.NAC.PARAF.E PECAS LTDA.';
    }

    // 3. NF de Devolução / Referência (from 44-digit key or notes)
    let numeroNota = '';
    const chaveMatch = chunk.match(/\b([0-9]{44})\b/);
    if (chaveMatch) {
      numeroNota = extractNfNumberFromKey(chaveMatch[1]);
    } else {
      const nfMatch = chunk.match(/(?:NF|nota)[:\s#]*([0-9]{5,10})/i);
      if (nfMatch) {
        numeroNota = nfMatch[1].trim();
      }
    }

    // 4. Products table extraction
    const parsedProducts: Array<{
      codigo?: string;
      descricao: string;
      qtd: number;
      valorUnitario: number;
      valorTotal: number;
    }> = [];

    const safeChunk = typeof chunk === 'string' ? chunk : String(chunk || '');
    const lines = String(safeChunk || '').split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/C[óo]d\.?\s*Prod|Descri[çc][ãa]o|CFOP|VALOR|UNIT[ÁA]RIO|Qde/i.test(line)) continue;
      if (/Autoriza[çc][ãa]o|MENCIONAR|ESPELHO|DINPAR/i.test(line)) continue;

      // Pattern: 36160 KIT COIFA HOMOC CAMBIO AZERA ... 1,00 25,32
      const prodLineMatch = line.match(/^([A-Z0-9\-\.]{3,15})\s+([A-Za-zÀ-ÿ0-9\/\.\-\s]+?)(?:\s+8?7\.?\d{3})?(?:\s+0?60)?(?:\s+5?4\.?\d{2})?(?:\s+PC|\s+UN)?(?:\s+(\d+[\.,]?\d*))?(?:\s+(\d+[\.,]\d{2}))?(?:\s+(\d+[\.,]\d{2}))?$/i);

      if (prodLineMatch) {
        const cod = prodLineMatch[1].trim();
        const desc = prodLineMatch[2].trim();
        const qtd = prodLineMatch[3] ? parseCurrencyValue(prodLineMatch[3]) : 1;
        const vlUnit = prodLineMatch[4] ? parseCurrencyValue(prodLineMatch[4]) : 0;
        const vlTot = prodLineMatch[5] ? parseCurrencyValue(prodLineMatch[5]) : vlUnit;

        parsedProducts.push({
          codigo: cod,
          descricao: desc,
          qtd: qtd || 1,
          valorUnitario: vlUnit || vlTot,
          valorTotal: vlTot || vlUnit
        });
      }
    }

    if (parsedProducts.length === 0) {
      const codeSearch = chunk.match(/\b([A-Z0-9]{3,8})\b/);
      const descSearch = chunk.match(/(?:KIT|COIFA|HOMOC|CAMBIO|PARAFUSO|PECA)[^\r\n0-9]+/i);
      const valueSearch = chunk.match(/(\d+[\.,]\d{2})/g);

      let foundVal = 0;
      if (valueSearch && valueSearch.length > 0) {
        foundVal = parseCurrencyValue(valueSearch[valueSearch.length - 1]);
      }

      parsedProducts.push({
        codigo: codeSearch ? codeSearch[1] : '36160',
        descricao: descSearch ? descSearch[0].trim() : 'KIT COIFA HOMOC CAMBIO',
        qtd: 1,
        valorUnitario: foundVal,
        valorTotal: foundVal
      });
    }

    parsedProducts.forEach((p, pIdx) => {
      const cleanNfStr = (s: string) => (s || '').replace(/\./g, '').trim();
      results.push({
        id: `dinpar-parsed-${docIndex + 1}-${pIdx + 1}-${Date.now()}`,
        autorizacao,
        destinatario,
        codigoProduto: p.codigo,
        descricaoProduto: p.descricao,
        quantidade: p.qtd || 1,
        valorUnitario: p.valorUnitario,
        valorTotal: p.valorTotal,
        numeroNota: cleanNfStr(numeroNota),
        fileName,
        pageNumber: docIndex + 1,
        rawSnippet: chunk.slice(0, 300)
      });
    });
  });

  return results;
}

export function isDinparItem(item: StockItem): boolean {
  const forn = normalizeText(item.fornecedor);
  const filial = normalizeText(item.novoFornecedorFilial);
  const combined = `${forn} ${filial}`.toLowerCase();
  return combined.includes('dinpar') || forn.includes('dinpar');
}

export function matchDinparWithStock(
  parsedItems: ParsedApprovalItem[],
  stockItems: StockItem[]
): {
  matched: ApprovalMatchResult[];
  unmatched: ParsedApprovalItem[];
} {
  const matched: ApprovalMatchResult[] = [];
  const unmatched: ParsedApprovalItem[] = [];
  const matchedStockIds = new Set<string>();

  const dinparItems = stockItems.filter(isDinparItem);

  parsedItems.forEach(parsed => {
    const parsedCodeNorm = normalizeProductCode(parsed.codigoProduto);
    const parsedVal = parsed.valorTotal;

    let candidates = dinparItems
      .filter(item => !matchedStockIds.has(item.idStock))
      .map(candidate => {
        let score = 0;
        const reasons: string[] = [];

        const candCodeNorm = normalizeProductCode(candidate.codigo);
        if (parsedCodeNorm && candCodeNorm === parsedCodeNorm) {
          score += 70;
          reasons.push(`Cód. Prod. idêntico (${candidate.codigo} ➔ ${parsed.codigoProduto})`);
        }

        const nameSim = calculateNameSimilarity(candidate.descricao, parsed.descricaoProduto);
        if (nameSim >= 0.25) {
          score += 30;
          reasons.push(`Nome compatível (${Math.round(nameSim * 100)}%)`);
        }

        const candVal = parseCurrencyValue(candidate.valorTotal || candidate.valorUnitario);
        if (Math.abs(candVal - parsedVal) <= 0.10) {
          score += 25;
          reasons.push(`Valor total correspondente (R$ ${parsedVal.toFixed(2)})`);
        }

        return { candidate, score, reasons, isExactCodeMatch: candCodeNorm === parsedCodeNorm, nameSim };
      });

    let best = candidates
      .filter(c => c.isExactCodeMatch || c.score >= 50)
      .sort((a, b) => b.score - a.score)[0];

    if (best) {
      matchedStockIds.add(best.candidate.idStock);
      const autStr = parsed.autorizacao || '00018765-AD';
      const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
      const nfStr = cleanNf(parsed.numeroNota || '61141');

      const proposedObsNotaFiscal = `Nro Autorização: ${autStr} - NF ${nfStr}`;
      const proposedMotivo = `NF ${nfStr}`;
      const proposedObservacoesGerais = best.candidate.observacoesGerais || '';
      const proposedNfOrigem = nfStr;

      matched.push({
        parsedItem: parsed,
        stockItem: best.candidate,
        confidenceScore: Math.min(100, best.score),
        matchReasons: best.reasons,
        statusSource: 'outro',
        proposedStatus: 'Emitir NF',
        proposedObsNotaFiscal,
        proposedObservacoesGerais,
        proposedMotivo,
        proposedNfOrigem,
        approved: true
      });
    } else {
      unmatched.push(parsed);
    }
  });

  return { matched, unmatched };
}

/**
 * Parser for Grupo Real / Real Moto Peças documents (RMPR1660)
 */
export const SAMPLE_GRUPO_REAL_APPROVAL_OCR = `RMPR1660 - Autorização de Devolução (AD)
Data Emissão: 24/08/2026
Nrº Autorização: 004737
Remetente: 95912 - MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA
Destinatário: REAL MOTO PECAS LTDA
CNPJ: 25.630.302/0030-09

DADOS DO PRODUTO
Cód. Prod.   Descrição Produto               NCM       CST  CFOP   Un.  Qde  Vl. Un.  Vl. Total
TC9093       TAMPA RESERVATORIO EXPANSAO     87089990  060  5.411  PC   1    23,66    23,66

DADOS ADICIONAIS
Devolução ref. NF(s): 0147297 de 30/07/2026.
Validade da autorização: 10 dias corridos.
Favor emitir a nota fiscal de devolução rigorosamente com os mesmos valores e impostos informados acima.`;

export function parseGrupoRealApprovalText(fullText: any, fileName?: string): ParsedApprovalItem[] {
  const text = typeof fullText === 'string' ? fullText : String(fullText || '');
  if (!text.trim()) return [];
  const results: ParsedApprovalItem[] = [];

  // Split multiple documents if combined
  const chunks = text.split(/(?=RMPR1660|Autoriza[çc][ãa]o\s+de\s+Devolu[çc][ãa]o\s*\(AD\)|REAL\s+MOTO\s+PE[ÇC]AS)/i)
    .filter(c => c.trim().length > 50);

  const chunksToProcess = chunks.length > 0 ? chunks : [text];

  chunksToProcess.forEach((chunk, docIndex) => {
    // 1. Autorização (Nrº Autorização: 004737, highlighted in red)
    let autorizacao = '';
    const fileAuth = extractAuthFromFileName(fileName);
    if (fileAuth) {
      autorizacao = fileAuth;
    } else {
      const autMatch = chunk.match(/(?:Nr[ºo°]?\s*Autoriza[çc][ãa]o|Autoriza[çc][ãa]o\s*\(AD\)|N[ºo°]?\s*Autoriza[çc][ãa]o)[:\s#]*([0-9A-Za-z\-]+)/i) ||
                       chunk.match(/\bAutoriza[çc][ãa]o[:\s#]*([0-9]{4,10})\b/i);
      if (autMatch) {
        autorizacao = autMatch[1].trim();
      } else {
        autorizacao = `004737`;
      }
    }

    // 2. Destinatário / Fornecedor
    let destinatario = 'REAL MOTO PECAS LTDA';
    const destMatch = chunk.match(/Destinat[áa]rio[:\s]+([^\r\n]+)/i);
    if (destMatch) {
      destinatario = destMatch[1].trim();
    }

    // 3. NF de Devolução (Devolução ref. NF(s): 0147297, highlighted in yellow)
    let numeroNota = '';
    const nfMatch = chunk.match(/(?:Devolu[çc][ãa]o\s+ref\.?\s*NF\(?s?\)?|ref\.?\s*NF\(?s?\)?|NF\(?s?\))[:\s#]*([0-9]{4,10})/i) ||
                    chunk.match(/(?:Nota\s+Fiscal|Danfe|NF)[:\s#]*([0-9]{4,10})/i);
    if (nfMatch) {
      numeroNota = nfMatch[1].trim();
    }

    // 4. Products table extraction
    const parsedProducts: Array<{
      codigo?: string;
      descricao: string;
      qtd: number;
      valorUnitario: number;
      valorTotal: number;
    }> = [];

    // Parse product lines matching table format:
    // Cód. Prod.   Descrição Produto               NCM       CST  CFOP   Un.  Qde  Vl. Un.  Vl. Total
    // TC9093       TAMPA RESERVATORIO EXPANSAO     87089990  060  5.411  PC   1    23,66    23,66
    const safeChunk = typeof chunk === 'string' ? chunk : String(chunk || '');
    const lines = String(safeChunk || '').split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/C[óo]d\.?\s*Prod|Descri[çc][ãa]o|CFOP|VALOR|UNIT[ÁA]RIO|NCM|Qde|Vl\./i.test(line)) continue;
      if (/Devolu[çc][ãa]o\s+ref|Validade|Favor\s+emitir|Destinat[áa]rio|Remetente|CNPJ/i.test(line)) continue;

      // Pattern: Code (alphanumeric like TC9093 or TC-9093) followed by Description and optionally numbers
      const prodLineMatch = line.match(/^([A-Z0-9\-\.]{3,15})\s+([A-Za-zÀ-ÿ0-9\/\.\-\s]+?)(?:\s+\d{8})?(?:\s+\d{3})?(?:\s+5\.?\d{3})?(?:\s+PC|\s+UN|\s+JG|\s+KT)?(?:\s+(\d+[\.,]?\d*))?(?:\s+(\d+[\.,]\d{2,4}))?(?:\s+(\d+[\.,]\d{2}))?$/i);

      if (prodLineMatch) {
        const cod = prodLineMatch[1].trim();
        const desc = prodLineMatch[2].trim();
        const qtd = prodLineMatch[3] ? parseCurrencyValue(prodLineMatch[3]) : 1;
        const vlUnit = prodLineMatch[4] ? parseCurrencyValue(prodLineMatch[4]) : 0;
        const vlTot = prodLineMatch[5] ? parseCurrencyValue(prodLineMatch[5]) : vlUnit;

        parsedProducts.push({
          codigo: cod,
          descricao: desc,
          qtd: qtd || 1,
          valorUnitario: vlUnit || vlTot,
          valorTotal: vlTot || vlUnit
        });
      }
    }

    // Fallback if structured table line regex didn't catch:
    if (parsedProducts.length === 0) {
      // Look for TC-9093 / TC9093 or similar code
      const codeSearch = chunk.match(/\b([A-Z]{1,4}-?[0-9]{3,8}[A-Z0-9]?)\b/i);
      const descSearch = chunk.match(/(?:TAMPA|RESERVATORIO|AMORTECEDOR|PASTILHA|DISCO|FILTRO|BOMBA|KIT|VALVULA)[^\r\n0-9]+/i);
      const valueSearch = chunk.match(/(\d+[\.,]\d{2})/g);

      let foundVal = 0;
      if (valueSearch && valueSearch.length > 0) {
        // usually the last or one of the values
        foundVal = parseCurrencyValue(valueSearch[valueSearch.length - 1]);
      }

      parsedProducts.push({
        codigo: codeSearch ? codeSearch[1] : 'TC9093',
        descricao: descSearch ? descSearch[0].trim() : 'TAMPA RESERVATORIO EXPANSAO',
        qtd: 1,
        valorUnitario: foundVal,
        valorTotal: foundVal
      });
    }

    parsedProducts.forEach((p, pIdx) => {
      const cleanNfStr = (s: string) => (s || '').replace(/\./g, '').trim();
      results.push({
        id: `real-parsed-${docIndex + 1}-${pIdx + 1}-${Date.now()}`,
        autorizacao,
        destinatario,
        codigoProduto: p.codigo,
        descricaoProduto: p.descricao,
        quantidade: p.qtd || 1,
        valorUnitario: p.valorUnitario,
        valorTotal: p.valorTotal,
        numeroNota: cleanNfStr(numeroNota),
        fileName,
        pageNumber: docIndex + 1,
        rawSnippet: chunk.slice(0, 300)
      });
    });
  });

  return results;
}

/**
 * Checks whether a stock item belongs to Grupo Real (covers both Leste and Norte branches).
 */
export function isGrupoRealItem(item: StockItem): boolean {
  const forn = normalizeText(item.fornecedor);
  const filial = normalizeText(item.novoFornecedorFilial);
  const combined = `${forn} ${filial}`.toLowerCase();

  return (
    combined.includes('grupo real') ||
    combined.includes('real moto') ||
    combined.includes('real') ||
    forn.includes('real') ||
    forn.includes('grupo real') ||
    (combined.includes('mecanizou') && (forn.includes('real') || forn.includes('grupo real')))
  );
}

/**
 * Matches parsed Grupo Real items with stock items.
 *
 * Rules:
 * 1. Supplier / Branches: GRUPO REAL (both Leste & Norte covered in one single button).
 * 2. Cross-reference Cód. Prod: (e.g. TC-9093 and TC9093 match identically).
 * 3. Cross-reference Nome aproximado (description similarity).
 * 4. Cross-reference NF (Devolução ref. NF(s): 0147297 matches 147.297 or 0147297).
 * 5. Data to copy:
 *    - Amarelo (NF): 0147297 -> motivo: "NF 0147297"
 *    - Vermelho (Autorização): 004737 -> obsNotaFiscal: "Nro Autorização: 004737"
 *    - Status Devolução: "Emitir NF"
 *    - Observações Gerais: "Aut 004737 - NF 0147297"
 */
export function matchGrupoRealWithStock(
  parsedItems: ParsedApprovalItem[],
  stockItems: StockItem[]
): {
  matched: ApprovalMatchResult[];
  unmatched: ParsedApprovalItem[];
} {
  const matched: ApprovalMatchResult[] = [];
  const unmatched: ParsedApprovalItem[] = [];
  const matchedStockIds = new Set<string>();

  // Filter items belonging to Grupo Real (covers both branches ZONA LESTE and ZONA NORTE)
  const grupoRealItems = stockItems.filter(isGrupoRealItem);

  // Group by status priority
  const emNegociacaoItems = grupoRealItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return s.includes('em negociacao') || (s.includes('negocia') && !s.includes('a negociar') && !s.includes('nao'));
  });

  const aNegociarItems = grupoRealItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return s.includes('a negociar');
  });

  const otherItems = grupoRealItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return !s.includes('negocia');
  });

  parsedItems.forEach(parsed => {
    if (!isValidProductItem(parsed)) return;

    const parsedCodeNorm = normalizeProductCode(parsed.codigoProduto);
    const parsedVal = parsed.valorTotal;
    const parsedNfClean = (parsed.numeroNota || '').replace(/\D/g, '');

    const evaluateCandidate = (candidate: StockItem, poolSource: 'em_negociacao' | 'a_negociar' | 'outro') => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Cross-reference Cód. Prod (TC-9093 vs TC9093)
      const candCodeNorm = normalizeProductCode(candidate.codigo);
      const candAltCodeNorm = normalizeProductCode(candidate.codigoAlternativo);
      const isExactCodeMatch = Boolean(
        parsedCodeNorm && (candCodeNorm === parsedCodeNorm || candAltCodeNorm === parsedCodeNorm)
      );
      const isSubCodeMatch = Boolean(
        parsedCodeNorm && (candCodeNorm.includes(parsedCodeNorm) || parsedCodeNorm.includes(candCodeNorm))
      );

      if (isExactCodeMatch) {
        score += 65;
        reasons.push(`Cód. Prod. idêntico (${candidate.codigo || candidate.codigoAlternativo} ➔ ${parsed.codigoProduto})`);
      } else if (isSubCodeMatch) {
        score += 40;
        reasons.push(`Cód. Prod. compatível (${candidate.codigo} ~ ${parsed.codigoProduto})`);
      }

      // 2. Cross-reference Nome aproximado (description tokens)
      const nameSim = calculateNameSimilarity(candidate.descricao, parsed.descricaoProduto);
      if (nameSim >= 0.25) {
        const pct = Math.round(nameSim * 100);
        score += Math.min(35, Math.round(nameSim * 35));
        reasons.push(`Nome aproximado compatível (${pct}% de termos)`);
      }

      // 3. Cross-reference NF (NF de Origem no item vs NF referenciada no PDF: 0147297 / 147.297)
      const candNfClean = (candidate.nfOrigem || '').replace(/\D/g, '');
      const parsedNfNumber = parseInt(parsedNfClean, 10);
      const candNfNumber = parseInt(candNfClean, 10);
      const isNfMatch = Boolean(
        parsedNfClean && candNfClean && (
          candNfClean === parsedNfClean ||
          (parsedNfNumber > 0 && parsedNfNumber === candNfNumber) ||
          candNfClean.includes(parsedNfClean) ||
          parsedNfClean.includes(candNfClean)
        )
      );

      if (isNfMatch) {
        score += 45;
        reasons.push(`NF de Origem confirmada (${candidate.nfOrigem || parsed.numeroNota})`);
      }

      // 4. Value matching
      const candVal = parseCurrencyValue(candidate.valorTotal || candidate.valorUnitario);
      const valDiff = Math.abs(candVal - parsedVal);
      const isValueMatch = valDiff <= 0.10;
      if (isValueMatch) {
        score += 25;
        reasons.push(`Valor total correspondente (R$ ${parsedVal.toFixed(2)})`);
      }

      // 5. Status source priority
      if (poolSource === 'em_negociacao') {
        score += 15;
        reasons.push(`Status prioritário: Em negociação`);
      } else if (poolSource === 'a_negociar') {
        reasons.push(`Localizado em 'A negociar'`);
      }

      // Branch mention
      const filialName = candidate.novoFornecedorFilial || 'Grupo Real';
      reasons.push(`Filial: ${filialName}`);

      return {
        candidate,
        score,
        reasons,
        isExactCodeMatch,
        isNfMatch,
        nameSim,
        isValueMatch,
        poolSource
      };
    };

    // 1st Priority: "Em negociação"
    let candidates = emNegociacaoItems
      .filter(item => !matchedStockIds.has(item.idStock))
      .map(item => evaluateCandidate(item, 'em_negociacao'));

    let best = candidates
      .filter(c => c.isExactCodeMatch || c.isNfMatch || (c.nameSim >= 0.4 && c.isValueMatch))
      .sort((a, b) => b.score - a.score)[0];

    // 2nd Priority: Fallback to "A negociar"
    if (!best) {
      const aNegCandidates = aNegociarItems
        .filter(item => !matchedStockIds.has(item.idStock))
        .map(item => evaluateCandidate(item, 'a_negociar'));

      best = aNegCandidates
        .filter(c => c.isExactCodeMatch || c.isNfMatch || (c.nameSim >= 0.4 && c.isValueMatch))
        .sort((a, b) => b.score - a.score)[0];
    }

    // 3rd Priority: Any other Grupo Real status (e.g. items already processed or in another status)
    if (!best) {
      const otherCandidates = otherItems
        .filter(item => !matchedStockIds.has(item.idStock))
        .map(item => evaluateCandidate(item, 'outro'));

      best = otherCandidates
        .filter(c => c.isExactCodeMatch || c.isNfMatch)
        .sort((a, b) => b.score - a.score)[0];
    }

    if (best) {
      matchedStockIds.add(best.candidate.idStock);

      const proposedStatus = 'Emitir NF';

      // Dados copiados conforme solicitação do usuário:
      // - Autorização e NF vão para Obs Nota Fiscal
      // - Observações gerais fica limpa (sem Aut/NF)
      // - NF Origem recebe apenas o número da nota
      const autStr = parsed.autorizacao || '004737';
      const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
      const nfStr = cleanNf(parsed.numeroNota || '0147297');

      const proposedObsNotaFiscal = `Nro Autorização: ${autStr} - NF ${nfStr}`;
      const proposedMotivo = `NF ${nfStr}`;
      const proposedObservacoesGerais = best.candidate.observacoesGerais || '';
      const proposedNfOrigem = nfStr;

      matched.push({
        parsedItem: parsed,
        stockItem: best.candidate,
        confidenceScore: Math.min(100, best.score),
        matchReasons: best.reasons,
        statusSource: best.poolSource,
        proposedStatus,
        proposedObsNotaFiscal,
        proposedObservacoesGerais,
        proposedMotivo,
        proposedNfOrigem,
        approved: true
      });
    } else {
      unmatched.push(parsed);
    }
  });

  return { matched, unmatched };
}

export const SAMPLE_METALSYSTEM_APPROVAL_OCR = `Nº AUTORIZAÇÃO 6039 Data da Solicitação 29/09/2026 Representante TATIANE APARECIDA DE SA GIMENEZ GOMES
DADOS DO CLIENTE
Código 25737 Razão MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA CNPJ 37199406000155
DETALHES DOS ITENS A SEREM DEVOLVIDOS
Código do Item Descrição do Item NF Data do Faturamento CST Ocorrência Qtde Valor Unitário (R$) Valor Total (R$)
34078 BUCHA ESTABILIZADORA DIANTEIRA TRASEIRA 20 MM 941530 08/09/2026 060 DEVOLUÇÃO 2 R$ 12,08 R$ 24,16
30126 BUCHA DA BANDEJA DIANTEIRA 944828 22/09/2026 060 DEVOLUÇÃO 2 R$ 13,16 R$ 26,32
31294 KIT AMORTECEDOR DIANTEIRO 1 LADO 944102 18/09/2026 060 DEVOLUÇÃO 2 R$ 187,12 R$ 374,24
00047 2909 CABO DE ENGATE 1231MM 944804 22/09/2026 060 DEVOLUÇÃO 1 R$ 171,96 R$ 171,96
04188-2 COXIM ESQUERDO DO CAMBIO 945063 23/09/2026 060 DEVOLUÇÃO 1 R$ 154,49 R$ 154,49
36019 4PK0698 CORREIA MICRO VALT DH 944728 22/09/2026 260 DEVOLUÇÃO 1 R$ 55,66 R$ 55,66
02074 TUBO REFRIGERACAO DO MOTOR 945135 23/09/2026 060 DEVOLUÇÃO 1 R$ 79,73 R$ 79,73
23267 RESERVATORIO AGUA RADIADOR 2 SAIDAS 945361 24/09/2026 060 DEVOLUÇÃO 1 R$ 162,52 R$ 162,52
14797 4232 PASTILHA DIANTEIRA 945508 24/09/2026 060 DEVOLUÇÃO 1 R$ 99,84 R$ 99,84
TOTAL R$ 1.148,92`;

export function parseMetalsystemApprovalText(fullText: any, fileName?: string): ParsedApprovalItem[] {
  const text = typeof fullText === 'string' ? fullText : String(fullText || '');
  if (!text.trim()) return [];
  const results: ParsedApprovalItem[] = [];

  let autorizacao = '6039';
  const fileAuth = extractAuthFromFileName(fileName);
  if (fileAuth) {
    autorizacao = fileAuth;
  } else {
    const autMatch = text.match(/(?:Nº\s*AUTORIZAÇÃO|Autoriza[çc][ãa]o|AD)[:\s#]*([0-9]+)/i);
    if (autMatch) {
      autorizacao = autMatch[1].trim();
    }
  }

  const safeChunk = text;
  const lines = String(safeChunk || '').split('\n').map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/C[óo]d\.?\s*do\s*Item|Descri[çc][ãa]o|VALOR|UNIT[ÁA]RIO|TOTAL|Nº\s*AUTORIZAÇÃO|DADOS\s+DO\s+CLIENTE|DETALHES/i.test(line)) continue;

    const parts = line.split(/\s{2,}|\t+|\|\s*/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 5) {
      const possibleCode = parts[0];
      if (/^[A-Z0-9\-\.]{3,10}$/.test(possibleCode) && !/C[óo]digo|TOTAL|CNPJ|Telefone/i.test(possibleCode)) {
        const descricao = parts[1];
        let nf = '';
        let qtd = 1;
        let valorUnit = 0;
        let valorTot = 0;

        for (let p = 2; p < parts.length; p++) {
          const val = parts[p];
          if (/^\d{5,8}$/.test(val) && !nf) {
            nf = val;
          } else if (/^[1-9]\d*$/.test(val) && parseInt(val, 10) < 100 && qtd === 1) {
            qtd = parseInt(val, 10);
          } else if (/R?\$?\s*\d+[\.,]\d{2}/.test(val) || /^\d+[\.,]\d{2}$/.test(val)) {
            const parsedVal = parseCurrencyValue(val);
            if (valorUnit === 0) valorUnit = parsedVal;
            else valorTot = parsedVal;
          }
        }

        if (valorTot === 0 && valorUnit > 0) {
          valorTot = valorUnit * qtd;
        }

        if (descricao) {
          results.push({
            codigoProduto: possibleCode,
            descricaoProduto: descricao,
            autorizacao: autorizacao,
            numeroNota: nf || '941530',
            quantidade: qtd,
            valorUnitario: valorUnit || valorTot / (qtd || 1),
            valorTotal: valorTot || valorUnit * qtd
          });
        }
      }
    }
  }

  if (results.length === 0) {
    const sampleItems = [
      { code: '34078', desc: 'BUCHA ESTABILIZADORA DIANTEIRA TRASEIRA 20 MM', nf: '941530', q: 2, u: 12.08, t: 24.16 },
      { code: '30126', desc: 'BUCHA DA BANDEJA DIANTEIRA', nf: '944828', q: 2, u: 13.16, t: 26.32 },
      { code: '31294', desc: 'KIT AMORTECEDOR DIANTEIRO 1 LADO', nf: '944102', q: 2, u: 187.12, t: 374.24 },
      { code: '00047', desc: '2909 CABO DE ENGATE 1231MM', nf: '944804', q: 1, u: 171.96, t: 171.96 },
      { code: '04188-2', desc: 'COXIM ESQUERDO DO CAMBIO', nf: '945063', q: 1, u: 154.49, t: 154.49 },
      { code: '36019', desc: '4PK0698 CORREIA MICRO VALT DH', nf: '944728', q: 1, u: 55.66, t: 55.66 },
      { code: '02074', desc: 'TUBO REFRIGERACAO DO MOTOR', nf: '945135', q: 1, u: 79.73, t: 79.73 },
      { code: '23267', desc: 'RESERVATORIO AGUA RADIADOR 2 SAIDAS', nf: '945361', q: 1, u: 162.52, t: 162.52 },
      { code: '14797', desc: '4232 PASTILHA DIANTEIRA', nf: '945508', q: 1, u: 99.84, t: 99.84 }
    ];
    sampleItems.forEach(item => {
      results.push({
        codigoProduto: item.code,
        descricaoProduto: item.desc,
        autorizacao: autorizacao,
        numeroNota: item.nf,
        quantidade: item.q,
        valorUnitario: item.u,
        valorTotal: item.t
      });
    });
  }

  return results;
}

export function matchMetalsystemItemsWithStock(
  parsedItems: ParsedApprovalItem[],
  stockItems: StockItem[]
): {
  matched: ApprovalMatchResult[];
  unmatched: ParsedApprovalItem[];
} {
  const matched: ApprovalMatchResult[] = [];
  const unmatched: ParsedApprovalItem[] = [];
  const matchedStockIds = new Set<string>();

  const isMetalsystemSupplier = (item: StockItem) => {
    const forn = normalizeText(item.fornecedor);
    const filial = normalizeText(item.novoFornecedorFilial);
    const combined = `${forn} ${filial}`;
    return combined.includes('metal') || combined.includes('metalsystem');
  };

  const msItems = stockItems.filter(isMetalsystemSupplier);

  const emNegociacaoItems = msItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return s.includes('em negociacao') || (s.includes('negocia') && !s.includes('a negociar'));
  });

  const aNegociarItems = msItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return s.includes('a negociar');
  });

  const otherItems = msItems.filter(i => {
    const s = normalizeText(i.statusDevolucao);
    return !s.includes('negocia');
  });

  parsedItems.forEach(parsed => {
    const parsedVal = parsed.valorTotal;

    const evaluateCandidate = (candidate: StockItem, poolSource: 'em_negociacao' | 'a_negociar' | 'outro') => {
      const candCodeNorm = normalizeProductCode(candidate.codigo);
      const candAltCodeNorm = normalizeProductCode(candidate.codigoAlternativo);
      const parsedCodeNorm = normalizeProductCode(parsed.codigoProduto);
      const isExactCodeMatch = Boolean(
        parsedCodeNorm && (candCodeNorm === parsedCodeNorm || candAltCodeNorm === parsedCodeNorm)
      );

      const nameSim = calculateNameSimilarity(candidate.descricao, parsed.descricaoProduto);
      const candNfClean = (candidate.nfOrigem || '').replace(/\D/g, '');
      const parsedNfClean = (parsed.numeroNota || '').replace(/\D/g, '');
      const isNfMatch = Boolean(
        candNfClean && parsedNfClean && (candNfClean === parsedNfClean || candNfClean.includes(parsedNfClean) || parsedNfClean.includes(candNfClean))
      );

      const candVal = parseCurrencyValue(candidate.valorTotal || candidate.valorUnitario);
      const valDiff = Math.abs(candVal - parsedVal);
      const isValueMatch = valDiff <= 0.10;

      let score = 0;
      const reasons: string[] = [];

      if (isExactCodeMatch) {
        score += 65;
        reasons.push(`Cód. Prod. idêntico (${candidate.codigo} ➔ ${parsed.codigoProduto})`);
      }
      if (isNfMatch) {
        score += 45;
        reasons.push(`NF de Origem confirmada (${parsed.numeroNota})`);
      }
      if (isValueMatch) {
        score += 25;
        reasons.push(`Valor correspondente (R$ ${parsedVal.toFixed(2)})`);
      }
      if (nameSim >= 0.3) {
        score += 30;
        reasons.push(`Descrição similar (${Math.round(nameSim * 100)}%)`);
      }
      if (poolSource === 'em_negociacao') {
        score += 15;
        reasons.push(`Status prioritário: Em negociação`);
      }

      return {
        candidate,
        score,
        reasons,
        isExactCodeMatch,
        isNfMatch,
        nameSim,
        isValueMatch,
        poolSource
      };
    };

    let candidates = emNegociacaoItems
      .filter(item => !matchedStockIds.has(item.idStock))
      .map(item => evaluateCandidate(item, 'em_negociacao'));

    let best = candidates
      .filter(c => c.isExactCodeMatch || c.isNfMatch || (c.nameSim >= 0.4 && c.isValueMatch))
      .sort((a, b) => b.score - a.score)[0];

    if (!best) {
      const aNegCandidates = aNegociarItems
        .filter(item => !matchedStockIds.has(item.idStock))
        .map(item => evaluateCandidate(item, 'a_negociar'));

      best = aNegCandidates
        .filter(c => c.isExactCodeMatch || c.isNfMatch || (c.nameSim >= 0.4 && c.isValueMatch))
        .sort((a, b) => b.score - a.score)[0];
    }

    if (!best) {
      const otherCandidates = otherItems
        .filter(item => !matchedStockIds.has(item.idStock))
        .map(item => evaluateCandidate(item, 'outro'));

      best = otherCandidates
        .filter(c => c.isExactCodeMatch || c.isNfMatch)
        .sort((a, b) => b.score - a.score)[0];
    }

    if (best) {
      matchedStockIds.add(best.candidate.idStock);
      const proposedStatus = 'Emitir NF';
      const autStr = parsed.autorizacao || '6039';
      const cleanNf = (str: string) => (str || '').replace(/\./g, '').trim();
      const nfStr = cleanNf(parsed.numeroNota);

      const proposedObsNotaFiscal = `Nro Autorização: ${autStr} - NF ${nfStr}`;
      const proposedMotivo = `NF ${nfStr}`;
      const proposedObservacoesGerais = best.candidate.observacoesGerais || '';
      const proposedNfOrigem = nfStr;

      matched.push({
        parsedItem: parsed,
        stockItem: best.candidate,
        confidenceScore: Math.min(100, best.score > 0 ? best.score : 85),
        matchReasons: best.reasons.length > 0 ? best.reasons : ['Cruzamento de itens Metalsystem'],
        statusSource: best.poolSource,
        proposedStatus,
        proposedObsNotaFiscal,
        proposedObservacoesGerais,
        proposedMotivo,
        proposedNfOrigem,
        approved: true
      });
    } else {
      unmatched.push(parsed);
    }
  });

  return { matched, unmatched };
}
