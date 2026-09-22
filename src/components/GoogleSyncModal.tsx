import React, { useState } from 'react';
import { X, Check, Copy, Link, Database, Sparkles, CheckCircle2, AlertCircle, Play, Info } from 'lucide-react';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onSaveWebhookUrl
}) => {
  const [inputUrl, setInputUrl] = useState<string>(webhookUrl || '');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const scriptCode = `// SCRIPT DE ALTA PERFORMANCE BATCH PARA PLANILHAS (66.000+ LINHAS)
// Cole no seu Google Apps Script (Extensões -> Apps Script)

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return reply({ error: "Servidor ocupado processando outra gravação. Tente novamente." });
  }

  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = { raw: e.postData.contents };
      }
    } else if (e && e.parameter) {
      if (e.parameter.payload) {
        try { payload = JSON.parse(e.parameter.payload); } catch (err) {}
      } else if (e.parameter.items) {
        try { payload = { items: JSON.parse(e.parameter.items) }; } catch (err) {}
      } else {
        payload = e.parameter;
      }
    }

    if (payload.action === "ping" && (!payload.items || payload.items.length === 0)) {
      return reply({ success: true, message: "Webhook ativo e respondendo!", timestamp: new Date().toISOString() });
    }

    if (payload.action === "exportarBrother") {
      var FOLDER_ID = '0AJd5XfKdhs1oUk9PVA';
      var pasta = DriveApp.getFolderById(FOLDER_ID);
      var itemsToExport = payload.items || [];
      
      var csv = '"ID","CODIGO","DESCRICAO ITEM","Qtd.","MARCA","FORNECEDOR","Qtd. IMPRESSA"\\n';
      itemsToExport.forEach(function(item) {
        var id = String(item.idStock || '').replace(/"/g, '""');
        var codigo = String(item.codigo || '').replace(/"/g, '""');
        var desc = String(item.descricao || '').replace(/"/g, '""');
        var qtd = String(item.quantEstoque || item.qtd || '1').replace(/"/g, '""');
        var marca = String(item.marca || '').replace(/"/g, '""');
        var forn = String(item.fornecedor || '').replace(/"/g, '""');
        var qtdImp = String(item.qtdImpressa || '').replace(/"/g, '""');
        csv += '"' + id + '","' + codigo + '","' + desc + '","' + qtd + '","' + marca + '","' + forn + '","' + qtdImp + '"\\n';
      });

      var nomeFinal = 'impressao-etiquetas-qrcode - etiquetas-avulsa-brother.csv';
      var arquivos = pasta.getFiles();
      var removidos = 0;
      while (arquivos.hasNext()) {
        try {
          arquivos.next().setTrashed(true);
          removidos++;
        } catch (err) {}
      }
      Utilities.sleep(2000);
      pasta.createFile(nomeFinal, csv, MimeType.CSV);

      return reply({
        success: true,
        message: "CSV gerado com sucesso (" + itemsToExport.length + " itens) e enviado para a pasta Brother!",
        removedCount: removidos,
        count: itemsToExport.length
      });
    }

    var items = [];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload.items && Array.isArray(payload.items)) {
      items = payload.items;
    } else if (typeof payload === "object" && payload.idStock) {
      items = [payload];
    }

    if (items.length === 0) {
      return reply({ success: true, updatedCount: 0, message: "Nenhum item para atualizar." });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var sheet = null;
    var idCol = -1;
    var headers = [];
    var lastRow = 0;
    var lastCol = 0;

    // Search all sheets for one that has an ID STOCK or ID column
    for (var s = 0; s < sheets.length; s++) {
      var sh = sheets[s];
      var lRow = sh.getLastRow();
      var lCol = sh.getLastColumn();
      if (lRow < 2 || lCol < 1) continue;
      
      var hVals = sh.getRange(1, 1, 1, lCol).getValues()[0];
      var hs = hVals.map(function(h) {
        return String(h || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
      });

      var foundId = hs.findIndex(function(h) {
        return h.includes("id stock") || h.includes("idstock") || h === "id" || h.includes("codigo") || h.includes("protocolo");
      });

      if (foundId !== -1) {
        sheet = sh;
        idCol = foundId;
        headers = hs;
        lastRow = lRow;
        lastCol = lCol;
        break;
      }
    }

    if (!sheet) {
      sheet = ss.getActiveSheet();
      lastRow = sheet.getLastRow();
      lastCol = sheet.getLastColumn();
      if (lastRow >= 1 && lastCol >= 1) {
        var hVals = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        headers = hVals.map(function(h) {
          return String(h || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
        });
        idCol = headers.findIndex(function(h) {
          return h.includes("id stock") || h.includes("idstock") || h === "id" || h.includes("codigo");
        });
        if (idCol === -1) idCol = 0;
      }
    }

    if (!sheet || lastRow < 2) {
      return reply({ error: "Nenhuma aba com dados encontrada na planilha." });
    }

    var findCol = function(exactList, partialList, excludeList) {
      excludeList = excludeList || [];
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i];
        var isExcluded = false;
        for (var x = 0; x < excludeList.length; x++) {
          if (h.indexOf(excludeList[x]) !== -1) { isExcluded = true; break; }
        }
        if (isExcluded) continue;

        for (var e = 0; e < exactList.length; e++) {
          var cleanE = String(exactList[e]).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
          if (h === cleanE) return i;
        }
      }
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i];
        var isExcluded = false;
        for (var x = 0; x < excludeList.length; x++) {
          if (h.indexOf(excludeList[x]) !== -1) { isExcluded = true; break; }
        }
        if (isExcluded) continue;

        for (var p = 0; p < partialList.length; p++) {
          var cleanP = String(partialList[p]).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
          if (h.indexOf(cleanP) !== -1) return i;
        }
      }
      return -1;
    };

    var statusCol = findCol(["Status Devolução", "Status Devolucao", "Status da Devolução", "Status"], ["status devolu", "status_devolucao"], []);
    var obsStatusCol = findCol(["Observação do status de devolução", "Obs Status Devolução", "Obs Status"], ["obs status", "observacao status"], []);
    var obsNfCol = findCol(["Obs Nota Fiscal", "Obs NF", "Observação Nota Fiscal"], ["obs nota fiscal", "obs nf"], []);
    var obsGeraisCol = findCol(["Observações gerais do item", "Observações Gerais", "Obs Gerais"], ["observacoes gerais", "observacoes"], []);
    var nfOrigemCol = findCol(["NF Origem", "NF_Origem", "Nota Fiscal Origem", "NF Entrada"], ["nf origem", "nf_origem", "nf entrada"], []);
    var nfSaidaCol = findCol(["Nota Fiscal de Saída", "NF Saída", "NF Saida"], ["nf saida", "nota fiscal de saida"], []);
    var interacaoCol = findCol(["Última Interação", "Ultima Interacao"], ["ultima interac", "interacao"], []);
    var localidadeCol = findCol(["Localidade", "Localização", "Local"], ["localidade", "localizacao"], []);

    // Read all sheet data in 1 single bulk call
    var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    
    // Build row index map for fast lookup
    var idToRowMap = {};
    for (var r = 1; r < allData.length; r++) {
      var rawId = String(allData[r][idCol] || "").trim();
      if (rawId) {
        var clean = rawId.toLowerCase();
        idToRowMap[clean] = r; // 0-indexed for allData array
        var noPunct = clean.replace(/[^0-9a-z]/g, "");
        if (noPunct && !idToRowMap[noPunct]) {
          idToRowMap[noPunct] = r;
        }
      }
    }

    var updatedCount = 0;
    var notFoundCount = 0;

    items.forEach(function(item) {
      var targetId = String(item.idStock || item.id || item.codigo || "").trim().toLowerCase();
      if (!targetId) return;

      var targetNoPunct = targetId.replace(/[^0-9a-z]/g, "");
      var rowIndex = idToRowMap[targetId] !== undefined ? idToRowMap[targetId] : idToRowMap[targetNoPunct];

      // If not found in idCol, search entire sheet data array
      if (rowIndex === undefined) {
        for (var i = 1; i < allData.length; i++) {
          var rowStr = allData[i].join(" ").toLowerCase();
          if (rowStr.includes(targetId) || (targetNoPunct.length > 5 && rowStr.replace(/[^0-9a-z]/g, "").includes(targetNoPunct))) {
            rowIndex = i;
            break;
          }
        }
      }

      if (rowIndex === undefined) {
        notFoundCount++;
        return;
      }

      var sheetRow = rowIndex + 1; // 1-based row index in sheet

      // Helper to update text columns: if existing data present, prepend new data ("new / existing"). If empty, set new.
      var updateTextCol = function(colIdx, newVal) {
        if (colIdx === -1 || newVal === undefined || newVal === null || String(newVal).trim() === "") return;
        var cellRange = sheet.getRange(sheetRow, colIdx + 1);
        var existingVal = String(cellRange.getValue() || "").trim();
        var strNew = String(newVal).trim();
        if (!existingVal) {
          cellRange.setValue(strNew);
        } else if (existingVal !== strNew && existingVal.indexOf(strNew) === -1) {
          cellRange.setValue(strNew + " / " + existingVal);
        }
      };

      if (statusCol !== -1 && item.statusDevolucao !== undefined && item.statusDevolucao !== null && String(item.statusDevolucao).trim() !== "") {
        sheet.getRange(sheetRow, statusCol + 1).setValue(item.statusDevolucao);
      }
      if (item.obsStatusDevolucao !== undefined) {
        updateTextCol(obsStatusCol, item.obsStatusDevolucao);
      }
      if (item.obsNotaFiscal !== undefined) {
        updateTextCol(obsNfCol, item.obsNotaFiscal);
      }
      if (item.observacoesGerais !== undefined) {
        updateTextCol(obsGeraisCol, item.observacoesGerais);
      }
      // EXCEPTION: NF Origem always takes the new value directly without prepending/concatenating
      if (nfOrigemCol !== -1 && item.nfOrigem !== undefined && item.nfOrigem !== null && String(item.nfOrigem).trim() !== "") {
        sheet.getRange(sheetRow, nfOrigemCol + 1).setValue(item.nfOrigem);
      }
      // NF Saida only updates if cell is empty (new inclusion), never overwrites if data already exists
      if (nfSaidaCol !== -1 && item.notaFiscalSaida !== undefined && item.notaFiscalSaida !== null && String(item.notaFiscalSaida).trim() !== "") {
        var cellRangeNfSaida = sheet.getRange(sheetRow, nfSaidaCol + 1);
        var existingNfSaida = String(cellRangeNfSaida.getValue() || "").trim();
        if (!existingNfSaida) {
          cellRangeNfSaida.setValue(item.notaFiscalSaida);
        }
      }
      if (interacaoCol !== -1 && item.ultimaInteracao !== undefined) {
        sheet.getRange(sheetRow, interacaoCol + 1).setValue(item.ultimaInteracao);
      }
      // NOTE: Column AC ("Localidade" / localidadeCol) is intentionally NOT modified or touched here, protecting it 100%.

      updatedCount++;
    });

    if (updatedCount > 0) {
      SpreadsheetApp.flush();
    }

    return reply({
      success: true,
      updatedCount: updatedCount,
      notFoundCount: notFoundCount,
      sheetName: sheet.getName(),
      totalRows: lastRow,
      columnsMapped: {
        statusCol: statusCol,
        obsNfCol: obsNfCol,
        localidadeCol: localidadeCol
      }
    });
  } catch (err) {
    return reply({ error: err.toString() });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet(e) {
  return reply({
    status: "ok",
    service: "Mecanizou Devoluções Webhook",
    timestamp: new Date().toISOString()
  });
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSave = async () => {
    const cleanUrl = inputUrl.trim();
    onSaveWebhookUrl(cleanUrl);
    try {
      await fetch('/api/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cleanUrl })
      });
    } catch (_) {}
    onClose();
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      setTestStatus({ loading: false, success: false, message: 'Insira a URL do Webhook primeiro.' });
      return;
    }

    setTestStatus({ loading: true });
    try {
      const res = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: inputUrl.trim()
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTestStatus({
          loading: false,
          success: true,
          message: json.message || `Conexão bem-sucedida (${json.durationMs}ms)! A planilha está pronta para gravar.`
        });
        onSaveWebhookUrl(inputUrl.trim());
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: json.message || 'Erro ao conectar ao Webhook. Verifique se publicou como "Qualquer pessoa".'
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Falha ao testar conexão: ' + (err.message || 'Erro de rede')
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl animate-fadeIn my-8 text-slate-800 dark:text-slate-200">
        <div className="flex items-center justify-between border-b border-sky-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-200 dark:border-sky-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Gravação em Tempo Real na Planilha Google</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Sincronize status de devolução, observações e notas fiscais direto nas células da sua planilha
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Why the sheet doesn't update without webhook */}
        <div className="p-3.5 bg-sky-50/70 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-xl text-xs space-y-1 text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Por que a planilha do Google não altera sem o Webhook?</span>
          </div>
          <p className="leading-relaxed pl-5">
            O Google disponibiliza o link de exportação apenas como <strong>leitura</strong>. Para que alterações no sistema sejam gravadas diretamente nas células da sua planilha online (em 1 a 2 segundos), o Google exige a URL de um Webhook autorizado. Enquanto o Webhook não é inserido, <strong>suas alterações continuam 100% salvas com segurança no aplicativo</strong>.
          </p>
        </div>

        {/* Input Webhook URL */}
        <div className="space-y-2 bg-sky-50/30 dark:bg-slate-950 p-4 rounded-xl border border-sky-200 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
            URL do Webhook do Google Apps Script
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-sky-500 font-mono"
            />
            <button
              onClick={handleTestConnection}
              disabled={testStatus?.loading}
              className="px-3.5 py-2.5 bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-sky-900 dark:text-slate-200 font-bold text-xs rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{testStatus?.loading ? 'Testando...' : 'Testar Conexão'}</span>
            </button>
          </div>

          {testStatus && (
            <div className={`mt-2 p-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
              testStatus.success ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {testStatus.success ? <CheckCircle2 className="w-4 h-4 text-sky-600" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Como criar o script em 1 minuto na sua Planilha Google:
          </h4>

          <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside bg-sky-50/20 dark:bg-slate-950/80 p-4 rounded-xl border border-sky-100 dark:border-slate-800 font-sans leading-relaxed">
            <li>Abra sua <strong>Planilha Google</strong> e vá em <strong>Extensões › Apps Script</strong>.</li>
            <li>Ao lado de <strong>Arquivos</strong>, clique no <strong>+ (Adicionar arquivo › Script)</strong> (ex: <code className="bg-sky-100 dark:bg-slate-800 px-1 py-0.5 rounded text-sky-900 dark:text-sky-300">webhook.gs</code>).</li>
            <li>Cole o código fornecido abaixo.</li>
            <li>Clique no botão azul superior <strong>Implantar › Nova implantação</strong>.</li>
            <li>Em <em>Selecione o tipo</em> (ícone de engrenagem), escolha <strong>App da Web</strong>.</li>
            <li>Em <em>Quem pode acessar</em>, selecione <strong>Qualquer pessoa</strong> (necessário para a sincronização web) e clique em <strong>Implantar</strong>.</li>
            <li>Copie a <strong>URL do App da Web</strong> (termina em <code className="bg-sky-100 dark:bg-slate-800 px-1 py-0.5 rounded text-sky-900 dark:text-sky-300">/exec</code>) e cole no campo acima!</li>
          </ol>
        </div>

        {/* Copy Script Code Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Código do Apps Script (Pronto para copiar)
            </span>
            <button
              onClick={copyScriptToClipboard}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copiado!' : 'Copiar Código'}</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl text-[11px] font-mono text-sky-300 overflow-x-auto max-h-48 scrollbar-thin">
            {scriptCode}
          </pre>
        </div>

        {/* Modal Action Footer */}
        <div className="border-t border-sky-100 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            {webhookUrl ? '🟢 Webhook configurado e ativo para gravação em tempo real' : '⚪ Webhook não configurado (salvamento no aplicativo ativo)'}
          </span>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
