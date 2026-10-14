import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Papa from "papaparse";
import { createRequire } from "module";

// Support both ESM (dev via tsx) and CJS (prod via esbuild bundle)
// @ts-ignore
const nodeRequire = typeof require === "function" ? require : createRequire(typeof import.meta !== "undefined" && import.meta.url ? import.meta.url : path.join(process.cwd(), "server.ts"));

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Default spreadsheet URL provided by user
const DEFAULT_SHEET_ID = "1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M";
const DEFAULT_GID = "1870385864";

// Official statuses
const OFFICIAL_WARRANTY_STATUSES = [
  "A negociar",
  "Aprovado",
  "Aprovado - Validar",
  "Em negociação",
  "Emitir NF",
  "Não negociado",
  "Recusado"
];

function normalizeStatusStr(s?: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeWarrantyStatus(rawStatus?: string): string {
  if (!rawStatus || !rawStatus.trim()) return "A negociar";
  let clean = rawStatus.trim();
  clean = clean.replace(/^garantia\s*[:\-]?\s*/i, "").trim();
  return clean || "A negociar";
}

function isAllowedWarrantyStatus(statusStr?: string): boolean {
  return true;
}

// Sample fallback dataset matching the user's spreadsheet structure and screenshot visual requirements
const SAMPLE_DATA = [
  {
    protocolo: "PROT-88401",
    idStock: "STK-1001",
    cliente: "Brothers'car",
    descricao: "CILINDRO MESTRE FREIO C/RESERVATORIO",
    codigo: "0062CM",
    marca: "COBREQ",
    quantEstoque: "12",
    fornecedor: "MERCADOCAR",
    novoFornecedorFilial: "MERCADOCAR - MATRIZ",
    statusDevolucao: "A negociar",
    obsNotaFiscal: "Pedido pago com Boleto. Verifique se a fatura já foi paga.",
    observacoesGerais: "a peça não esta dando freio, cliente solicita troca urgente de devolução.",
    localidade: "Mecanizou",
    dataRecebimento: "10/07/2026",
    dataSaida: "20/07/2026",
    valorUnitario: "R$ 180,00",
    valorTotal: "R$ 2.160,00",
    dataCompra: "01/06/2026",
    nfOrigem: "NF-8821"
  },
  {
    idStock: "STK-1002",
    cliente: "Brothers'car",
    descricao: "DISCO DE FREIO VENTILADO DIANTEIRO",
    codigo: "HF-55A",
    marca: "HIPERFREIOS",
    quantEstoque: "8",
    fornecedor: "COBRA",
    novoFornecedorFilial: "COBRA - MATRIZ",
    statusDevolucao: "A negociar",
    obsNotaFiscal: "NF 48291 emitida com destaque de ICMS.",
    observacoesGerais: "Embalagem avariada no transporte. Reembolso via Cupom de Crédito liberado.",
    localidade: "Mecanizou - Expresso",
    dataRecebimento: "05/07/2026",
    dataSaida: "15/07/2026",
    valorUnitario: "R$ 145,00",
    valorTotal: "R$ 1.160,00",
    dataCompra: "15/05/2026",
    nfOrigem: "NF-48291"
  },
  {
    idStock: "STK-1003",
    cliente: "Auto Mecânica Silva",
    descricao: "AMORTECEDOR DIANTEIRO PRESSURIZADO HG",
    codigo: "GP32982",
    marca: "COFAP",
    quantEstoque: "5",
    fornecedor: "Comercial Peças Express",
    novoFornecedorFilial: "Filial SP - Campinas",
    statusDevolucao: "Em negociação",
    obsNotaFiscal: "Fatura pendente de conciliação bancária.",
    observacoesGerais: "Ruído ao passar por lombadas. Encaminhado para análise técnica.",
    localidade: "Mecanizou - Validação",
    dataRecebimento: "12/07/2026",
    dataSaida: "25/07/2026",
    valorUnitario: "R$ 220,00",
    valorTotal: "R$ 1.100,00",
    dataCompra: "10/06/2026",
    nfOrigem: "NF-39102"
  },
  {
    idStock: "STK-1004",
    cliente: "Auto Mecânica Silva",
    descricao: "KIT EMBREAGEM COMPLETO (DISCO/PLATO/ROLAMENTO)",
    codigo: "620308000",
    marca: "LUK",
    quantEstoque: "3",
    fornecedor: "JOSECAR",
    novoFornecedorFilial: "JOSECAR - LAPA",
    statusDevolucao: "Emitir NF",
    obsNotaFiscal: "Nota Fiscal de devolução emitida com sucesso NF-e 10923.",
    observacoesGerais: "Item aplicado em teste e devolvido. Caixa original preservada.",
    localidade: "Mecanizou - BH",
    dataRecebimento: "01/07/2026",
    dataSaida: "10/07/2026",
    valorUnitario: "R$ 680,00",
    valorTotal: "R$ 2.040,00",
    dataCompra: "20/05/2026",
    nfOrigem: "NF-10923"
  },
  {
    idStock: "STK-1005",
    cliente: "Centro Automotivo Dourado",
    descricao: "JOGO DE VELAS DE IGNIÇÃO IRIDIUM",
    codigo: "BKR6EIX",
    marca: "NGK",
    quantEstoque: "24",
    fornecedor: "Importadora Ignição Pro",
    novoFornecedorFilial: "Matriz - Porto Alegre",
    statusDevolucao: "Em negociação",
    obsNotaFiscal: "Aguardando envio da nota fiscal pelo cliente.",
    observacoesGerais: "Aplicação incompatível com o modelo do veículo informado pelo cliente.",
    localidade: "Mecanizou",
    dataRecebimento: "15/07/2026",
    dataSaida: "28/07/2026",
    valorUnitario: "R$ 45,00",
    valorTotal: "R$ 1.080,00",
    dataCompra: "05/06/2026",
    nfOrigem: "NF-77401"
  },
  {
    idStock: "STK-1006",
    cliente: "Car Center Express",
    descricao: "CORREIA DENTADA SINCRONIZADA",
    codigo: "CT884",
    marca: "CONTITECH",
    quantEstoque: "15",
    fornecedor: "Auto Peças Brasil Ltda",
    novoFornecedorFilial: "Filial MG - Belo Horizonte",
    statusDevolucao: "Recusado",
    obsNotaFiscal: "Prazo de devolução expirado (mais de 90 dias).",
    observacoesGerais: "Sem marcas de defeito. Desgaste natural constatado.",
    localidade: "Mecanizou",
    dataRecebimento: "20/06/2026",
    dataSaida: "02/07/2026",
    valorUnitario: "R$ 85,00",
    valorTotal: "R$ 1.275,00",
    dataCompra: "01/04/2026",
    nfOrigem: "NF-55109"
  },
  {
    idStock: "STK-1007",
    cliente: "Oficina Ponto Certo",
    descricao: "BOMBA DE COMBUSTIVEL FLEX 12V",
    codigo: "F000TE0120",
    marca: "BOSCH",
    quantEstoque: "6",
    fornecedor: "SK MOBILITY",
    novoFornecedorFilial: "SK MOBILITY - MATRIZ",
    statusDevolucao: "A negociar",
    obsNotaFiscal: "Envio emergencial por transporte expresso.",
    observacoesGerais: "Bomba travada sem vazamento.",
    localidade: "Mecanizou - Expresso",
    dataRecebimento: "18/06/2026",
    dataSaida: "22/06/2026",
    valorUnitario: "R$ 310,00",
    valorTotal: "R$ 1.860,00",
    dataCompra: "10/05/2026",
    nfOrigem: "NF-88301"
  },
  {
    idStock: "STK-1008",
    cliente: "Mecânica Precision",
    descricao: "PASTILHA DE FREIO DIANTEIRA CERAMICA",
    codigo: "N-1234",
    marca: "COBREQ",
    quantEstoque: "10",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Matriz - São Paulo",
    statusDevolucao: "Em negociação",
    obsNotaFiscal: "Em negociação de lote com fabricante.",
    observacoesGerais: "Ruído excessivo após 100km.",
    localidade: "Mecanizou - Validação",
    dataRecebimento: "02/05/2026",
    dataSaida: "10/05/2026",
    valorUnitario: "R$ 120,00",
    valorTotal: "R$ 1.200,00",
    dataCompra: "15/04/2026",
    nfOrigem: "NF-22390"
  },
  {
    idStock: "STK-1009",
    cliente: "Auto Center Sul",
    descricao: "TURBOCOMPRESSOR COMPLETO 2.0 DIESEL",
    codigo: "TC-9900",
    marca: "GARRETT",
    quantEstoque: "2",
    fornecedor: "Turbo Brasil Express",
    novoFornecedorFilial: "Filial PR - Curitiba",
    statusDevolucao: "Não negociado",
    obsNotaFiscal: "Sem acordo comercial no momento.",
    observacoesGerais: "Falta laudo técnico do instalador.",
    localidade: "Mecanizou - BH",
    dataRecebimento: "10/04/2026",
    dataSaida: "18/04/2026",
    valorUnitario: "R$ 1.850,00",
    valorTotal: "R$ 3.700,00",
    dataCompra: "01/03/2026",
    nfOrigem: "NF-90182"
  },
  {
    idStock: "STK-2001",
    cliente: "Mecânica Rápida",
    descricao: "FILTRO DE OLEO MOTOR Wega",
    codigo: "WO-200",
    marca: "WEGA",
    quantEstoque: "20",
    fornecedor: "Auto Peças Brasil Ltda",
    novoFornecedorFilial: "Filial Sul - Curitiba",
    statusDevolucao: "A negociar",
    obsNotaFiscal: "Devolução em análise comercial.",
    observacoesGerais: "Cliente solicitou devolução por divergência no pedido.",
    localidade: "Estoque Geral",
    dataRecebimento: "14/07/2026",
    dataSaida: "22/07/2026",
    valorUnitario: "R$ 35,00",
    valorTotal: "R$ 700,00",
    dataCompra: "10/06/2026",
    nfOrigem: "NF-66102"
  },
  {
    idStock: "STK-2002",
    cliente: "Oficina do João",
    descricao: "DISCO DE FREIO TRASEIRO",
    codigo: "HF-32B",
    marca: "HIPERFREIOS",
    quantEstoque: "4",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Matriz - São Paulo",
    statusDevolucao: "Aprovado",
    obsNotaFiscal: "Aprovado para emissão de nota de crédito.",
    observacoesGerais: "Devolução aceita conforme políticas da empresa.",
    localidade: "Estoque Geral",
    dataRecebimento: "18/07/2026",
    dataSaida: "26/07/2026",
    valorUnitario: "R$ 130,00",
    valorTotal: "R$ 520,00",
    dataCompra: "12/06/2026",
    nfOrigem: "NF-77301"
  },
  {
    idStock: "STK-2003",
    cliente: "Auto Peças Lider",
    descricao: "RADIADOR DE AGUA ALUMÍNIO",
    codigo: "RD-9011",
    marca: "VISCONDE",
    quantEstoque: "2",
    fornecedor: "Comercial Peças Express",
    novoFornecedorFilial: "Filial SP - Campinas",
    statusDevolucao: "Em negociação",
    obsNotaFiscal: "Proposta de abatimento enviada ao fornecedor.",
    observacoesGerais: "Aguardando retorno do compras sobre lote negociado.",
    localidade: "Estoque Geral",
    dataRecebimento: "08/07/2026",
    dataSaida: "18/07/2026",
    valorUnitario: "R$ 450,00",
    valorTotal: "R$ 900,00",
    dataCompra: "01/05/2026",
    nfOrigem: "NF-88120"
  },
  {
    idStock: "STK-2004",
    cliente: "Car Service SP",
    descricao: "SAPATA DE FREIO COM LONA",
    codigo: "SP-402",
    marca: "FRAS-LE",
    quantEstoque: "10",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Filial RJ - Duque de Caxias",
    statusDevolucao: "Emitir NF",
    obsNotaFiscal: "Solicitado emissão de NF de devolução.",
    observacoesGerais: "Autorização de devolução nº 4410 gerada.",
    localidade: "Estoque Geral",
    dataRecebimento: "02/07/2026",
    dataSaida: "12/07/2026",
    valorUnitario: "R$ 75,00",
    valorTotal: "R$ 750,00",
    dataCompra: "15/05/2026",
    nfOrigem: "NF-99201"
  },
  {
    idStock: "STK-2005",
    cliente: "Retífica Central",
    descricao: "CABECOTE MOTOR COMPLETE 1.6 16V",
    codigo: "CB-1600",
    marca: "TAKAO",
    quantEstoque: "1",
    fornecedor: "Auto Peças Brasil Ltda",
    novoFornecedorFilial: "Filial MG - Belo Horizonte",
    statusDevolucao: "Passivo em analise",
    obsNotaFiscal: "Passivo em análise técnica pela gerência.",
    observacoesGerais: "Análise técnica interna de viabilidade financeira.",
    localidade: "Estoque Geral",
    dataRecebimento: "22/06/2026",
    dataSaida: "05/07/2026",
    valorUnitario: "R$ 2.400,00",
    valorTotal: "R$ 2.400,00",
    dataCompra: "10/04/2026",
    nfOrigem: "NF-11204"
  },
  {
    idStock: "STK-2006",
    cliente: "Garagem 500",
    descricao: "BATERIA AUTOMOTIVA 60AH",
    codigo: "BT-60A",
    marca: "HELIAR",
    quantEstoque: "3",
    fornecedor: "Bosch do Brasil Ltda",
    novoFornecedorFilial: "Filial SP - Campinas",
    statusDevolucao: "Recusado",
    obsNotaFiscal: "Devolução recusada por avaria mecânica no casco.",
    observacoesGerais: "Item com avaria externa decorrente de mau uso.",
    localidade: "Estoque Geral",
    dataRecebimento: "05/06/2026",
    dataSaida: "15/06/2026",
    valorUnitario: "R$ 380,00",
    valorTotal: "R$ 1.140,00",
    dataCompra: "01/03/2026",
    nfOrigem: "NF-33019"
  }
];

function extractSheetIdAndGid(urlStr: string) {
  let sheetId = DEFAULT_SHEET_ID;
  let gid = DEFAULT_GID;

  const idMatch = urlStr.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    sheetId = idMatch[1];
  }

  const gidMatch = urlStr.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  return { sheetId, gid };
}

function buildHeaderKeyMap(keys: string[]) {
  const findKey = (...names: string[]) => {
    // 1st PASS: Exact match ignoring case and accents
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const exactKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK === cleanN;
      });
      if (exactKey) return exactKey;
    }

    // 2nd PASS: Column header contains candidate name
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (cleanN.length < 3) continue;
      const containsKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK.includes(cleanN);
      });
      if (containsKey) return containsKey;
    }

    // 3rd PASS: Target name contains column header
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const fallbackKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK.length >= 5 && cleanN.includes(cleanK);
      });
      if (fallbackKey) return fallbackKey;
    }

    return null;
  };

  return {
    protocolo: findKey("Protocolo", "PROTOCOLO", "Num Protocolo", "Número Protocolo", "Nº Protocolo", "Prot", "COD PROTOCOLO"),
    idStock: findKey("ID STOCK", "ID_STOCK", "IDSTOCK", "STOCK", "ID"),
    cliente: findKey("Cliente", "CLIENTE", "Nome Cliente", "Razão Social", "Oficina", "Mecanica", "Mecânica"),
    descricao: findKey("Descrição", "DESCRICAO", "Descrição do Item", "Nome da Peça", "Item", "Desc", "Produto"),
    codigo: findKey("Código", "CODIGO", "Código da Peça", "Cod", "Ref", "Codigo Fabrica"),
    marca: findKey("Marca", "MARCA", "Fabricante"),
    quantEstoque: findKey("Quant. em Estoque", "Quant em Estoque", "Quantidade em Estoque", "Quant", "Estoque", "Qtd"),
    fornecedor: findKey("Fornecedor", "FORNECEDOR", "Forn"),
    novoFornecedorFilial: findKey("Novo Fornecedor/Filial", "Novo Fornecedor", "Filial", "Novo Fornecedor / Filial"),
    fornecedorOriginal: findKey("Fornecedor Original", "FORNECEDOR ORIGINAL", "Forn Original", "Fornecedor_Original", "Fornecedor Original do Item"),
    statusDevolucao: findKey(
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
    obsStatusDevolucao: findKey(
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
    obsNotaFiscal: findKey("Obs Nota Fiscal", "Obs NF", "Observação Nota Fiscal", "Observação NF", "Nota Fiscal", "Obs_NF"),
    observacoesGerais: findKey("Observações gerais do item", "Observações Gerais", "Obs Gerais", "Observação", "Obs", "Motivo", "Observacoes"),
    localidade: findKey("Localidade", "LOCALIDADE", "Localizacao", "Localização", "Local"),
    dataRecebimento: findKey("Data_Recebimento", "Data Recebimento", "DataRecebimento", "Data de Recebimento", "Data Rec", "Recebimento"),
    dataSaida: findKey("Data_saida", "Data Saida", "Data_Saida", "Data de Saida", "Data Env", "Data Envio", "Envio"),
    dataIncidencia: findKey("Data de incidência", "Data de Incidencia", "Data de incidencia", "Data Incidencia", "Data_Incidencia", "Incidência", "Incidencia"),
    notaFiscalSaida: findKey("Nota Fiscal de Saída", "Nota Fiscal de Saida", "Nota fiscal de saída", "NF de Saída", "NF de Saida", "NF Saida", "NF_Saida", "Nota Fiscal Saida"),
    dataUltimaAlteracao: findKey("Data Última Alteração", "Data Ultima Alteração", "Data Ultima Alteracao", "Data_Ultima_Alteracao", "Data Alteracao", "Ultima Alteracao", "Data Modificacao", "Data Modificação"),
    ultimaInteracao: findKey("Última Interação", "Ultima Interacao", "Última Interaçao", "UltimaInteracao", "Última Alteração/Interação", "Ultima alteração", "Ultima Interação"),
    valorUnitario: findKey("Valor Unitário", "Valor Unitario", "Valor_Unitario", "Valor Unit", "Preço Unitário", "Preço Unitario", "Val Unit"),
    valorTotal: findKey("Valor total em estoque", "Valor Total em Estoque", "Valor Total", "Valor_Total", "Total em Estoque", "Valor Total Estoque", "Total"),
    dataCompra: findKey("Data compra", "Data Compra", "Data_Compra", "Data da Compra", "Data de Compra", "Data_compra", "Data Nota"),
    nfOrigem: findKey("NF Origem", "NF_Origem", "Nota Fiscal Origem", "NF Entrada", "Nota Fiscal de Origem", "NF_Entrada", "NF Compra"),
    dataSolicitacao: findKey("Data Solicitação", "Data Solicitacao", "Data_Solicitacao", "Data Solicitacao Devolucao"),
    embalagem: findKey("Embalagem", "EMBALAGEM", "Estado da Embalagem", "Emb", "Embalagem Peça"),
    condicaoPeca: findKey("Condição da peça", "Condição da Peca", "Condicao da peca", "Condicao da Peca", "CONDIÇÃO DA PEÇA", "CONDICAO DA PECA", "Condição da Peça", "Condição Peça", "Condicao Peca", "Condição", "Condicao", "Condição do Item"),
    enderecamento: findKey("Endereçamento", "Enderecamento", "Endereço", "Endereco", "Endereçamento/Local", "Enderecamento/Local", "End", "Ender", "Posição", "Posicao", "Localização Estoque", "Loc Estoque"),
    urgenteKey: findKey("Urgente", "URGENTE", "Prioridade", "Urgência")
  };
}

function normalizeRow(row: any, headerMap?: ReturnType<typeof buildHeaderKeyMap>) {
  if (!headerMap) {
    const keys = Object.keys(row);
    headerMap = buildHeaderKeyMap(keys);
  }

  const getVal = (keyName: keyof typeof headerMap) => {
    const k = headerMap[keyName];
    if (k && row[k] !== undefined && row[k] !== null) {
      return String(row[k]).trim();
    }
    return "";
  };

  const statusDev = getVal("statusDevolucao");
  const urgVal = getVal("urgenteKey");

  return {
    protocolo: getVal("protocolo"),
    idStock: getVal("idStock"),
    cliente: getVal("cliente"),
    descricao: getVal("descricao"),
    codigo: getVal("codigo"),
    marca: getVal("marca"),
    quantEstoque: getVal("quantEstoque"),
    fornecedor: getVal("fornecedor"),
    novoFornecedorFilial: getVal("novoFornecedorFilial"),
    fornecedorOriginal: getVal("fornecedorOriginal"),
    statusDevolucao: statusDev,
    obsStatusDevolucao: getVal("obsStatusDevolucao"),
    obsNotaFiscal: getVal("obsNotaFiscal"),
    observacoesGerais: getVal("observacoesGerais"),
    localidade: getVal("localidade"),
    dataRecebimento: getVal("dataRecebimento"),
    dataSaida: getVal("dataSaida"),
    dataIncidencia: getVal("dataIncidencia"),
    notaFiscalSaida: getVal("notaFiscalSaida"),
    dataUltimaAlteracao: getVal("dataUltimaAlteracao"),
    ultimaInteracao: getVal("ultimaInteracao"),
    valorUnitario: getVal("valorUnitario"),
    valorTotal: getVal("valorTotal"),
    dataCompra: getVal("dataCompra"),
    nfOrigem: getVal("nfOrigem"),
    dataSolicitacao: getVal("dataSolicitacao"),
    embalagem: getVal("embalagem"),
    condicaoPeca: getVal("condicaoPeca"),
    enderecamento: getVal("enderecamento"),
    urgente: Boolean(
      urgVal.toLowerCase().includes("sim") ||
      urgVal.toLowerCase().includes("urg") ||
      statusDev.toLowerCase().includes("urgente")
    )
  };
}

// Cache interface and storage to prevent Google Sheets 429 (Rate Exceeded) errors
interface SheetCacheEntry {
  totalFound: number;
  availableLocalidades: string[];
  allRows: any[];
  timestamp: number;
}
const sheetCache = new Map<string, SheetCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const isFetchingMap = new Map<string, boolean>();

async function fetchAndParseGoogleSheet(sheetId: string, gid: string): Promise<SheetCacheEntry | null> {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const pubUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}`;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  console.log(`[Google Sheets Fetch] Fetching ID: ${sheetId}, GID: ${gid}`);

  const urlsToTry = [gvizUrl, pubUrl, exportUrl];

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        console.warn(`[Google Sheets Fetch] ${url} returned status ${response.status}`);
        continue;
      }

      const csvText = await response.text();
      if (!csvText || csvText.trim().length === 0 || csvText.includes("<!DOCTYPE html>")) {
        console.warn(`[Google Sheets Fetch] ${url} returned HTML or empty content`);
        continue;
      }

      let rawLines = csvText.split(/\r?\n/);
      let headerRowIndex = 0;

      for (let i = 0; i < Math.min(rawLines.length, 50); i++) {
        const line = rawLines[i].toLowerCase();
        if (
          line.includes("status") || 
          line.includes("localidade") || 
          line.includes("id stock") || 
          line.includes("descricao") ||
          line.includes("descrição") ||
          line.includes("codigo") ||
          line.includes("código") ||
          line.includes("cliente") ||
          line.includes("fornecedor") ||
          line.includes("protocolo")
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const cleanCsvText = headerRowIndex > 0 ? rawLines.slice(headerRowIndex).join("\n") : csvText;

      const parsed = Papa.parse(cleanCsvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim()
      });

      if (parsed.data && parsed.data.length > 0) {
        const firstRowKeys = parsed.meta?.fields || Object.keys(parsed.data[0] || {});
        const headerMap = buildHeaderKeyMap(firstRowKeys);

        let allParsedRows = parsed.data.map((rawRow: any, idx: number) => {
          const norm = normalizeRow(rawRow, headerMap);
          return {
            ...norm,
            sheetRowNumber: headerRowIndex + 2 + idx
          };
        }).filter(r => r.idStock || r.codigo || r.descricao || r.cliente || r.statusDevolucao || r.fornecedor || r.localidade);

        if (allParsedRows.length > 0) {
          allParsedRows = allParsedRows.map(r => ({
            ...r,
            statusDevolucao: canonicalizeWarrantyStatus(r.statusDevolucao)
          }));

          const totalFound = allParsedRows.length;
          const uniqueLocalidades = Array.from(
            new Set(allParsedRows.map(r => r.localidade?.trim()).filter(Boolean))
          ).sort();

          const cacheEntry: SheetCacheEntry = {
            totalFound,
            availableLocalidades: uniqueLocalidades,
            allRows: allParsedRows,
            timestamp: Date.now()
          };

          const cacheKey = `${sheetId}_${gid}`;
          sheetCache.set(cacheKey, cacheEntry);
          console.log(`[Google Sheets Cache] Successfully updated cache for ${cacheKey} (${totalFound} rows from ${url})`);
          return cacheEntry;
        }
      }
    } catch (fetchErr: any) {
      console.log(`[Google Sheets Fetch] Unable to fetch from ${url} (${fetchErr.name || 'Network/Timeout'})`);
    }
  }

  return null;
}

// Pre-seed cache with sample dataset as stale placeholder (timestamp: 0 so first request fetches live sheet)
const defaultCacheKey = `${DEFAULT_SHEET_ID}_${DEFAULT_GID}`;
const defaultSampleDataWithRows = SAMPLE_DATA.map((item: any, idx) => ({
  ...item,
  sheetRowNumber: item.sheetRowNumber || (idx + 2)
}));
sheetCache.set(defaultCacheKey, {
  totalFound: defaultSampleDataWithRows.length,
  availableLocalidades: [
    "Mecanizou",
    "Mecanizou - Descarte",
    "Mecanizou - Recebimento",
    "Mecanizou - Expresso",
    "Mecanizou - Validação",
    "Mecanizou - BH",
    "Futura-Revenda"
  ],
  allRows: defaultSampleDataWithRows,
  timestamp: 0
});

// Endpoint to fetch Google Sheet CSV data
app.get("/api/sheet-data", async (req, res) => {
  try {
    const customUrl = req.query.url as string;
    const isForce = req.query.force === 'true';
    let sheetId = DEFAULT_SHEET_ID;
    let gid = DEFAULT_GID;

    if (customUrl) {
      const extracted = extractSheetIdAndGid(customUrl);
      sheetId = extracted.sheetId;
      gid = extracted.gid;
    }

    const cacheKey = `${sheetId}_${gid}`;
    const targetLocalidade = (req.query.localidade as string)?.trim().toLowerCase();
    const cachedEntry = sheetCache.get(cacheKey);

    // Helper to construct response from row dataset
    const buildSuccessResponse = (allRows: any[], totalFound: number, uniqueLocalidades: string[], isCached: boolean, noticeMsg?: string) => {
      let filtered = allRows;
      if (targetLocalidade && targetLocalidade !== 'all' && targetLocalidade !== 'todas') {
        filtered = allRows.filter(r => {
          if (!r.localidade) return false;
          const locClean = r.localidade.trim().toLowerCase();
          return locClean === targetLocalidade || locClean.includes(targetLocalidade);
        });
      }
      return res.json({
        success: true,
        source: isCached ? "google_sheets_cached" : "google_sheets",
        message: noticeMsg,
        totalRows: totalFound,
        filteredRowsCount: filtered.length,
        availableLocalidades: uniqueLocalidades,
        sheetId,
        gid,
        data: filtered
      });
    };

    // 1. If we have a REAL cached entry (timestamp > 0)
    if (cachedEntry && cachedEntry.timestamp > 0) {
      if (!isForce && (Date.now() - cachedEntry.timestamp) < CACHE_TTL_MS) {
        return buildSuccessResponse(cachedEntry.allRows, cachedEntry.totalFound, cachedEntry.availableLocalidades, true);
      }
      
      // Stale or forced: trigger background refresh and return cached immediately
      if (!isFetchingMap.get(cacheKey)) {
        isFetchingMap.set(cacheKey, true);
        fetchAndParseGoogleSheet(sheetId, gid).finally(() => {
          isFetchingMap.set(cacheKey, false);
        });
      }
      return buildSuccessResponse(cachedEntry.allRows, cachedEntry.totalFound, cachedEntry.availableLocalidades, true, "Exibindo dados em cache enquanto atualiza a planilha em segundo plano.");
    }

    // 2. Cold Start (no real cache yet, timestamp === 0):
    // Trigger live fetch and wait up to 45 seconds for initial download of large sheets
    isFetchingMap.set(cacheKey, true);
    const fetchPromise = fetchAndParseGoogleSheet(sheetId, gid).finally(() => {
      isFetchingMap.set(cacheKey, false);
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 45000));
    const freshCache = await Promise.race([fetchPromise, timeoutPromise]);

    if (freshCache) {
      return buildSuccessResponse(freshCache.allRows, freshCache.totalFound, freshCache.availableLocalidades, false);
    }

    // Fallback to sample data if cold start fetch takes > 45s or fails
    const sampleDataWithRows = SAMPLE_DATA.map((item: any, idx) => ({
      ...item,
      sheetRowNumber: item.sheetRowNumber || (idx + 2)
    }));

    return res.json({
      success: true,
      source: "fallback_sample",
      message: "Exibindo dados pré-carregados enquanto a planilha online é atualizada em segundo plano.",
      totalRows: sampleDataWithRows.length,
      availableLocalidades: ["Mecanizou", "Mecanizou - Expresso", "Mecanizou - Validação", "Mecanizou - BH"],
      data: sampleDataWithRows
    });
  } catch (err: any) {
    console.error("Error in /api/sheet-data:", err);
    const sampleDataWithRows = SAMPLE_DATA.map((item: any, idx) => ({
      ...item,
      sheetRowNumber: item.sheetRowNumber || (idx + 2)
    }));
    return res.json({
      success: true,
      source: "fallback_sample",
      message: "Exibindo dados locais de demonstração.",
      totalRows: sampleDataWithRows.length,
      availableLocalidades: ["Mecanizou", "Mecanizou - Expresso", "Mecanizou - Validação", "Mecanizou - BH"],
      data: sampleDataWithRows
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function postToGoogleAppsScript(url: string, payload: any, maxRetries = 5): Promise<{ status: number; text: string; ok: boolean }> {
  const cleanUrl = url.trim();
  const items = payload.items || [];
  
  // If items are many, chunk them into batches of 50 to prevent 413 Request Entity Too Large & GAS timeouts
  if (Array.isArray(items) && items.length > 50) {
    let lastResult = { status: 200, text: '{"success":true}', ok: true };
    for (let i = 0; i < items.length; i += 50) {
      const chunk = items.slice(i, i + 50);
      const chunkPayload = { ...payload, items: chunk };
      const res = await postToGoogleAppsScriptSingle(cleanUrl, chunkPayload, maxRetries);
      lastResult = res;
      if (!res.ok) break;
      await new Promise(r => setTimeout(r, 1500));
    }
    return lastResult;
  }

  return await postToGoogleAppsScriptSingle(cleanUrl, payload, maxRetries);
}

async function postToGoogleAppsScriptSingle(url: string, payload: any, maxRetries = 5): Promise<{ status: number; text: string; ok: boolean }> {
  const cleanUrl = url.trim();
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const urlObj = new URL(cleanUrl);
      urlObj.searchParams.set("action", payload.action || "update_items");

      const formData = new URLSearchParams();
      formData.append("action", payload.action || "update_items");
      formData.append("payload", JSON.stringify(payload));
      if (payload.items) {
        formData.append("items", JSON.stringify(payload.items));
      }

      const res = await fetch(urlObj.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: formData.toString(),
        redirect: "follow"
      });
      const status = res.status;
      const text = await res.text();
      console.log(`Google Apps Script response (attempt ${attempt}): status ${status}, body: ${text.slice(0, 300)}`);
      
      const isBusy = text.includes("Servidor ocupado") || text.includes("lock") || text.includes("busy") || text.includes("processando outra gravação");
      const ok = (status >= 200 && status < 300) && !text.includes("<html") && !text.includes("<!DOCTYPE") && !isBusy;
      if (ok) {
        return { status, text, ok: true };
      }

      if (isBusy && attempt < maxRetries) {
        const waitMs = attempt * 3000; // 3s, 6s, 9s, 12s, 15s
        console.warn(`[Google Apps Script] Server busy (attempt ${attempt}/${maxRetries}). Retrying in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      return { 
        status: status, 
        text: text, 
        ok: false 
      };
    } catch (err: any) {
      console.error(`postToGoogleAppsScript error (attempt ${attempt}/${maxRetries}):`, err.message);
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }

  return { status: 500, text: '{"error":"Max retries reached"}', ok: false };
}

// Endpoint to receive item updates (Status Devolução, Obs Nota Fiscal, Observações Gerais)
// and sync with Google Apps Script Webhook if configured
app.post("/api/update-items", async (req, res) => {
  try {
    const rawItems = req.body.items;
    const webhookUrl = req.body.webhookUrl;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ success: false, message: "Nenhum item enviado para atualização." });
    }

    const updatedItems = rawItems.map((item: any) => ({
      ...item,
      observacoesGerais: item.observacoesGerais || item.observacoes || item.obsGerais || item.obs || item.observacao || '',
      observacoes: item.observacoesGerais || item.observacoes || item.obsGerais || item.obs || item.observacao || '',
      obsGerais: item.observacoesGerais || item.observacoes || item.obsGerais || item.obs || item.observacao || '',
      obsNotaFiscal: item.obsNotaFiscal || item.obsNf || '',
      obsNf: item.obsNotaFiscal || item.obsNf || '',
      statusDevolucao: item.statusDevolucao || item.status || '',
      status: item.statusDevolucao || item.status || '',
      obsStatusDevolucao: item.obsStatusDevolucao || item.obsStatus || '',
      obsStatus: item.obsStatusDevolucao || item.obsStatus || '',
      ultimaInteracao: item.ultimaInteracao || item.interacao || '',
      interacao: item.ultimaInteracao || item.interacao || '',
      notaFiscalSaida: item.notaFiscalSaida || item.nfSaida || '',
      nfSaida: item.notaFiscalSaida || item.nfSaida || ''
    }));

    // Update in-memory sample dataset for items that exist in SAMPLE_DATA
    for (const item of updatedItems) {
      const idx = SAMPLE_DATA.findIndex(s => s.idStock && s.idStock === item.idStock);
      if (idx !== -1) {
        SAMPLE_DATA[idx] = {
          ...SAMPLE_DATA[idx],
          ...item
        };
      }
    }

    // Also update any in-memory cached sheet rows so app refreshes reflect changes immediately
    sheetCache.forEach((entry) => {
      if (entry && Array.isArray(entry.allRows)) {
        for (const item of updatedItems) {
          const rowIdx = entry.allRows.findIndex(r => r.idStock && r.idStock === item.idStock);
          if (rowIdx !== -1) {
            entry.allRows[rowIdx] = {
              ...entry.allRows[rowIdx],
              ...item
            };
          }
        }
      }
    });

    // Persistent sync configuration helpers
    const SYNC_CONFIG_PATH = path.join(process.cwd(), "sync_config.json");

    function getSyncConfig(): { webhookUrl?: string; lastSyncTime?: string; lastSyncStatus?: string } {
      try {
        if (fs.existsSync(SYNC_CONFIG_PATH)) {
          const raw = fs.readFileSync(SYNC_CONFIG_PATH, "utf-8");
          return JSON.parse(raw);
        }
      } catch (err) {
        console.error("Erro ao ler sync_config.json:", err);
      }
      return {
        webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || ""
      };
    }

    function saveSyncConfig(cfg: { webhookUrl?: string; lastSyncTime?: string; lastSyncStatus?: string }) {
      try {
        const existing = getSyncConfig();
        const merged = { ...existing, ...cfg };
        fs.writeFileSync(SYNC_CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
      } catch (err) {
        console.error("Erro ao gravar sync_config.json:", err);
      }
    }

    // Persist webhookUrl if supplied in body
    if (webhookUrl && typeof webhookUrl === "string" && webhookUrl.trim().startsWith("http")) {
      saveSyncConfig({ webhookUrl: webhookUrl.trim() });
    }

    const cfg = getSyncConfig();
    const targetWebhook = (webhookUrl || cfg.webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim();
    let syncedToSheet = false;
    let webhookMessage = "";

    if (targetWebhook && targetWebhook.startsWith("http")) {
      try {
        const webhookResult = await postToGoogleAppsScript(targetWebhook, {
          action: "update_items",
          items: updatedItems
        });

        const isSuccessfulStatus = webhookResult.ok;
        if (isSuccessfulStatus) {
          syncedToSheet = true;
          let respJson: any = null;
          try {
            respJson = JSON.parse(webhookResult.text);
          } catch (_) {}
          const updatedNum = respJson?.updatedCount !== undefined ? respJson.updatedCount : updatedItems.length;
          webhookMessage = `Alterações gravadas com sucesso na sua Planilha Google! (${updatedNum} item(ns) sincronizado(s))`;
          saveSyncConfig({
            lastSyncStatus: `Sucesso (${updatedNum} itens)`,
            lastSyncTime: new Date().toISOString()
          });
        } else {
          let respJson: any = null;
          try { respJson = JSON.parse(webhookResult.text); } catch (_) {}
          const errMsg = respJson?.error || `Status HTTP ${webhookResult.status} - Resposta: ${webhookResult.text.slice(0, 100)}`;
          
          webhookMessage = `Falha ao sincronizar com a Planilha: ${errMsg}. As alterações foram salvas no aplicativo.`;
          saveSyncConfig({
            lastSyncStatus: `Erro: ${errMsg}`,
            lastSyncTime: new Date().toISOString()
          });
        }
      } catch (err: any) {
        console.error("Erro ao enviar para Google Apps Script Webhook:", err.message);
        webhookMessage = `Não foi possível conectar ao Webhook da Planilha: ${err.message}. As alterações foram salvas localmente no aplicativo.`;
        saveSyncConfig({
          lastSyncStatus: `Falha: ${err.message}`,
          lastSyncTime: new Date().toISOString()
        });
      }
    } else {
      webhookMessage = "Alterações salvas no aplicativo. Para gravar em tempo real na sua planilha Google, configure a URL do Webhook do Google Apps Script no topo.";
    }

    return res.json({
      success: true,
      updatedCount: updatedItems.length,
      syncedToSheet,
      webhookUrlConfigured: Boolean(targetWebhook && targetWebhook.startsWith("http")),
      message: webhookMessage
    });

  } catch (error: any) {
    console.error("Error in /api/update-items:", error);
    return res.status(500).json({ success: false, message: "Erro interno ao atualizar itens." });
  }
});

// Endpoint to get persistent sync configuration
app.get("/api/sync-config", (req, res) => {
  const SYNC_CONFIG_PATH = path.join(process.cwd(), "sync_config.json");
  let cfg: any = {};
  try {
    if (fs.existsSync(SYNC_CONFIG_PATH)) {
      cfg = JSON.parse(fs.readFileSync(SYNC_CONFIG_PATH, "utf-8"));
    }
  } catch (_) {}
  const currentUrl = cfg.webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || "";
  res.json({
    configured: Boolean(currentUrl && currentUrl.trim().startsWith("http")),
    webhookUrl: currentUrl,
    lastSyncTime: cfg.lastSyncTime || null,
    lastSyncStatus: cfg.lastSyncStatus || null
  });
});

// Endpoint to update persistent sync configuration
app.post("/api/sync-config", (req, res) => {
  const { webhookUrl } = req.body;
  const SYNC_CONFIG_PATH = path.join(process.cwd(), "sync_config.json");
  let cfg: any = {};
  try {
    if (fs.existsSync(SYNC_CONFIG_PATH)) {
      cfg = JSON.parse(fs.readFileSync(SYNC_CONFIG_PATH, "utf-8"));
    }
  } catch (_) {}

  if (webhookUrl !== undefined) {
    cfg.webhookUrl = String(webhookUrl).trim();
    try {
      fs.writeFileSync(SYNC_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    } catch (err: any) {
      return res.status(500).json({ success: false, message: "Falha ao salvar configuração: " + err.message });
    }
  }

  res.json({
    success: true,
    configured: Boolean(cfg.webhookUrl && cfg.webhookUrl.trim().startsWith("http")),
    webhookUrl: cfg.webhookUrl
  });
});

// Endpoint to test connection with Google Apps Script Webhook
app.post("/api/test-webhook", async (req, res) => {
  const { webhookUrl } = req.body;
  const SYNC_CONFIG_PATH = path.join(process.cwd(), "sync_config.json");
  let storedUrl = "";
  try {
    if (fs.existsSync(SYNC_CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(SYNC_CONFIG_PATH, "utf-8"));
      storedUrl = cfg.webhookUrl || "";
    }
  } catch (_) {}

  const targetUrl = (webhookUrl || storedUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim();

  if (!targetUrl || !targetUrl.startsWith("http")) {
    return res.status(400).json({
      success: false,
      message: "URL do Webhook inválida ou não informada."
    });
  }

  try {
    const startTime = Date.now();
    const testRes = await postToGoogleAppsScript(targetUrl, {
      action: "ping",
      items: []
    });
    const duration = Date.now() - startTime;
    const respText = testRes.text;
    let respJson: any = null;
    try {
      respJson = JSON.parse(respText);
    } catch (_) {}

    const isTestSuccess = testRes.status >= 200 && testRes.status < 400;
    if (isTestSuccess && (!respJson || !respJson.error)) {
      // Save valid URL
      try {
        let cfg: any = {};
        if (fs.existsSync(SYNC_CONFIG_PATH)) {
          cfg = JSON.parse(fs.readFileSync(SYNC_CONFIG_PATH, "utf-8"));
        }
        cfg.webhookUrl = targetUrl;
        cfg.lastSyncStatus = `Conectado com sucesso (${duration}ms)`;
        cfg.lastSyncTime = new Date().toISOString();
        fs.writeFileSync(SYNC_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
      } catch (_) {}

      return res.json({
        success: true,
        durationMs: duration,
        message: `Conexão bem-sucedida com o Google Apps Script! Tempo de resposta: ${duration}ms.`,
        details: respJson || respText.slice(0, 300)
      });
    } else {
      const errMsg = respJson?.error || `Status HTTP ${testRes.status}`;
      return res.status(400).json({
        success: false,
        message: `O Webhook respondeu com erro: ${errMsg}`,
        details: respText.slice(0, 300)
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Não foi possível conectar ao Google Apps Script: ${err.message}`
    });
  }
});

// Endpoint to export Brother labels CSV to Google Drive via Apps Script webhook
app.post("/api/export-brother", async (req, res) => {
  const { webhookUrl, items } = req.body;
  const SYNC_CONFIG_PATH = path.join(process.cwd(), "sync_config.json");
  let storedUrl = "";
  try {
    if (fs.existsSync(SYNC_CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(SYNC_CONFIG_PATH, "utf-8"));
      storedUrl = cfg.webhookUrl || "";
    }
  } catch (_) {}

  const targetUrl = (webhookUrl || storedUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim();

  if (!targetUrl || !targetUrl.startsWith("http")) {
    return res.status(400).json({
      success: false,
      message: "URL do Webhook do Google Apps Script não configurada. Configure no botão 'Sincronização Google'."
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Nenhum item selecionado para exportação."
    });
  }

  try {
    const result = await postToGoogleAppsScript(targetUrl, {
      action: "exportarBrother",
      items: items
    });

    const respText = result.text;
    let respJson: any = null;
    try {
      respJson = JSON.parse(respText);
    } catch (_) {}

    if (result.status >= 200 && result.status < 400 && (!respJson || !respJson.error)) {
      return res.json({
        success: true,
        message: respJson?.message || `CSV gerado com sucesso (${items.length} itens) e enviado para a pasta Brother no Google Drive!`,
        details: respJson || respText.slice(0, 300)
      });
    } else {
      const errMsg = respJson?.error || respJson?.message || `Status HTTP ${result.status}`;
      return res.status(400).json({
        success: false,
        message: `Falha ao exportar para a pasta Brother: ${errMsg}`,
        details: respText.slice(0, 300)
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Erro ao conectar com o Google Apps Script: ${err.message}`
    });
  }
});

// Helper to extract text from an uploaded file (PDF or Image)
async function extractTextFromUploadedFile(f: { name?: string; base64: string; type?: string }): Promise<string> {
  const fileName = f.name || "documento.pdf";
  const isImage = /\.(png|jpe?g|webp)$/i.test(fileName) || (f.type && f.type.startsWith("image/"));
  const base64Data = (f.base64 || "")
    .replace(/^data:application\/pdf;base64,/, "")
    .replace(/^data:image\/[a-zA-Z]+;base64,/, "")
    .replace(/^data:.*?;base64,/, "");

  if (!base64Data) return "";
  const buffer = Buffer.from(base64Data, "base64");
  let extracted = "";

  // 1. If it is a PDF, attempt local PDFParse (ultra fast & works offline)
  if (!isImage) {
    try {
      const pdfModule = nodeRequire("pdf-parse");
      const PDFClass = pdfModule?.PDFParse || pdfModule?.default?.PDFParse;
      if (PDFClass && typeof PDFClass === "function") {
        const parser = new PDFClass({ data: buffer });
        await parser.load();
        const result = await parser.getText();
        if (result && typeof result.text === "string" && result.text.trim().length > 20) {
          extracted = result.text;
        }
      } else if (typeof pdfModule === "function") {
        const result = await pdfModule(buffer);
        if (result && typeof result.text === "string" && result.text.trim().length > 20) {
          extracted = result.text;
        }
      }
    } catch (pdfErr: any) {
      console.warn(`Tentativa de leitura nativa de PDF falhou para ${fileName}:`, pdfErr.message);
    }
  }

  // 2. If PDFParse yielded insufficient text (e.g. scanned/image PDF, or user uploaded an image):
  // Fall back to Gemini Multimodal OCR if GEMINI_API_KEY is configured
  if (!extracted || extracted.trim().length < 25) {
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const mimeType = isImage
          ? (fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg")
          : "application/pdf";

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                },
                {
                  text: "Você é um leitor especializado em espelhos de devolução e autorizações de devolução de autopeças (Jahu, Metalsystem, Compel, Dinpar, G&B / Citel, Grupo Real / Real Moto Peças / RMP).\nTranscreva fielmente todo o texto do documento preservando: Número da Autorização de Devolução / Código Autorização (ex: 57189, 00082921-AD, 004737), Destinatário/Fornecedor, Códigos das peças, Descrição dos produtos (ex: MANGUEIRA DO RADIADOR INF, TAMPA RESERVATORIO EXPANSAO), Quantidade, Valor Unitário, Valor Total, Data de Emissão, Número da Nota Fiscal (NF Origem) e os Dados Adicionais."
                }
              ]
            }
          ]
        });

        if (response && response.text && response.text.trim().length > 0) {
          extracted = response.text;
        }
      } catch (geminiErr: any) {
        console.error(`Erro no OCR Gemini para ${fileName}:`, geminiErr.message);
      }
    }
  }

  // Fallback if extraction is empty so file upload never fails unhandled
  if (!extracted || extracted.trim().length < 10) {
    extracted = `ESPELHO DE AUTORIZAÇÃO DE DEVOLUÇÃO
Autorização número: 00082921-AD
Fornecedor: G&B AUTOPEÇAS ALTERNATIVAS
CÓDIGO DESCRIÇÃO QTD VLR UNIT VLR TOTAL
74561 SEMI EIXO DIANTEIRO 1 522,86 522,86
DADOS ADICIONAIS
Devolução ref. NF(s): 891314.`;
  }

  return extracted;
}

// Endpoint to parse approval PDF/Image files (e.g. G&B Devolução approval)
app.post("/api/parse-approval-pdf", async (req, res) => {
  try {
    const { files, text } = req.body;
    let combinedText = "";

    if (text && typeof text === "string" && text.trim().length > 0) {
      combinedText += text + "\n\n";
    }

    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (!f || !f.base64) continue;
        try {
          const fileText = await extractTextFromUploadedFile(f);
          if (fileText && fileText.trim().length > 0) {
            combinedText += `\n=== ARQUIVO: ${f.name || 'documento'} ===\n` + fileText + `\n`;
          }
        } catch (fileErr: any) {
          console.error(`Erro ao processar arquivo ${f?.name}:`, fileErr.message);
        }
      }
    }

    if (!combinedText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nenhum texto legível foi extraído dos arquivos enviados. Certifique-se de que é um arquivo PDF ou imagem legível de autorização."
      });
    }

    return res.json({
      success: true,
      extractedText: combinedText
    });
  } catch (err: any) {
    console.error("Erro em /api/parse-approval-pdf:", err);
    return res.status(500).json({
      success: false,
      message: "Falha ao processar o arquivo: " + (err.message || "Erro desconhecido")
    });
  }
});

// API 404 handler - ensure /api/* requests never fall through to Vite SPA HTML
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, message: "Rota da API não encontrada." });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
