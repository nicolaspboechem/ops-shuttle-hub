import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useViagens } from '@/hooks/useViagens';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useEventos } from '@/hooks/useEventos';
import { ViagemCardMobile } from '@/components/app/ViagemCardMobile';
import { CreateViagemMotoristaForm } from '@/components/app/CreateViagemMotoristaForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, Loader2, Search, CheckCircle2, Bus, Plus } from 'lucide-react';

export default function AppMotorista() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { viagens, loading, refetch } = useViagens(eventoId);
  const { eventos } = useEventos();
  const { iniciarViagem, registrarChegada, registrarRetorno } = useViagemOperacao();
  
  const [busca, setBusca] = useState<string>('');
  const [operando, setOperando] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const evento = eventos.find(e => e.id === eventoId);

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

  const handleAction = async (viagemId: string, action: 'iniciar' | 'chegada' | 'retorno') => {
    const viagem = viagens.find(v => v.id === viagemId);
    if (!viagem) return;

    setOperando(viagemId);
    try {
      if (action === 'iniciar') await iniciarViagem(viagem);
      if (action === 'chegada') await registrarChegada(viagem);
      if (action === 'retorno') await registrarRetorno(viagem);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                <Bus className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Motorista</h1>
                <p className="text-xs text-muted-foreground">{evento?.nome_planilha}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={refetch}>
                <RefreshCw className="h-5 w-5" />
              </Button>
              {busca.trim() && (
                <Button size="icon" onClick={() => setShowForm(true)}>
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-4 space-y-4">
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

        {/* Lista de Viagens */}
        {!busca.trim() ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Busque suas viagens</p>
            <p className="text-sm">Digite seu nome ou placa para ver suas viagens</p>
          </div>
        ) : minhasViagens.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhuma viagem encontrada</p>
            <p className="text-sm mb-4">Nenhuma viagem para "{busca}"</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Nova Viagem
            </Button>
          </div>
        ) : (
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
                  onRetorno={() => handleAction(viagem.id, 'retorno')}
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
