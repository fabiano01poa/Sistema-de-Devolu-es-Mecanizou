import React, { useState, useMemo, useRef, useEffect } from 'react';
import { QrCode, Search, CheckCircle2, AlertTriangle, RefreshCw, Layers, MapPin, Package, FileText, Check, ArrowRight, Calendar, BarChart3, Clock, AlertCircle, Camera, X } from 'lucide-react';
import { StockItem } from '../types';

interface InventarioViewProps {
  items: StockItem[];
  theme?: 'dark' | 'light';
}

interface VagaInventarioRecord {
  vaga: string;
  dataConclusao: string;
  totalItens: number;
  totalCertos: number;
  totalErrados: number;
  contagens: Record<string, { fisica: number; obs: string; statusBIP: 'ok' | 'divergente' | 'pendente' }>;
}

export const InventarioView: React.FC<InventarioViewProps> = ({ items, theme = 'dark' }) => {
  const isLight = theme === 'light';

  // Histórico de vagas já contadas e finalizadas
  const [vagasConcluidas, setVagasConcluidas] = useState<Record<string, VagaInventarioRecord>>({});
  
  const [selectedVaga, setSelectedVaga] = useState<string>('');
  const [vagaSearchQuery, setVagaSearchQuery] = useState<string>('');
  const [contagens, setContagens] = useState<Record<string, { fisica: number; obs: string; statusBIP: 'ok' | 'divergente' | 'pendente' }>>({});
  const [inventarioConcluido, setInventarioConcluido] = useState<boolean>(false);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrSearchInput, setQrSearchInput] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          // @ts-ignore
          focusMode: 'continuous'
        }
      })
        .then(stream => {
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          // Tentar aplicar foco contínuo nas tracks de vídeo se suportado pelo navegador/hardware
          const track = stream.getVideoTracks()[0];
          if (track && typeof track.applyConstraints === 'function') {
            track.applyConstraints({
              // @ts-ignore
              advanced: [{ focusMode: 'continuous' }, { zoom: 1.0 }]
            }).catch(() => {});
          }
        })
        .catch(err => {
          console.error("Erro ao acessar a câmera:", err);
          alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
          setCameraActive(false);
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraActive]);

  // Extrair lista de vagas únicas disponíveis no sistema
  const availableVagas = useMemo(() => {
    const setVagas = new Set<string>();
    items.forEach(i => {
      const vaga = i.enderecamento || i.localidade;
      if (vaga && vaga.trim() !== '') {
        setVagas.add(vaga.trim());
      }
    });
    return Array.from(setVagas).sort();
  }, [items]);

  // Itens que pertencem à vaga selecionada no sistema
  const itensNaVaga = useMemo(() => {
    if (!selectedVaga) return [];
    return items.filter(i => {
      const v = i.enderecamento || i.localidade;
      return v && v.trim() === selectedVaga;
    });
  }, [items, selectedVaga]);

  // Dashboard Geral de Inventário
  const dashStats = useMemo(() => {
    let totalSistemaPecas = 0;
    let totalContadasPecas = 0;
    let vagasCountTotal = availableVagas.length;
    let vagasContadasCount = Object.keys(vagasConcluidas).length;

    let totalCertos = 0;
    let totalErrados = 0;

    items.forEach(i => {
      totalSistemaPecas += parseInt(i.quantEstoque || '1', 10) || 1;
    });

    Object.values(vagasConcluidas).forEach((rec: VagaInventarioRecord) => {
      const vItens = items.filter(i => (i.enderecamento || i.localidade)?.trim() === rec.vaga);
      vItens.forEach(item => {
        const sys = parseInt(item.quantEstoque || '1', 10) || 1;
        const recordFisica = rec.contagens[item.idStock]?.fisica ?? sys;
        totalContadasPecas += recordFisica;
        if (recordFisica === sys && rec.contagens[item.idStock]?.statusBIP !== 'divergente') {
          totalCertos++;
        } else {
          totalErrados++;
        }
      });
    });

    const percentContado = vagasCountTotal > 0 ? Math.round((vagasContadasCount / vagasCountTotal) * 100) : 0;
    const totalItensAvaliados = totalCertos + totalErrados;
    const assertividade = totalItensAvaliados > 0 ? Math.round((totalCertos / totalItensAvaliados) * 100) : 100;
    const percentErros = totalItensAvaliados > 0 ? Math.round((totalErrados / totalItensAvaliados) * 100) : 0;

    return {
      totalSistemaPecas,
      totalContadasPecas,
      vagasCountTotal,
      vagasContadasCount,
      percentContado,
      assertividade,
      percentErros,
      totalCertos,
      totalErrados
    };
  }, [items, availableVagas, vagasConcluidas]);

  const handleUpdateContagem = (idStock: string, quant: number, statusBIP: 'ok' | 'divergente' | 'pendente', obs: string = '') => {
    setContagens(prev => ({
      ...prev,
      [idStock]: { fisica: Math.max(0, quant), obs, statusBIP }
    }));
  };

  const handleBiparItem = (itemToBip: StockItem, status?: 'ok' | 'divergente') => {
    const sys = parseInt(itemToBip.quantEstoque || '1', 10) || 1;
    const itemEnderecamento = (itemToBip.enderecamento || itemToBip.localidade || '').trim();
    const isMismatched = itemEnderecamento !== '' && itemEnderecamento.toLowerCase() !== selectedVaga.toLowerCase();

    const determinedStatus = isMismatched ? 'divergente' : (status || 'ok');
    const defaultObs = isMismatched 
      ? `Endereçamento divergente: consta como "${itemEnderecamento}" mas bipado na vaga "${selectedVaga}"`
      : '';

    const current = contagens[itemToBip.idStock];
    const fisica = determinedStatus === 'ok' ? sys : (current?.fisica ?? sys);
    const obs = current?.obs || defaultObs;
    
    handleUpdateContagem(itemToBip.idStock, fisica, determinedStatus, obs);
  };

  const handleSimulateQrScan = (scannedCode: string) => {
    const found = itensNaVaga.find(i => 
      i.codigo?.toLowerCase() === scannedCode.toLowerCase() ||
      i.idStock?.toLowerCase() === scannedCode.toLowerCase() ||
      i.codigoAlternativo?.toLowerCase() === scannedCode.toLowerCase()
    );

    if (found) {
      handleBiparItem(found, 'ok');
      setQrSearchInput('');
      setQrModalOpen(false);
    } else {
      alert(`Peça "${scannedCode}" não encontrada nesta vaga (${selectedVaga}). Verifique o código.`);
    }
  };

  const handleFinalizarVaga = () => {
    if (!selectedVaga) return;

    // Verificar se há peças pendentes não bipadas
    const pendingItems = itensNaVaga.filter(item => {
      const current = contagens[item.idStock];
      return !current || current.statusBIP === 'pendente';
    });

    if (pendingItems.length > 0) {
      const confirmMsg = `Existem ${pendingItems.length} ${pendingItems.length === 1 ? 'peça pendente' : 'peças pendentes'} não bipadas nesta vaga. Deseja finalizar? Se finalizar, essas peças serão marcadas como "Não localizada na vaga" (erros) e a vaga será finalizada ajustando só para as que ficaram ok.`;
      if (!window.confirm(confirmMsg)) {
        return;
      }

      // Marcar pendentes como divergente com "Não localizada na vaga"
      const updated = { ...contagens };
      pendingItems.forEach(item => {
        const sys = parseInt(item.quantEstoque || '1', 10) || 1;
        updated[item.idStock] = {
          fisica: sys,
          obs: 'Não localizada na vaga',
          statusBIP: 'divergente'
        };
      });
      setContagens(updated);
    }

    let certos = 0;
    let errados = 0;

    const updatedContagens: Record<string, { fisica: number; obs: string; statusBIP: 'ok' | 'divergente' | 'pendente' }> = {};

    itensNaVaga.forEach(item => {
      const sys = parseInt(item.quantEstoque || '1', 10) || 1;
      const existing = contagens[item.idStock];
      const itemEnderecamento = (item.enderecamento || item.localidade || '').trim();
      const isMismatched = itemEnderecamento !== '' && itemEnderecamento.toLowerCase() !== selectedVaga.toLowerCase();

      let statusBIP = existing?.statusBIP || (isMismatched ? 'divergente' : 'ok');
      const fisica = existing?.fisica ?? sys;
      let obs = existing?.obs || '';

      if (isMismatched && !obs) {
        obs = `Endereçamento divergente: consta como "${itemEnderecamento}" mas bipado na vaga "${selectedVaga}"`;
        statusBIP = 'divergente';
      }

      updatedContagens[item.idStock] = {
        fisica,
        obs,
        statusBIP
      };

      if (statusBIP === 'ok' && !isMismatched && fisica === sys) {
        certos++;
      } else {
        errados++;
      }
    });

    const record: VagaInventarioRecord = {
      vaga: selectedVaga,
      dataConclusao: new Date().toLocaleString('pt-BR'),
      totalItens: itensNaVaga.length,
      totalCertos: certos,
      totalErrados: errados,
      contagens: updatedContagens
    };

    setVagasConcluidas(prev => ({
      ...prev,
      [selectedVaga]: record
    }));
    setInventarioConcluido(true);
  };

  const handleReiniciarCicloGeral = () => {
    if (window.confirm('Deseja iniciar um novo ciclo de inventário? Todas as marcações de concluído serão limpas para recontagem.')) {
      setVagasConcluidas({});
      setSelectedVaga('');
      setContagens({});
      setInventarioConcluido(false);
    }
  };

  // Cores de fundo e texto
  const bgCard = isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Ação de Novo Ciclo */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isLight ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100' : 'bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border-indigo-900/30'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                <QrCode className="w-5 h-5" />
              </span>
              <h1 className={`text-xl font-bold tracking-tight ${textPrimary}`}>
                Inventário de Vagas & Acuracidade
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
                Ciclo Ativo
              </span>
            </div>
            <p className={`text-xs ${textMuted} mt-1`}>
              Selecione as vagas para contagem física. As vagas concluídas ficam marcadas com data e cor diferenciada até que você inicie um novo ciclo.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReiniciarCicloGeral}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/40 flex items-center space-x-2 transition-all cursor-pointer flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Iniciar Novo Ciclo Geral</span>
          </button>
        </div>
      </div>

      {/* Dashboard Resumo de Inventário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm space-y-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase ${textMuted}`}>Progresso Vagas</span>
            <MapPin className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${textPrimary}`}>
              {dashStats.vagasContadasCount} / {dashStats.vagasCountTotal}
            </span>
            <span className="text-xs font-semibold text-indigo-500 font-mono">
              ({dashStats.percentContado}% contado)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${dashStats.percentContado}%` }} />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm space-y-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase ${textMuted}`}>Assertividade Geral</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono text-emerald-500`}>
              {dashStats.assertividade}%
            </span>
            <span className={`text-xs ${textMuted}`}>de exatidão</span>
          </div>
          <p className={`text-[11px] ${textMuted} mt-1`}>
            {dashStats.totalCertos} itens corretos vs {dashStats.totalErrados} com divergência
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm space-y-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase ${textMuted}`}>Peças no Sistema</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${textPrimary}`}>
              {dashStats.totalSistemaPecas}
            </span>
            <span className={`text-xs ${textMuted}`}>unidades</span>
          </div>
          <p className={`text-[11px] ${textMuted} mt-1`}>
            Base cadastrada atual
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm space-y-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase ${textMuted}`}>Taxa de Erros</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono text-amber-500`}>
              {dashStats.percentErros}%
            </span>
            <span className={`text-xs ${textMuted}`}>divergentes</span>
          </div>
          <p className={`text-[11px] ${textMuted} mt-1`}>
            Requer ajuste em espelho
          </p>
        </div>
      </div>

      {/* Seleção de Vaga */}
      <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <h3 className={`text-sm font-bold ${textPrimary}`}>1. Selecionar ou Buscar Vaga para Inventariar</h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar vaga (ex: A1, 01)..."
              value={vagaSearchQuery}
              onChange={(e) => setVagaSearchQuery(e.target.value)}
              className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
              }`}
            />
          </div>
        </div>

        {availableVagas.length === 0 ? (
          <div className={`p-4 rounded-xl border text-center ${isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/30 border-amber-900/50 text-amber-300'}`}>
            Nenhuma vaga/endereçamento encontrado nos itens carregados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
            {availableVagas
              .filter(vaga => vaga.toLowerCase().includes(vagaSearchQuery.toLowerCase()))
              .map(vaga => {
                const isSelected = selectedVaga === vaga;
                const isConcluida = !!vagasConcluidas[vaga];
                const record = vagasConcluidas[vaga];
                const itemCount = items.filter(i => (i.enderecamento || i.localidade)?.trim() === vaga).length;

                return (
                  <button
                    key={vaga}
                    type="button"
                    onClick={() => {
                      setSelectedVaga(vaga);
                      if (record) {
                        setContagens(record.contagens);
                        setInventarioConcluido(true);
                      } else {
                        setContagens({});
                        setInventarioConcluido(false);
                      }
                      // Automaticamente abre a modal de bipar QR Code da vaga ao selecionar
                      setQrModalOpen(true);
                      setCameraActive(true);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-950/40 ring-2 ring-indigo-400/20'
                        : isConcluida
                        ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                        : isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        {isConcluida ? (
                          <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                        ) : (
                          <Package className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                        )}
                        <span className="font-bold text-sm truncate">{vaga}</span>
                      </div>

                      <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-indigo-100' : isConcluida ? 'text-emerald-600 dark:text-emerald-400' : textMuted}`}>
                        {isConcluida ? (
                          <span className="flex items-center space-x-1 font-mono">
                            <Clock className="w-3 h-3 inline" />
                            <span>Contado: {record.dataConclusao.slice(0, 10)}</span>
                          </span>
                        ) : (
                          <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'} (Bipar)</span>
                        )}
                      </div>
                    </div>
                    <Camera className={`w-4 h-4 ${isSelected ? 'text-white' : textMuted}`} />
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* Seção de Contagem da Vaga Selecionada */}
      {selectedVaga && !inventarioConcluido && (
        <div className={`p-6 rounded-2xl border ${bgCard} shadow-sm space-y-6 animate-fadeIn`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/30">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs">
                  Vaga: {selectedVaga}
                </span>
                <span className={`text-xs ${textMuted}`}>
                  ({itensNaVaga.length} {itensNaVaga.length === 1 ? 'item' : 'itens'} alocados)
                </span>
              </div>
              <p className={`text-xs ${textMuted} mt-1`}>
                Bipe o QR Code das peças da vaga ou clique em OK / Divergente em cada item. O que estiver na vaga e não for registrado como erro será considerado OK ao finalizar.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40 flex items-center space-x-2 cursor-pointer transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Bipar QR Code da Peça</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContagens({});
                  setInventarioConcluido(false);
                }}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1 transition-colors ${
                  isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Modal de Simulação de Leitura de QR Code */}
          {qrModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`w-full max-w-md p-6 rounded-2xl border ${bgCard} shadow-2xl space-y-4`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-5 h-5 text-indigo-500" />
                    <h3 className={`text-base font-bold ${textPrimary}`}>Leitor QR Code / Código de Barras</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${textMuted}`}>
                      Aproxime a câmera do QR Code da peça ou utilize a pistola de bipagem:
                    </p>
                    <button
                      type="button"
                      onClick={() => setCameraActive(!cameraActive)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1 ${
                        cameraActive 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{cameraActive ? 'Câmera Ativa (Live)' : 'Ligar Câmera'}</span>
                    </button>
                  </div>

                  {/* Câmera Real (Live Streaming) */}
                  {cameraActive && (
                    <div className="space-y-1.5">
                      <div className="relative w-full h-72 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                        <div className="absolute w-48 h-48 border-2 border-dashed border-emerald-400 rounded-2xl animate-pulse flex items-center justify-center pointer-events-none">
                          <span className="text-[11px] text-emerald-200 font-mono text-center px-3 bg-slate-950/85 py-1 rounded-lg">Centralize o QR Code / Código</span>
                        </div>
                        <div className="absolute bottom-2 text-xs text-emerald-400 font-mono bg-emerald-950/90 px-3 py-1 rounded-lg border border-emerald-800 flex items-center space-x-1.5 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Câmera HD Ativa (Foco Automático)</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-400/90 text-center font-medium">
                        💡 Dica: Mantenha a câmera a cerca de 15 a 25 cm do código para que a lente do celular faça o foco automático (macro).
                      </p>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ex: TC9093 ou ID..."
                      value={qrSearchInput}
                      onChange={(e) => setQrSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && qrSearchInput.trim()) {
                          handleSimulateQrScan(qrSearchInput.trim());
                        }
                      }}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl border text-sm font-mono ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (qrSearchInput.trim()) handleSimulateQrScan(qrSearchInput.trim());
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Bipar
                    </button>
                  </div>

                  {/* Sugestões rápidas de itens da vaga para teste */}
                  <div className="pt-2">
                    <span className={`text-[10px] uppercase font-bold block ${textMuted} mb-1.5`}>Sugestões rápidas para teste (clique para bipar):</span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {itensNaVaga.map(it => (
                        <button
                          key={it.idStock}
                          type="button"
                          onClick={() => handleSimulateQrScan(it.codigo || it.idStock)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-mono font-semibold"
                        >
                          {it.codigo} - {it.descricao?.slice(0, 18)}...
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {itensNaVaga.length === 0 ? (
            <div className={`p-8 text-center rounded-xl border border-dashed ${isLight ? 'border-slate-300 text-slate-500' : 'border-slate-700 text-slate-400'}`}>
              Nenhum item alocado para esta vaga no sistema atual.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {itensNaVaga.map((item, idx) => {
                  const sistemaQty = parseInt(item.quantEstoque || '1', 10) || 1;
                  const currentContagem = contagens[item.idStock];
                  const fisicaQty = currentContagem !== undefined ? currentContagem.fisica : sistemaQty;
                  const itemObs = currentContagem?.obs || '';
                  const statusBIP = currentContagem?.statusBIP || 'pendente';

                  const itemEnderecamento = (item.enderecamento || item.localidade || '').trim();
                  const isMismatched = itemEnderecamento !== '' && itemEnderecamento.toLowerCase() !== selectedVaga.toLowerCase();
                  const hasDivergence = statusBIP === 'divergente' || fisicaQty !== sistemaQty || isMismatched;

                  return (
                    <div 
                      key={item.idStock} 
                      className={`p-4 rounded-xl border transition-all ${
                        isMismatched
                          ? isLight ? 'bg-red-50/90 border-red-300 text-red-950' : 'bg-red-950/30 border-red-900/60 text-red-200'
                          : statusBIP === 'ok'
                          ? isLight ? 'bg-emerald-50/50 border-emerald-300' : 'bg-emerald-950/20 border-emerald-900/40'
                          : hasDivergence
                          ? isLight ? 'bg-amber-50/70 border-amber-300' : 'bg-amber-950/20 border-amber-900/40'
                          : isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              #{idx + 1} • ID: {item.idStock}
                            </span>
                            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">
                              Cód: {item.codigo}
                            </span>
                            {isMismatched ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span>Endereço Divergente ({itemEnderecamento})</span>
                              </span>
                            ) : statusBIP === 'ok' ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Bipado OK</span>
                              </span>
                            ) : statusBIP === 'divergente' ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Apontado Divergente</span>
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">
                                Aguardando Bip
                              </span>
                            )}
                          </div>
                          <h4 className={`text-sm font-bold truncate ${textPrimary}`}>
                            {item.descricao || 'Sem descrição'}
                          </h4>
                          <p className={`text-xs ${textMuted}`}>
                            Cliente: <span className="font-medium">{item.cliente || 'N/D'}</span> | Fornecedor: <span className="font-medium">{item.fornecedor || 'N/D'}</span> | Endereçamento Cadastrado: <strong className="text-indigo-400">{itemEnderecamento || 'Não definido'}</strong>
                          </p>

                          {isMismatched && (
                            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-1.5 mt-1">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                              <span>Atenção: Endereçamento no sistema é &quot;{itemEnderecamento}&quot;, diferente da vaga atual ({selectedVaga}). A peça ficará vermelha e registrada como erro na finalização.</span>
                            </div>
                          )}

                          {hasDivergence && !isMismatched && (
                            <div className="pt-2">
                              <input
                                type="text"
                                placeholder="Motivo do erro / Observação da divergência..."
                                value={itemObs}
                                onChange={(e) => handleUpdateContagem(item.idStock, fisicaQty, 'divergente', e.target.value)}
                                className={`w-full text-xs px-3 py-1.5 rounded-lg border font-medium ${
                                  isLight ? 'bg-white border-amber-300 text-slate-900' : 'bg-slate-950 border-amber-900/60 text-slate-200'
                                }`}
                              />
                            </div>
                          )}
                        </div>

                        {/* Botões rápidos Bipar OK / Divergente + Controles Físicos */}
                        <div className="flex items-center space-x-3 flex-shrink-0 flex-wrap gap-y-2">
                          <div className="flex items-center space-x-1.5 bg-slate-800/40 p-1 rounded-xl border border-slate-700/40">
                            <button
                              type="button"
                              onClick={() => handleBiparItem(item, 'ok')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                                statusBIP === 'ok'
                                  ? 'bg-emerald-600 text-white shadow-md'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>OK na Vaga</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBiparItem(item, 'divergente')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                                statusBIP === 'divergente'
                                  ? 'bg-amber-600 text-white shadow-md'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Erro / Divergente</span>
                            </button>
                          </div>

                          <div className="flex items-center space-x-2 bg-slate-900/20 p-1 rounded-xl border border-slate-700/40">
                            <span className={`text-[10px] uppercase font-bold pl-2 ${textMuted}`}>Qtd:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateContagem(item.idStock, fisicaQty - 1, statusBIP, itemObs)}
                              className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={fisicaQty}
                              onChange={(e) => handleUpdateContagem(item.idStock, parseInt(e.target.value) || 0, statusBIP, itemObs)}
                              className="w-12 text-center bg-slate-950 text-white font-mono font-bold rounded-lg py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateContagem(item.idStock, fisicaQty + 1, statusBIP, itemObs)}
                              className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ação de Conclusão e Relatório da Vaga */}
              <div className="pt-4 border-t border-slate-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className={`text-xs ${textMuted}`}>
                  💡 O que estiver na vaga e não for registrado como erro será considerado <strong>OK</strong> ao finalizar.
                </div>
                <button
                  type="button"
                  onClick={handleFinalizarVaga}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-950/50 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Finalizar Vaga & Ver Resumo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Relatório / Espelho Gerado após Conclusão */}
      {inventarioConcluido && selectedVaga && (
        <div className={`p-6 rounded-2xl border ${bgCard} shadow-lg border-emerald-500/40 space-y-6 animate-fadeIn`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/30">
            <div className="flex items-center space-x-3">
              <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className={`text-base font-bold ${textPrimary}`}>
                    Relatório da Vaga: {selectedVaga}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    Concluído em {vagasConcluidas[selectedVaga]?.dataConclusao}
                  </span>
                </div>
                <p className={`text-xs ${textMuted}`}>
                  Análise detalhada de acerto, erros, motivos informados e ajustes propostos para o estoque.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setInventarioConcluido(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Editar Contagem
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700/60'}`}>
              <span className={`text-[10px] uppercase font-bold block ${textMuted}`}>Total na Vaga</span>
              <span className={`text-xl font-bold font-mono ${textPrimary}`}>{itensNaVaga.length}</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700/60'}`}>
              <span className={`text-[10px] uppercase font-bold block ${textMuted}`}>Itens Certos (OK)</span>
              <span className={`text-xl font-bold font-mono text-emerald-500`}>
                {vagasConcluidas[selectedVaga]?.totalCertos || 0}
              </span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700/60'}`}>
              <span className={`text-[10px] uppercase font-bold block ${textMuted}`}>Itens Errados / Divergentes</span>
              <span className={`text-xl font-bold font-mono text-amber-500`}>
                {vagasConcluidas[selectedVaga]?.totalErrados || 0}
              </span>
            </div>
          </div>

          {/* Listagem detalhada dos ajustes e motivos */}
          <div className="space-y-3 pt-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>Detalhamento dos Itens e Ajustes Propostos</h4>
            <div className="space-y-2">
              {itensNaVaga.map(item => {
                const sys = parseInt(item.quantEstoque || '1', 10) || 1;
                const record = vagasConcluidas[selectedVaga];
                const fis = record?.contagens[item.idStock]?.fisica ?? sys;
                const obs = record?.contagens[item.idStock]?.obs || 'Nenhum motivo informado';
                const isErr = fis !== sys;

                return (
                  <div key={item.idStock} className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isErr 
                      ? isLight ? 'bg-amber-50/70 border-amber-300' : 'bg-amber-950/20 border-amber-900/40' 
                      : isLight ? 'bg-white border-slate-200' : 'bg-slate-800/30 border-slate-700/60'
                  }`}>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-indigo-500">ID: {item.idStock}</span>
                        <span className="font-mono text-slate-400">Cód: {item.codigo}</span>
                        <span className="font-bold truncate text-slate-200">{item.descricao}</span>
                      </div>
                      {isErr && (
                        <div className="text-amber-400 font-medium flex items-center space-x-1 pt-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Motivo / Observação: <strong>{obs}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 flex-shrink-0 font-mono">
                      <div>Sistema: <strong className="text-white">{sys}</strong></div>
                      <div>Físico: <strong className={isErr ? 'text-amber-400' : 'text-emerald-400'}>{fis}</strong></div>
                      <div>
                        {isErr ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">Ajustar: {fis - sys > 0 ? `+${fis - sys}` : fis - sys}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Correto</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
