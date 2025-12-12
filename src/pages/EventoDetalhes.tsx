import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, Car, Bus, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useViagens } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { EventoTabs } from '@/components/eventos/EventoTabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EventoDetalhes() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading: loadingViagens, lastUpdate, refetch } = useViagens(eventoId);
  const { getEventoById, loading: loadingEventos } = useEventos();
  
  const evento = eventoId ? getEventoById(eventoId) : null;

  // Separar viagens por tipo de operação
  const viagensTransfer = useMemo(() => 
    viagens.filter(v => v.tipo_operacao === 'transfer'), [viagens]);
  
  const viagensShuttle = useMemo(() => 
    viagens.filter(v => v.tipo_operacao === 'shuttle'), [viagens]);

  const statusConfig = {
    ativo: { label: 'Ativo', className: 'bg-status-ok/10 text-status-ok border-status-ok/20' },
    finalizado: { label: 'Finalizado', className: 'bg-muted text-muted-foreground' },
    processando: { label: 'Processando', className: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  if (loadingViagens || loadingEventos) {
    return (
      <MainLayout>
        <Header title="Carregando..." />
        <div className="p-8 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!evento) {
    return (
      <MainLayout>
        <Header title="Evento não encontrado" />
        <div className="p-8">
          <p className="text-muted-foreground">O evento solicitado não foi encontrado.</p>
        </div>
      </MainLayout>
    );
  }

  const status = statusConfig[evento.status as keyof typeof statusConfig] || statusConfig.ativo;

  return (
    <MainLayout>
      <Header 
        title={evento.nome_planilha}
        subtitle={`${viagens.length} viagens • ${viagensTransfer.length} transfer • ${viagensShuttle.length} shuttle`}
        lastUpdate={lastUpdate}
        onRefresh={refetch}
      />
      
      <div className="p-8 space-y-6">
        {/* Header do Evento */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card rounded-lg border">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Badge className={status.className}>{status.label}</Badge>
              <span className="text-sm text-muted-foreground">
                Última atualização: {formatDate(evento.data_ultima_sync)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Car className="w-4 h-4 text-amber-500" />
                <span>{viagensTransfer.length} transfers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-emerald-500" />
                <span>{viagensShuttle.length} shuttles</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{viagens.filter(v => !v.encerrado).length} em andamento</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Abas Transfer/Shuttle */}
        <EventoTabs 
          viagensTransfer={viagensTransfer}
          viagensShuttle={viagensShuttle}
          onUpdate={refetch}
        />
      </div>
    </MainLayout>
  );
}
