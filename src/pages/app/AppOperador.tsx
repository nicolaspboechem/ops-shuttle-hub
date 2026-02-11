import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useAuth } from '@/lib/auth/AuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { useTutorial, operadorSteps } from '@/hooks/useTutorial';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Evento } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { CreateViagemForm } from '@/components/app/CreateViagemForm';
import { ViagemCardOperador } from '@/components/app/ViagemCardOperador';
import { CreateMotoristaWizard } from '@/components/motoristas/CreateMotoristaWizard';
import { MissaoTipoModal, MissaoTipo } from '@/components/motoristas/MissaoTipoModal';
import { MissaoInstantaneaModal } from '@/components/motoristas/MissaoInstantaneaModal';
import { MissaoModal } from '@/components/motoristas/MissaoModal';
import { NewActionModal, ActionType } from '@/components/app/NewActionModal';
import { useMissoes } from '@/hooks/useMissoes';
import { useMotoristas as useMotoristasCadastros } from '@/hooks/useCadastros';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { CreateVeiculoWizard } from '@/components/veiculos/CreateVeiculoWizard';
import { VeiculoKmModal } from '@/components/app/VeiculoKmModal';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { TutorialPopover } from '@/components/app/TutorialPopover';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { OperadorBottomNav, OperadorTabId } from '@/components/app/OperadorBottomNav';
import { OperadorMotoristasTab } from '@/components/app/OperadorMotoristasTab';
import { OperadorHistoricoTab } from '@/components/app/OperadorHistoricoTab';
import { OperadorMaisTab } from '@/components/app/OperadorMaisTab';
import { 
  ArrowLeft, 
  Loader2,
  Bus,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { NavigationModal } from '@/components/app/NavigationModal';

type StatusFilter = 'todos' | 'agendado' | 'em_andamento' | 'aguardando_retorno' | 'encerrado';

// Memoized tab components to prevent unnecessary re-renders
const MemoizedMotoristasTab = memo(OperadorMotoristasTab);
const MemoizedHistoricoTab = memo(OperadorHistoricoTab);
const MemoizedMaisTab = memo(OperadorMaisTab);

export default function AppOperador() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { getAgoraSync } = useServerTime();
  
  const [evento, setEvento] = useState<Evento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMotoristaForm, setShowMotoristaForm] = useState(false);
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [showKmModal, setShowKmModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showMissaoTipoModal, setShowMissaoTipoModal] = useState(false);
  const [showMissaoInstantanea, setShowMissaoInstantanea] = useState(false);
  const [showMissaoModal, setShowMissaoModal] = useState(false);
  const [preselectedTipo, setPreselectedTipo] = useState<string>('transfer');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [activeTab, setActiveTab] = useState<OperadorTabId>('viagens');
  
  // Dia operacional (padrão: hoje)
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(new Date(), '04:00')
  );
  const [verTodosDias, setVerTodosDias] = useState(false);
  
  // Atualizar data operacional quando evento carregar com horário de virada customizado
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

  const { viagens, loading, refreshing, refetch } = useViagens(eventoId, viagensOptions);
  
  const { refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const { createMissao } = useMissoes(eventoId);
  const { motoristas: motoristasCadastrados } = useMotoristasCadastros(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  
  // Estado para modal de navegação
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [navModalData, setNavModalData] = useState<{origem?: string | null; destino?: string | null} | null>(null);
  
  // Tutorial system
  const tutorial = useTutorial('operador', operadorSteps);

  const handleRefresh = async () => {
    await refetch();
  };

  useEffect(() => {
    if (eventoId) {
      supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single()
        .then(({ data }) => setEvento(data));
    }
  }, [eventoId]);

  const filteredViagens = viagens.filter(v => {
    if (statusFilter !== 'todos' && v.status !== statusFilter) return false;
    return true;
  });

  const sortedViagens = [...filteredViagens].sort((a, b) => {
    const statusOrder = { 
      em_andamento: 0, 
      aguardando_retorno: 1, 
      agendado: 2, 
      encerrado: 3, 
      cancelado: 4 
    };
    const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 5;
    const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 5;
    if (orderA !== orderB) return orderA - orderB;
    return (a.h_pickup || '').localeCompare(b.h_pickup || '');
  });

  const counts = {
    agendado: viagens.filter(v => v.status === 'agendado').length,
    em_andamento: viagens.filter(v => v.status === 'em_andamento').length,
    aguardando_retorno: viagens.filter(v => v.status === 'aguardando_retorno').length,
    encerrado: viagens.filter(v => v.status === 'encerrado').length,
  };

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/auth');
  }, [signOut, navigate]);

  const handleTabChange = (tab: OperadorTabId) => {
    if (tab === 'nova') {
      setShowActionModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleActionSelect = (tipo: ActionType) => {
    if (tipo === 'missao') {
      setShowMissaoTipoModal(true);
    } else {
      setPreselectedTipo(tipo);
      setShowForm(true);
    }
  };

  // Memoized values - must be before early returns
  const viagemAtivaNav = useMemo(() => 
    viagens.find(v => v.status === 'em_andamento'), 
    [viagens]
  );

  const handleOpenNavigation = useCallback((origem?: string | null, destino?: string | null) => {
    setNavModalData({ origem, destino });
    setNavModalOpen(true);
  }, []);

  const maisTabProps = useMemo(() => ({
    userName: user?.email,
    eventoNome: evento?.nome_planilha,
    viagemAtiva: viagemAtivaNav,
    onCadastrarMotorista: () => setShowMotoristaForm(true),
    onCadastrarVeiculo: () => setShowVeiculoForm(true),
    onRegistrarKm: () => setShowKmModal(true),
    onOpenNavigation: handleOpenNavigation,
    onLogout: handleLogout,
  }), [user?.email, evento?.nome_planilha, viagemAtivaNav, handleOpenNavigation, handleLogout]);

  // Early returns after all hooks
  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading && !viagens.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Keep all tabs mounted but hidden for instant switching
  const renderAllTabs = () => (
    <>
      {/* Tab: Viagens */}
      <div className={activeTab === 'viagens' ? 'block' : 'hidden'}>
        <div className="space-y-4">
          {/* Seletor de Dia */}
          <DiaSeletor
            dataOperacional={dataOperacional}
            onChange={setDataOperacional}
            dataInicio={evento?.data_inicio}
            dataFim={evento?.data_fim}
            showToggleAll={true}
            verTodosDias={verTodosDias}
            onToggleTodosDias={setVerTodosDias}
          />

          {/* Status Cards */}
          <div className="grid grid-cols-4 gap-2">
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'agendado' ? 'ring-2 ring-primary' : 'bg-muted/50'}`}
              onClick={() => setStatusFilter(statusFilter === 'agendado' ? 'todos' : 'agendado')}
            >
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{counts.agendado}</p>
              <p className="text-[10px] text-muted-foreground">Agendado</p>
            </div>
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'em_andamento' ? 'ring-2 ring-primary' : 'bg-primary/10'}`}
              onClick={() => setStatusFilter(statusFilter === 'em_andamento' ? 'todos' : 'em_andamento')}
            >
              <Bus className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold text-primary">{counts.em_andamento}</p>
              <p className="text-[10px] text-muted-foreground">Andamento</p>
            </div>
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'aguardando_retorno' ? 'ring-2 ring-primary' : 'bg-amber-500/10'}`}
              onClick={() => setStatusFilter(statusFilter === 'aguardando_retorno' ? 'todos' : 'aguardando_retorno')}
            >
              <Clock className="h-4 w-4 mx-auto mb-1 text-amber-600" />
              <p className="text-xl font-bold text-amber-600">{counts.aguardando_retorno}</p>
              <p className="text-[10px] text-muted-foreground">Aguardando</p>
            </div>
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'encerrado' ? 'ring-2 ring-primary' : 'bg-emerald-500/10'}`}
              onClick={() => setStatusFilter(statusFilter === 'encerrado' ? 'todos' : 'encerrado')}
            >
              <CheckCircle className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
              <p className="text-xl font-bold text-emerald-600">{counts.encerrado}</p>
              <p className="text-[10px] text-muted-foreground">Encerrado</p>
            </div>
          </div>

          {/* Lista de viagens */}
          <div className="space-y-3">
            {sortedViagens.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma viagem</p>
                <p className="text-sm mb-4">
                  {statusFilter !== 'todos' 
                    ? 'Nenhuma viagem com este status'
                    : 'Toque em + para criar uma viagem'}
                </p>
              </div>
            ) : (
              sortedViagens.map(viagem => (
                <ViagemCardOperador 
                  key={viagem.id} 
                  viagem={viagem} 
                  onUpdate={refetch}
                  onTripStarted={(origem, destino) => {
                    setNavModalData({ origem, destino });
                    setNavModalOpen(true);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tab: Motoristas - stays mounted */}
      <div className={activeTab === 'motoristas' ? 'block' : 'hidden'}>
        <MemoizedMotoristasTab eventoId={eventoId!} />
      </div>

      {/* Tab: Histórico - stays mounted */}
      <div className={activeTab === 'historico' ? 'block' : 'hidden'}>
        <MemoizedHistoricoTab viagens={viagens} />
      </div>

      {/* Tab: Mais - stays mounted */}
      <div className={activeTab === 'mais' ? 'block' : 'hidden'}>
        <MemoizedMaisTab {...maisTabProps} />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden w-full max-w-full">
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

      {/* Header simplificado */}
      <header className="sticky top-0 z-50 bg-primary safe-area-top">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="text-primary-foreground hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-9 w-9 rounded-lg object-contain"
              />
              <div>
                <h1 className="text-base font-semibold text-primary-foreground">Operador</h1>
                <p className="text-xs text-primary-foreground/70 truncate max-w-[160px]">
                  {evento?.nome_planilha || 'Carregando...'}
                </p>
              </div>
            </div>

            {/* Botão de refresh */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-primary-foreground hover:bg-white/10"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content com Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="container mx-auto px-4 py-4 pb-24">
          {renderAllTabs()}
        </main>
      </PullToRefresh>

      {/* Barra de navegação inferior */}
      <OperadorBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      {/* Action Type Modal */}
      <NewActionModal
        open={showActionModal}
        onOpenChange={setShowActionModal}
        onSelect={handleActionSelect}
      />

      {/* Form de criação de viagem (Drawer) */}
      <CreateViagemForm
        open={showForm}
        onOpenChange={setShowForm}
        eventoId={eventoId!}
        defaultTipoOperacao={preselectedTipo}
        onCreated={() => {
          refetch();
          setActiveTab('viagens');
        }}
      />

      {/* Tipo de Missão */}
      <MissaoTipoModal
        open={showMissaoTipoModal}
        onOpenChange={setShowMissaoTipoModal}
        onSelect={(tipo: MissaoTipo) => {
          if (tipo === 'instantanea') {
            setShowMissaoInstantanea(true);
          } else {
            setShowMissaoModal(true);
          }
        }}
      />

      {/* Missão Instantânea */}
      <MissaoInstantaneaModal
        open={showMissaoInstantanea}
        onOpenChange={setShowMissaoInstantanea}
        motoristas={motoristasCadastrados}
        pontos={pontos}
        onSave={async (data) => {
          await createMissao(data);
        }}
      />

      {/* Missão Agendada */}
      <MissaoModal
        open={showMissaoModal}
        onOpenChange={setShowMissaoModal}
        motoristas={motoristasCadastrados}
        pontos={pontos}
        onSave={async (data) => {
          await createMissao(data);
        }}
      />

      {/* Wizard completo de cadastro de motorista */}
      <CreateMotoristaWizard
        open={showMotoristaForm}
        onOpenChange={setShowMotoristaForm}
        veiculos={veiculos}
        eventoId={eventoId!}
        onSubmit={async (data) => {
          const { data: motorista, error } = await supabase
            .from('motoristas')
            .insert([{
              nome: data.nome,
              telefone: data.telefone,
              veiculo_id: data.veiculo_id,
              evento_id: eventoId,
              ativo: true,
            }])
            .select('id')
            .single();
          
          if (error) throw error;
          
          await refetchMotoristas();
          return motorista.id;
        }}
      />

      {/* Wizard completo de cadastro de veículo */}
      <CreateVeiculoWizard
        open={showVeiculoForm}
        onOpenChange={setShowVeiculoForm}
        eventoId={eventoId!}
        onCreated={() => refetchVeiculos()}
      />

      {/* Modal de registro de KM */}
      <VeiculoKmModal
        open={showKmModal}
        onOpenChange={setShowKmModal}
        eventoId={eventoId!}
        onUpdated={() => refetchVeiculos()}
      />

      {/* Modal de Navegação */}
      <NavigationModal
        open={navModalOpen}
        onOpenChange={setNavModalOpen}
        origem={navModalData?.origem}
        destino={navModalData?.destino}
      />
    </div>
  );
}
