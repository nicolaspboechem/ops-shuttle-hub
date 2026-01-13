import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useViagens } from '@/hooks/useViagens';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useMissoes } from '@/hooks/useMissoes';
import { useMotoristas } from '@/hooks/useCadastros';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEventos } from '@/hooks/useEventos';
import { ViagemCardMobile } from '@/components/app/ViagemCardMobile';
import { MissaoCardMobile } from '@/components/app/MissaoCardMobile';
import { CreateViagemMotoristaForm } from '@/components/app/CreateViagemMotoristaForm';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Search, CheckCircle2, Bus, Plus, MoreVertical, LogOut, ClipboardList } from 'lucide-react';
import logoAS from '@/assets/as_logo_reduzida_preta.png';

export default function AppMotorista() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const { viagens, loading, refetch } = useViagens(eventoId);
  const { eventos } = useEventos();
  const { iniciarViagem, registrarChegada } = useViagemOperacao();
  const { motoristas } = useMotoristas(eventoId);
  const { missoes, loading: loadingMissoes, updateMissao, refetch: refetchMissoes } = useMissoes(eventoId);
  
  const [busca, setBusca] = useState<string>('');
  const [operando, setOperando] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const evento = eventos.find(e => e.id === eventoId);
  
  // Find motorista ID from name
  const motoristaData = motoristas.find(m => 
    m.nome.toLowerCase() === busca.toLowerCase().trim()
  );

  // Filter missions for this driver
  const minhasMissoes = useMemo(() => {
    if (!motoristaData) return [];
    return missoes.filter(m => 
      m.motorista_id === motoristaData.id && 
      ['pendente', 'aceita', 'em_andamento'].includes(m.status)
    );
  }, [missoes, motoristaData]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchMissoes()]);
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

        const now = new Date();
        const horaPickup = now.toTimeString().slice(0, 8);

        const { data: novaViagem, error } = await supabase
          .from('viagens')
          .insert({
            evento_id: eventoId,
            motorista: motorista.nome,
            ponto_embarque: missao.ponto_embarque,
            ponto_desembarque: missao.ponto_desembarque,
            tipo_operacao: 'transfer',
            h_pickup: horaPickup,
            status: 'em_andamento',
            criado_por: user?.id,
            iniciado_por: user?.id,
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
            atualizado_por: user?.id
          })
          .eq('id', missaoId);

        // Atualizar status do motorista para em_viagem
        await supabase
          .from('motoristas')
          .update({ status: 'em_viagem' })
          .eq('id', missao.motorista_id);

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
        
        if (viagemId) {
          const now = new Date();
          const horaChegada = now.toTimeString().slice(0, 8);

          await supabase
            .from('viagens')
            .update({
              status: 'encerrado',
              h_chegada: horaChegada,
              h_fim_real: now.toISOString(),
              finalizado_por: user?.id,
              atualizado_por: user?.id,
              encerrado: true,
            })
            .eq('id', viagemId);
        }

        // Verificar se motorista tem outras viagens ativas
        const { data: outrasViagens } = await supabase
          .from('viagens')
          .select('id')
          .eq('motorista', motorista.nome)
          .eq('evento_id', eventoId)
          .eq('encerrado', false);

        if (!outrasViagens || outrasViagens.length === 0) {
          await supabase
            .from('motoristas')
            .update({ status: 'disponivel' })
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

  useEffect(() => {
    if (profile?.full_name && !busca) {
      setBusca(profile.full_name);
    }
  }, [profile]);

  const minhasViagens = useMemo(() => {
    if (!busca.trim()) return [];
    
    const termo = busca.toLowerCase();
    return viagens
      .filter(v => 
        v.motorista.toLowerCase().includes(termo) || 
        v.placa?.toLowerCase().includes(termo)
      )
      .sort((a, b) => {
        const ordem: Record<string, number> = {
          'em_andamento': 0,
          'aguardando_retorno': 1,
          'agendado': 2,
          'encerrado': 3,
          'cancelado': 4
        };
        const statusA = a.status || 'agendado';
        const statusB = b.status || 'agendado';
        return (ordem[statusA] || 5) - (ordem[statusB] || 5);
      });
  }, [viagens, busca]);

  const stats = useMemo(() => {
    const ativas = minhasViagens.filter(v => 
      v.status !== 'encerrado' && v.status !== 'cancelado'
    ).length;
    const concluidas = minhasViagens.filter(v => v.status === 'encerrado').length;
    return { ativas, concluidas, total: minhasViagens.length };
  }, [minhasViagens]);

  const handleAction = async (viagemId: string, action: 'iniciar' | 'chegada') => {
    const viagem = viagens.find(v => v.id === viagemId);
    if (!viagem) return;

    setOperando(viagemId);
    try {
      if (action === 'iniciar') await iniciarViagem(viagem);
      if (action === 'chegada') await registrarChegada(viagem);
      refetch();
    } finally {
      setOperando(null);
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div>
                <h1 className="text-lg font-semibold">Motorista</h1>
                <p className="text-xs text-muted-foreground">{evento?.nome_planilha} - AS Brasil</p>
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
                    onClick={async () => {
                      await signOut();
                      navigate('/auth');
                    }}
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
        <main className="container mx-auto px-4 py-4 space-y-4 pb-24">
          {/* Busca por nome/placa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou placa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Stats Card */}
          {busca && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{stats.ativas}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                <p className="text-2xl font-bold text-emerald-600">{stats.concluidas}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
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

          {/* Lista de Viagens */}
          {!busca.trim() ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Busque suas viagens</p>
              <p className="text-sm">Digite seu nome ou placa para ver suas viagens</p>
            </div>
          ) : minhasViagens.length === 0 && minhasMissoes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma viagem encontrada</p>
              <p className="text-sm mb-4">Nenhuma viagem para "{busca}"</p>
            </div>
          ) : minhasViagens.length > 0 && (
            <div className="space-y-3">
              {/* Viagens ativas primeiro */}
              {minhasViagens
                .filter(v => v.status !== 'encerrado' && v.status !== 'cancelado')
                .map(viagem => (
                  <ViagemCardMobile
                    key={viagem.id}
                    viagem={viagem}
                    loading={operando === viagem.id}
                    onIniciar={() => handleAction(viagem.id, 'iniciar')}
                    onChegada={() => handleAction(viagem.id, 'chegada')}
                  />
                ))
              }

              {/* Viagens concluídas */}
              {minhasViagens.filter(v => v.status === 'encerrado').length > 0 && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Viagens concluídas ({minhasViagens.filter(v => v.status === 'encerrado').length})</span>
                  </div>
                  {minhasViagens
                    .filter(v => v.status === 'encerrado')
                    .map(viagem => (
                      <ViagemCardMobile
                        key={viagem.id}
                        viagem={viagem}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </main>
      </PullToRefresh>

      {/* FAB Fixo - Nova Viagem */}
      {busca.trim() && (
        <Button
          size="lg"
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Form de criação para motorista */}
      {busca.trim() && (
        <CreateViagemMotoristaForm
          open={showForm}
          onOpenChange={setShowForm}
          eventoId={eventoId!}
          motoristaName={busca.trim()}
          onCreated={refetch}
        />
      )}
    </div>
  );
}
