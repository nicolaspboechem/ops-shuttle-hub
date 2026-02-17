import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { useLocalizadorMotoristas } from '@/hooks/useLocalizadorMotoristas';
import { useServerTime } from '@/hooks/useServerTime';
import { useTutorial, supervisorSteps } from '@/hooks/useTutorial';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft,
  MoreVertical,
  LogOut,
  Bell,
  Fuel
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { SupervisorBottomNav, SupervisorTabId } from '@/components/app/SupervisorBottomNav';
import { SupervisorFrotaTab } from '@/components/app/SupervisorFrotaTab';
import { SupervisorViagensTab } from '@/components/app/SupervisorViagensTab';
import { SupervisorLocalizadorTab } from '@/components/app/SupervisorLocalizadorTab';
import { SupervisorMaisTab } from '@/components/app/SupervisorMaisTab';
import { CreateViagemForm } from '@/components/app/CreateViagemForm';
import { NewActionModal, ActionType } from '@/components/app/NewActionModal';
import { MissaoInstantaneaModal } from '@/components/motoristas/MissaoInstantaneaModal';
import { MissaoDeslocamentoModal } from '@/components/motoristas/MissaoDeslocamentoModal';
import { useMissoes } from '@/hooks/useMissoes';
import { useMotoristas } from '@/hooks/useCadastros';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { TutorialPopover } from '@/components/app/TutorialPopover';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { useAlertasFrota } from '@/hooks/useAlertasFrota';
import { SupervisorAlertasModal } from '@/components/app/SupervisorAlertasModal';

// Memoized tab components
const MemoizedFrotaTab = memo(SupervisorFrotaTab);
const MemoizedViagensTab = memo(SupervisorViagensTab);
const MemoizedLocalizadorTab = memo(SupervisorLocalizadorTab);
const MemoizedMaisTab = memo(SupervisorMaisTab);

interface Evento {
  nome_planilha: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  horario_virada_dia?: string | null;
}

export default function AppSupervisor() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user, signOut, profile } = useAuth();
  const { getAgoraSync } = useServerTime();
  
  const [activeTab, setActiveTab] = useState<SupervisorTabId>('frota');
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNovaViagem, setShowNovaViagem] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showMissaoInstantanea, setShowMissaoInstantanea] = useState(false);
  const [showAlertasModal, setShowAlertasModal] = useState(false);
  const [showMissaoDeslocamento, setShowMissaoDeslocamento] = useState(false);
  const [preselectedTipo, setPreselectedTipo] = useState<string>('transfer');
  
  // Dia operacional
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(getAgoraSync(), '04:00')
  );
  const [verTodosDias, setVerTodosDias] = useState(false);
  
  // Tutorial system
  const tutorial = useTutorial('supervisor', supervisorSteps);

  // Atualizar data operacional quando evento carregar
  useEffect(() => {
    if (evento?.horario_virada_dia) {
      setDataOperacional(getDataOperacional(getAgoraSync(), evento.horario_virada_dia));
    }
  }, [evento?.horario_virada_dia, getAgoraSync]);

  // Buscar viagens com filtro de data
  const viagensOptions = useMemo(() => {
    if (verTodosDias) return undefined;
    return {
      dataOperacional,
      horarioVirada: evento?.horario_virada_dia || '04:00',
    };
  }, [dataOperacional, evento?.horario_virada_dia, verTodosDias]);

  const { refetch: refetchViagens } = useViagens(eventoId, viagensOptions);
  const { refetch: refetchMotoristas } = useLocalizadorMotoristas(eventoId || '');
  const { createMissao, aceitarMissao, iniciarMissao, concluirMissao, cancelarMissao } = useMissoes(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const { alertas, atualizarStatus: atualizarAlertaStatus } = useAlertasFrota(eventoId);

  useEffect(() => {
    if (eventoId) {
      fetchEvento();
    }
  }, [eventoId]);

  const fetchEvento = async () => {
    const { data } = await supabase
      .from('eventos')
      .select('nome_planilha, data_inicio, data_fim, horario_virada_dia')
      .eq('id', eventoId)
      .single();
    
    if (data) setEvento(data);
    setLoading(false);
  };

  const handleTabChange = (tab: SupervisorTabId) => {
    if (tab === 'nova') {
      setShowActionModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleActionSelect = (tipo: ActionType) => {
    if (tipo === 'missao') {
      setShowMissaoInstantanea(true);
    } else if (tipo === 'deslocamento') {
      setShowMissaoDeslocamento(true);
    } else {
      setPreselectedTipo(tipo);
      setShowNovaViagem(true);
    }
  };

  const handleRefresh = useCallback(async () => {
    // Refetch data based on active tab
    await Promise.all([
      refetchViagens(),
      refetchMotoristas(),
    ]);
  }, [refetchViagens, refetchMotoristas]);

  // Keep all tabs mounted but hidden for instant switching
  const renderAllTabs = () => (
    <>
      {/* Tab: Frota */}
      <div className={activeTab === 'frota' ? 'block' : 'hidden'}>
        <MemoizedFrotaTab eventoId={eventoId!} />
      </div>

      {/* Tab: Viagens */}
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
          <MemoizedViagensTab 
            eventoId={eventoId!} 
            onRefresh={refetchViagens}
            dataOperacional={verTodosDias ? undefined : dataOperacional}
            horarioVirada={evento?.horario_virada_dia || undefined}
            onConcluirMissao={concluirMissao}
            onCancelarMissao={cancelarMissao}
          />
        </div>
      </div>

      {/* Tab: Localizador */}
      <div className={activeTab === 'localizador' ? 'block' : 'hidden'}>
        <MemoizedLocalizadorTab eventoId={eventoId!} />
      </div>

      {/* Tab: Mais */}
      <div className={activeTab === 'mais' ? 'block' : 'hidden'}>
        <MemoizedMaisTab 
          eventoId={eventoId!} 
          eventoNome={evento?.nome_planilha}
          userName={profile?.full_name || user?.email}
          onLogout={signOut}
        />
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
    <div className="min-h-screen bg-background flex flex-col pb-16 overflow-x-hidden w-full max-w-full">
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
      <header className="sticky top-0 z-50 bg-primary safe-area-top">
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/app')}>
                  Trocar Evento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content with Pull to Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="flex-1 container mx-auto px-4 py-4">
          {renderAllTabs()}
        </main>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <SupervisorBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Action Type Modal */}
      <NewActionModal
        open={showActionModal}
        onOpenChange={setShowActionModal}
        onSelect={handleActionSelect}
        hideShuttle
      />

      {/* Nova Viagem (Transfer/Shuttle) */}
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
      <MissaoInstantaneaModal
        open={showMissaoInstantanea}
        onOpenChange={setShowMissaoInstantanea}
        motoristas={motoristas}
        pontos={pontos}
        onSave={async (data) => {
          await createMissao(data);
        }}
      />

      {/* Missão Deslocamento */}
      <MissaoDeslocamentoModal
        open={showMissaoDeslocamento}
        onOpenChange={setShowMissaoDeslocamento}
        motoristas={motoristas}
        pontos={pontos}
        onSave={async (data) => {
          const missao = await createMissao(data);
          if (missao?.id) {
            await aceitarMissao(missao.id);
            await iniciarMissao(missao.id);
          }
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
