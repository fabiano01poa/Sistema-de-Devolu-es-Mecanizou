import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatsOverview } from './components/StatsOverview';
import { Filters } from './components/Filters';
import { DetailCard } from './components/DetailCard';
import { ItemList } from './components/ItemList';
import { SheetModal } from './components/SheetModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { BrotherLabelModal } from './components/BrotherLabelModal';
import { SupplierLabelModal } from './components/SupplierLabelModal';
import { DocumentationModal } from './components/DocumentationModal';
import { Dashboard } from './components/Dashboard';
import { NegociarView } from './components/NegociarView';
import { InventarioView } from './components/InventarioView';
import { FornecedoresView } from './components/FornecedoresView';
import { StockItem, FilterState } from './types';
import { isAllowedWarrantyStatus, isWarrantyItem, isDevolucaoItem, isItemUrgent, canonicalizeWarrantyStatus, OFFICIAL_WARRANTY_STATUSES, OFFICIAL_OBS_STATUS_DEVOLUCAO } from './utils/statusUtils';
import { getItemPrimaryTimestamp } from './utils/dateUtils';
import { FALLBACK_SAMPLE_DATA } from './utils/fallbackData';
import { fetchSheetDirectlyFromClient } from './utils/clientSheetFetcher';
import { AlertTriangle, Sparkles, RefreshCw, Layers, RotateCcw, Printer, Truck } from 'lucide-react';

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M/edit?gid=1870385864#gid=1870385864";

export default function App() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [source, setSource] = useState<'google_sheets' | 'fallback_sample' | 'custom_csv'>('google_sheets');
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('app_sheet_url') || DEFAULT_SHEET_URL;
    } catch {
      return DEFAULT_SHEET_URL;
    }
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('gs_webhook_url') || '';
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [selectedBrotherIds, setSelectedBrotherIds] = useState<Set<string>>(new Set());
  const [isBrotherModalOpen, setIsBrotherModalOpen] = useState<boolean>(false);
  const [isSupplierLabelModalOpen, setIsSupplierLabelModalOpen] = useState<boolean>(false);

  const handleToggleBrotherSelect = (idStock: string) => {
    setSelectedBrotherIds(prev => {
      const next = new Set(prev);
      if (next.has(idStock)) {
        next.delete(idStock);
      } else {
        next.add(idStock);
      }
      return next;
    });
  };

  const handleToggleSelectAllPage = (ids: string[], select: boolean) => {
    setSelectedBrotherIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const [activeView, setActiveView] = useState<'consulta' | 'dash' | 'garantias' | 'negociar' | 'inventario' | 'fornecedores'>('garantias');
  const [selectedLocalidade, setSelectedLocalidade] = useState<string>('todas');
  const [availableLocalidades, setAvailableLocalidades] = useState<string[]>([]);

  const selectedBrotherItems = useMemo(() => {
    return items.filter(i => selectedBrotherIds.has(i.idStock));
  }, [items, selectedBrotherIds]);
  const [totalSheetRows, setTotalSheetRows] = useState<number>(0);

  // Theme state (dark / light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem('app_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  const isLight = theme === 'light';

  useEffect(() => {
    try {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
      localStorage.setItem('app_theme', theme);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const [filters, setFilters] = useState<FilterState>({
    idStock: '',
    cliente: '',
    searchTerm: '',
    obsSearchTerm: '',
    enderecamento: ''
  });

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<StockItem | null>(null);
  const [detailNavList, setDetailNavList] = useState<StockItem[] | null>(null);
  const [detailNavContextLabel, setDetailNavContextLabel] = useState<string | null>(null);

  // Dynamic extraction of all available localidades from loaded data + known locations
  const dynamicAvailableLocalidades = useMemo(() => {
    const set = new Set<string>();
    [
      "Mecanizou",
      "Mecanizou - Descarte",
      "Mecanizou - Recebimento",
      "Mecanizou - Expresso",
      "Mecanizou - Validação",
      "Mecanizou - BH",
      "Futura-Revenda"
    ].forEach(l => set.add(l));

    availableLocalidades.forEach(l => {
      if (l && l.trim()) set.add(l.trim());
    });

    items.forEach(i => {
      if (i.localidade && i.localidade.trim()) {
        set.add(i.localidade.trim());
      }
    });

    return Array.from(set).sort();
  }, [availableLocalidades, items]);

  const itemsFornecedoresMemo = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.fornecedor && i.fornecedor.trim()) set.add(i.fornecedor.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Load persistent user modifications from localStorage
  const getItemOverrides = (): Record<string, Partial<StockItem>> => {
    try {
      const saved = localStorage.getItem('item_overrides_v2');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const updateItemOverrides = (updatedList: StockItem[]) => {
    try {
      const current = getItemOverrides();
      updatedList.forEach(item => {
        const rawId = item.idStock || item.codigo;
        if (!rawId) return;
        const key = String(rawId).trim().toLowerCase();
        current[key] = {
          ...(current[key] || {}),
          statusDevolucao: item.statusDevolucao,
          obsStatusDevolucao: item.obsStatusDevolucao,
          observacoesGerais: item.observacoesGerais,
          obsNotaFiscal: item.obsNotaFiscal,
          notaFiscalSaida: item.notaFiscalSaida,
          motivo: item.motivo,
          urgente: item.urgente,
          ultimaInteracao: item.ultimaInteracao,
          dataUltimaAlteracao: item.dataUltimaAlteracao,
          historicoAlteracoes: item.historicoAlteracoes
        };
      });
      localStorage.setItem('item_overrides_v2', JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save overrides:', e);
    }
  };

  const applyOverridesToData = (dataList: StockItem[]): StockItem[] => {
    const overrides = getItemOverrides();
    return dataList.map(item => {
      const rawId = item.idStock || item.codigo;
      if (!rawId) return item;
      const cleanKey = String(rawId).trim().toLowerCase();
      const noPunctKey = cleanKey.replace(/[^0-9a-z]/g, "");
      const ov = overrides[cleanKey] || overrides[noPunctKey] || overrides[String(item.idStock || '').trim()];
      if (!ov) return item;
      return {
        ...item,
        statusDevolucao: ov.statusDevolucao !== undefined ? ov.statusDevolucao : item.statusDevolucao,
        obsStatusDevolucao: ov.obsStatusDevolucao !== undefined ? ov.obsStatusDevolucao : item.obsStatusDevolucao,
        observacoesGerais: ov.observacoesGerais !== undefined ? ov.observacoesGerais : item.observacoesGerais,
        obsNotaFiscal: ov.obsNotaFiscal !== undefined ? ov.obsNotaFiscal : item.obsNotaFiscal,
        notaFiscalSaida: ov.notaFiscalSaida !== undefined ? ov.notaFiscalSaida : item.notaFiscalSaida,
        motivo: ov.motivo !== undefined ? ov.motivo : item.motivo,
        urgente: ov.urgente !== undefined ? ov.urgente : item.urgente,
        ultimaInteracao: ov.ultimaInteracao !== undefined ? ov.ultimaInteracao : item.ultimaInteracao,
        dataUltimaAlteracao: ov.dataUltimaAlteracao !== undefined ? ov.dataUltimaAlteracao : item.dataUltimaAlteracao,
        historicoAlteracoes: ov.historicoAlteracoes || item.historicoAlteracoes || []
      };
    });
  };

  const fetchSheetData = async (customUrl?: string, customLocalidade?: string, isBackground = false, forceLive = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    const targetUrl = customUrl || sheetUrl;
    const targetLocalidade = customLocalidade !== undefined ? customLocalidade : selectedLocalidade;

    try {
      const liveQuery = forceLive ? '&forceLive=true' : '';
      const res = await fetch(`/api/sheet-data?url=${encodeURIComponent(targetUrl)}&localidade=${encodeURIComponent(targetLocalidade)}${liveQuery}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0 && json.source !== 'fallback_sample') {
          const mergedData = applyOverridesToData(json.data);
          setItems(mergedData);
          setSource(json.source || 'google_sheets');
          if (json.totalRows) setTotalSheetRows(json.totalRows);
          if (json.availableLocalidades) setAvailableLocalidades(json.availableLocalidades);
          setLastSyncedAt(new Date());

          if (json.message && !isBackground) {
            setStatusMessage(json.message);
          } else if (!isBackground) {
            setStatusMessage(undefined);
          }

          setSelectedItem(prev => {
            if (!prev) return mergedData.length > 0 ? mergedData[0] : null;
            const updated = mergedData.find((i: StockItem) => i.idStock === prev.idStock);
            return updated || prev;
          });
          return;
        }
      }

      // If server returned fallback_sample or non-ok response, execute Client-Side Direct Fetch from Google Sheets
      console.warn('Server returned fallback sample or failed; attempting client-side direct CSV fetch...');
      const clientRes = await fetchSheetDirectlyFromClient(targetUrl);
      if (clientRes.data && clientRes.data.length > 0) {
        const mergedData = applyOverridesToData(clientRes.data);
        setItems(mergedData);
        setSource('google_sheets');
        setTotalSheetRows(clientRes.totalRows);
        setAvailableLocalidades(clientRes.availableLocalidades);
        setLastSyncedAt(new Date());
        if (!isBackground) {
          setStatusMessage('Sincronizado diretamente pelo navegador (Client-Side Direct).');
        }
        setSelectedItem(prev => prev || mergedData[0] || null);
        return;
      }
    } catch (error) {
      console.warn('Server fetch error; attempting client-side direct CSV fetch:', error);
      try {
        const clientRes = await fetchSheetDirectlyFromClient(targetUrl);
        if (clientRes.data && clientRes.data.length > 0) {
          const mergedData = applyOverridesToData(clientRes.data);
          setItems(mergedData);
          setSource('google_sheets');
          setTotalSheetRows(clientRes.totalRows);
          setAvailableLocalidades(clientRes.availableLocalidades);
          setLastSyncedAt(new Date());
          if (!isBackground) {
            setStatusMessage('Sincronizado diretamente pelo navegador (Client-Side Direct).');
          }
          setSelectedItem(prev => prev || mergedData[0] || null);
          return;
        }
      } catch (clientErr) {
        console.error('Client-side direct fetch failed as well:', clientErr);
      }

      if (!isBackground) {
        setStatusMessage('Exibindo dados locais de demonstração.');
      }
      setItems(prev => {
        if (prev.length > 0) return prev;
        return FALLBACK_SAMPLE_DATA;
      });
      setSelectedItem(prev => prev || FALLBACK_SAMPLE_DATA[0] || null);
      setAvailableLocalidades(prev => prev.length > 0 ? prev : ["Mecanizou", "Mecanizou - Expresso", "Mecanizou - Validação", "Mecanizou - BH"]);
      setTotalSheetRows(prev => prev > 0 ? prev : FALLBACK_SAMPLE_DATA.length);
      setSource('fallback_sample');
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSheetData();
    fetch('/api/sync-config')
      .then(res => res.json())
      .then(data => {
        if (data && data.webhookUrl) {
          setWebhookUrl(data.webhookUrl);
          localStorage.setItem('gs_webhook_url', data.webhookUrl);
        }
      })
      .catch(() => {});
  }, [selectedLocalidade]);

  // Background Auto-Sync Timer: Updates every 15 minutes without freezing UI
  useEffect(() => {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const interval = setInterval(() => {
      fetchSheetData(undefined, undefined, true);
    }, FIFTEEN_MINUTES_MS);

    return () => clearInterval(interval);
  }, [sheetUrl, selectedLocalidade]);

  // Line threshold start filter state (default 1 or saved in localStorage)
  const [startRow, setStartRow] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('app_start_row');
      return saved ? parseInt(saved, 10) || 1 : 1;
    } catch {
      return 1;
    }
  });

  const handleStartRowChange = (val: number) => {
    const num = isNaN(val) ? 1 : Math.max(1, val);
    setStartRow(num);
    try {
      localStorage.setItem('app_start_row', num.toString());
    } catch (e) {
      console.error(e);
    }
  };

  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const handleLoadCustomData = (customData: StockItem[]) => {
    const merged = applyOverridesToData(customData);
    setItems(merged);
    setSource('custom_csv');
    setStatusMessage(`Carregado com sucesso ${customData.length} registros.`);
    setSelectedItem(merged.length > 0 ? merged[0] : null);
    setLastSyncedAt(new Date());
  };

  // Extract unique statuses and obsStatuses across the dataset
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_WARRANTY_STATUSES.forEach(st => set.add(st));
    items.forEach(i => {
      if (i.statusDevolucao && i.statusDevolucao.trim()) {
        set.add(i.statusDevolucao.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const availableObsStatuses = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.obsStatusDevolucao && i.obsStatusDevolucao.trim()) {
        set.add(i.obsStatusDevolucao.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Strictly filter only items that qualify as Devoluções / Garantias
  const warrantyItems = useMemo(() => {
    return items.filter(item => {
      if (startRow > 1) {
        const rowNum = item._rowIndex ?? 0;
        if (rowNum > 0 && rowNum < startRow) {
          return false;
        }
      }
      return isDevolucaoItem(item);
    });
  }, [items, startRow]);

  // Extract unique clients
  const clients = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.cliente && i.cliente.trim()) {
        set.add(i.cliente.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Get list of stock IDs for suggestions
  const stockIds = useMemo(() => {
    return warrantyItems.map(i => i.idStock).filter(Boolean);
  }, [warrantyItems]);

  // Filter items based on user inputs
  const filteredItems = useMemo(() => {
    return warrantyItems.filter(item => {
      // Filter by ID STOCK / PROTOCOLO
      if (filters.idStock && filters.idStock.trim()) {
        const cleanFilter = filters.idStock.toLowerCase().trim();
        const cleanId = (item.idStock || '').toLowerCase().trim();
        const cleanProtocolo = (item.protocolo || '').toLowerCase().trim();
        if (!cleanId.includes(cleanFilter) && !cleanProtocolo.includes(cleanFilter)) {
          return false;
        }
      }

      // Filter by Cliente
      if (filters.cliente && filters.cliente.trim()) {
        if (item.cliente.trim() !== filters.cliente.trim()) {
          return false;
        }
      }

      // Filter by Endereçamento
      if (filters.enderecamento && filters.enderecamento.trim()) {
        const cleanEnd = filters.enderecamento.toLowerCase().trim();
        const itemEnd = (item.enderecamento || '').toLowerCase().trim();
        if (!itemEnd.includes(cleanEnd)) {
          return false;
        }
      }

      // Filter by Urgentes toggle
      if (filters.apenasUrgentes) {
        if (!item.urgente && !item.statusDevolucao?.toLowerCase().includes('urgente')) {
          return false;
        }
      }

      // Filter 1: Search Term (Descrição, Código, Marca, Fornecedor, etc)
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.toLowerCase().trim();
        const matches =
          (item.protocolo && item.protocolo.toLowerCase().includes(term)) ||
          (item.idStock && item.idStock.toLowerCase().includes(term)) ||
          (item.cliente && item.cliente.toLowerCase().includes(term)) ||
          (item.descricao && item.descricao.toLowerCase().includes(term)) ||
          (item.codigo && item.codigo.toLowerCase().includes(term)) ||
          (item.marca && item.marca.toLowerCase().includes(term)) ||
          (item.fornecedor && item.fornecedor.toLowerCase().includes(term)) ||
          (item.novoFornecedorFilial && item.novoFornecedorFilial.toLowerCase().includes(term)) ||
          (item.statusDevolucao && item.statusDevolucao.toLowerCase().includes(term)) ||
          (item.nfOrigem && item.nfOrigem.toLowerCase().includes(term)) ||
          (item.embalagem && item.embalagem.toLowerCase().includes(term)) ||
          (item.condicaoPeca && item.condicaoPeca.toLowerCase().includes(term)) ||
          (item.enderecamento && item.enderecamento.toLowerCase().includes(term)) ||
          (item.notaFiscalSaida && item.notaFiscalSaida.toLowerCase().includes(term));

        if (!matches) {
          return false;
        }
      }

      // Filter 2: Unified Observations & Motivo Search
      if (filters.obsSearchTerm && filters.obsSearchTerm.trim()) {
        const obsTerm = filters.obsSearchTerm.toLowerCase().trim();
        const matchesObs =
          (item.obsNotaFiscal && item.obsNotaFiscal.toLowerCase().includes(obsTerm)) ||
          (item.observacoesGerais && item.observacoesGerais.toLowerCase().includes(obsTerm)) ||
          (item.motivo && item.motivo.toLowerCase().includes(obsTerm));

        if (!matchesObs) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => getItemPrimaryTimestamp(b) - getItemPrimaryTimestamp(a));
  }, [warrantyItems, filters]);

  // Sync selectedItem with active search results safely
  useEffect(() => {
    if (filteredItems.length > 0) {
      const selectedId = selectedItem?.idStock;
      const stillInList = selectedId ? filteredItems.find(i => i.idStock === selectedId) : undefined;
      if (stillInList) {
        if (selectedItem?.idStock !== stillInList.idStock) {
          setSelectedItem(stillInList);
        }
      } else {
        setSelectedItem(filteredItems[0]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [filteredItems]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem('gs_webhook_url', url);
    fetch('/api/sync-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: url })
    }).catch(() => {});
  };

  const syncItemsToServer = async (itemsToSync: StockItem[]) => {
    try {
      const normalizedItems = itemsToSync.map(item => ({
        ...item,
        observacoesGerais: item.observacoesGerais || (item as any).observacoes || (item as any).obsGerais || (item as any).obs || (item as any).observacao || '',
        observacoes: item.observacoesGerais || (item as any).observacoes || (item as any).obsGerais || (item as any).obs || (item as any).observacao || '',
        obsGerais: item.observacoesGerais || (item as any).observacoes || (item as any).obsGerais || (item as any).obs || (item as any).observacao || '',
        obsNotaFiscal: item.obsNotaFiscal || (item as any).obsNf || '',
        obsNf: item.obsNotaFiscal || (item as any).obsNf || '',
        statusDevolucao: item.statusDevolucao || (item as any).status || '',
        status: item.statusDevolucao || (item as any).status || '',
        obsStatusDevolucao: item.obsStatusDevolucao || (item as any).obsStatus || '',
        obsStatus: item.obsStatusDevolucao || (item as any).obsStatus || '',
        ultimaInteracao: item.ultimaInteracao || (item as any).interacao || '',
        interacao: item.ultimaInteracao || (item as any).interacao || '',
        notaFiscalSaida: item.notaFiscalSaida || (item as any).nfSaida || '',
        nfSaida: item.notaFiscalSaida || (item as any).nfSaida || ''
      }));

      // 1. Server-side sync API call
      const res = await fetch('/api/update-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: normalizedItems,
          webhookUrl: webhookUrl || undefined
        })
      });
      const data = await res.json();
      
      // 2. Client-side direct fallback / dual push if webhookUrl is present
      if (webhookUrl && webhookUrl.trim().startsWith('http')) {
        try {
          fetch(webhookUrl.trim(), {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'update_items',
              items: normalizedItems
            })
          }).catch(() => {});
        } catch (_) {}
      }

      if (data && data.message) {
        setStatusMessage(data.message);
        setTimeout(() => setStatusMessage(undefined), 7000);
      }
    } catch (err) {
      console.error('Failed to sync items to server:', err);
    }
  };

  const handleUpdateItem = (updatedItem: StockItem) => {
    updateItemOverrides([updatedItem]);
    setItems(prev => prev.map(i => i.idStock === updatedItem.idStock ? updatedItem : i));
    if (detailNavList) {
      setDetailNavList(prev => prev ? prev.map(i => i.idStock === updatedItem.idStock ? updatedItem : i) : null);
    }
    if (selectedItem?.idStock === updatedItem.idStock) {
      setSelectedItem(updatedItem);
    }
    if (detailModalItem?.idStock === updatedItem.idStock) {
      setDetailModalItem(updatedItem);
    }
    syncItemsToServer([updatedItem]);
  };

  // Mass / Batch update callback
  const handleBatchUpdateStatus = (
    itemsToUpdate: StockItem[], 
    newStatus?: string, 
    newObsStatusDevolucao?: string, 
    newObs?: string, 
    newNfSaida?: string
  ) => {
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const updatedMap = new Map<string, StockItem>();

    const updatedList = itemsToUpdate.map(orig => {
      // If no bulk fields were passed, the items are already pre-modified with their own individual fields
      if (!newStatus && !newObsStatusDevolucao && !newObs && !newNfSaida) {
        updatedMap.set(orig.idStock, orig);
        return orig;
      }

      const detailParts: string[] = [];
      if (newStatus && newStatus !== orig.statusDevolucao) {
        detailParts.push(`Status: "${orig.statusDevolucao || 'N/A'}" ➔ "${newStatus}"`);
      }
      if (newObsStatusDevolucao !== undefined && newObsStatusDevolucao !== orig.obsStatusDevolucao) {
        detailParts.push(`Obs Status: "${newObsStatusDevolucao}"`);
      }
      if (newObs !== undefined && newObs.trim()) {
        detailParts.push(`Obs Gerais: "${newObs}"`);
      }
      if (newNfSaida !== undefined && newNfSaida.trim()) {
        detailParts.push(`NF Saída: "${newNfSaida}"`);
      }

      const historyDetail = detailParts.length > 0 ? detailParts.join(' | ') : 'Alteração em massa de registros';
      const interacaoText = `${todayShort} - ${historyDetail}`;

      const updated: StockItem = {
        ...orig,
        statusDevolucao: newStatus || orig.statusDevolucao,
        obsStatusDevolucao: newObsStatusDevolucao !== undefined ? newObsStatusDevolucao : orig.obsStatusDevolucao,
        observacoesGerais: newObs !== undefined && newObs.trim() ? newObs : orig.observacoesGerais,
        notaFiscalSaida: newNfSaida !== undefined && newNfSaida.trim() ? newNfSaida : orig.notaFiscalSaida,
        dataUltimaAlteracao: nowStr,
        ultimaInteracao: interacaoText,
        historicoAlteracoes: [
          {
            data: nowStr,
            acao: 'Alteração em massa de Status de Devolução',
            detalhe: historyDetail
          },
          ...(orig.historicoAlteracoes || [])
        ]
      };
      updatedMap.set(orig.idStock, updated);
      return updated;
    });

    updateItemOverrides(updatedList);

    setItems(prev => prev.map(i => updatedMap.get(i.idStock) || i));
    if (detailNavList) {
      setDetailNavList(prev => prev ? prev.map(i => updatedMap.get(i.idStock) || i) : null);
    }

    if (selectedItem && updatedMap.has(selectedItem.idStock)) {
      setSelectedItem(updatedMap.get(selectedItem.idStock)!);
    }
    if (detailModalItem && updatedMap.has(detailModalItem.idStock)) {
      setDetailModalItem(updatedMap.get(detailModalItem.idStock)!);
    }

    syncItemsToServer(updatedList);
  };

  const handleResetFilters = () => {
    setFilters({
      idStock: '',
      cliente: '',
      searchTerm: '',
      obsSearchTerm: '',
      enderecamento: '',
      apenasUrgentes: false
    });
  };

  const handleSelectItem = (item: StockItem, contextList?: StockItem[], contextLabel?: string) => {
    setSelectedItem(item);
    setDetailModalItem(item);
    if (contextList && contextList.length > 0) {
      setDetailNavList(contextList);
      setDetailNavContextLabel(contextLabel || null);
    } else {
      setDetailNavList(null);
      setDetailNavContextLabel(null);
    }
  };

  const handleSelectById = (idStock: string) => {
    const found = items.find(i => i.idStock === idStock);
    if (found) {
      handleSelectItem(found);
      setFilters(prev => ({ ...prev, idStock: found.idStock }));
    }
  };

  // Active navigation items: either the scoped context (e.g. marked items or supplier subset) or filtered list
  const activeNavItems = useMemo(() => {
    if (detailNavList && detailNavList.length > 0) {
      return detailNavList;
    }
    return filteredItems;
  }, [detailNavList, filteredItems]);

  const selectedIndex = selectedItem 
    ? activeNavItems.findIndex(i => (i.idStock && selectedItem.idStock ? i.idStock === selectedItem.idStock : i === selectedItem))
    : -1;

  const modalIndex = detailModalItem 
    ? activeNavItems.findIndex(i => (i.idStock && detailModalItem.idStock ? i.idStock === detailModalItem.idStock : i === detailModalItem))
    : -1;

  const handleNextItem = () => {
    if (activeNavItems.length === 0) return;
    const safeIdx = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIdx = (safeIdx + 1) % activeNavItems.length;
    setSelectedItem(activeNavItems[nextIdx]);
  };

  const handlePrevItem = () => {
    if (activeNavItems.length === 0) return;
    const safeIdx = selectedIndex >= 0 ? selectedIndex : 0;
    const prevIdx = (safeIdx - 1 + activeNavItems.length) % activeNavItems.length;
    setSelectedItem(activeNavItems[prevIdx]);
  };

  const handleNextModalItem = () => {
    if (activeNavItems.length === 0) return;
    const safeIdx = modalIndex >= 0 ? modalIndex : 0;
    const nextIdx = (safeIdx + 1) % activeNavItems.length;
    const nextItem = activeNavItems[nextIdx];
    setSelectedItem(nextItem);
    setDetailModalItem(nextItem);
  };

  const handlePrevModalItem = () => {
    if (activeNavItems.length === 0) return;
    const safeIdx = modalIndex >= 0 ? modalIndex : 0;
    const prevIdx = (safeIdx - 1 + activeNavItems.length) % activeNavItems.length;
    const prevItem = activeNavItems[prevIdx];
    setSelectedItem(prevItem);
    setDetailModalItem(prevItem);
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0f1d] text-slate-100'} font-sans antialiased selection:bg-indigo-500 selection:text-white flex`}>
      {/* Modern Sidebar (Persistent on Desktop, Drawer on Mobile) */}
      <Sidebar
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        activeView={activeView}
        onViewChange={setActiveView}
        onSync={() => fetchSheetData(undefined, undefined, false, true)}
        isLoading={isLoading}
        source={source}
        message={statusMessage}
        totalItems={items.length}
        lastSyncedAt={lastSyncedAt}
        onOpenSheetModal={() => setIsModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenDocModal={() => setIsDocModalOpen(true)}
        hasWebhookConfigured={!!webhookUrl}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace Area (Top Bar + Dynamic View Content) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Clean Header Bar */}
        <Header
          onSync={() => fetchSheetData(undefined, undefined, false, true)}
          isLoading={isLoading}
          source={source}
          message={statusMessage}
          totalItems={items.length}
          onOpenMobileSidebar={() => setIsSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          activeView={activeView}
          onViewChange={setActiveView}
          lastSyncedAt={lastSyncedAt}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        
        {/* Active Warranty & Sheet Reading Banner */}
        <div className={`${
          isLight 
            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' 
            : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200 shadow-md'
        } rounded-xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs border`}>
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <span className={`p-1.5 rounded-lg font-bold flex-shrink-0 ${isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-900/80 text-indigo-400'}`}>📍</span>
            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              Leitura de Devoluções:
            </span>
            <span className={`font-semibold px-2.5 py-1 rounded-lg border ${
              isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60'
            }`}>
              {warrantyItems.length.toLocaleString('pt-BR')} devoluções exibidas {startRow > 1 ? `(a partir da linha ${startRow.toLocaleString('pt-BR')})` : ''} de {items.length.toLocaleString('pt-BR')} registros na planilha
            </span>

            {/* Line Threshold Filter Control */}
            <div className={`flex items-center space-x-2 rounded-lg px-2.5 py-1 border ${
              isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-indigo-700/80 text-white'
            }`}>
              <label className={`font-bold text-xs whitespace-nowrap flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-indigo-300'}`}>
                <span>A partir da linha:</span>
              </label>
              <input
                type="number"
                min={1}
                value={startRow || ''}
                onChange={(e) => handleStartRowChange(parseInt(e.target.value, 10))}
                placeholder="Ex: 25000"
                className={`w-24 border rounded px-2 py-0.5 font-mono text-xs font-bold focus:ring-1 focus:ring-indigo-400 outline-none text-center ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-indigo-500/60 text-white'
                }`}
              />
            </div>

            <div className="flex items-center space-x-1.5 ml-1">
              <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Localidade:</span>
              <select
                value={selectedLocalidade}
                onChange={(e) => setSelectedLocalidade(e.target.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-400 outline-none cursor-pointer border ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-800' 
                    : 'bg-indigo-950 border-indigo-700/80 text-white'
                }`}
              >
                <option value="todas">Todas as Localidades ({warrantyItems.length.toLocaleString('pt-BR')} devoluções)</option>
                {dynamicAvailableLocalidades.map((loc, locIdx) => (
                  <option key={`loc-opt-${loc}-${locIdx}`} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {startRow > 1 && (
              <button
                onClick={() => handleStartRowChange(1)}
                className={`text-[11px] underline font-semibold transition-colors px-2 py-1 rounded border ${
                  isLight 
                    ? 'bg-white text-indigo-700 hover:bg-slate-100 border-indigo-300' 
                    : 'text-indigo-400 hover:text-white bg-indigo-950/80 border-indigo-800'
                }`}
              >
                Resetar para Linha 1
              </button>
            )}
            {selectedLocalidade !== 'todas' && (
              <button
                onClick={() => setSelectedLocalidade('todas')}
                className={`text-[11px] underline font-semibold transition-colors ${
                  isLight ? 'text-indigo-700 hover:text-indigo-900' : 'text-indigo-400 hover:text-white'
                }`}
              >
                Ver Todas as Localidades
              </button>
            )}
          </div>
        </div>

        {/* Yellow Warning Panel when startRow filter returns 0 items */}
        {startRow > 1 && warrantyItems.length === 0 && items.length > 0 && (
          <div className={`border rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-lg ${
            isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/90 border-amber-500/80 text-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <div>
                <div className={`font-bold text-sm ${isLight ? 'text-amber-950' : 'text-amber-100'}`}>
                  A linha inicial configurada ({startRow.toLocaleString('pt-BR')}) está acima do total de registros na planilha ou não retornou nenhum item.
                </div>
                <div className={`text-xs mt-0.5 ${isLight ? 'text-amber-800' : 'text-amber-300/80'}`}>
                  Existem {items.length.toLocaleString('pt-BR')} registros carregados na planilha. Clique no botão ao lado para restaurar a exibição completa.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleStartRowChange(1)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Exibir desde a Linha 1
            </button>
          </div>
        )}

        {/* Status Alert Banner if in Fallback or Notice */}
        {statusMessage && (
          <div className={`border rounded-xl p-3.5 mb-6 flex items-center justify-between text-xs ${
            isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`underline flex-shrink-0 font-semibold ${isLight ? 'text-amber-900 hover:text-amber-950' : 'hover:text-white'}`}
            >
              Configurar Planilha
            </button>
          </div>
        )}

        {/* View Switch: Dashboard vs Devoluções vs Consulta */}
        {activeView === 'dash' ? (
          <Dashboard
            items={warrantyItems}
            theme={theme}
            onSelectItem={handleSelectItem}
          />
        ) : activeView === 'inventario' ? (
          <InventarioView
            items={warrantyItems}
            theme={theme}
          />
        ) : activeView === 'fornecedores' ? (
          <FornecedoresView
            theme={theme}
            itemsFornecedores={itemsFornecedoresMemo}
          />
        ) : activeView === 'garantias' || activeView === 'negociar' ? (
          <NegociarView
            mode="garantias"
            items={warrantyItems}
            theme={theme}
            onSelectItem={handleSelectItem}
            onBatchUpdateStatus={handleBatchUpdateStatus}
          />
        ) : (
          <>
            {/* Stats Summary Bar */}
            <StatsOverview items={warrantyItems} theme={theme} />

            {/* Search & Filter Controls */}
            <Filters
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              clients={clients}
              stockIds={stockIds}
              itemsCount={filteredItems.length}
              totalItems={warrantyItems.length}
              allItems={warrantyItems}
              onSelectItemById={handleSelectById}
              theme={theme}
            />

            {/* Loading Spinner */}
            {isLoading ? (
              <div className={`${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'} border rounded-2xl p-12 text-center my-8 shadow-sm`}>
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
                <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Carregando dados da planilha Google Sheets...
                </p>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'} mt-1`}>
                  Buscando e organizando colunas de estoque e devoluções.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header above table with Etiquetas button */}
                <div className="flex items-center justify-between px-1">
                  <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} font-medium`}>
                    {selectedBrotherIds.size > 0 ? `${selectedBrotherIds.size} ${selectedBrotherIds.size === 1 ? 'item selecionado' : 'itens selecionados'} para impressão` : 'Selecione itens abaixo ou digite as etiquetas direto no formulário'}
                  </span>
                  <div className="flex items-center space-x-2">
                    {selectedBrotherIds.size > 0 && (
                      <button
                        onClick={() => setSelectedBrotherIds(new Set())}
                        className={`text-xs font-semibold px-2 py-1 ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'} cursor-pointer`}
                      >
                        Limpar seleção
                      </button>
                    )}
                    <button
                      onClick={() => setIsBrotherModalOpen(true)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Etiquetas {selectedBrotherIds.size > 0 ? `(${selectedBrotherIds.size})` : ''}</span>
                    </button>
                    <button
                      onClick={() => setIsSupplierLabelModalOpen(true)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Etiq Fornecedor</span>
                    </button>
                  </div>
                </div>

                {/* Row-by-Row Query Results Table */}
                <ItemList
                  items={filteredItems}
                  selectedItem={selectedItem}
                  theme={theme}
                  onSelectItem={handleSelectItem}
                  selectedBrotherIds={selectedBrotherIds}
                  onToggleBrotherSelect={handleToggleBrotherSelect}
                  onToggleSelectAllPage={handleToggleSelectAllPage}
                />

                {/* Inline Selected Item Card (if user prefers inline viewing) */}
                {selectedItem && !detailModalItem && (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'} flex items-center`}>
                        <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                        Ficha Detalhada do Item Selecionado
                      </h3>
                      <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                        ID: <strong className="text-indigo-600 dark:text-indigo-400">{selectedItem.idStock}</strong>
                      </span>
                    </div>
                    <DetailCard
                      item={selectedItem}
                      itemIndex={selectedIndex >= 0 ? selectedIndex : 0}
                      totalMatching={activeNavItems.length}
                      contextLabel={detailNavContextLabel || undefined}
                      availableStatuses={availableStatuses}
                      availableObsStatuses={availableObsStatuses}
                      onNextItem={handleNextItem}
                      onPrevItem={handlePrevItem}
                      onUpdateItem={handleUpdateItem}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      </div>

      {/* Pop-up Modal for Full Item Details */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl custom-scrollbar">
            <DetailCard
              item={detailModalItem}
              itemIndex={modalIndex >= 0 ? modalIndex : 0}
              totalMatching={activeNavItems.length}
              contextLabel={detailNavContextLabel || undefined}
              availableStatuses={availableStatuses}
              availableObsStatuses={availableObsStatuses}
              onNextItem={handleNextModalItem}
              onPrevItem={handlePrevModalItem}
              onClose={() => setDetailModalItem(null)}
              onUpdateItem={handleUpdateItem}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      <GoogleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        webhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
      />

      {/* System Documentation & Manual PDF Modal */}
      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />

      {/* Sheet Management Modal */}
      <SheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUrl={sheetUrl}
        onSyncCustomUrl={(url) => {
          setSheetUrl(url);
          try {
            localStorage.setItem('app_sheet_url', url);
          } catch {}
          fetchSheetData(url);
        }}
        onLoadCustomData={handleLoadCustomData}
        isLoading={isLoading}
      />


      {/* Brother Label Printing Modal */}
      <BrotherLabelModal
        isOpen={isBrotherModalOpen}
        onClose={() => setIsBrotherModalOpen(false)}
        selectedItems={selectedBrotherItems}
        onPrinted={() => setSelectedBrotherIds(new Set())}
        theme={theme}
      />

      {/* Supplier (Fornecedor / Filial / Volume) Label Modal */}
      <SupplierLabelModal
        isOpen={isSupplierLabelModalOpen}
        onClose={() => setIsSupplierLabelModalOpen(false)}
        items={items}
        theme={theme}
      />
    </div>
  );
}
