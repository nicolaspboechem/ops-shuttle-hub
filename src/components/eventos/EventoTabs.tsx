import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Bus, LayoutGrid, CheckCircle, AlertTriangle, Users, Clock, Truck, TrendingUp } from 'lucide-react';
import { TransferTable } from '@/components/transfer/TransferTable';
import { TransferMetrics } from '@/components/transfer/TransferMetrics';
import { ShuttleTable } from '@/components/shuttle/ShuttleTable';
import { ShuttleMetrics } from '@/components/shuttle/ShuttleMetrics';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { VehiclesChart } from '@/components/dashboard/VehiclesChart';
import { PassengersChart } from '@/components/dashboard/PassengersChart';
import { ExportButton } from '@/components/eventos/ExportButton';
import { useCalculos } from '@/hooks/useViagens';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Viagem } from '@/lib/types/viagem';
import { cn } from '@/lib/utils';

interface EventoTabsProps {
  viagensTransfer: Viagem[];
  viagensShuttle: Viagem[];
  eventoNome?: string;
  onUpdate?: () => void;
  selectedDate?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function MetricCardCompact({ title, value, subtitle, icon, className }: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({ title, value, icon, variant }: { title: string; value: number; icon: React.ReactNode; variant: 'success' | 'warning' | 'danger' }) {
  const variantStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
  };
  const iconStyles = {
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
  };

  return (
    <Card className={cn("border", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={iconStyles[variant]}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EventoTabs({ viagensTransfer, viagensShuttle, eventoNome, onUpdate, selectedDate }: EventoTabsProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'transfer' | 'shuttle'>('geral');

  // Combinar todas as viagens para cálculos gerais
  const todasViagens = [...viagensTransfer, ...viagensShuttle];
  const { kpis, metricasPorHora, viagensAtivas } = useCalculos(todasViagens);

  // Calculate unique vehicles
  const veiculosUnicos = useMemo(() => {
    const placas = new Set(todasViagens.map(v => v.placa).filter(Boolean));
    return placas.size;
  }, [todasViagens]);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'geral' | 'transfer' | 'shuttle')}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <TabsList className="h-11 p-1 bg-muted/50">
          <TabsTrigger 
            value="geral" 
            className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Geral</span>
            <span className="text-xs opacity-80 bg-background/20 px-1.5 py-0.5 rounded-md font-medium">
              {todasViagens.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="transfer" 
            className="gap-2 px-4 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Transfer</span>
            <span className="text-xs opacity-80 bg-background/20 px-1.5 py-0.5 rounded-md font-medium">
              {viagensTransfer.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="shuttle"
            className="gap-2 px-4 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <Bus className="w-4 h-4" />
            <span className="hidden sm:inline">Shuttle</span>
            <span className="text-xs opacity-80 bg-background/20 px-1.5 py-0.5 rounded-md font-medium">
              {viagensShuttle.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <ExportButton 
          viagensTransfer={viagensTransfer} 
          viagensShuttle={viagensShuttle} 
          eventoNome={eventoNome}
        />
      </div>

      {/* Aba Geral - Dashboard Redesenhado */}
      <TabsContent value="geral" className="space-y-6 mt-0">
        {/* KPI Cards - Grid mais limpo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardCompact
            title="Total Viagens"
            value={kpis?.totalViagens || 0}
            subtitle={`${viagensAtivas.length} ativas`}
            icon={<Bus className="w-5 h-5" />}
          />
          <MetricCardCompact
            title="Total Passageiros"
            value={(kpis?.totalPax || 0).toLocaleString('pt-BR')}
            subtitle="Ida + Retorno"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCardCompact
            title="Tempo Médio"
            value={kpis ? formatarMinutos(kpis.tempoMedioGeral) : '-'}
            subtitle="Por viagem"
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCardCompact
            title="Veículos Ativos"
            value={veiculosUnicos}
            subtitle={`${viagensTransfer.length} transfer • ${viagensShuttle.length} shuttle`}
            icon={<Truck className="w-5 h-5" />}
          />
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            title="Viagens OK"
            value={kpis?.viagensOk || 0}
            icon={<CheckCircle className="w-8 h-8" />}
            variant="success"
          />
          <StatusCard
            title="Em Alerta"
            value={kpis?.alertas.length || 0}
            icon={<AlertTriangle className="w-8 h-8" />}
            variant="warning"
          />
          <StatusCard
            title="Críticos"
            value={kpis?.alertasCriticos.length || 0}
            icon={<AlertTriangle className="w-8 h-8" />}
            variant="danger"
          />
        </div>

        {/* Alerts Panel */}
        {kpis && (
          <AlertsPanel 
            criticos={kpis.alertasCriticos}
            alertas={kpis.alertas}
          />
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VehiclesChart data={metricasPorHora} />
          <PassengersChart data={metricasPorHora} />
        </div>
      </TabsContent>

      <TabsContent value="transfer" className="space-y-6 mt-0">
        <TransferMetrics viagens={viagensTransfer} />
        <TransferTable viagens={viagensTransfer} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="shuttle" className="space-y-6 mt-0">
        <ShuttleMetrics viagens={viagensShuttle} />
        <ShuttleTable viagens={viagensShuttle} onUpdate={onUpdate} />
      </TabsContent>
    </Tabs>
  );
}
