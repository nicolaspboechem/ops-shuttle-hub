import { useMemo, useState, useEffect } from 'react';
import { Users, CheckCircle, Bus, Clock, TrendingUp, Route, Car, Fuel, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useMotoristasDashboard } from '@/hooks/useMotoristasDashboard';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { supabase } from '@/integrations/supabase/client';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PassengersChart } from '@/components/dashboard/PassengersChart';
import { RoutePerformanceChart } from '@/components/dashboard/RoutePerformanceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ClienteDashboardTabProps {
  eventoId: string;
}

interface VeiculoFrota {
  id: string;
  tipo_veiculo: string;
  nivel_combustivel: string | null;
  placa: string;
}

const FUEL_ORDER = ['cheio', '3/4', '1/2', '1/4', 'reserva'];
const FUEL_COLORS: Record<string, string> = {
  'cheio': 'bg-emerald-500',
  '3/4': 'bg-green-400',
  '1/2': 'bg-amber-400',
  '1/4': 'bg-orange-500',
  'reserva': 'bg-red-500',
};

export function ClienteDashboardTab({ eventoId }: ClienteDashboardTabProps) {
  const { viagens, loading, lastUpdate } = useViagens(eventoId);
  const { kpis, metricasPorHora, viagensAtivas, viagensFinalizadas } = useCalculos(viagens);
  const { getAgoraSync } = useServerTime();
  const [veiculos, setVeiculos] = useState<VeiculoFrota[]>([]);

  // Data operacional for motoristas dashboard
  const dataOperacional = useMemo(() => {
    const agora = getAgoraSync();
    return getDataOperacional(agora, '04:00');
  }, [getAgoraSync]);

  // Motoristas em viagem (IDs)
  const motoristasEmViagem = useMemo(() => {
    const ids = new Set<string>();
    viagensAtivas.forEach(v => { if (v.motorista_id) ids.add(v.motorista_id); });
    return ids;
  }, [viagensAtivas]);

  const motoristasDash = useMotoristasDashboard(eventoId, dataOperacional, motoristasEmViagem);

  // Fetch veiculos for fleet metrics
  useEffect(() => {
    if (!eventoId) return;
    supabase
      .from('veiculos')
      .select('id, tipo_veiculo, nivel_combustivel, placa')
      .eq('evento_id', eventoId)
      .eq('ativo', true)
      .then(({ data }) => setVeiculos(data || []));
  }, [eventoId]);

  // KPIs computados
  const totalPaxDia = useMemo(() => 
    viagens.reduce((acc, v) => acc + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0)
  , [viagens]);

  const veiculosAtivos = useMemo(() => {
    const placas = new Set<string>();
    viagensAtivas.forEach(v => { if (v.placa) placas.add(v.placa); });
    return placas.size;
  }, [viagensAtivas]);

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

  // Distribuição por tipo de veículo
  const distribuicaoTipo = useMemo(() => {
    const countByTipo: Record<string, number> = {};
    viagens.forEach(v => {
      const tipo = v.tipo_veiculo || 'Outro';
      countByTipo[tipo] = (countByTipo[tipo] || 0) + 1;
    });
    return Object.entries(countByTipo).sort(([, a], [, b]) => b - a);
  }, [viagens]);

  // Combustível da frota
  const combustivelFrota = useMemo(() => {
    const countByNivel: Record<string, number> = {};
    veiculos.forEach(v => {
      const nivel = v.nivel_combustivel || 'sem_info';
      countByNivel[nivel] = (countByNivel[nivel] || 0) + 1;
    });
    return countByNivel;
  }, [veiculos]);

  // Top 3 rotas com tempo médio
  const topRotas = useMemo(() => {
    const rotaMap: Record<string, { count: number; totalMin: number }> = {};
    viagens.forEach(v => {
      const rota = v.ponto_embarque || 'Sem rota';
      if (!rotaMap[rota]) rotaMap[rota] = { count: 0, totalMin: 0 };
      rotaMap[rota].count++;
      if (v.h_inicio_real && v.h_fim_real) {
        const diff = (new Date(v.h_fim_real).getTime() - new Date(v.h_inicio_real).getTime()) / 60000;
        if (diff > 0 && diff < 600) rotaMap[rota].totalMin += diff;
      }
    });
    return Object.entries(rotaMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([nome, data]) => ({
        nome,
        count: data.count,
        tempoMedio: data.count > 0 ? Math.round(data.totalMin / data.count) : 0,
      }));
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
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Análise Estratégica</h2>
          <p className="text-xs text-muted-foreground">Métricas compiladas</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {format(lastUpdate, 'HH:mm', { locale: ptBR })}
        </Badge>
      </div>

      {/* KPIs 2x3 grid mobile */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard 
          title="Total PAX" 
          value={totalPaxDia} 
          icon={<Users className="h-4 w-4" />}
          subtitle="Transportados"
        />
        <MetricCard 
          title="Realizadas" 
          value={viagensFinalizadas.length} 
          icon={<CheckCircle className="h-4 w-4" />}
          subtitle="Viagens"
        />
        <MetricCard 
          title="Em Trânsito" 
          value={viagensAtivas.length} 
          icon={<Bus className="h-4 w-4" />}
          subtitle="Ativas agora"
          highlight={viagensAtivas.length > 0}
        />
        <MetricCard 
          title="Tempo Médio" 
          value={formatarMinutos(kpis?.tempoMedioGeral || 0)} 
          icon={<Clock className="h-4 w-4" />}
          subtitle="Por viagem"
        />
        <MetricCard 
          title="Veículos Ativos" 
          value={veiculosAtivos} 
          icon={<Car className="h-4 w-4" />}
          subtitle={`de ${veiculos.length} na frota`}
        />
        <MetricCard 
          title="Motoristas" 
          value={motoristasDash.online} 
          icon={<UserCheck className="h-4 w-4" />}
          subtitle={`${motoristasDash.disponiveis} disponíveis`}
        />
      </div>

      {/* Insights compilados */}
      <div className="grid gap-4">
        {/* Distribuição por tipo de veículo */}
        {distribuicaoTipo.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Viagens por Tipo de Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {distribuicaoTipo.map(([tipo, count]) => (
                  <Badge key={tipo} variant="secondary" className="text-xs">
                    {tipo}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combustível da frota */}
        {veiculos.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Fuel className="h-4 w-4 text-primary" />
                Combustível da Frota ({veiculos.length} veículos)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {FUEL_ORDER.map(nivel => {
                  const count = combustivelFrota[nivel] || 0;
                  if (count === 0) return null;
                  const pct = Math.round((count / veiculos.length) * 100);
                  return (
                    <div key={nivel} className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${FUEL_COLORS[nivel]}`} />
                      <span className="capitalize flex-1">{nivel}</span>
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground text-xs">({pct}%)</span>
                    </div>
                  );
                })}
                {combustivelFrota['sem_info'] > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-3 h-3 rounded-full bg-muted" />
                    <span className="flex-1">Sem registro</span>
                    <span className="font-medium">{combustivelFrota['sem_info']}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 Rotas */}
        {topRotas.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                Top Rotas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {topRotas.map((rota, i) => (
                <div key={rota.nome} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rota.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {rota.count} viagens · {rota.tempoMedio > 0 ? `${formatarMinutos(rota.tempoMedio)} médio` : 'sem dados'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Horário de Pico + Rota mais usada */}
        <div className="grid grid-cols-2 gap-3">
          {horarioPico && horarioPico.totalPax > 0 && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Pico
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xl font-bold">{horarioPico.hora}</p>
                <p className="text-xs text-muted-foreground">{horarioPico.totalPax} PAX</p>
              </CardContent>
            </Card>
          )}
          {rotaMaisUsada && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium flex items-center gap-1">
                  <Route className="h-3.5 w-3.5 text-primary" />
                  Top Rota
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm font-bold truncate">{rotaMaisUsada.nome}</p>
                <p className="text-xs text-muted-foreground">{rotaMaisUsada.count} viagens</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">PAX por Hora</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <PassengersChart data={metricasPorHora} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Desempenho por Rota</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <RoutePerformanceChart viagens={viagens} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
