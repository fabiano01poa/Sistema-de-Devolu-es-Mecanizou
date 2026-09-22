export interface HistoryEntry {
  data: string;
  acao: string;
  detalhe?: string;
}

export interface StockItem {
  idStock: string;
  cliente: string;
  descricao: string;
  codigo: string;
  codigoAlternativo?: string;
  marca: string;
  quantEstoque: string;
  fornecedor: string;
  novoFornecedorFilial: string;
  fornecedorOriginal?: string;
  statusDevolucao: string;
  obsStatusDevolucao?: string;
  obsNotaFiscal: string;
  observacoesGerais: string;
  localidade?: string;
  dataRecebimento?: string;
  dataSaida?: string;
  dataIncidencia?: string;
  protocolo?: string;
  valorUnitario?: string;
  valorTotal?: string;
  motivo?: string;
  dataSolicitacao?: string;
  dataCompra?: string;
  nfOrigem?: string;
  notaFiscalSaida?: string;
  embalagem?: string;
  condicaoPeca?: string;
  enderecamento?: string;
  dataUltimaAlteracao?: string;
  ultimaInteracao?: string;
  urgente?: boolean;
  sheetRowNumber?: number;
  historicoAlteracoes?: HistoryEntry[];
}

export interface FilterState {
  idStock: string;
  cliente: string;
  searchTerm: string;
  obsSearchTerm?: string;
  apenasUrgentes?: boolean;
  enderecamento?: string;
}

export interface SheetFetchResult {
  success: boolean;
  source: 'google_sheets' | 'fallback_sample' | 'custom_csv';
  message?: string;
  totalRows: number;
  data: StockItem[];
  sheetId?: string;
  gid?: string;
}
