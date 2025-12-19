import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, Users, Clock, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { VehiclesChart } from '@/components/dashboard/VehiclesChart';
import { PassengersChart } from '@/components/dashboard/PassengersChart';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading, lastUpdate, refetch } = useViagens(eventoId);
  const { getEventoById } = useEventos();
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');

  const evento = eventoId ? getEventoById(eventoId) : null;

  const viagensFiltradas = useMemo(() => {
    if (tipoOperacao === 'todos') return viagens;
    return viagens.filter(v => v.tipo_operacao === tipoOperacao);
  }, [viagens, tipoOperacao]);

  const { kpis, metricasPorHora, viagensAtivas } = useCalculos(viagensFiltradas);

  const contadores = useMemo(() => ({
    todos: viagens.length,
    transfer: viagens.filter(v => v.tipo_operacao === 'transfer').length,
    shuttle: viagens.filter(v => v.tipo_operacao === 'shuttle').length,
  }), [viagens]);

  if (loading) {
    return (
      <EventLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout>
      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Viagens" value={kpis?.totalViagens || 0} subtitle={`${viagensAtivas.length} ativas`} icon={<Bus className="w-6 h-6" />} />
          <MetricCard title="Total Passageiros" value={kpis?.totalPax || 0} subtitle="Ida + Retorno" icon={<Users className="w-6 h-6" />} />
          <MetricCard title="Tempo Médio" value={kpis ? formatarMinutos(kpis.tempoMedioGeral) : '-'} subtitle="Por viagem" icon={<Clock className="w-6 h-6" />} />
          <MetricCard title="Veículos Ativos" value={28} subtitle="9 ônibus, 16 vans, 3 PCD" icon={<Truck className="w-6 h-6" />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Viagens OK" value={kpis?.viagensOk || 0} icon={<CheckCircle className="w-6 h-6 text-status-ok" />} className="border-status-ok/20" />
          <MetricCard title="Em Alerta" value={kpis?.alertas.length || 0} icon={<AlertTriangle className="w-6 h-6 text-status-alert" />} className="border-status-alert/20" />
          <MetricCard title="Críticos" value={kpis?.alertasCriticos.length || 0} icon={<AlertTriangle className="w-6 h-6 text-status-critical" />} className="border-status-critical/20" />
        </div>

        {kpis && <AlertsPanel criticos={kpis.alertasCriticos} alertas={kpis.alertas} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VehiclesChart data={metricasPorHora} />
          <PassengersChart data={metricasPorHora} />
        </div>
      </div>
    </EventLayout>
  );
}
