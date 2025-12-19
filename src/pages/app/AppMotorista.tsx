import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useViagens } from '@/hooks/useViagens';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useEventos } from '@/hooks/useEventos';
import { ViagemCardMobile } from '@/components/app/ViagemCardMobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Loader2, Search, CheckCircle2 } from 'lucide-react';

export default function AppMotorista() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { viagens, loading, refetch } = useViagens(eventoId);
  const { eventos } = useEventos();
  const { iniciarViagem, registrarChegada, registrarRetorno } = useViagemOperacao();
  
  const [busca, setBusca] = useState<string>('');
  const [operando, setOperando] = useState<string | null>(null);

  const evento = eventos.find(e => e.id === eventoId);

  // Auto-preencher busca com nome do usuário se disponível
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
        // Ordenar: em_andamento primeiro, depois aguardando_retorno, depois agendado
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Motorista</h1>
              <p className="text-xs text-muted-foreground">{evento?.nome_planilha}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

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
      </header>

      <main className="p-4 space-y-4">
        {/* Stats Card */}
        {busca && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.ativas}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.concluidas}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Viagens */}
        {!busca.trim() ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Digite seu nome ou placa para ver suas viagens</p>
            </CardContent>
          </Card>
        ) : minhasViagens.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma viagem encontrada para "{busca}"
            </CardContent>
          </Card>
        ) : (
          <>
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

            {/* Viagens concluídas colapsadas */}
            {minhasViagens.filter(v => v.status === 'encerrado').length > 0 && (
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Viagens concluídas ({minhasViagens.filter(v => v.status === 'encerrado').length})
                </p>
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
          </>
        )}
      </main>
    </div>
  );
}
