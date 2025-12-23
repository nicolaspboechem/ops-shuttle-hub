import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, Users, Clock, Truck, CheckCircle, AlertTriangle, RefreshCw, Trophy } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { VehiclesChart } from '@/components/dashboard/VehiclesChart';
import { PassengersChart } from '@/components/dashboard/PassengersChart';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useVeiculos, useMotoristas } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading, lastUpdate, refetch } = useViagens(eventoId);
  const { veiculos } = useVeiculos(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { getEventoById } = useEventos();
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');

  const evento = eventoId ? getEventoById(eventoId) : null;

  const viagensFiltradas = useMemo(() => {
    if (tipoOperacao === 'todos') return viagens;
    return viagens.filter(v => v.tipo_operacao === tipoOperacao);
  }, [viagens, tipoOperacao]);

  const { kpis, metricasPorHora, viagensAtivas, viagensFinalizadas, motoristas: metricasMotoristas } = useCalculos(viagensFiltradas);

  // Real-time metrics
  const metricsRealTime = useMemo(() => {
    const motoristasAtivos = new Set(viagensAtivas.map(v => v.motorista));
    const veiculosAtivos = new Set(viagensAtivas.map(v => v.placa).filter(Boolean));
    
    // Count vehicles by type from active trips
    const tiposVeiculosAtivos = viagensAtivas.reduce((acc, v) => {
      const tipo = v.tipo_veiculo || 'Outro';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      viagensAtivas: viagensAtivas.length,
      motoristasAtivos: motoristasAtivos.size,
      veiculosAtivos: veiculosAtivos.size,
      onibus: tiposVeiculosAtivos['Ônibus'] || 0,
      vans: tiposVeiculosAtivos['Van'] || 0,
    };
  }, [viagensAtivas]);

  const contadores = useMemo(() => ({
    todos: viagens.length,
    transfer: viagens.filter(v => v.tipo_operacao === 'transfer').length,
    shuttle: viagens.filter(v => v.tipo_operacao === 'shuttle').length,
  }), [viagens]);

  // Top motoristas (por viagens)
  const topMotoristas = useMemo(() => {
    return [...metricasMotoristas]
      .sort((a, b) => b.totalViagens - a.totalViagens)
      .slice(0, 5);
  }, [metricasMotoristas]);

  // Top veículos (por viagens)
  const topVeiculos = useMemo(() => {
    const veiculoStats = new Map<string, { placa: string; tipo: string; viagens: number; pax: number }>();
    
    viagens.forEach(v => {
      if (!v.placa) return;
      const current = veiculoStats.get(v.placa) || { placa: v.placa, tipo: v.tipo_veiculo || 'Van', viagens: 0, pax: 0 };
      current.viagens++;
      current.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      veiculoStats.set(v.placa, current);
    });

    return Array.from(veiculoStats.values())
      .sort((a, b) => b.viagens - a.viagens)
      .slice(0, 5);
  }, [viagens]);

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
        {/* Header com status real-time */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Painel de Controle</h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento em tempo real da operação
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-ok animate-pulse" />
              Atualizado: {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
            </Badge>
            <button 
              onClick={() => refetch()} 
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />

        {/* Cards de Métricas em Tempo Real */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Viagens Ativas" 
            value={metricsRealTime.viagensAtivas} 
            subtitle={`${viagensFinalizadas.length} finalizadas`} 
            icon={<Bus className="w-6 h-6" />} 
            highlight={true}
          />
          <MetricCard 
            title="Motoristas em Operação" 
            value={metricsRealTime.motoristasAtivos} 
            subtitle={`${motoristas.length} cadastrados`} 
            icon={<Users className="w-6 h-6" />} 
          />
          <MetricCard 
            title="Veículos Ativos" 
            value={metricsRealTime.veiculosAtivos} 
            subtitle={`${metricsRealTime.onibus} ônibus, ${metricsRealTime.vans} vans`} 
            icon={<Truck className="w-6 h-6" />} 
          />
          <MetricCard 
            title="Tempo Médio de Ciclo" 
            value={kpis ? formatarMinutos(kpis.tempoMedioGeral) : '-'} 
            subtitle="Pickup → Retorno" 
            icon={<Clock className="w-6 h-6" />} 
          />
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard 
            title="Viagens OK" 
            value={kpis?.viagensOk || 0} 
            icon={<CheckCircle className="w-6 h-6 text-status-ok" />} 
            className="border-status-ok/20" 
          />
          <MetricCard 
            title="Em Alerta" 
            value={kpis?.alertas.length || 0} 
            icon={<AlertTriangle className="w-6 h-6 text-status-alert" />} 
            className="border-status-alert/20" 
          />
          <MetricCard 
            title="Críticos" 
            value={kpis?.alertasCriticos.length || 0} 
            icon={<AlertTriangle className="w-6 h-6 text-status-critical" />} 
            className="border-status-critical/20" 
          />
        </div>

        {/* Painel de Alertas */}
        {kpis && <AlertsPanel criticos={kpis.alertasCriticos} alertas={kpis.alertas} />}

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Motoristas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Motoristas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topMotoristas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma viagem registrada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {topMotoristas.map((m, index) => (
                    <div key={m.motorista} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-yellow-950' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-amber-600 text-amber-100' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{m.motorista}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{m.totalViagens} viagens</span>
                        <Badge variant="secondary">{m.totalPax} PAX</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Veículos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Veículos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topVeiculos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma viagem registrada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {topVeiculos.map((v, index) => (
                    <div key={v.placa} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-yellow-950' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-amber-600 text-amber-100' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v.placa}</code>
                          <Badge variant="outline" className="text-xs">{v.tipo}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{v.viagens} viagens</span>
                        <Badge variant="secondary">{v.pax} PAX</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grid com Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VehiclesChart data={metricasPorHora} />
          <PassengersChart data={metricasPorHora} />
        </div>
      </div>
    </EventLayout>
  );
}
