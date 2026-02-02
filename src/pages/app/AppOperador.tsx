import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTutorial, operadorSteps } from '@/hooks/useTutorial';
import { Evento } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { CreateViagemForm } from '@/components/app/CreateViagemForm';
import { ViagemCardOperador } from '@/components/app/ViagemCardOperador';
import { CreateMotoristaWizard } from '@/components/motoristas/CreateMotoristaWizard';
import { CreateVeiculoWizard } from '@/components/veiculos/CreateVeiculoWizard';
import { VeiculoKmModal } from '@/components/app/VeiculoKmModal';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { TutorialPopover } from '@/components/app/TutorialPopover';
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
import logoAS from '@/assets/as_logo_reduzida_preta.png';

type StatusFilter = 'todos' | 'agendado' | 'em_andamento' | 'aguardando_retorno' | 'encerrado';

export default function AppOperador() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { viagens, loading, refreshing, refetch } = useViagens(eventoId);
  
  const { refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMotoristaForm, setShowMotoristaForm] = useState(false);
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [showKmModal, setShowKmModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [activeTab, setActiveTab] = useState<OperadorTabId>('viagens');
  
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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleTabChange = (tab: OperadorTabId) => {
    if (tab === 'nova') {
      setShowForm(true);
    } else {
      setActiveTab(tab);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'viagens':
        return (
          <div className="space-y-4">
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
                  />
                ))
              )}
            </div>
          </div>
        );

      case 'motoristas':
        return <OperadorMotoristasTab eventoId={eventoId!} />;

      case 'historico':
        return <OperadorHistoricoTab viagens={viagens} />;

      case 'mais':
        return (
          <OperadorMaisTab
            userName={user?.email}
            eventoNome={evento?.nome_planilha}
            onCadastrarMotorista={() => setShowMotoristaForm(true)}
            onCadastrarVeiculo={() => setShowVeiculoForm(true)}
            onRegistrarKm={() => setShowKmModal(true)}
            onLogout={handleLogout}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-9 w-9 rounded-lg object-contain"
              />
              <div>
                <h1 className="text-base font-semibold">Operador</h1>
                <p className="text-xs text-muted-foreground truncate max-w-[160px]">
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
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content com Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="container mx-auto px-4 py-4 pb-24">
          {renderTabContent()}
        </main>
      </PullToRefresh>

      {/* Barra de navegação inferior */}
      <OperadorBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      {/* Form de criação de viagem (Drawer) */}
      <CreateViagemForm
        open={showForm}
        onOpenChange={setShowForm}
        eventoId={eventoId!}
        onCreated={() => {
          refetch();
          setActiveTab('viagens');
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
    </div>
  );
}
