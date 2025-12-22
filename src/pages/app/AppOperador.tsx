import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useAuth } from '@/lib/auth/AuthContext';
import { Viagem, Evento } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CreateViagemForm } from '@/components/app/CreateViagemForm';
import { ViagemCardOperador } from '@/components/app/ViagemCardOperador';
import { 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  Loader2,
  Bus,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

type StatusFilter = 'todos' | 'agendado' | 'em_andamento' | 'aguardando_retorno' | 'encerrado';

export default function AppOperador() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { viagens, loading, refetch } = useViagens(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [pontoFilter, setPontoFilter] = useState<string>('todos');

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
    if (pontoFilter !== 'todos' && v.ponto_embarque !== pontoFilter) return false;
    return true;
  });

  // Ordenar por status (em andamento primeiro) e depois por horário
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

  // Contadores
  const counts = {
    agendado: viagens.filter(v => v.status === 'agendado').length,
    em_andamento: viagens.filter(v => v.status === 'em_andamento').length,
    aguardando_retorno: viagens.filter(v => v.status === 'aguardando_retorno').length,
    encerrado: viagens.filter(v => v.status === 'encerrado').length,
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Operador</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {evento?.nome_planilha || 'Carregando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refetch}>
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button size="icon" onClick={() => setShowForm(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Badges de status */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        <Badge 
          variant={statusFilter === 'todos' ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap"
          onClick={() => setStatusFilter('todos')}
        >
          Todos ({viagens.length})
        </Badge>
        <Badge 
          variant={statusFilter === 'agendado' ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap"
          onClick={() => setStatusFilter('agendado')}
        >
          <Clock className="h-3 w-3 mr-1" />
          Agendado ({counts.agendado})
        </Badge>
        <Badge 
          variant={statusFilter === 'em_andamento' ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap bg-blue-500/10 text-blue-600 border-blue-500/30"
          onClick={() => setStatusFilter('em_andamento')}
        >
          <Bus className="h-3 w-3 mr-1" />
          Em Andamento ({counts.em_andamento})
        </Badge>
        <Badge 
          variant={statusFilter === 'aguardando_retorno' ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
          onClick={() => setStatusFilter('aguardando_retorno')}
        >
          Aguardando ({counts.aguardando_retorno})
        </Badge>
        <Badge 
          variant={statusFilter === 'encerrado' ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap bg-green-500/10 text-green-600 border-green-500/30"
          onClick={() => setStatusFilter('encerrado')}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Encerrado ({counts.encerrado})
        </Badge>
      </div>

      {/* Filtro por ponto */}
      {pontos.length > 0 && (
        <div className="px-4 pb-3">
          <Select value={pontoFilter} onValueChange={setPontoFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por ponto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os pontos</SelectItem>
              {pontos.filter(p => p.ativo).map(p => (
                <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Lista de viagens */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedViagens.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bus className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma viagem</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== 'todos' 
                  ? 'Nenhuma viagem com este status'
                  : 'Crie a primeira viagem do evento'}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Viagem
              </Button>
            </CardContent>
          </Card>
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

      {/* Form de criação (Drawer) */}
      <CreateViagemForm
        open={showForm}
        onOpenChange={setShowForm}
        eventoId={eventoId!}
        onCreated={refetch}
      />
    </div>
  );
}
