import Papa from 'papaparse';
import { StockItem } from '../types';
import { isItemUrgent, canonicalizeWarrantyStatus } from './statusUtils';

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M/gviz/tq?tqx=out:csv&gid=1870385864";

export function getGoogleSheetCsvUrl(url?: string): string {
  if (!url || !url.trim()) return DEFAULT_SHEET_URL;
  const cleanUrl = url.trim();
  if (cleanUrl.includes('/gviz/tq?tqx=out:csv')) return cleanUrl;
  
  const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return DEFAULT_SHEET_URL;
  
  const sheetId = match[1];
  const gidMatch = cleanUrl.match(/[?&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '1870385864';
  
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

export interface ClientSheetFetchResult {
  data: StockItem[];
  totalRows: number;
  availableLocalidades: string[];
  source: 'google_sheets';
}

function normalizeHeaderName(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function buildHeaderColumnMap(headers: string[]) {
  const findCol = (...names: string[]): number => {
    // 1st PASS: Exact match
    for (const name of names) {
      const cleanN = normalizeHeaderName(name);
      const idx = headers.findIndex(h => normalizeHeaderName(h) === cleanN);
      if (idx !== -1) return idx;
    }
    // 2nd PASS: Column header contains target name
    for (const name of names) {
      const cleanN = normalizeHeaderName(name);
      const idx = headers.findIndex(h => {
        const cleanH = normalizeHeaderName(h);
        return cleanH.length >= 3 && cleanH.includes(cleanN);
      });
      if (idx !== -1) return idx;
    }
    // 3rd PASS: Target name contains column header
    for (const name of names) {
      const cleanN = normalizeHeaderName(name);
      const idx = headers.findIndex(h => {
        const cleanH = normalizeHeaderName(h);
        return cleanH.length >= 5 && cleanN.includes(cleanH);
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    protocolo: findCol("Protocolo", "PROTOCOLO", "Num Protocolo", "Número Protocolo", "Nº Protocolo", "Prot", "COD PROTOCOLO"),
    idStock: findCol("ID STOCK", "ID_STOCK", "IDSTOCK", "STOCK", "ID"),
    cliente: findCol("Cliente", "CLIENTE", "Nome Cliente", "Razão Social", "Oficina", "Mecanica", "Mecânica"),
    descricao: findCol("Descrição", "DESCRICAO", "Descrição do Item", "Nome da Peça", "Item", "Desc", "Produto"),
    codigo: findCol("Código", "CODIGO", "Código da Peça", "Cod", "Ref", "Codigo Fabrica"),
    marca: findCol("Marca", "MARCA", "Fabricante"),
    quantEstoque: findCol("Quant. em Estoque", "Quant em Estoque", "Quantidade em Estoque", "Quant", "Estoque", "Qtd"),
    fornecedor: findCol("Fornecedor", "FORNECEDOR", "Forn"),
    novoFornecedorFilial: findCol("Novo Fornecedor/Filial", "Novo Fornecedor", "Filial", "Novo Fornecedor / Filial"),
    fornecedorOriginal: findCol("Fornecedor Original", "FORNECEDOR ORIGINAL", "Forn Original", "Fornecedor_Original", "Fornecedor Original do Item"),
    statusDevolucao: findCol(
      "Status Devolução", 
      "Status Devolucao", 
      "Status_Devolucao", 
      "Status da Devolução", 
      "Status de Devolução", 
      "Status Devolucao Peça", 
      "Status Devolucao Item", 
      "Status Garantia", 
      "Status Processo", 
      "Status"
    ),
    obsStatusDevolucao: findCol(
      "Observação do status de devolução", 
      "Observação do status de devolucao",
      "Observacao do status de devolucao", 
      "Observação do Status de Devolução",
      "Observação status devolução",
      "Observação do status",
      "Obs Status Devolução", 
      "Obs Status Devolucao", 
      "Obs do status de devolução",
      "Obs do status",
      "Obs Status"
    ),
    obsNotaFiscal: findCol("Obs Nota Fiscal", "Obs NF", "Observação Nota Fiscal", "Observação NF", "Nota Fiscal", "Obs_NF"),
    observacoesGerais: findCol("Observações gerais do item", "Observações Gerais", "Obs Gerais", "Observação", "Obs", "Motivo", "Observacoes"),
    localidade: findCol("Localidade", "LOCALIDADE", "Localizacao", "Localização", "Local"),
    dataRecebimento: findCol("Data_Recebimento", "Data Recebimento", "DataRecebimento", "Data de Recebimento", "Data Rec", "Recebimento"),
    dataSaida: findCol("Data_saida", "Data Saida", "Data_Saida", "Data de Saida", "Data Env", "Data Envio", "Envio"),
    dataIncidencia: findCol("Data de incidência", "Data de Incidencia", "Data de incidencia", "Data Incidencia", "Data_Incidencia", "Incidência", "Incidencia"),
    notaFiscalSaida: findCol("Nota Fiscal de Saída", "Nota Fiscal de Saida", "Nota fiscal de saída", "NF de Saída", "NF de Saida", "NF Saida", "NF_Saida", "Nota Fiscal Saida"),
    dataUltimaAlteracao: findCol("Data Última Alteração", "Data Ultima Alteração", "Data Ultima Alteracao", "Data_Ultima_Alteracao", "Data Alteracao", "Ultima Alteracao", "Data Modificacao", "Data Modificação"),
    ultimaInteracao: findCol("Última Interação", "Ultima Interacao", "Última Interaçao", "UltimaInteracao", "Última Alteração/Interação", "Ultima alteração", "Ultima Interação"),
    valorUnitario: findCol("Valor Unitário", "Valor Unitario", "Valor_Unitario", "Valor Unit", "Preço Unitário", "Preço Unitario", "Val Unit"),
    valorTotal: findCol("Valor total em estoque", "Valor Total em Estoque", "Valor Total", "Valor_Total", "Total em Estoque", "Valor Total Estoque", "Total"),
    dataCompra: findCol("Data compra", "Data Compra", "Data_Compra", "Data da Compra", "Data de Compra", "Data_compra", "Data Nota"),
    nfOrigem: findCol("NF Origem", "NF_Origem", "Nota Fiscal Origem", "NF Entrada", "Nota Fiscal de Origem", "NF_Entrada", "NF Compra"),
    dataSolicitacao: findCol("Data Solicitação", "Data Solicitacao", "Data_Solicitacao", "Data Solicitacao Devolucao"),
    embalagem: findCol("Embalagem", "EMBALAGEM", "Estado da Embalagem", "Emb", "Embalagem Peça"),
    condicaoPeca: findCol("Condição da peça", "Condição da Peca", "Condicao da peca", "Condicao da Peca", "CONDIÇÃO DA PEÇA", "CONDICAO DA PECA", "Condição da Peça", "Condição Peça", "Condicao Peca", "Condição", "Condicao", "Condição do Item"),
    enderecamento: findCol("Endereçamento", "Enderecamento", "Endereço", "Endereco", "Endereçamento/Local", "Enderecamento/Local", "End", "Ender", "Posição", "Posicao", "Localização Estoque", "Loc Estoque"),
    urgenteCol: findCol("Urgente", "URGENTE", "Prioridade", "Urgência")
  };
}

export async function fetchSheetDirectlyFromClient(sheetUrl?: string): Promise<ClientSheetFetchResult> {
  const csvUrl = getGoogleSheetCsvUrl(sheetUrl);
  
  const response = await fetch(csvUrl, {
    method: 'GET',
    headers: { 'Accept': 'text/csv,text/plain,*/*' }
  });

  if (!response.ok) {
    throw new Error(`Client CSV fetch failed with status ${response.status}`);
  }

  const csvText = await response.text();
  if (!csvText || !csvText.trim()) {
    throw new Error('Retrieved CSV content is empty.');
  }

  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: 'greedy'
  });

  const rawLines = parsed.data || [];
  if (rawLines.length === 0) {
    throw new Error('Parsed CSV contains no rows.');
  }

  // Detect header row index
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawLines.length, 50); i++) {
    const lineJoined = rawLines[i].join(" ").toLowerCase();
    if (
      lineJoined.includes("status") ||
      lineJoined.includes("localidade") ||
      lineJoined.includes("id stock") ||
      lineJoined.includes("descricao") ||
      lineJoined.includes("descrição") ||
      lineJoined.includes("codigo") ||
      lineJoined.includes("código") ||
      lineJoined.includes("cliente") ||
      lineJoined.includes("fornecedor") ||
      lineJoined.includes("protocolo")
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawLines[headerRowIndex] || [];
  const colMap = buildHeaderColumnMap(headerRow);

  const getCellVal = (row: string[], colIdx: number): string => {
    if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null) {
      return String(row[colIdx]).trim();
    }
    return '';
  };

  const parsedItems: StockItem[] = [];
  const localidadesSet = new Set<string>();

  for (let idx = headerRowIndex + 1; idx < rawLines.length; idx++) {
    const row = rawLines[idx];
    if (!row || row.length === 0) continue;

    const idStock = getCellVal(row, colMap.idStock);
    const cliente = getCellVal(row, colMap.cliente);
    const descricao = getCellVal(row, colMap.descricao);
    const codigo = getCellVal(row, colMap.codigo);
    const statusDevolucao = getCellVal(row, colMap.statusDevolucao);
    const localidade = getCellVal(row, colMap.localidade);
    const fornecedor = getCellVal(row, colMap.fornecedor);

    // Skip empty rows
    if (!idStock && !cliente && !descricao && !codigo && !statusDevolucao && !fornecedor && !localidade) {
      continue;
    }

    if (localidade && localidade.trim()) {
      localidadesSet.add(localidade.trim());
    }

    const urgStr = getCellVal(row, colMap.urgenteCol);
    const item: StockItem = {
      protocolo: getCellVal(row, colMap.protocolo),
      idStock: idStock,
      cliente: cliente,
      descricao: descricao,
      codigo: codigo,
      marca: getCellVal(row, colMap.marca),
      quantEstoque: getCellVal(row, colMap.quantEstoque),
      fornecedor: fornecedor,
      novoFornecedorFilial: getCellVal(row, colMap.novoFornecedorFilial),
      fornecedorOriginal: getCellVal(row, colMap.fornecedorOriginal),
      statusDevolucao: canonicalizeWarrantyStatus(statusDevolucao),
      obsStatusDevolucao: getCellVal(row, colMap.obsStatusDevolucao),
      obsNotaFiscal: getCellVal(row, colMap.obsNotaFiscal),
      observacoesGerais: getCellVal(row, colMap.observacoesGerais),
      localidade: localidade,
      dataRecebimento: getCellVal(row, colMap.dataRecebimento),
      dataSaida: getCellVal(row, colMap.dataSaida),
      dataIncidencia: getCellVal(row, colMap.dataIncidencia),
      notaFiscalSaida: getCellVal(row, colMap.notaFiscalSaida),
      dataUltimaAlteracao: getCellVal(row, colMap.dataUltimaAlteracao),
      ultimaInteracao: getCellVal(row, colMap.ultimaInteracao),
      valorUnitario: getCellVal(row, colMap.valorUnitario),
      valorTotal: getCellVal(row, colMap.valorTotal),
      dataCompra: getCellVal(row, colMap.dataCompra),
      nfOrigem: getCellVal(row, colMap.nfOrigem),
      dataSolicitacao: getCellVal(row, colMap.dataSolicitacao),
      embalagem: getCellVal(row, colMap.embalagem),
      condicaoPeca: getCellVal(row, colMap.condicaoPeca),
      enderecamento: getCellVal(row, colMap.enderecamento),
      urgente: Boolean(
        urgStr.toLowerCase().includes("sim") ||
        urgStr.toLowerCase().includes("urg") ||
        statusDevolucao.toLowerCase().includes("urgente")
      ),
      sheetRowNumber: headerRowIndex + 2 + (parsedItems.length)
    };

    item.urgente = item.urgente || isItemUrgent(item);
    parsedItems.push(item);
  }

  // Ensure default localities are included in list
  [
    "Mecanizou",
    "Mecanizou - Descarte",
    "Mecanizou - Recebimento",
    "Mecanizou - Expresso",
    "Mecanizou - Validação",
    "Mecanizou - BH",
    "Futura-Revenda"
  ].forEach(l => localidadesSet.add(l));

  return {
    data: parsedItems,
    totalRows: parsedItems.length,
    availableLocalidades: Array.from(localidadesSet).sort(),
    source: 'google_sheets'
  };
}
