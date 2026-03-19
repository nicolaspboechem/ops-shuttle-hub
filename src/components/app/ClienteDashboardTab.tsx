import { useMemo, useState, useEffect } from 'react';
import { Users, CheckCircle, Bus, Clock, TrendingUp, Route, Car, UserCheck, Radio, BarChart3, ChevronRight } from 'lucide-react';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
interface ClienteDashboardTabProps {
  eventoId: string;
  tiposViagem?: string[] | null;
  horarioVirada?: string;
}

interface VeiculoFrota {
  id: string;
  tipo_veiculo: string;
  nivel_combustivel: string | null;
  placa: string;
  nome: string | null;
  status: string | null;
  capacidade: number | null;
}


export function ClienteDashboardTab({ eventoId, tiposViagem, horarioVirada }: ClienteDashboardTabProps) {
  const { getAgoraSync } = useServerTime();
  const horarioViradaFinal = horarioVirada || '04:00';

  // Filtrar viagens pelo dia operacional atual
  const dataOperacional = useMemo(() => {
    return getDataOperacional(getAgoraSync(), horarioViradaFinal);
  }, [getAgoraSync, horarioViradaFinal]);

  const viagensOptions = useMemo(() => ({
    dataOperacional,
    horarioVirada: horarioViradaFinal,
  }), [dataOperacional, horarioViradaFinal]);

  const { viagens: todasViagens, loading, lastUpdate } = useViagens(eventoId, viagensOptions);
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');

  // Filter viagens by selected operation type
  const viagens = useMemo(() => {
    if (tipoOperacao === 'todos') return todasViagens;
    if (tipoOperacao === 'missao') return todasViagens.filter(v => !!v.origem_missao_id);
    return todasViagens.filter(v => v.tipo_operacao === tipoOperacao && !v.origem_missao_id);
  }, [todasViagens, tipoOperacao]);

  const { kpis, metricasPorHora, viagensAtivas, viagensFinalizadas } = useCalculos(viagens);

  // Contadores always from all viagens (unfiltered)
  const contadoresOperacao = useMemo(() => {
    const ativas = todasViagens.filter(v => v.status !== 'encerrado' && v.status !== 'cancelado');
    return {
      shuttle: ativas.filter(v => v.tipo_operacao === 'shuttle' && !v.origem_missao_id).length,
      missao: ativas.filter(v => !!v.origem_missao_id).length,
    };
  }, [todasViagens]);
  const [veiculos, setVeiculos] = useState<VeiculoFrota[]>([]);

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
      .select('id, tipo_veiculo, nivel_combustivel, placa, nome, status, capacidade')
      .eq('evento_id', eventoId)
      .eq('ativo', true)
      .then(({ data }) => setVeiculos(data || []));
  }, [eventoId]);

  // KPIs computados
  const totalPaxDia = useMemo(() => 
    viagens.reduce((acc, v) => acc + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0)
  , [viagens]);

  const paxAtivos = useMemo(() =>
    viagensAtivas.reduce((acc, v) => acc + (v.qtd_pax || 0), 0)
  , [viagensAtivas]);

  const paxFinalizados = useMemo(() =>
    viagensFinalizadas.reduce((acc, v) => acc + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0)
  , [viagensFinalizadas]);

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
      const origem = v.ponto_embarque || 'Sem rota';
      const rota = v.ponto_desembarque ? `${origem} > ${v.ponto_desembarque}` : origem;
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


  // Frota agrupada por tipo de veículo
  const frotaPorTipo = useMemo(() => {
    const grouped: Record<string, VeiculoFrota[]> = {};
    veiculos.forEach(v => {
      const tipo = v.tipo_veiculo || 'Outro';
      if (!grouped[tipo]) grouped[tipo] = [];
      grouped[tipo].push(v);
    });
    return Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length);
  }, [veiculos]);

  // Top 3 rotas com tempo médio
  const topRotas = useMemo(() => {
    const rotaMap: Record<string, { count: number; totalMin: number }> = {};
    viagens.forEach(v => {
      const origem = v.ponto_embarque || 'Sem rota';
      const rota = v.ponto_desembarque ? `${origem} > ${v.ponto_desembarque}` : origem;
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
          <h2 className="text-lg font-bold">Painel Estratégico</h2>
          <p className="text-xs text-muted-foreground">Visão operacional do evento</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {format(lastUpdate, 'HH:mm', { locale: ptBR })}
        </Badge>
      </div>

      {/* Filtro por tipo de operação */}
      <OperationTabs
        value={tipoOperacao}
        onChange={setTipoOperacao}
        contadores={contadoresOperacao}
        tiposHabilitados={tiposViagem}
      />

      {/* ═══════════════════════════════════════════ */}
      {/* SEÇÃO: OPERAÇÃO AGORA (tempo real) */}
      {/* ═══════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Operação Agora
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard 
            title="Em Trânsito" 
            value={viagensAtivas.length} 
            icon={<Bus className="h-4 w-4" />}
            subtitle="Viagens ativas"
            highlight={viagensAtivas.length > 0}
          />
          <MetricCard 
            title="PAX em Rota" 
            value={paxAtivos} 
            icon={<Users className="h-4 w-4" />}
            subtitle="Passageiros agora"
            highlight={paxAtivos > 0}
          />
          <MetricCard 
            title="Veículos Ativos" 
            value={veiculosAtivos} 
            icon={<Car className="h-4 w-4" />}
            subtitle={`de ${veiculos.length} na frota`}
          />
          {tipoOperacao !== 'missao' ? (
            <MetricCard 
              title="Frota Total" 
              value={veiculos.length} 
              icon={<Car className="h-4 w-4" />}
              subtitle="Veículos cadastrados"
            />
          ) : (
            <MetricCard 
              title="Motoristas Online" 
              value={motoristasDash.online} 
              icon={<UserCheck className="h-4 w-4" />}
              subtitle={`${motoristasDash.disponiveis} disponíveis`}
            />
          )}
        </div>

      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* SEÇÃO: CONSOLIDADO (acumulado do dia) */}
      {/* ═══════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consolidado do Dia
          </h3>
        </div>

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
            subtitle="Viagens finalizadas"
          />
          <MetricCard 
            title="Tempo Médio" 
            value={formatarMinutos(kpis?.tempoMedioGeral || 0)} 
            icon={<Clock className="h-4 w-4" />}
            subtitle="Por viagem"
          />
          <MetricCard 
            title="Total Viagens" 
            value={viagens.length} 
            icon={<Route className="h-4 w-4" />}
            subtitle="Ativas + finalizadas"
          />
        </div>

        {/* Card Frota por Tipo com Popover */}
        {frotaPorTipo.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Frota por Tipo ({veiculos.length} veículos)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {frotaPorTipo.map(([tipo, lista]) => {
                  const pct = Math.round((lista.length / veiculos.length) * 100);
                  const IconTipo = tipo === 'Ônibus' || tipo === 'Van' ? Bus : Car;
                  return (
                    <Popover key={tipo}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-sm w-full rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-left">
                          <IconTipo className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 font-medium">{tipo}</span>
                          <span className="font-semibold">{lista.length}</span>
                          <span className="text-muted-foreground text-xs w-10 text-right">({pct}%)</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <div className="px-3 py-2 border-b">
                          <p className="text-sm font-semibold">{tipo} ({lista.length} veículos)</p>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y">
                          {lista.map(v => (
                            <div key={v.id} className="px-3 py-1.5 text-xs flex items-center gap-2">
                              <span className="font-mono font-medium w-20 shrink-0">{v.placa}</span>
                              <span className="flex-1 truncate text-muted-foreground">{v.nome || '—'}</span>
                              {v.capacidade && (
                                <span className="text-muted-foreground shrink-0">{v.capacidade}lug</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
    </div>
  );
}
