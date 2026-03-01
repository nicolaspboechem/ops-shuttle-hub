import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bus, Users, ArrowUp, ArrowDown, Car } from 'lucide-react';
import { Viagem } from '@/lib/types/viagem';

interface ShuttleMetricsProps {
  viagens: Viagem[];
  totalVeiculos?: number;
}

function KpiCard({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle?: string; icon: React.ReactNode }) {
  return (
    <Card className="border-emerald-500/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ShuttleMetrics({ viagens, totalVeiculos }: ShuttleMetricsProps) {
  const metrics = useMemo(() => {
    const paxIda = viagens.reduce((sum, v) => sum + (v.qtd_pax || 0), 0);
    const paxVolta = viagens.reduce((sum, v) => sum + (v.qtd_pax_retorno || 0), 0);
    const ativas = viagens.filter(v => !v.encerrado && v.status !== 'encerrado' && v.status !== 'cancelado');
    const veiculosEmOperacao = new Set(ativas.map(v => v.veiculo_id).filter(Boolean)).size;
    return {
      totalViagens: viagens.length,
      paxIda,
      paxVolta,
      paxTotal: paxIda + paxVolta,
      ativas: ativas.length,
      veiculosEmOperacao,
    };
  }, [viagens]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard
        title="Passageiros Total"
        value={metrics.paxTotal.toLocaleString('pt-BR')}
        subtitle="Ida + Volta"
        icon={<Users className="w-5 h-5" />}
      />
      <KpiCard
        title="Total Viagens"
        value={metrics.totalViagens}
        subtitle={metrics.ativas > 0 ? `${metrics.ativas} ativas` : 'Registradas'}
        icon={<Bus className="w-5 h-5" />}
      />
      <KpiCard
        title="Veículos em Op."
        value={metrics.veiculosEmOperacao}
        subtitle={totalVeiculos != null ? `de ${totalVeiculos} na frota` : 'Em viagens ativas'}
        icon={<Car className="w-5 h-5" />}
      />
      <KpiCard
        title="PAX Ida"
        value={metrics.paxIda.toLocaleString('pt-BR')}
        subtitle="Embarques"
        icon={<ArrowUp className="w-5 h-5" />}
      />
      <KpiCard
        title="PAX Volta"
        value={metrics.paxVolta.toLocaleString('pt-BR')}
        subtitle="Retornos"
        icon={<ArrowDown className="w-5 h-5" />}
      />
    </div>
  );
}
