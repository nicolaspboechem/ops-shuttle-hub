import { useMemo } from 'react';
import { Users, CheckCircle, Bus, Clock, TrendingUp, Route } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PassengersChart } from '@/components/dashboard/PassengersChart';
import { RoutePerformanceChart } from '@/components/dashboard/RoutePerformanceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ClienteDashboardTabProps {
  eventoId: string;
}

export function ClienteDashboardTab({ eventoId }: ClienteDashboardTabProps) {
  const { viagens, loading, lastUpdate } = useViagens(eventoId);
  const { kpis, metricasPorHora, viagensAtivas, viagensFinalizadas } = useCalculos(viagens);

  // Métricas estratégicas
  const totalPaxDia = useMemo(() => 
    viagens.reduce((acc, v) => acc + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0)
  , [viagens]);

  const horarioPico = useMemo(() => {
    if (!metricasPorHora.length) return null;
    return metricasPorHora.reduce((max, h) => h.totalPax > max.totalPax ? h : max, metricasPorHora[0]);
  }, [metricasPorHora]);

  const rotaMaisUsada = useMemo(() => {
    if (!viagens.length) return null;
    const countByRota: Record<string, number> = {};
    viagens.forEach(v => {
      const rota = v.ponto_embarque || 'Sem rota';
      countByRota[rota] = (countByRota[rota] || 0) + 1;
    });
    const sorted = Object.entries(countByRota).sort(([, a], [, b]) => b - a);
    return sorted[0] ? { nome: sorted[0][0], count: sorted[0][1] } : null;
  }, [viagens]);

  const formatarMinutos = (minutos: number) => {
    if (!minutos || minutos === 0) return '0min';
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header com última atualização */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Análise Estratégica</h2>
          <p className="text-sm text-muted-foreground">Métricas de público e comportamento</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Atualizado: {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
        </Badge>
      </div>

      {/* KPIs Estratégicos - Sem alertas operacionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Total PAX Dia" 
          value={totalPaxDia} 
          icon={<Users className="h-5 w-5" />}
          subtitle="Passageiros transportados"
        />
        <MetricCard 
          title="Viagens Realizadas" 
          value={viagensFinalizadas.length} 
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle="Finalizadas hoje"
        />
        <MetricCard 
          title="Em Trânsito" 
          value={viagensAtivas.length} 
          icon={<Bus className="h-5 w-5" />}
          subtitle="Viagens ativas"
          highlight={viagensAtivas.length > 0}
        />
        <MetricCard 
          title="Tempo Médio" 
          value={formatarMinutos(kpis?.tempoMedioGeral || 0)} 
          icon={<Clock className="h-5 w-5" />}
          subtitle="Por viagem"
        />
      </div>

      {/* Insights Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {horarioPico && horarioPico.totalPax > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Horário de Pico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{horarioPico.hora}</p>
              <p className="text-sm text-muted-foreground">
                {horarioPico.totalPax} passageiros transportados
              </p>
            </CardContent>
          </Card>
        )}

        {rotaMaisUsada && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                Rota Mais Utilizada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold truncate">{rotaMaisUsada.nome}</p>
              <p className="text-sm text-muted-foreground">
                {rotaMaisUsada.count} viagens realizadas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráficos - Foco em comportamento */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Passageiros por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <PassengersChart data={metricasPorHora} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desempenho por Rota</CardTitle>
          </CardHeader>
          <CardContent>
            <RoutePerformanceChart viagens={viagens} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
