import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, Car, Bus, Clock, CalendarDays } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useViagens } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { EventoTabs } from '@/components/eventos/EventoTabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EventoDetalhes() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading: loadingViagens, refreshing, lastUpdate, refetch } = useViagens(eventoId);
  const { getEventoById, loading: loadingEventos } = useEventos();
  const [selectedDate, setSelectedDate] = useState<string>('all');
  
  const evento = eventoId ? getEventoById(eventoId) : null;

  // Extract unique dates from viagens
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    viagens.forEach(v => {
      const date = new Date(v.data_criacao).toISOString().split('T')[0];
      dates.add(date);
    });
    return Array.from(dates).sort();
  }, [viagens]);

  // Filter viagens by selected date
  const filteredViagens = useMemo(() => {
    if (selectedDate === 'all') return viagens;
    return viagens.filter(v => {
      const viagemDate = new Date(v.data_criacao).toISOString().split('T')[0];
      return viagemDate === selectedDate;
    });
  }, [viagens, selectedDate]);

  const viagensTransfer = useMemo(() => 
    filteredViagens.filter(v => v.tipo_operacao === 'transfer'), [filteredViagens]);
  
  const viagensShuttle = useMemo(() => 
    filteredViagens.filter(v => v.tipo_operacao === 'shuttle'), [filteredViagens]);

  const statusConfig = {
    ativo: { label: 'Ativo', className: 'bg-status-ok/10 text-status-ok border-status-ok/20' },
    finalizado: { label: 'Finalizado', className: 'bg-muted text-muted-foreground' },
    processando: { label: 'Processando', className: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  const formatDateForSelect = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loadingViagens || loadingEventos) {
    return (
      <EventLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </EventLayout>
    );
  }

  if (!evento) {
    return (
      <EventLayout>
        <div className="p-6">
          <h1 className="text-xl font-semibold mb-2">Evento não encontrado</h1>
          <p className="text-muted-foreground">O evento solicitado não foi encontrado.</p>
        </div>
      </EventLayout>
    );
  }

  const status = statusConfig[evento.status as keyof typeof statusConfig] || statusConfig.ativo;

  return (
    <EventLayout>
      <div className="p-6 space-y-6">
        {/* Header do Evento - Mais compacto */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{evento.nome_planilha}</h1>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Última atualização: {formatDateTime(evento.data_ultima_sync)}
                </p>
                <div className="flex items-center gap-5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">{viagensTransfer.length}</span>
                    <span className="text-muted-foreground">transfers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium">{viagensShuttle.length}</span>
                    <span className="text-muted-foreground">shuttles</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">{filteredViagens.filter(v => !v.encerrado).length}</span>
                    <span className="text-muted-foreground">em andamento</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Date Filter */}
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as datas</SelectItem>
                    {uniqueDates.map(date => (
                      <SelectItem key={date} value={date}>
                        {formatDateForSelect(date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={refetch} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Atualizando...' : 'Atualizar'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Abas Transfer/Shuttle */}
        <EventoTabs 
          viagensTransfer={viagensTransfer}
          viagensShuttle={viagensShuttle}
          eventoNome={evento.nome_planilha}
          onUpdate={refetch}
          selectedDate={selectedDate}
        />
      </div>
    </EventLayout>
  );
}
