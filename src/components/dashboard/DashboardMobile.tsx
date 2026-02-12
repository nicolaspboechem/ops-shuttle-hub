import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, Users, Clock, Truck, CheckCircle, AlertTriangle, RefreshCw, Fuel } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { MotoristaStatusPanel } from '@/components/dashboard/MotoristaStatusPanel';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useVeiculos, useMotoristas } from '@/hooks/useCadastros';
import { useMotoristasDashboard } from '@/hooks/useMotoristasDashboard';
import { useAlertasFrota } from '@/hooks/useAlertasFrota';
import { useEventos } from '@/hooks/useEventos';
import { useServerTime } from '@/hooks/useServerTime';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MobileMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function MobileMetricCard({ title, value, subtitle, icon, highlight }: MobileMetricCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden",
      highlight && "ring-2 ring-primary/50 bg-primary/5"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant: 'ok' | 'alert' | 'critical';
}

function StatusCard({ title, value, icon, variant }: StatusCardProps) {
  const variants = {
    ok: 'border-status-ok/30 bg-status-ok/5',
    alert: 'border-status-alert/30 bg-status-alert/5',
    critical: 'border-status-critical/30 bg-status-critical/5',
  };

  return (
    <Card className={cn("overflow-hidden border", variants[variant])}>
      <CardContent className="p-3 flex flex-col items-center justify-center text-center">
        <div className="mb-1">{icon}</div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] font-medium text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardMobile() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById } = useEventos();
  const { getAgoraSync } = useServerTime();
  const evento = eventoId ? getEventoById(eventoId) : null;

  const dataOperacional = useMemo(() => {
    const virada = evento?.horario_virada_dia || '04:00';
    return getDataOperacional(getAgoraSync(), virada);
  }, [evento?.horario_virada_dia, getAgoraSync]);

  const { viagens, loading, refreshing, lastUpdate, refetch } = useViagens(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { alertas, alertasAbertos } = useAlertasFrota(eventoId);
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');

  // Filtrar viagens por tipo de operação
  const viagensFiltradas = useMemo(() => {
    if (tipoOperacao === 'todos') return viagens;
    return viagens.filter(v => v.tipo_operacao === tipoOperacao);
  }, [viagens, tipoOperacao]);

  // Total de PAX nas viagens ativas
  const totalPaxAtivas = useMemo(() => {
    return viagensFiltradas
      .filter(v => v.status === 'em_andamento' || !v.h_retorno)
      .reduce((acc, v) => acc + (v.qtd_pax || 0), 0);
  }, [viagensFiltradas]);

  const { kpis, viagensAtivas, viagensFinalizadas } = useCalculos(viagensFiltradas);

  // Set de motorista_ids com viagem ativa
  const motoristasEmViagemSet = useMemo(() => {
    return new Set(viagensAtivas.map(v => v.motorista_id).filter(Boolean) as string[]);
  }, [viagensAtivas]);

  const motoristasDash = useMotoristasDashboard(eventoId, dataOperacional, motoristasEmViagemSet);

  // Real-time metrics
  const metricsRealTime = useMemo(() => {
    const veiculosAtivos = new Set(viagensAtivas.map(v => v.placa).filter(Boolean));
    
    const tiposVeiculosAtivos = viagensAtivas.reduce((acc, v) => {
      const tipo = v.tipo_veiculo || 'Outro';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      viagensAtivas: viagensAtivas.length,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader title="Dashboard" subtitle="Carregando..." />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="Painel de Controle" 
        subtitle="Monitoramento em tempo real"
        rightContent={
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="flex items-center gap-1 text-[10px] px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-ok animate-pulse" />
              {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Filtros por tipo de operação */}
        <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />

        {/* Grid de métricas principais */}
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard 
            title="Viagens Ativas" 
            value={metricsRealTime.viagensAtivas} 
            subtitle={`${viagensFinalizadas.length} finalizadas`} 
            icon={<Bus className="w-5 h-5" />} 
            highlight
          />
          <MobileMetricCard 
            title="PAX em Trânsito" 
            value={totalPaxAtivas} 
            subtitle="Nas viagens ativas" 
            icon={<Users className="w-5 h-5" />} 
            highlight
          />
          <MobileMetricCard 
            title="Veículos" 
            value={metricsRealTime.veiculosAtivos} 
            subtitle={`${metricsRealTime.onibus} ôn. ${metricsRealTime.vans} vans`} 
            icon={<Truck className="w-5 h-5" />} 
          />
        </div>

        {/* Motoristas em Tempo Real */}
        <MotoristaStatusPanel
          online={motoristasDash.online}
          disponiveis={motoristasDash.disponiveis}
          emTransito={motoristasDash.emTransito}
          compact
        />

        {/* Tempo médio */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tempo Médio</p>
              <p className="text-2xl font-bold">{kpis ? formatarMinutos(kpis.tempoMedioGeral) : '-'}</p>
              <p className="text-xs text-muted-foreground">Pickup → Retorno</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatusCard 
            title="OK" 
            value={kpis?.viagensOk || 0} 
            icon={<CheckCircle className="w-5 h-5 text-status-ok" />} 
            variant="ok"
          />
          <StatusCard 
            title="Alerta" 
            value={kpis?.alertas.length || 0} 
            icon={<AlertTriangle className="w-5 h-5 text-status-alert" />} 
            variant="alert"
          />
          <StatusCard 
            title="Crítico" 
            value={kpis?.alertasCriticos.length || 0} 
            icon={<AlertTriangle className="w-5 h-5 text-status-critical" />} 
            variant="critical"
          />
        </div>

        {/* Painel de Alertas */}
        {kpis && <AlertsPanel criticos={kpis.alertasCriticos} alertas={kpis.alertas} />}

        {/* Alertas de Combustível */}
        {alertas.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Fuel className="w-4 h-4 text-status-alert" />
                <span className="text-sm font-semibold">Combustível</span>
                <Badge variant="destructive" className="text-[10px] ml-auto">{alertasAbertos.length}</Badge>
              </div>
              <div className="space-y-2">
                {alertas.slice(0, 5).map(alerta => (
                  <div key={alerta.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Fuel className="w-3.5 h-3.5 text-status-alert shrink-0" />
                      <code className="text-[10px] bg-background px-1 rounded">{alerta.veiculo?.placa || '---'}</code>
                      <span className="text-xs truncate">{alerta.motorista?.nome || '---'}</span>
                    </div>
                    <Badge variant={alerta.status === 'aberto' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                      {alerta.nivel_combustivel}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
