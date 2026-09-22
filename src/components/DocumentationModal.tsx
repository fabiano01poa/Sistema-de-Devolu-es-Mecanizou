import React, { useState } from 'react';
import { X, FileText, Download, BookOpen, CheckCircle2, ShieldAlert, Layers, Search, BarChart2, Kanban, Handshake, Database, HelpCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'entidades' | 'endpoints' | 'casosdeuso' | 'sincronizacao'>('geral');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header background banner
      doc.setFillColor(15, 23, 42); // dark slate
      doc.rect(0, 0, pageWidth, 42, 'F');

      // Company header
      doc.setTextColor(16, 185, 129); // Emerald accent
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA | CNPJ 37.199.406/0001-55", 14, 12);

      // Header title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("DOCUMENTAÇÃO TÉCNICA E MANUAL DE USO", 14, 21);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Especificação de Entidades, Endpoints, Casos de Uso e Fluxos de Dados", 14, 29);

      // System Metadata
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - 14, 29, { align: 'right' });

      let currentY = 50;

      // Section 1: Visão Geral
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // indigo
      doc.text("1. VISÃO GERAL E ARQUITETURA DO SISTEMA", 14, currentY);
      currentY += 6;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const generalText = "O Sistema de Consulta de Estoque & Devoluções é uma aplicação full-stack (React + Express + Vite) para gestão operacional, rastreamento de garantias, auditoria de notas fiscais e negociação de lotes com fornecedores. A aplicação opera com leitura contínua de planilhas Google Sheets, provendo resiliência contra limites de taxa (Rate Limit 429) por meio de cache em memória de 60 segundos e gravação bidirecional assíncrona via Webhook (Google Apps Script).";
      const splitGeneral = doc.splitTextToSize(generalText, pageWidth - 28);
      doc.text(splitGeneral, 14, currentY);
      currentY += splitGeneral.length * 4.2 + 6;

      // Section 2: Especificação de Entidades e Campos
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text("2. ENTIDADES DO SISTEMA E DICIONÁRIO DE CAMPOS", 14, currentY);
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: [['Entidade', 'Campo / Propriedade', 'Tipo', 'Descrição / Regra de Negócio']],
        body: [
          ['StockItem', 'protocolo', 'string', 'Código único rastreador da devolução/garantia.'],
          ['StockItem', 'idStock', 'string', 'Identificador único do item no sistema de estoque.'],
          ['StockItem', 'descricaoPeca', 'string', 'Nome comercial e especificações do componente.'],
          ['StockItem', 'marca', 'string', 'Fabricante da peça.'],
          ['StockItem', 'codigoFabrica', 'string', 'Código do fabricante para reposição.'],
          ['StockItem', 'fornecedor', 'string', 'Fornecedor de origem do componente.'],
          ['StockItem', 'localidade', 'string', 'Filial/depósito de alocação física do item.'],
          ['StockItem', 'cliente', 'string', 'Nome do cliente vinculado à devolução.'],
          ['StockItem', 'statusDevolucao', 'string', 'Estágio do processo (A negociar, Em negociação, Emitir NF, Recusado, etc.).'],
          ['StockItem', 'urgente', 'boolean', 'Sinalizador de prioridade alta com preservação de override.'],
          ['StockItem', 'dataIncidencia', 'string (YYYY-MM-DD)', 'Data do surgimento do problema/defeito.'],
          ['StockItem', 'dataRecebimento', 'string (YYYY-MM-DD)', 'Data da entrada física do item no estoque.'],
          ['StockItem', 'dataSaida', 'string (YYYY-MM-DD)', 'Data do envio ou conclusão da devolução.'],
          ['StockItem', 'obsNotaFiscal', 'string', 'Anotações fiscais (chave NF-e, número NF de retorno).'],
          ['StockItem', 'valorTotal', 'number/string', 'Valor monetário do item em estoque.'],
          ['TimelineEvent', 'data', 'string', 'Registro de data/hora do evento na linha do tempo.'],
          ['TimelineEvent', 'status', 'string', 'Status gravado na alteração do histórico.'],
          ['NegotiationLot', 'id', 'string', 'Identificador único do lote de negociação.'],
          ['NegotiationLot', 'fornecedor', 'string', 'Fornecedor envolvido no acordo comercial.'],
          ['NegotiationLot', 'itens', 'StockItem[]', 'Lista de peças incluídas no lote de negociação.']
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 38, fontStyle: 'bold' },
          2: { cellWidth: 28 },
          3: { cellWidth: 'auto' }
        }
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 8;

      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      // Section 3: Endpoints REST API
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text("3. ENDPOINTS DA API REST E INTEGRACAO WEBHOOK", 14, currentY);
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: [['Método', 'Endpoint / Rota', 'Parâmetros / Payload', 'Descrição da Operação']],
        body: [
          ['GET', '/api/sheet-data', 'url (string), localidade (string)', 'Obtém lista de itens da planilha Google. Inclui cache automático de 60s com fallback contra erro 429 Rate Exceeded.'],
          ['POST', '/api/update-item', 'StockItem (JSON no body)', 'Recebe edições da Ficha do Item e encaminha para o Webhook Google Apps Script para persistência na planilha.'],
          ['POST', '/api/batch-update-status', '{ items: StockItem[], status: string }', 'Atualização em lote de múltiplos itens selecionados (ex: atribuição coletiva de status).'],
          ['GET', '/api/health', 'Nenhum', 'Verifica o estado operacional do servidor Node/Express.'],
          ['POST', 'Webhook Apps Script', 'JSON estruturado', 'Script executado na nuvem do Google que altera diretamente as linhas e colunas na Planilha Google Drive.']
        ],
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 42, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 'auto' }
        }
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 8;

      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      // Section 4: Casos de Uso
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text("4. CASOS DE USO E FLUXOS DE INFORMAÇÃO", 14, currentY);
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: [['Código', 'Caso de Uso', 'Fluxo de Informação / Ação do Sistema']],
        body: [
          ['CU-01', 'Consulta e Busca Multicritério', 'O usuário insere termos na barra global. O sistema filtra instantaneamente em memória por Protocolo, ID Stock, Cliente, Peça e Fornecedor.'],
          ['CU-02', 'Atualização de Status & Timeline', 'O operador altera o status na Ficha. O sistema recalcula o tempo corrido, grava o log na Timeline Unificada e envia os dados via API /api/update-item.'],
          ['CU-03', 'Controle de Urgência & Overrides', 'Ao marcar um item como "Urgente", a preferência é salva no LocalStorage (itemOverrides). As atualizações de 5min da planilha respeitam essa marcação.'],
          ['CU-04', 'Análise Gerencial (Dashboard)', 'O usuário escolhe filtrar por Data de Incidência, Recebimento ou Saída. Os gráficos de Recharts re-calculam a distribuição por status e fornecedores.'],
          ['CU-05', 'Monitoramento Kanban & Aging', 'Itens são categorizados por colunas de status. Badges visuais destacam itens estagnados há mais de 10, 20 ou 30+ dias para ação preventiva.'],
          ['CU-06', 'Negociação de Lotes & PDF', 'No módulo Negociar, o usuário seleciona peças, analisa soma financeira e gera relatório formal consolidado em formato PDF ou planilha Excel.'],
          ['CU-07', 'Tolerância a Falhas (Rate Limit 429)', 'Se a API do Google responder com "Rate Exceeded", o servidor Express serve automaticamente a versão em cache de 60s, evitando telas de erro para o usuário.']
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 48, fontStyle: 'bold' },
          2: { cellWidth: 'auto' }
        }
      });

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${totalPages} - Sistema de Consulta de Estoque & Devoluções`, pageWidth / 2, 287, { align: 'center' });
      }

      doc.save(`Documentacao_Tecnica_Sistema_Devolucoes_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF da documentação:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Documentação do Sistema & Manual do Usuário
              </h2>
              <p className="text-xs text-slate-400">
                Guia técnico completo: Entidades, Dicionário de Campos, Endpoints API e Casos de Uso
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all active:scale-95 shadow-md shadow-indigo-950/50 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 mr-1.5 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-5 py-2 flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'geral'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Visão Geral</span>
          </button>
          <button
            onClick={() => setActiveTab('entidades')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'entidades'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Entidades e Campos</span>
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'endpoints'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>3. Endpoints REST API</span>
          </button>
          <button
            onClick={() => setActiveTab('casosdeuso')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'casosdeuso'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>4. Casos de Uso & Fluxos</span>
          </button>
          <button
            onClick={() => setActiveTab('sincronizacao')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'sincronizacao'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>5. Sincronização & Rate Limits</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-sm leading-relaxed">
          {activeTab === 'geral' && (
            <div className="space-y-5">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  Arquitetura do Sistema
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm">
                  A aplicação opera em arquitetura full-stack. O front-end React provê interfaces dinâmicas para Consulta, Dashboard, Kanban e Negociação. O servidor backend Node.js (Express) gerencia consultas à API de planilhas públicas do Google, cache em memória com TTL de 60 segundos e ponte de comunicação Webhook com o Google Apps Script.
                </p>
              </div>

              <h4 className="font-bold text-white uppercase text-xs tracking-wider text-slate-400 pt-2">
                Módulos da Aplicação
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                    <Search className="w-4 h-4" />
                    <span>Módulo Consulta (Tabela & Ficha)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Busca global multicritério por Protocolo, ID Stock, Cliente e Peça. Permite abrir a Ficha Completa, editar dados fiscais e acompanhar a Linha do Tempo Unificada do processo.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                    <BarChart2 className="w-4 h-4" />
                    <span>Módulo Dashboard (Indicadores)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Análise com alternância dinâmica de base temporal (Data de Incidência, Recebimento ou Saída), gráficos Recharts por status, fornecedores e aging.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                    <Kanban className="w-4 h-4" />
                    <span>Módulo Alertas Kanban</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Quadro Kanban organizado por etapas de devolução com badges de destaque visual para peças paradas há mais de 10, 20 e 30+ dias.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <Handshake className="w-4 h-4" />
                    <span>Módulo Negociar (Lotes)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Seleção de itens em lote, cálculo financeiro total, apuração de prazos legais de garantia e geração de relatórios formais em PDF e Excel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'entidades' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Dicionário de Entidades e Mapeamento de Campos
              </h3>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-bold uppercase">
                      <th className="p-2.5">Entidade</th>
                      <th className="p-2.5">Campo</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Descrição / Regra de Negócio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono text-[11px]">
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 font-bold text-amber-400">protocolo</td>
                      <td className="p-2.5 text-slate-400">string</td>
                      <td className="p-2.5 font-sans text-slate-300">Código rastreador único gerado na devolução.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 font-bold text-amber-400">idStock</td>
                      <td className="p-2.5 text-slate-400">string</td>
                      <td className="p-2.5 font-sans text-slate-300">Identificador único do item no sistema de estoque.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 text-white">descricaoPeca</td>
                      <td className="p-2.5 text-slate-400">string</td>
                      <td className="p-2.5 font-sans text-slate-300">Descrição do componente/peça.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 text-white">urgente</td>
                      <td className="p-2.5 text-emerald-400">boolean</td>
                      <td className="p-2.5 font-sans text-slate-300">Marcador de prioridade. Preservado via LocalStorage override.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 text-purple-400">dataIncidencia</td>
                      <td className="p-2.5 text-slate-400">string (YYYY-MM-DD)</td>
                      <td className="p-2.5 font-sans text-slate-300">Data de identificação da falha/avaria.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 text-purple-400">dataRecebimento</td>
                      <td className="p-2.5 text-slate-400">string (YYYY-MM-DD)</td>
                      <td className="p-2.5 font-sans text-slate-300">Data de recebimento físico no estoque.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 text-purple-400">dataSaida</td>
                      <td className="p-2.5 text-slate-400">string (YYYY-MM-DD)</td>
                      <td className="p-2.5 font-sans text-slate-300">Data de devolução ou expedição.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-400">StockItem</td>
                      <td className="p-2.5 text-amber-300">obsNotaFiscal</td>
                      <td className="p-2.5 text-slate-400">string</td>
                      <td className="p-2.5 font-sans text-slate-300">Observações e dados de Nota Fiscal (chave de acesso, NF retorno).</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-emerald-400">TimelineEvent</td>
                      <td className="p-2.5 text-white">data / status</td>
                      <td className="p-2.5 text-slate-400">string</td>
                      <td className="p-2.5 font-sans text-slate-300">Registro histórico de transição de status do item.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-purple-400">NegotiationLot</td>
                      <td className="p-2.5 text-white">id / itens</td>
                      <td className="p-2.5 text-slate-400">string / StockItem[]</td>
                      <td className="p-2.5 font-sans text-slate-300">Agrupamento de itens para negociação formal com fornecedores.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                Endpoints da API REST (Servidor Backend Express)
              </h3>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 font-bold">GET /api/sheet-data</span>
                    <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded text-[10px]">Leitura + Cache</span>
                  </div>
                  <p className="text-slate-400">
                    Retorna os dados da planilha Google. Suporta filtro por filial/localidade. Implementa cache em memória (60s) que previne o bloqueio por limite de requisições do Google (Rate Limit 429).
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-400 font-bold">POST /api/update-item</span>
                    <span className="bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded text-[10px]">Webhook Relay</span>
                  </div>
                  <p className="text-slate-400">
                    Recebe as alterações efetuadas pelo usuário na Ficha do Item e as retransmite para o Webhook do Google Apps Script para salvamento permanente na Planilha do Google Drive.
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-amber-400 font-bold">POST /api/batch-update-status</span>
                    <span className="bg-amber-950 border border-amber-800 text-amber-300 px-2 py-0.5 rounded text-[10px]">Lote Webhook</span>
                  </div>
                  <p className="text-slate-400">
                    Envia atualizações de status em massa para múltiplos itens selecionados na interface.
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-purple-400 font-bold">GET /api/health</span>
                    <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px]">Diagnóstico</span>
                  </div>
                  <p className="text-slate-400">
                    Endpoint de diagnóstico para validar o funcionamento do servidor Node.js/ Express na porta 3000.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'casosdeuso' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Handshake className="w-5 h-5 text-indigo-400" />
                Matriz de Casos de Uso (CU) e Regras de Negócio
              </h3>

              <div className="space-y-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <h4 className="font-bold text-indigo-300">CU-01: Pesquisa Multicritério</h4>
                  <p className="text-slate-400">
                    Permite que o operador localize rapidamente qualquer peça digitando termos na busca global. A pesquisa varre instantaneamente Protocolo, ID Stock, Peça, Cliente, Fornecedor e Código de Fábrica sem latência de rede.
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <h4 className="font-bold text-emerald-300">CU-02: Transição de Status e Linha do Tempo</h4>
                  <p className="text-slate-400">
                    Ao alterar o status da devolução (ex: de "A negociar" para "Em negociação"), a Linha do Tempo Unificada continua contando o prazo corrido normalmente, finalizando a contagem apenas quando atinge um status encerrador (ex: "Não negociado", "Recusado").
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <h4 className="font-bold text-amber-300">CU-03: Marcação de Urgência com Preservação de Estado</h4>
                  <p className="text-slate-400">
                    Permite alterar o status para versões "Urgente" ou clicar na estrela de prioridade. As modificações de urgência do usuário são salvas em memória local persitente (LocalStorage), garantindo que atualizações automáticas de 5 minutos não desmarquem a urgência inserida no app.
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <h4 className="font-bold text-purple-300">CU-04: Relatório de Negociação de Lotes em PDF/Excel</h4>
                  <p className="text-slate-400">
                    O usuário seleciona os itens desejados na aba Negociar, verifica a soma financeira acumulada, prazos legais de garantia e clica em "Emitir Relatório" para gerar o documento PDF formatado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sincronizacao' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                Mecanismo de Resiliência e Proteção Contra Limites do Google (429)
              </h3>

              <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-800/60 text-xs text-emerald-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Cache Inteligente em Memória (TTL 60s):
                </p>
                <p className="text-emerald-300/90 leading-relaxed">
                  Para evitar erros de estouramento de cota "Rate Exceeded" da API pública do Google Sheets quando múltiplos usuários acessam simultaneamente, o servidor Express mantém os dados em cache de 60 segundos. Se o Google responder com erro 429, o servidor entrega o cache existente de forma transparente, garantindo disponibilidade contínua.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-white text-sm">Passo a Passo de Instalação do Webhook (Gravação):</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Clique em <span className="text-indigo-400 font-bold">"Vincular Gravação"</span> no menu superior.</li>
                  <li>Copie o script Google Apps Script exibido.</li>
                  <li>Abra a sua Planilha no Google Drive &gt; acesse <span className="font-bold text-white">Extensões &gt; Apps Script</span>.</li>
                  <li>Cole o código, salve e clique em <span className="font-bold text-white">Implantar &gt; Nova Implantação</span>.</li>
                  <li>Selecione <span className="font-bold text-white">App da Web</span>, configure acesso para <span className="text-emerald-400 font-mono font-bold">"Qualquer pessoa"</span> (Anyone) e conclua.</li>
                  <li>Copie a URL Web App gerada e cole no campo "Webhook URL" na aplicação.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center text-xs text-slate-400 gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Para obter a documentação completa impressa em PDF, clique em <strong>Baixar PDF</strong> no canto superior.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
