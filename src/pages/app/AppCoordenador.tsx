import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useViagens } from '@/hooks/useViagens';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useEventos } from '@/hooks/useEventos';
import { ViagemCardMobile } from '@/components/app/ViagemCardMobile';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Loader2, Filter, Bus, UserCircle } from 'lucide-react';

export default function AppCoordenador() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { viagens, loading, refetch } = useViagens(eventoId);
  const { eventos } = useEventos();
  const { iniciarViagem, registrarChegada, registrarRetorno } = useViagemOperacao();
  
  const [pontoFiltro, setPontoFiltro] = useState<string>('todos');
  const [statusFiltro, setStatusFiltro] = useState<string>('ativos');
  const [operando, setOperando] = useState<string | null>(null);

  const evento = eventos.find(e => e.id === eventoId);

  const pontosEmbarque = useMemo(() => {
    return [...new Set(viagens.map(v => v.ponto_embarque).filter(Boolean))] as string[];
  }, [viagens]);

  const viagensFiltradas = useMemo(() => {
    return viagens.filter(v => {
      if (pontoFiltro !== 'todos' && v.ponto_embarque !== pontoFiltro) return false;
      
      const status = v.status || 'agendado';
      if (statusFiltro === 'ativos' && (status === 'encerrado' || status === 'cancelado')) return false;
      if (statusFiltro === 'encerrados' && status !== 'encerrado') return false;
      
      return true;
    }).sort((a, b) => {
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
  }, [viagens, pontoFiltro, statusFiltro]);

  const contadores = useMemo(() => {
    const counts: Record<string, number> = {
      agendado: 0,
      em_andamento: 0,
      aguardando_retorno: 0,
      encerrado: 0
    };
    viagens.forEach(v => {
      const s = v.status || 'agendado';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [viagens]);

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
                <UserCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Coordenador</h1>
                <p className="text-xs text-muted-foreground">{evento?.nome_planilha}</p>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={refetch}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Status Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xl font-bold">{contadores.agendado}</p>
            <p className="text-[10px] text-muted-foreground">Agendado</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <p className="text-xl font-bold text-primary">{contadores.em_andamento}</p>
            <p className="text-[10px] text-muted-foreground">Em Andamento</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-500/10">
            <p className="text-xl font-bold text-amber-600">{contadores.aguardando_retorno}</p>
            <p className="text-[10px] text-muted-foreground">Aguardando</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/10">
            <p className="text-xl font-bold text-emerald-600">{contadores.encerrado}</p>
            <p className="text-[10px] text-muted-foreground">Encerrado</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <Select value={pontoFiltro} onValueChange={setPontoFiltro}>
            <SelectTrigger className="flex-1">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ponto de Embarque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os pontos</SelectItem>
              {pontosEmbarque.map(ponto => (
                <SelectItem key={ponto} value={ponto}>{ponto}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="encerrados">Encerrados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Viagens */}
        <div className="space-y-3">
          {viagensFiltradas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma viagem encontrada</p>
              <p className="text-sm">Ajuste os filtros para ver mais viagens</p>
            </div>
          ) : (
            viagensFiltradas.map(viagem => (
              <ViagemCardMobile
                key={viagem.id}
                viagem={viagem}
                loading={operando === viagem.id}
                onIniciar={() => handleAction(viagem.id, 'iniciar')}
                onChegada={() => handleAction(viagem.id, 'chegada')}
                onRetorno={() => handleAction(viagem.id, 'retorno')}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
