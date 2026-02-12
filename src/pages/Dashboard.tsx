import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, Users, Clock, Truck, CheckCircle, AlertTriangle, RefreshCw, Trophy, MapPin, HelpCircle, Fuel } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { MotoristaStatusPanel } from '@/components/dashboard/MotoristaStatusPanel';
import { useMotoristasDashboard } from '@/hooks/useMotoristasDashboard';
import { VehiclesChart } from '@/components/dashboard/VehiclesChart';
import { PassengersChart } from '@/components/dashboard/PassengersChart';
import { RoutePerformanceChart } from '@/components/dashboard/RoutePerformanceChart';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { DashboardMobile } from '@/components/dashboard/DashboardMobile';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useVeiculos, useMotoristas } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { useAlertasFrota } from '@/hooks/useAlertasFrota';
import { useServerTime } from '@/hooks/useServerTime';
import { useTutorial, adminEventoSteps } from '@/hooks/useTutorial';
import { TutorialPopover } from '@/components/app/TutorialPopover';
import { HelpDrawer } from '@/components/app/HelpDrawer';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById } = useEventos();
  const { getAgoraSync } = useServerTime();
  const evento = eventoId ? getEventoById(eventoId) : null;
  
  // Dia operacional
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(new Date(), '04:00')
  );
  const [verTodosDias, setVerTodosDias] = useState(false);

  // Atualizar data operacional quando evento carregar
  useEffect(() => {
    if (evento?.horario_virada_dia) {
      setDataOperacional(getDataOperacional(getAgoraSync(), evento.horario_virada_dia));
    }
  }, [evento?.horario_virada_dia, getAgoraSync]);

  // Preparar options para useViagens
  const viagensOptions = useMemo(() => {
    if (verTodosDias) return undefined;
    return {
      dataOperacional,
      horarioVirada: evento?.horario_virada_dia || '04:00',
    };
  }, [dataOperacional, evento?.horario_virada_dia, verTodosDias]);

  const { viagens, loading, refreshing, lastUpdate, refetch } = useViagens(eventoId, viagensOptions);
  const { veiculos } = useVeiculos(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { alertas, alertasAbertos, alertasPendentes } = useAlertasFrota(eventoId);
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');
  const [rotaFiltro, setRotaFiltro] = useState<string>('todas');
  const [showHelp, setShowHelp] = useState(false);
  
  // Tutorial for admin inside event
  const tutorial = useTutorial('admin_evento', adminEventoSteps);

  // Extrair pontos de embarque únicos
  const pontosEmbarque = useMemo(() => {
    const pontos = new Set(viagens.map(v => v.ponto_embarque).filter(Boolean));
    return Array.from(pontos).sort();
  }, [viagens]);

  // Filtrar viagens por tipo de operação e rota
  const viagensFiltradas = useMemo(() => {
    let filtered = viagens;
    if (tipoOperacao !== 'todos') {
      filtered = filtered.filter(v => v.tipo_operacao === tipoOperacao);
    }
    if (rotaFiltro !== 'todas') {
      filtered = filtered.filter(v => v.ponto_embarque === rotaFiltro);
    }
    return filtered;
  }, [viagens, tipoOperacao, rotaFiltro]);

  // Total de PAX nas viagens ativas
  const totalPaxAtivas = useMemo(() => {
    return viagensFiltradas
      .filter(v => v.status === 'em_andamento' || !v.h_retorno)
      .reduce((acc, v) => acc + (v.qtd_pax || 0), 0);
  }, [viagensFiltradas]);

  const { kpis, metricasPorHora, viagensAtivas, viagensFinalizadas, motoristas: metricasMotoristas } = useCalculos(viagensFiltradas);

  // Set de motorista_ids com viagem ativa (para o hook de motoristas dashboard)
  const motoristasEmViagemSet = useMemo(() => {
    return new Set(viagensAtivas.map(v => v.motorista_id).filter(Boolean) as string[]);
  }, [viagensAtivas]);

  const motoristasDash = useMotoristasDashboard(eventoId, dataOperacional, motoristasEmViagemSet);

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
    transfer: viagens.filter(v => v.tipo_operacao === 'transfer' && !v.origem_missao_id).length,
    shuttle: viagens.filter(v => v.tipo_operacao === 'shuttle' && !v.origem_missao_id).length,
    missao: viagens.filter(v => v.origem_missao_id).length,
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
    <EventLayout mobileComponent={<DashboardMobile />}>
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Header com status real-time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Painel de Controle</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Monitoramento em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-status-ok animate-pulse" />
              {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
            </Badge>
            <button 
              onClick={() => refetch()} 
              className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              title="Atualizar dados"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowHelp(true)}
              title="Central de Ajuda"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Seletor de Dia + Filtros */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          <DiaSeletor
            dataOperacional={dataOperacional}
            onChange={setDataOperacional}
            dataInicio={evento?.data_inicio}
            dataFim={evento?.data_fim}
            showToggleAll={true}
            verTodosDias={verTodosDias}
            onToggleTodosDias={setVerTodosDias}
          />
          
          <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />
          
          {pontosEmbarque.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <MapPin className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <Select value={rotaFiltro} onValueChange={setRotaFiltro}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por rota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as rotas</SelectItem>
                  {pontosEmbarque.map(ponto => (
                    <SelectItem key={ponto} value={ponto!}>
                      {ponto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {rotaFiltro !== 'todas' && (
            <Badge variant="secondary" className="gap-1">
              {rotaFiltro}
              <button 
                onClick={() => setRotaFiltro('todas')} 
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
        </div>

        {/* Cards de Métricas em Tempo Real - Grid responsivo */}
        <div data-tutorial="metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
          <MetricCard 
            title="Viagens Ativas" 
            value={metricsRealTime.viagensAtivas} 
            subtitle={`${viagensFinalizadas.length} finalizadas`} 
            icon={<Bus className="w-5 h-5 md:w-6 md:h-6" />} 
            highlight={true}
          />
          <MetricCard 
            title="PAX em Trânsito" 
            value={totalPaxAtivas} 
            subtitle="Nas viagens ativas" 
            icon={<Users className="w-5 h-5 md:w-6 md:h-6" />} 
            highlight={true}
          />
          <MetricCard 
            title="Veículos" 
            value={metricsRealTime.veiculosAtivos} 
            subtitle={`${metricsRealTime.onibus} ôn. ${metricsRealTime.vans} vans`} 
            icon={<Truck className="w-5 h-5 md:w-6 md:h-6" />} 
          />
          <MetricCard 
            title="Tempo Médio" 
            value={kpis ? formatarMinutos(kpis.tempoMedioGeral) : '-'} 
            subtitle="Pickup → Retorno" 
            icon={<Clock className="w-5 h-5 md:w-6 md:h-6" />} 
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* Motoristas em Tempo Real */}
        <MotoristaStatusPanel
          online={motoristasDash.online}
          disponiveis={motoristasDash.disponiveis}
          emTransito={motoristasDash.emTransito}
          totalCadastrados={motoristas.length}
        />

        {/* Cards de Status - Grid responsivo */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <MetricCard 
            title="OK" 
            value={kpis?.viagensOk || 0} 
            icon={<CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-status-ok" />} 
            className="border-status-ok/20" 
          />
          <MetricCard 
            title="Alerta" 
            value={kpis?.alertas.length || 0} 
            icon={<AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-status-alert" />} 
            className="border-status-alert/20" 
          />
          <MetricCard 
            title="Crítico" 
            value={kpis?.alertasCriticos.length || 0} 
            icon={<AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-status-critical" />} 
            className="border-status-critical/20" 
          />
        </div>

        {/* Painel de Alertas */}
        {kpis && <AlertsPanel criticos={kpis.alertasCriticos} alertas={kpis.alertas} />}

        {/* Alertas de Combustível */}
        {alertas.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Fuel className="w-5 h-5 text-status-alert" />
                Alertas de Combustível
                <Badge variant="destructive" className="ml-auto">{alertasAbertos.length} abertos</Badge>
                {alertasPendentes.length > 0 && (
                  <Badge variant="secondary">{alertasPendentes.length} pendentes</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertas.map(alerta => {
                  const nivelColors: Record<string, string> = {
                    'vazio': 'bg-status-critical/10 border-status-critical/30 text-status-critical',
                    '1/4': 'bg-status-critical/10 border-status-critical/30 text-status-critical',
                    '1/2': 'bg-status-alert/10 border-status-alert/30 text-status-alert',
                    '3/4': 'bg-status-ok/10 border-status-ok/30 text-status-ok',
                    'cheio': 'bg-status-ok/10 border-status-ok/30 text-status-ok',
                  };
                  const colorClass = nivelColors[alerta.nivel_combustivel || ''] || 'bg-muted';
                  
                  return (
                    <div key={alerta.id} className={`flex items-center justify-between p-3 rounded-lg border ${colorClass}`}>
                      <div className="flex items-center gap-3">
                        <Fuel className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded font-mono">
                              {alerta.veiculo?.placa || '---'}
                            </code>
                            <span className="text-sm font-medium">{alerta.motorista?.nome || 'Desconhecido'}</span>
                          </div>
                          {alerta.observacao && (
                            <p className="text-xs mt-0.5 opacity-80">{alerta.observacao}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{alerta.nivel_combustivel}</Badge>
                        <Badge variant={alerta.status === 'aberto' ? 'destructive' : 'secondary'} className="text-xs">
                          {alerta.status === 'aberto' ? 'Aberto' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rankings - Oculto em mobile para economizar espaço */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
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

        {/* Grid com Gráficos - Oculto em mobile */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          <VehiclesChart data={metricasPorHora} />
          <PassengersChart data={metricasPorHora} />
          <RoutePerformanceChart viagens={viagensFiltradas} />
        </div>

        {/* Tutorial Popover */}
        {tutorial.isActive && tutorial.currentStep && (
          <TutorialPopover
            step={tutorial.currentStep}
            currentIndex={tutorial.currentIndex}
            totalSteps={tutorial.totalSteps}
            onNext={tutorial.next}
            onSkip={tutorial.skip}
            onComplete={tutorial.complete}
          />
        )}

        {/* Help Drawer */}
        <HelpDrawer 
          open={showHelp} 
          onOpenChange={setShowHelp} 
          role="admin" 
        />
      </div>
    </EventLayout>
  );
}
