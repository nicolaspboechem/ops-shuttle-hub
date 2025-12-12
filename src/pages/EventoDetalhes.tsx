import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Calendar, Bus, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EventoTabs } from '@/components/eventos/EventoTabs';
import { useViagens } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';

export default function EventoDetalhes() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { viagens, loading, lastUpdate, refetch } = useViagens(eventoId);
  const { getEventoById, loading: loadingEventos } = useEventos();
  
  const evento = eventoId ? getEventoById(eventoId) : null;

  // Separate trips by type
  const { viagensTransfer, viagensShuttle } = useMemo(() => ({
    viagensTransfer: viagens.filter(v => v.tipo_operacao === 'transfer'),
    viagensShuttle: viagens.filter(v => v.tipo_operacao === 'shuttle'),
  }), [viagens]);

  const statusConfig = {
    ativo: { label: 'Ativo', className: 'bg-status-ok text-status-ok-foreground' },
    finalizado: { label: 'Finalizado', className: 'bg-muted text-muted-foreground' },
    processando: { label: 'Processando', className: 'bg-status-alert text-status-alert-foreground' }
  };

  const status = evento 
    ? (statusConfig[evento.status as keyof typeof statusConfig] || statusConfig.ativo)
    : statusConfig.ativo;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || loadingEventos) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </header>
        <div className="container mx-auto px-6 py-6 space-y-6">
          <Skeleton className="h-12 w-80" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Evento não encontrado</h1>
          <Button onClick={() => navigate('/eventos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Eventos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/eventos')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-semibold truncate">
                    {evento.nome_planilha}
                  </h1>
                  <Badge className={status.className}>
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5" />
                    {viagens.length} viagens
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Car className="w-3.5 h-3.5" />
                    {viagensTransfer.length} transfer
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Bus className="w-3.5 h-3.5" />
                    {viagensShuttle.length} shuttle
                  </span>
                  {lastUpdate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Atualizado: {formatDate(lastUpdate.toISOString())}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content with Tabs */}
      <div className="container mx-auto px-6 py-6">
        <EventoTabs 
          viagensTransfer={viagensTransfer}
          viagensShuttle={viagensShuttle}
          onUpdate={refetch}
        />
      </div>
    </div>
  );
}
