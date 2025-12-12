import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Bus, LayoutGrid, CheckCircle, AlertTriangle, Users, Clock, Truck } from 'lucide-react';
import { TransferTable } from '@/components/transfer/TransferTable';
import { TransferMetrics } from '@/components/transfer/TransferMetrics';
import { ShuttleTable } from '@/components/shuttle/ShuttleTable';
import { ShuttleMetrics } from '@/components/shuttle/ShuttleMetrics';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { VehiclesChart } from '@/components/dashboard/VehiclesChart';
import { PassengersChart } from '@/components/dashboard/PassengersChart';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ExportButton } from '@/components/eventos/ExportButton';
import { useCalculos } from '@/hooks/useViagens';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Viagem } from '@/lib/types/viagem';

interface EventoTabsProps {
  viagensTransfer: Viagem[];
  viagensShuttle: Viagem[];
  eventoNome?: string;
  onUpdate?: () => void;
}

export function EventoTabs({ viagensTransfer, viagensShuttle, eventoNome, onUpdate }: EventoTabsProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'transfer' | 'shuttle'>('geral');

  // Combinar todas as viagens para cálculos gerais
  const todasViagens = [...viagensTransfer, ...viagensShuttle];
  const { kpis, metricasPorHora, viagensAtivas } = useCalculos(todasViagens);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'geral' | 'transfer' | 'shuttle')}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3 h-12">
        <TabsTrigger 
          value="geral" 
          className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <LayoutGrid className="w-4 h-4" />
          Geral
          <span className="ml-1 text-xs opacity-75 bg-background/20 px-1.5 py-0.5 rounded">
            {todasViagens.length}
          </span>
        </TabsTrigger>
        <TabsTrigger 
          value="transfer" 
          className="gap-2 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950"
        >
          <Car className="w-4 h-4" />
          Transfer
          <span className="ml-1 text-xs opacity-75 bg-background/20 px-1.5 py-0.5 rounded">
            {viagensTransfer.length}
          </span>
        </TabsTrigger>
        <TabsTrigger 
          value="shuttle"
          className="gap-2 py-2.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-emerald-950"
        >
          <Bus className="w-4 h-4" />
          Shuttle
          <span className="ml-1 text-xs opacity-75 bg-background/20 px-1.5 py-0.5 rounded">
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
      {/* Aba Geral - Dashboard completo */}
      <TabsContent value="geral" className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Viagens"
            value={kpis?.totalViagens || 0}
            subtitle={`${viagensAtivas.length} ativas`}
            icon={<Bus className="w-6 h-6" />}
          />
          <MetricCard
            title="Total Passageiros"
            value={kpis?.totalPax || 0}
            subtitle="Ida + Retorno"
            icon={<Users className="w-6 h-6" />}
          />
          <MetricCard
            title="Tempo Médio"
            value={kpis ? formatarMinutos(kpis.tempoMedioGeral) : '-'}
            subtitle="Por viagem"
            icon={<Clock className="w-6 h-6" />}
          />
          <MetricCard
            title="Veículos Ativos"
            value={kpis?.veiculosAtivos || 0}
            subtitle={`${viagensTransfer.length} transfer • ${viagensShuttle.length} shuttle`}
            icon={<Truck className="w-6 h-6" />}
          />
        </div>

        {/* Secondary Metrics */}
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

      <TabsContent value="transfer" className="space-y-6">
        <TransferMetrics viagens={viagensTransfer} />
        <TransferTable viagens={viagensTransfer} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="shuttle" className="space-y-6">
        <ShuttleMetrics viagens={viagensShuttle} />
        <ShuttleTable viagens={viagensShuttle} onUpdate={onUpdate} />
      </TabsContent>
    </Tabs>
  );
}