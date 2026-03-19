import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { APP_VERSION, APP_NAME } from '@/lib/version';
import { useMissoes } from '@/hooks/useMissoes';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useLocalizadorMotoristas } from '@/hooks/useLocalizadorMotoristas';
import { useServerTime } from '@/hooks/useServerTime';
import { useTutorial, supervisorSteps } from '@/hooks/useTutorial';
import { useUserNames } from '@/hooks/useUserNames';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Viagem } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import { 
  ChevronLeft,
  MoreVertical,
  LogOut,
  Fuel,
  Bus,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { SupervisorBottomNav, SupervisorTabId } from '@/components/app/SupervisorBottomNav';
import { SupervisorFrotaTab } from '@/components/app/SupervisorFrotaTab';
import { SupervisorLocalizadorTab } from '@/components/app/SupervisorLocalizadorTab';
import { ViagemCardOperador } from '@/components/app/ViagemCardOperador';
import { ShuttleCardOperador } from '@/components/app/ShuttleCardOperador';
import { MissaoCardMobile } from '@/components/app/MissaoCardMobile';
import { CreateViagemForm } from '@/components/app/CreateViagemForm';
import { CreateShuttleForm } from '@/components/app/CreateShuttleForm';
import { ShuttleEncerrarModal } from '@/components/app/ShuttleEncerrarModal';
import { NewActionModal, ActionType } from '@/components/app/NewActionModal';
import { MissaoInstantaneaModal } from '@/components/motoristas/MissaoInstantaneaModal';
import { MissaoDeslocamentoModal } from '@/components/motoristas/MissaoDeslocamentoModal';
import { OperadorHistoricoTab } from '@/components/app/OperadorHistoricoTab';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { TutorialPopover } from '@/components/app/TutorialPopover';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { useAlertasFrota } from '@/hooks/useAlertasFrota';
import { SupervisorAlertasModal } from '@/components/app/SupervisorAlertasModal';

// Memoized tab components
const MemoizedFrotaTab = memo(SupervisorFrotaTab);
const MemoizedLocalizadorTab = memo(SupervisorLocalizadorTab);
const MemoizedHistoricoTab = OperadorHistoricoTab;

// Card simples para viagem encerrada (shuttle ou transfer)
function ViagemEncerradaCard({ viagem, getName }: { viagem: Viagem; getName: (id: string) => string }) {
  const horario = viagem.h_inicio_real 
    ? format(new Date(viagem.h_inicio_real), 'HH:mm')
    : '--:--';
  const criador = viagem.criado_por ? getName(viagem.criado_por) : '';
  const nomeViagem = viagem.coordenador;
  const isShuttle = viagem.tipo_operacao === 'shuttle';

  return (
    <div className="bg-card border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="bg-primary/10 rounded-full p-1.5 shrink-0">
            {isShuttle ? (
              <Users className="h-4 w-4 text-primary" />
            ) : (
              <ArrowRightLeft className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            {nomeViagem && <p className="text-sm font-medium truncate">{nomeViagem}</p>}
            {!nomeViagem && viagem.ponto_embarque && (
              <p className="text-sm font-medium truncate">{viagem.ponto_embarque} → {viagem.ponto_desembarque || '?'}</p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{viagem.qtd_pax || 0}↑</span>
              {isShuttle && (
                <span className="text-base font-bold text-muted-foreground">{viagem.qtd_pax_retorno || 0}↓</span>
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {viagem.tipo_operacao}
              </Badge>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-mono text-muted-foreground">{horario}</span>
          {criador && (
            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{criador}</p>
          )}
        </div>
      </div>
      {viagem.observacao && (
        <p className="text-xs text-muted-foreground mt-1.5 truncate">
          {viagem.observacao}
        </p>
      )}
    </div>
  );
}

// Filter pills component
function FiltroTipoPills({ tipos, filtroAtivo, onChange }: {
  tipos: string[];
  filtroAtivo: string | null;
  onChange: (tipo: string | null) => void;
}) {
  if (tipos.length <= 1) return null;

  const labels: Record<string, string> = {
    shuttle: 'Shuttle',
    missao: 'Missão',
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
          filtroAtivo === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent'
        }`}
      >
        Todos
      </button>
      {tipos.map(tipo => (
        <button
          key={tipo}
          onClick={() => onChange(tipo)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            filtroAtivo === tipo
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {labels[tipo] || tipo}
        </button>
      ))}
    </div>
  );
}

interface Evento {
  nome_planilha: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  horario_virada_dia?: string | null;
  tipos_viagem_habilitados?: string[] | null;
}

export default function AppSupervisor() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const userName = profile?.full_name || user?.email || '';
  const { getAgoraSync } = useServerTime();
  
  const [activeTab, setActiveTab] = useState<SupervisorTabId>('frota');
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [apenasMinhas, setApenasMinhas] = useState(true);
  const [viagemParaEncerrar, setViagemParaEncerrar] = useState<Viagem | null>(null);
  
  // Modals
  const [showNovaViagem, setShowNovaViagem] = useState(false);
  const [showShuttleForm, setShowShuttleForm] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showMissaoInstantanea, setShowMissaoInstantanea] = useState(false);
  const [showAlertasModal, setShowAlertasModal] = useState(false);
  const [showMissaoDeslocamento, setShowMissaoDeslocamento] = useState(false);
  const [preselectedTipo, setPreselectedTipo] = useState<string>('shuttle');
  const [shuttleMode, setShuttleMode] = useState<'rapido' | 'completo'>('rapido');
  
  // Dia operacional
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(getAgoraSync(), '04:00')
  );
  const [verTodosDias, setVerTodosDias] = useState(false);
  
  // Tutorial system
  const tutorial = useTutorial('supervisor', supervisorSteps);

  const tiposHabilitados = useMemo(() => 
    evento?.tipos_viagem_habilitados || ['shuttle'],
    [evento?.tipos_viagem_habilitados]
  );

  // Atualizar data operacional quando evento carregar
  useEffect(() => {
    if (evento?.horario_virada_dia) {
      setDataOperacional(getDataOperacional(getAgoraSync(), evento.horario_virada_dia));
    }
  }, [evento?.horario_virada_dia, getAgoraSync]);

  // Buscar viagens com filtro de data
  const viagensOptions = useMemo(() => {
    const opts: any = {};
    if (!verTodosDias) {
      opts.dataOperacional = dataOperacional;
      opts.horarioVirada = evento?.horario_virada_dia || '04:00';
    }
    return opts;
  }, [dataOperacional, evento?.horario_virada_dia, verTodosDias]);

  const { viagens, loading: loadingViagens, refreshing, refetch: refetchViagens } = useViagens(eventoId, viagensOptions);
  const { refetch: refetchMotoristas } = useLocalizadorMotoristas(eventoId || '');

  // Missões
  const hasMissao = tiposHabilitados.includes('missao');
  const { 
    missoesAtivas, 
    missoesConcluidas,
    missoesCanceladas,
    createMissao, 
    aceitarMissao, 
    iniciarMissao, 
    concluirMissao,
    refetch: refetchMissoes,
  } = useMissoes(hasMissao ? eventoId : undefined);

  const { motoristas } = useMotoristas(eventoId);
  const { veiculos } = useVeiculos(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const { alertas, atualizarStatus: atualizarAlertaStatus } = useAlertasFrota(eventoId);

  // Filter viagens by selected tipo + "apenas minhas"
  const viagensFiltradas = useMemo(() => {
    let result = viagens;
    if (apenasMinhas && user?.id) {
      result = result.filter(v => v.criado_por === user.id || v.iniciado_por === user.id);
    }
    if (filtroTipo && filtroTipo !== 'missao') {
      result = result.filter(v => v.tipo_operacao === filtroTipo);
    }
    return result;
  }, [viagens, filtroTipo, apenasMinhas, user?.id]);

  // Separate active vs finished
  const viagensAtivas = useMemo(() => 
    viagensFiltradas.filter(v => !v.encerrado && v.status !== 'cancelado' && v.status !== 'encerrado'),
    [viagensFiltradas]
  );

  const viagensEncerradas = useMemo(() => 
    viagensFiltradas.filter(v => v.encerrado || v.status === 'encerrado' || v.status === 'cancelado'),
    [viagensFiltradas]
  );

  // Missões filtradas
  const missoesAtivasFiltradas = useMemo(() => {
    if (filtroTipo && filtroTipo !== 'missao') return [];
    return missoesAtivas;
  }, [missoesAtivas, filtroTipo]);

  const missoesFinalizadasFiltradas = useMemo(() => {
    if (filtroTipo && filtroTipo !== 'missao') return [];
    return [...missoesConcluidas, ...missoesCanceladas];
  }, [missoesConcluidas, missoesCanceladas, filtroTipo]);

  // Get creator names
  const creatorIds = useMemo(() => 
    viagens.map(v => v.criado_por).filter(Boolean) as string[], 
    [viagens]
  );
  const { getName } = useUserNames(creatorIds);

  // Summary metrics
  const summary = useMemo(() => {
    const totalPaxIda = viagensFiltradas.reduce((sum, v) => sum + (v.qtd_pax || 0), 0);
    const totalPaxVolta = viagensFiltradas.reduce((sum, v) => sum + (v.qtd_pax_retorno || 0), 0);
    return {
      total: viagensFiltradas.length + missoesAtivasFiltradas.length + missoesFinalizadasFiltradas.length,
      ativas: viagensAtivas.length + missoesAtivasFiltradas.length,
      totalPaxIda,
      totalPaxVolta,
      totalPax: totalPaxIda + totalPaxVolta,
    };
  }, [viagensFiltradas, viagensAtivas, missoesAtivasFiltradas, missoesFinalizadasFiltradas]);

  // Sort
  const sortedAtivas = useMemo(() => 
    [...viagensAtivas].sort((a, b) => 
      new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
    ), [viagensAtivas]
  );

  const sortedEncerradas = useMemo(() => 
    [...viagensEncerradas].sort((a, b) => 
      new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
    ), [viagensEncerradas]
  );

  // Pagination
  const { visibleItems: ativasVisiveis, hasMore: hasMoreAtivas, loadMore: loadMoreAtivas, total: totalAtivas, pageSize: pageSizeAtivas } = usePaginatedList(sortedAtivas, { defaultPageSize: 10 });
  const { visibleItems: encerradasVisiveis, hasMore: hasMoreEnc, loadMore: loadMoreEnc, total: totalEnc, pageSize: pageSizeEnc } = usePaginatedList(sortedEncerradas, { defaultPageSize: 10 });
  const { visibleItems: missoesAtivasVisiveis, hasMore: hasMoreMissAtivas, loadMore: loadMoreMissAtivas, total: totalMissAtivas, pageSize: pageSizeMissAtivas } = usePaginatedList(missoesAtivasFiltradas, { defaultPageSize: 10 });
  const { visibleItems: missoesFinVisiveis, hasMore: hasMoreMissFin, loadMore: loadMoreMissFin, total: totalMissFin, pageSize: pageSizeMissFin } = usePaginatedList(missoesFinalizadasFiltradas, { defaultPageSize: 10 });

  useEffect(() => {
    if (eventoId) {
      fetchEvento();
    }
  }, [eventoId]);

  const fetchEvento = async () => {
    const { data } = await supabase
      .from('eventos')
      .select('nome_planilha, data_inicio, data_fim, horario_virada_dia, tipos_viagem_habilitados')
      .eq('id', eventoId)
      .single();
    
    if (data) setEvento(data);
    setLoading(false);
  };

  const handleTabChange = (tab: SupervisorTabId) => {
    if (tab === 'nova') {
      if (tiposHabilitados.length === 1) {
        const tipo = tiposHabilitados[0];
        if (tipo === 'shuttle') { setShowActionModal(true); }
        else if (tipo === 'missao') setShowMissaoInstantanea(true);
        else setShowActionModal(true);
      } else {
        setShowActionModal(true);
      }
    } else {
      setActiveTab(tab);
    }
  };

  const handleActionSelect = (tipo: ActionType) => {
    if (tipo === 'missao') {
      setShowMissaoInstantanea(true);
    } else if (tipo === 'deslocamento') {
      setShowMissaoDeslocamento(true);
    } else if (tipo === 'shuttle_rapido') {
      setShuttleMode('rapido');
      setShowShuttleForm(true);
    } else if (tipo === 'shuttle_completo') {
      setShuttleMode('completo');
      setShowShuttleForm(true);
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchViagens(),
      refetchMotoristas(),
      hasMissao ? refetchMissoes() : Promise.resolve(),
    ]);
  }, [refetchViagens, refetchMotoristas, hasMissao, refetchMissoes]);

  const hasNoData = sortedAtivas.length === 0 && sortedEncerradas.length === 0 
    && missoesAtivasFiltradas.length === 0 && missoesFinalizadasFiltradas.length === 0;

  // Keep all tabs mounted but hidden for instant switching
  const renderAllTabs = () => (
    <>
      {/* Tab: Frota */}
      <div className={activeTab === 'frota' ? 'block' : 'hidden'}>
        <MemoizedFrotaTab eventoId={eventoId!} />
      </div>

      {/* Tab: Viagens (inline like Operador) */}
      <div className={activeTab === 'viagens' ? 'block' : 'hidden'}>
        <div className="space-y-4">
          <DiaSeletor
            dataOperacional={dataOperacional}
            onChange={setDataOperacional}
            dataInicio={evento?.data_inicio}
            dataFim={evento?.data_fim}
            showToggleAll={true}
            verTodosDias={verTodosDias}
            onToggleTodosDias={setVerTodosDias}
          />

          {/* Filter pills */}
          <FiltroTipoPills
            tipos={tiposHabilitados}
            filtroAtivo={filtroTipo}
            onChange={setFiltroTipo}
          />

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border rounded-lg p-4 text-center">
              <Bus className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">{summary.ativas > 0 ? `${summary.ativas} ativas` : 'Operações'}</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.totalPax}</p>
              <p className="text-xs text-muted-foreground">PAX Total</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <ArrowUp className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
              <p className="text-2xl font-bold">{summary.totalPaxIda}</p>
              <p className="text-xs text-muted-foreground">PAX Ida</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <ArrowDown className="h-5 w-5 mx-auto mb-1 text-sky-500" />
              <p className="text-2xl font-bold">{summary.totalPaxVolta}</p>
              <p className="text-xs text-muted-foreground">PAX Volta</p>
            </div>
          </div>

          {/* Missões ativas */}
          {missoesAtivasFiltradas.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Missões Ativas ({missoesAtivasFiltradas.length})
              </h2>
              {missoesAtivasVisiveis.map(missao => (
                <MissaoCardMobile
                  key={missao.id}
                  missao={missao}
                  dataOperacional={dataOperacional}
                  onAceitar={() => aceitarMissao(missao.id)}
                  onIniciar={() => iniciarMissao(missao.id)}
                  onFinalizar={() => concluirMissao(missao.id)}
                />
              ))}
              <LoadMoreFooter
                total={totalMissAtivas}
                visible={missoesAtivasVisiveis.length}
                hasMore={hasMoreMissAtivas}
                onLoadMore={loadMoreMissAtivas}
                pageSize={pageSizeMissAtivas}
                showPageSizeSelector={false}
              />
            </div>
          )}

          {/* Viagens ativas */}
          {sortedAtivas.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Em andamento ({sortedAtivas.length})
              </h2>
              {ativasVisiveis.map(viagem => {
                const isShuttleRapido = viagem.tipo_operacao === 'shuttle'
                  && !viagem.iniciado_por
                  && !viagem.h_chegada
                  && viagem.status === 'em_andamento';
                
                if (isShuttleRapido) {
                  return (
                    <ShuttleCardOperador
                      key={viagem.id}
                      viagem={viagem}
                      getName={getName}
                      onEncerrar={setViagemParaEncerrar}
                    />
                  );
                }
                
                return (
                  <ViagemCardOperador
                    key={viagem.id}
                    viagem={viagem}
                    onUpdate={refetchViagens}
                  />
                );
              })}
              <LoadMoreFooter
                total={totalAtivas}
                visible={ativasVisiveis.length}
                hasMore={hasMoreAtivas}
                onLoadMore={loadMoreAtivas}
                pageSize={pageSizeAtivas}
                showPageSizeSelector={false}
              />
            </div>
          )}

          {/* Encerradas */}
          <div className="space-y-2">
            {(sortedEncerradas.length > 0 || missoesFinalizadasFiltradas.length > 0) && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Encerradas ({sortedEncerradas.length + missoesFinalizadasFiltradas.length})
              </h2>
            )}
            {hasNoData ? (
              <div className="text-center py-16 text-muted-foreground">
                <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma operação</p>
                <p className="text-sm mb-4">Toque em + para registrar</p>
              </div>
            ) : (
              <>
                {encerradasVisiveis.map(viagem => (
                  <ViagemEncerradaCard 
                    key={viagem.id} 
                    viagem={viagem}
                    getName={getName}
                  />
                ))}
                {/* Missões finalizadas */}
                {missoesFinVisiveis.map(missao => (
                  <MissaoCardMobile
                    key={missao.id}
                    missao={missao}
                    dataOperacional={dataOperacional}
                  />
                ))}
                <LoadMoreFooter
                  total={totalEnc + totalMissFin}
                  visible={encerradasVisiveis.length + missoesFinVisiveis.length}
                  hasMore={hasMoreEnc || hasMoreMissFin}
                  onLoadMore={() => { if (hasMoreEnc) loadMoreEnc(); if (hasMoreMissFin) loadMoreMissFin(); }}
                  pageSize={pageSizeEnc}
                  showPageSizeSelector={false}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab: Localizador */}
      <div className={activeTab === 'localizador' ? 'block' : 'hidden'}>
        <MemoizedLocalizadorTab eventoId={eventoId!} />
      </div>

      {/* Tab: Histórico */}
      <div className={activeTab === 'historico' ? 'block' : 'hidden'}>
        <MemoizedHistoricoTab viagens={viagens} />
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden w-full max-w-full">
      {/* Tutorial Popover */}
      {tutorial.isActive && tutorial.currentStep && (
        <TutorialPopover
          step={tutorial.currentStep}
          currentIndex={tutorial.currentIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.next}
          onSkip={tutorial.skip}
          onComplete={tutorial.complete}
        />
      )}
      {/* Header */}
      <header className="shrink-0 z-50 bg-primary safe-area-top">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/app')}
                className="text-primary-foreground hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-8 w-8 rounded-lg object-contain"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold truncate text-primary-foreground">Supervisor</h1>
                  <Badge variant="secondary" className="text-xs bg-white/20 text-primary-foreground border-0">Master</Badge>
                </div>
                <p className="text-xs text-primary-foreground/70 truncate">
                  {evento?.nome_planilha || 'Carregando...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Bell icon for fuel alerts */}
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-white/10 relative"
                onClick={() => setShowAlertasModal(true)}
              >
                <Fuel className="h-5 w-5" />
                {alertas.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                    {alertas.length}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{evento?.nome_planilha}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/app')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Trocar Evento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setApenasMinhas(prev => !prev)}>
                    {apenasMinhas ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                    {apenasMinhas ? 'Ver todas as viagens' : 'Ver apenas minhas'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="text-center py-1">
                    <span className="text-[10px] text-muted-foreground/50">
                      {APP_NAME} · V{APP_VERSION}
                    </span>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Pull to Refresh */}
      <div className="flex-1 overflow-y-auto pb-20">
        <PullToRefresh onRefresh={handleRefresh}>
          <main className="container mx-auto px-4 py-4">
            {renderAllTabs()}
          </main>
        </PullToRefresh>
      </div>

      {/* Bottom Navigation */}
      <SupervisorBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Action Type Modal */}
      <NewActionModal
        open={showActionModal}
        onOpenChange={setShowActionModal}
        onSelect={handleActionSelect}
        tiposHabilitados={tiposHabilitados}
      />

      {/* Shuttle Form */}
      <CreateShuttleForm
        open={showShuttleForm}
        onOpenChange={setShowShuttleForm}
        eventoId={eventoId!}
        veiculos={veiculos}
        pontos={pontos}
        mode={shuttleMode}
        onCreated={() => {
          refetchViagens();
          setActiveTab('viagens');
        }}
      />

      {/* Nova Viagem (Transfer) */}
      <CreateViagemForm 
        open={showNovaViagem}
        onOpenChange={setShowNovaViagem}
        eventoId={eventoId!}
        defaultTipoOperacao={preselectedTipo}
        onCreated={() => {
          setShowNovaViagem(false);
          refetchViagens();
          setActiveTab('viagens');
        }}
      />

      {/* Missão Instantânea */}
      {hasMissao && (
        <MissaoInstantaneaModal
          open={showMissaoInstantanea}
          onOpenChange={setShowMissaoInstantanea}
          motoristas={motoristas}
          pontos={pontos}
          horarioVirada={evento?.horario_virada_dia || undefined}
          onSave={async (data) => {
            await createMissao(data);
          }}
        />
      )}

      {/* Missão Deslocamento */}
      {hasMissao && (
        <MissaoDeslocamentoModal
          open={showMissaoDeslocamento}
          onOpenChange={setShowMissaoDeslocamento}
          motoristas={motoristas}
          pontos={pontos}
          horarioVirada={evento?.horario_virada_dia || undefined}
          onSave={async (data) => {
            const missao = await createMissao(data);
            if (missao?.id) {
              await aceitarMissao(missao.id);
              await iniciarMissao(missao.id);
            }
          }}
        />
      )}

      {/* Shuttle Encerrar */}
      <ShuttleEncerrarModal
        open={!!viagemParaEncerrar}
        onOpenChange={(val) => { if (!val) setViagemParaEncerrar(null); }}
        viagem={viagemParaEncerrar}
        onEncerrado={() => {
          setViagemParaEncerrar(null);
          refetchViagens();
        }}
      />

      {/* Alertas de Combustível */}
      <SupervisorAlertasModal
        open={showAlertasModal}
        onOpenChange={setShowAlertasModal}
        alertas={alertas}
        onAtualizarStatus={atualizarAlertaStatus}
      />
    </div>
  );
}
