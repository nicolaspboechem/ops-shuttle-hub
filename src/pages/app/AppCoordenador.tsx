import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useViagens } from '@/hooks/useViagens';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useEventos } from '@/hooks/useEventos';
import { ViagemCardMobile } from '@/components/app/ViagemCardMobile';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Loader2, Filter } from 'lucide-react';
import { StatusViagemOperacao } from '@/lib/types/viagem';

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
      // Filtro por ponto
      if (pontoFiltro !== 'todos' && v.ponto_embarque !== pontoFiltro) return false;
      
      // Filtro por status
      const status = v.status || 'agendado';
      if (statusFiltro === 'ativos' && (status === 'encerrado' || status === 'cancelado')) return false;
      if (statusFiltro === 'encerrados' && status !== 'encerrado') return false;
      
      return true;
    }).sort((a, b) => {
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
              <h1 className="font-semibold">Coordenador</h1>
              <p className="text-xs text-muted-foreground">{evento?.nome_planilha}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge variant="outline" className="bg-slate-100 whitespace-nowrap">
            Agendado: {contadores.agendado}
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 whitespace-nowrap">
            Em Andamento: {contadores.em_andamento}
          </Badge>
          <Badge variant="outline" className="bg-amber-100 text-amber-700 whitespace-nowrap">
            Aguardando: {contadores.aguardando_retorno}
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-700 whitespace-nowrap">
            Encerrado: {contadores.encerrado}
          </Badge>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-2">
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
      </header>

      {/* Lista de Viagens */}
      <main className="p-4 space-y-4">
        {viagensFiltradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma viagem encontrada
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
      </main>
    </div>
  );
}
