import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { useParams, useNavigate } from 'react-router-dom';
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useViagensPorMotorista } from '@/hooks/useViagens';
import { useViagemOperacaoMotorista } from '@/hooks/useViagemOperacaoMotorista';
import { useMissoesPorMotorista } from '@/hooks/useMissoes';
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


import { MissaoCardMobile } from '@/components/app/MissaoCardMobile';
import { CreateViagemMotoristaForm } from '@/components/app/CreateViagemMotoristaForm';
import { CheckinCheckoutCard } from '@/components/app/CheckinCheckoutCard';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { TutorialPopover } from '@/components/app/TutorialPopover';
import { MotoristaBottomNav, MotoristaTabId } from '@/components/app/MotoristaBottomNav';
import { MotoristaVeiculoTab } from '@/components/app/MotoristaVeiculoTab';
import { MotoristaHistoricoTab } from '@/components/app/MotoristaHistoricoTab';
import { HelpDrawer } from '@/components/app/HelpDrawer';
import { VersionBadge } from '@/components/ui/version-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, CheckCircle2, MoreVertical, LogOut, ClipboardList, Car, HelpCircle, ChevronRight, MapPin, Navigation } from 'lucide-react';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { NavigationModal } from '@/components/app/NavigationModal';

export default function AppMotorista() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  
  // Use driver auth instead of Supabase auth
  const { driverSession, signOut } = useDriverAuth();
  const motoristaId = driverSession?.motorista_id;
  
  // Hooks filtrados por motorista - carrega apenas dados do motorista logado
  const { viagens, loading, refetch } = useViagensPorMotorista(eventoId, motoristaId);
  
  // Buscar evento diretamente (sem Realtime desnecessário)
  const [evento, setEvento] = useState<any>(null);
  useEffect(() => {
    if (!eventoId) return;
    supabase.from('eventos').select('id, nome_planilha, horario_virada_dia, data_inicio, data_fim').eq('id', eventoId).single()
      .then(({ data }) => setEvento(data));
  }, [eventoId]);
  const { iniciarViagem, registrarChegada } = useViagemOperacaoMotorista();
  const { missoes, loading: loadingMissoes, refetch: refetchMissoes } = useMissoesPorMotorista(eventoId, motoristaId);
  const { getAgoraSync, loading: loadingServerTime } = useServerTime();
  
  const [operando, setOperando] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MotoristaTabId>('inicio');
  const [showHelp, setShowHelp] = useState(false);
  
  // Estado para modal de navegação
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [navModalData, setNavModalData] = useState<{origem?: string | null; destino?: string | null} | null>(null);
  
  // Estado para modal de aviso de veículo não vinculado
  const [showVeiculoAlert, setShowVeiculoAlert] = useState(false);
  const [missaoParaIniciar, setMissaoParaIniciar] = useState<string | null>(null);
  const missaoActionRef = useRef(false);

  // Tutorial system
  const tutorial = useTutorial('motorista', motoristaSteps);

  
  
  // Buscar dados do motorista diretamente (em vez de carregar todos os 41)
  const [motoristaData, setMotoristaData] = useState<any>(null);
  const fetchMotorista = useCallback(async () => {
    if (!motoristaId) return;
    const { data } = await supabase
      .from('motoristas')
      .select('*')
      .eq('id', motoristaId)
      .single();
    setMotoristaData(data);
  }, [motoristaId]);
  
  useEffect(() => { fetchMotorista(); }, [fetchMotorista]);

  // Realtime para atualizar dados do motorista - CONSOLIDADO
  // O channel `motorista-{motoristaId}` no useMotoristaPresenca já escuta
  // UPDATE na tabela motoristas. Aqui usamos o refetch da presença para
  // também atualizar os dados do motorista, evitando channel duplicado.
  // Fallback: polling leve a cada 2 minutos apenas como safety net
  useEffect(() => {
    if (!motoristaId) return;
    const interval = setInterval(() => fetchMotorista(), 120000); // 2 min fallback
    return () => clearInterval(interval);
  }, [motoristaId, fetchMotorista]);

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
  } = useMotoristaPresenca(eventoId, motoristaId);

  // Veículo a exibir: só usa veículo da presença se presença estiver ativa (sem checkout)
  const presencaAtiva = presenca && presenca.checkin_at && !presenca.checkout_at;
  const veiculoExibir = (presencaAtiva ? presenca?.veiculo : null) || veiculoAtribuido;

  // Detectar transição de veiculoAtribuido: null -> veículo válido
  const prevVeiculoRef = useRef<typeof veiculoAtribuido>(undefined);
  useEffect(() => {
    // Pular a primeira renderização (montagem)
    if (prevVeiculoRef.current === undefined) {
      prevVeiculoRef.current = veiculoAtribuido;
      return;
    }
    // Se antes era null e agora tem veículo
    if (!prevVeiculoRef.current && veiculoAtribuido) {
      toast.success('Veículo vinculado! Confira na aba Veículo.', {
        duration: 6000,
        icon: '🚗',
      });
    }
    prevVeiculoRef.current = veiculoAtribuido;
  }, [veiculoAtribuido]);

  // Filter missions for this driver (only active)
  const dataOperacional = useMemo(() => {
    if (loadingServerTime) return null;
    return getDataOperacional(getAgoraSync(), evento?.horario_virada_dia || '04:00');
  }, [getAgoraSync, evento?.horario_virada_dia, loadingServerTime]);

  const minhasMissoes = useMemo(() => {
    if (!motoristaData) return [];
    const statusOrder: Record<string, number> = { em_andamento: 0, aceita: 1, pendente: 2 };
    return missoes
      .filter(m => 
        m.motorista_id === motoristaData.id && 
        ['pendente', 'aceita', 'em_andamento'].includes(m.status) &&
        (!m.data_programada || m.data_programada === dataOperacional)
      )
      .sort((a, b) => {
        // 1. Ordenar por status (em_andamento > aceita > pendente)
        const sa = statusOrder[a.status] ?? 9;
        const sb = statusOrder[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        // 2. Instantâneas antes de agendadas
        const aInst = !a.horario_previsto ? 0 : 1;
        const bInst = !b.horario_previsto ? 0 : 1;
        if (aInst !== bInst) return aInst - bInst;
        // 3. Por horário previsto (mais cedo primeiro)
        if (a.horario_previsto && b.horario_previsto) return a.horario_previsto.localeCompare(b.horario_previsto);
        // 4. Fallback por created_at
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
  }, [missoes, motoristaData, dataOperacional]);

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
    // Guard anti-duplicata síncrono
    if (missaoActionRef.current) return;
    missaoActionRef.current = true;

    const missao = missoes.find(m => m.id === missaoId);
    if (!missao) { missaoActionRef.current = false; return; }

    setOperando(missaoId);
    try {
      // Validação: apenas uma missão ativa por vez
      const temMissaoAtiva = minhasMissoes.some(m =>
        (m.status === 'aceita' || m.status === 'em_andamento') &&
        m.id !== missaoId
      );

      if (action === 'aceitar') {
        if (temMissaoAtiva) {
          toast.warning('Finalize a missão atual antes de aceitar outra');
          return;
        }
        // Verificar se tem veículo vinculado
        if (!motoristaData?.veiculo_id) {
          setShowVeiculoAlert(true);
          return;
        }
        await supabase.from('missoes').update({ status: 'aceita' }).eq('id', missaoId);
      } else if (action === 'recusar') {
        await supabase.from('missoes').update({ status: 'cancelada' }).eq('id', missaoId);
      } else if (action === 'iniciar') {
        if (temMissaoAtiva && missao.status !== 'aceita') {
          toast.warning('Finalize a missão atual antes de iniciar outra');
          return;
        }
        // Verificar se tem veículo vinculado
        if (!motoristaData?.veiculo_id) {
          setShowVeiculoAlert(true);
          return;
        }
        // Verificar se missão já tem viagem ativa (anti-duplicata)
        const { data: viagemExistente } = await supabase
          .from('viagens')
          .select('id')
          .eq('origem_missao_id', missaoId)
          .in('status', ['agendado', 'em_andamento', 'aguardando_retorno'])
          .limit(1);

        if (viagemExistente && viagemExistente.length > 0) {
          toast.info('Missão já possui viagem ativa');
          return;
        }
        // Criar viagem ao iniciar a missão
        if (!motoristaData || !eventoId) {
          toast.error('Motorista não encontrado');
          return;
        }

        // Encontrar veículo vinculado ao motorista
        const veiculoVinculado = motoristaData.veiculo_id;

        const now = getAgoraSync();
        const horaPickup = now.toTimeString().slice(0, 8);

        const { data: novaViagem, error } = await supabase
          .from('viagens')
          .insert({
            evento_id: eventoId,
            // Campos FK normalizados
            motorista_id: motoristaData.id,
            veiculo_id: veiculoVinculado || null,
            ponto_embarque_id: missao.ponto_embarque_id || null,
            ponto_desembarque_id: missao.ponto_desembarque_id || null,
            // Campos de texto (compatibilidade)
            motorista: motoristaData.nome,
            placa: veiculoExibir?.placa || null,
            tipo_veiculo: veiculoExibir?.tipo_veiculo || null,
            ponto_embarque: missao.ponto_embarque,
            ponto_desembarque: missao.ponto_desembarque,
            tipo_operacao: 'transfer',
            h_pickup: horaPickup,
            qtd_pax: missao.qtd_pax || 0,
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

        // Registrar log de início (gera notificação)
        await supabase.from('viagem_logs').insert([{
          viagem_id: novaViagem.id,
          user_id: motoristaData.id,
          acao: 'inicio',
          detalhes: {
            via: 'app_motorista_missao',
            motorista_nome: motoristaData.nome,
            placa: veiculoExibir?.placa || null,
          }
        }]);

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
        if (!motoristaData) {
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
          .eq('motorista_id', motoristaData.id)
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

        await supabase.from('missoes').update({ status: 'concluida' }).eq('id', missaoId);
        refetch(); // Refetch viagens
      }
      refetchMissoes();
    } finally {
      setOperando(null);
      missaoActionRef.current = false;
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
                {minhasMissoes.map(missao => {
                  const temOutraAtiva = minhasMissoes.some(m =>
                    (m.status === 'aceita' || m.status === 'em_andamento') &&
                    m.id !== missao.id
                  );
                  return (
                    <MissaoCardMobile
                      key={missao.id}
                      missao={missao}
                      loading={operando === missao.id}
                      disabled={missao.status === 'pendente' && temOutraAtiva}
                      dataOperacional={dataOperacional}
                      onAceitar={() => handleMissaoAction(missao.id, 'aceitar')}
                      onIniciar={() => setMissaoParaIniciar(missao.id)}
                      onRecusar={() => handleMissaoAction(missao.id, 'recusar')}
                      onFinalizar={() => handleMissaoAction(missao.id, 'finalizar')}
                    />
                  );
                })}
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
        return <MotoristaVeiculoTab veiculo={veiculoExibir} eventoId={eventoId} motoristaId={motoristaData?.id} />;

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
            horarioVirada={evento?.horario_virada_dia || '04:00'}
            dataInicio={evento?.data_inicio}
            dataFim={evento?.data_fim}
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

            {/* Version Badge */}
            <div className="text-center pt-4">
              <VersionBadge variant="footer" showAppName />
            </div>
          </div>
        );
      }
    }
  };

  if (loading || !motoristaData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={logoAS} alt="AS Brasil" className="h-14 w-14 rounded-lg object-contain opacity-60" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dados...</p>
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
      <header className="sticky top-0 z-50 bg-primary safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/login/motorista')} className="text-primary-foreground hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-primary-foreground">{nomeMotorista || 'Motorista'}</h1>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-primary-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-primary-foreground/70">{evento?.nome_planilha}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
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

      {/* Alert: Veículo não vinculado */}
      <AlertDialog open={showVeiculoAlert} onOpenChange={setShowVeiculoAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <Car className="h-10 w-10 text-muted-foreground" />
            </div>
            <AlertDialogTitle className="text-center">Veículo não vinculado</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Para aceitar esta missão, solicite ao supervisor operacional que vincule um veículo ao seu perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="w-full">Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert: Confirmação para iniciar missão */}
      <AlertDialog open={!!missaoParaIniciar} onOpenChange={(open) => { if (!open) setMissaoParaIniciar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <ClipboardList className="h-10 w-10 text-primary" />
            </div>
            <AlertDialogTitle className="text-center">Iniciar Missão?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Uma viagem será criada e iniciada automaticamente. Confirme para prosseguir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setMissaoParaIniciar(null)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (missaoParaIniciar) {
                  handleMissaoAction(missaoParaIniciar, 'iniciar');
                  setMissaoParaIniciar(null);
                }
              }}
            >
              Confirmar Início
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
