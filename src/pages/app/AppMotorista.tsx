import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';
import { useViagens } from '@/hooks/useViagens';
import { useViagemOperacaoMotorista } from '@/hooks/useViagemOperacaoMotorista';
import { useMissoes } from '@/hooks/useMissoes';
import { useMotoristas } from '@/hooks/useCadastros';
import { useMotoristaPresenca } from '@/hooks/useMotoristaPresenca';
import { useServerTime } from '@/hooks/useServerTime';
import { useTutorial, motoristaSteps } from '@/hooks/useTutorial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEventos } from '@/hooks/useEventos';

import { MissaoCardMobile } from '@/components/app/MissaoCardMobile';
import { CreateViagemMotoristaForm } from '@/components/app/CreateViagemMotoristaForm';
import { CheckinCheckoutCard } from '@/components/app/CheckinCheckoutCard';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { TutorialPopover } from '@/components/app/TutorialPopover';
import { MotoristaBottomNav, MotoristaTabId } from '@/components/app/MotoristaBottomNav';
import { MotoristaVeiculoTab } from '@/components/app/MotoristaVeiculoTab';
import { MotoristaHistoricoTab } from '@/components/app/MotoristaHistoricoTab';
import { HelpDrawer } from '@/components/app/HelpDrawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, CheckCircle2, MoreVertical, LogOut, ClipboardList, Car, HelpCircle, ChevronRight, MapPin, Navigation } from 'lucide-react';
import logoAS from '@/assets/as_logo_reduzida_preta.png';
import { NavigationModal } from '@/components/app/NavigationModal';

export default function AppMotorista() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  
  // Use driver auth instead of Supabase auth
  const { driverSession, signOut } = useDriverAuth();
  
  const { viagens, loading, refetch } = useViagens(eventoId);
  const { eventos } = useEventos();
  const { iniciarViagem, registrarChegada } = useViagemOperacaoMotorista();
  const { motoristas } = useMotoristas(eventoId);
  const { missoes, loading: loadingMissoes, updateMissao, refetch: refetchMissoes } = useMissoes(eventoId);
  const { getAgoraSync } = useServerTime();
  
  const [operando, setOperando] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MotoristaTabId>('inicio');
  const [showHelp, setShowHelp] = useState(false);
  
  // Estado para modal de navegação
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [navModalData, setNavModalData] = useState<{origem?: string | null; destino?: string | null} | null>(null);
  
  // Tutorial system
  const tutorial = useTutorial('motorista', motoristaSteps);

  const evento = eventos.find(e => e.id === eventoId);
  
  // Get motorista directly from driver session
  const motoristaData = useMemo(() => {
    if (!driverSession?.motorista_id) return null;
    return motoristas.find(m => m.id === driverSession.motorista_id);
  }, [motoristas, driverSession?.motorista_id]);

  const nomeMotorista = driverSession?.motorista_nome || motoristaData?.nome || '';

  // Hook de presença (check-in/check-out)
  const {
    presenca,
    checkinEnabled,
    veiculoAtribuido,
    realizarCheckin,
    realizarCheckout,
    loading: loadingPresenca,
    refetch: refetchPresenca
  } = useMotoristaPresenca(eventoId, motoristaData?.id);

  // Veículo a exibir: do check-in de hoje ou o atualmente atribuído
  const veiculoExibir = presenca?.veiculo || veiculoAtribuido;

  // Filter missions for this driver (only active)
  const minhasMissoes = useMemo(() => {
    if (!motoristaData) return [];
    return missoes.filter(m => 
      m.motorista_id === motoristaData.id && 
      ['pendente', 'aceita', 'em_andamento'].includes(m.status)
    );
  }, [missoes, motoristaData]);

  // Filter trips - only ACTIVE (no completed/cancelled)
  const minhasViagensAtivas = useMemo(() => {
    if (!motoristaData) return [];
    return viagens
      .filter(v => 
        v.motorista_id === motoristaData.id && 
        v.status !== 'encerrado' && 
        v.status !== 'cancelado'
      )
      .sort((a, b) => {
        const ordem: Record<string, number> = {
          'em_andamento': 0,
          'aguardando_retorno': 1,
          'agendado': 2
        };
        const statusA = a.status || 'agendado';
        const statusB = b.status || 'agendado';
        return (ordem[statusA] || 5) - (ordem[statusB] || 5);
      });
  }, [viagens, motoristaData]);

  // Filter trips - FINALIZED (encerrado or cancelado)
  const minhasViagensFinalizadas = useMemo(() => {
    if (!motoristaData) return [];
    return viagens
      .filter(v => 
        v.motorista_id === motoristaData.id && 
        (v.status === 'encerrado' || v.status === 'cancelado')
      )
      .sort((a, b) => {
        // Ordenar por hora de chegada (mais recente primeiro)
        return (b.h_chegada || '').localeCompare(a.h_chegada || '');
      });
  }, [viagens, motoristaData]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchMissoes(), refetchPresenca()]);
  };

  const handleLogout = () => {
    signOut();
    navigate('/login/motorista');
  };

  const handleMissaoAction = async (missaoId: string, action: 'aceitar' | 'iniciar' | 'recusar' | 'finalizar') => {
    const missao = missoes.find(m => m.id === missaoId);
    if (!missao) return;

    setOperando(missaoId);
    try {
      if (action === 'aceitar') {
        await updateMissao(missaoId, { status: 'aceita' });
      } else if (action === 'recusar') {
        await updateMissao(missaoId, { status: 'cancelada' });
      } else if (action === 'iniciar') {
        // Criar viagem ao iniciar a missão
        const motorista = motoristas.find(m => m.id === missao.motorista_id);
        if (!motorista || !eventoId) {
          toast.error('Motorista não encontrado');
          return;
        }

        // Encontrar veículo vinculado ao motorista
        const veiculoVinculado = motorista.veiculo_id;

        const now = getAgoraSync();
        const horaPickup = now.toTimeString().slice(0, 8);

        const { data: novaViagem, error } = await supabase
          .from('viagens')
          .insert({
            evento_id: eventoId,
            // Campos FK normalizados
            motorista_id: motorista.id,
            veiculo_id: veiculoVinculado || null,
            ponto_embarque_id: missao.ponto_embarque_id || null,
            ponto_desembarque_id: missao.ponto_desembarque_id || null,
            // Campos de texto (compatibilidade)
            motorista: motorista.nome,
            ponto_embarque: missao.ponto_embarque,
            ponto_desembarque: missao.ponto_desembarque,
            tipo_operacao: 'transfer',
            h_pickup: horaPickup,
            status: 'em_andamento',
            h_inicio_real: now.toISOString(),
            encerrado: false,
            origem_missao_id: missaoId, // Vincular viagem à missão
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar viagem:', error);
          toast.error('Erro ao criar viagem da missão');
          return;
        }

        // Atualizar missão com viagem_id e status
        await supabase
          .from('missoes')
          .update({ 
            viagem_id: novaViagem.id,
            status: 'em_andamento',
          })
          .eq('id', missaoId);

        // Atualizar status do motorista para em_viagem
        await supabase
          .from('motoristas')
          .update({ status: 'em_viagem' })
          .eq('id', missao.motorista_id);

        // Abrir modal de navegação
        setNavModalData({
          origem: missao.ponto_embarque,
          destino: missao.ponto_desembarque
        });
        setNavModalOpen(true);

        refetchMissoes();
        refetch(); // Refetch viagens
      } else if (action === 'finalizar') {
        // Usar viagem_id diretamente da missão
        const motorista = motoristas.find(m => m.id === missao.motorista_id);
        if (!motorista) {
          toast.error('Motorista não encontrado');
          return;
        }

        const viagemId = missao.viagem_id;
        const now = getAgoraSync(); // ✅ Usa hora sincronizada do servidor
        const horaChegada = now.toTimeString().slice(0, 8);
        
        if (viagemId) {
          await supabase
            .from('viagens')
            .update({
              status: 'encerrado',
              h_chegada: horaChegada,
              h_fim_real: now.toISOString(),
              encerrado: true,
              finalizado_por: driverSession?.motorista_id || null,
            })
            .eq('id', viagemId);
        }

        // Verificar se motorista tem outras viagens ativas (usar motorista_id)
        const { data: outrasViagens } = await supabase
          .from('viagens')
          .select('id')
          .eq('motorista_id', motorista.id)
          .eq('evento_id', eventoId)
          .eq('encerrado', false);

        if (!outrasViagens || outrasViagens.length === 0) {
          await supabase
            .from('motoristas')
            .update({ status: 'disponivel' })
            .eq('id', missao.motorista_id);
        }

        // ✅ ATUALIZAR LOCALIZAÇÃO PARA O PONTO DE DESEMBARQUE
        if (missao.ponto_desembarque) {
          await supabase
            .from('motoristas')
            .update({
              ultima_localizacao: missao.ponto_desembarque,
              ultima_localizacao_at: now.toISOString()
            })
            .eq('id', missao.motorista_id);
        }

        await updateMissao(missaoId, { status: 'concluida' });
        refetch(); // Refetch viagens
      }
      refetchMissoes();
    } finally {
      setOperando(null);
    }
  };

  const handleAction = async (viagemId: string, action: 'iniciar' | 'chegada') => {
    const viagem = viagens.find(v => v.id === viagemId);
    if (!viagem) return;

    setOperando(viagemId);
    try {
      if (action === 'iniciar') {
        const sucesso = await iniciarViagem(viagem);
        if (sucesso) {
          // Abrir modal de navegação
          setNavModalData({
            origem: viagem.ponto_embarque,
            destino: viagem.ponto_desembarque
          });
          setNavModalOpen(true);
        }
      }
      if (action === 'chegada') await registrarChegada(viagem);
      refetch();
    } finally {
      setOperando(null);
    }
  };

  // Check if there's anything to show (missions only - active trips shown elsewhere)
  const hasContent = minhasMissoes.length > 0;
  const isIdentified = !!motoristaData;

  // Driver status indicator
  const getStatusInfo = () => {
    if (!motoristaData) return { label: 'Offline', color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' };
    
    const status = motoristaData.status;
    
    if (status === 'em_viagem') {
      return { label: 'Em Viagem', color: 'bg-amber-500/15 text-amber-600', dot: 'bg-amber-500' };
    }
    if (status === 'disponivel') {
      return { label: 'Online', color: 'bg-emerald-500/15 text-emerald-600', dot: 'bg-emerald-500' };
    }
    // indisponivel or any other
    return { label: 'Offline', color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' };
  };
  
  const statusInfo = getStatusInfo();

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="space-y-4">
            {/* Check-in/Check-out Card */}
            {checkinEnabled && motoristaData && (
              <CheckinCheckoutCard
                presenca={presenca}
                veiculoAtribuido={veiculoAtribuido}
                onCheckin={realizarCheckin}
                onCheckout={realizarCheckout}
                loading={loadingPresenca}
                hideCheckout // Ocultar checkout - agora está na aba Histórico
              />
            )}

            {/* Missões designadas */}
            {minhasMissoes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span>Missões Designadas ({minhasMissoes.length})</span>
                </div>
                {minhasMissoes.map(missao => (
                  <MissaoCardMobile
                    key={missao.id}
                    missao={missao}
                    loading={operando === missao.id}
                    onAceitar={() => handleMissaoAction(missao.id, 'aceitar')}
                    onIniciar={() => handleMissaoAction(missao.id, 'iniciar')}
                    onRecusar={() => handleMissaoAction(missao.id, 'recusar')}
                    onFinalizar={() => handleMissaoAction(missao.id, 'finalizar')}
                  />
                ))}
              </div>
            )}

            {/* Empty State - Tudo certo */}
            {!hasContent && isIdentified && (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500 opacity-50" />
                <p className="text-lg font-medium">Tudo certo por aqui!</p>
                <p className="text-sm">Nenhuma viagem ou missão pendente</p>
              </div>
            )}

            {/* Empty State - Motorista não identificado */}
            {!isIdentified && (
              <div className="text-center py-16 text-muted-foreground">
                <Car className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Motorista não identificado</p>
                <p className="text-sm">Seu perfil não está vinculado a um motorista cadastrado</p>
              </div>
            )}
          </div>
        );

      case 'veiculo':
        return <MotoristaVeiculoTab veiculo={veiculoExibir} />;

      case 'corrida':
        return (
          <CreateViagemMotoristaForm
            open={true}
            onOpenChange={(open) => {
              if (!open) setActiveTab('inicio');
            }}
            eventoId={eventoId!}
            motoristaName={nomeMotorista}
            onCreated={() => {
              refetch();
              setActiveTab('inicio');
            }}
            embedded // Nova prop para renderizar inline
          />
        );

      case 'historico':
        return (
          <MotoristaHistoricoTab
            viagensFinalizadas={minhasViagensFinalizadas}
            presenca={presenca}
            onCheckout={realizarCheckout}
            loadingCheckout={loadingPresenca}
            eventoId={eventoId}
            motoristaNome={nomeMotorista}
          />
        );

      case 'mais': {
        // Encontrar viagem ativa para mostrar navegação
        const viagemAtivaEmAndamento = minhasViagensAtivas.find(v => v.status === 'em_andamento');
        
        return (
          <div className="space-y-4">
            {/* Card de Navegação (só aparece com viagem ativa em andamento) */}
            {viagemAtivaEmAndamento && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    Navegação da Viagem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Abrir rota no app de navegação
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-12"
                    onClick={() => {
                      setNavModalData({
                        origem: viagemAtivaEmAndamento.ponto_embarque,
                        destino: viagemAtivaEmAndamento.ponto_desembarque
                      });
                      setNavModalOpen(true);
                    }}
                  >
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-3" />
                      Abrir Navegação
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Suporte */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Suporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Precisa de ajuda? Acesse nossa central de suporte.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-12"
                  onClick={() => setShowHelp(true)}
                >
                  <div className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-3" />
                    Central de Ajuda
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>

            <Button 
              variant="destructive" 
              className="w-full gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair do Aplicativo
            </Button>

            {/* Help Drawer */}
            <HelpDrawer 
              open={showHelp} 
              onOpenChange={setShowHelp}
              role="motorista"
            />
          </div>
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/login/motorista')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{nomeMotorista || 'Motorista'}</h1>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot} animate-pulse`} />
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{evento?.nome_planilha}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content com Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="container mx-auto px-4 py-4 pb-24">
          {renderTabContent()}
        </main>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MotoristaBottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
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
