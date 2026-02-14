import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, Users } from 'lucide-react';
import { Viagem } from '@/lib/types/viagem';

interface ShuttleMetricsProps {
  viagens: Viagem[];
}

export function ShuttleMetrics({ viagens }: ShuttleMetricsProps) {
  const metrics = useMemo(() => ({
    totalViagens: viagens.length,
    totalPassageiros: viagens.reduce((sum, v) => sum + (v.qtd_pax || 0), 0),
  }), [viagens]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Shuttles</CardTitle>
          <Bus className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalViagens}</div>
          <p className="text-xs text-muted-foreground">Registrados</p>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Passageiros</CardTitle>
          <Users className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalPassageiros}</div>
          <p className="text-xs text-muted-foreground">Total transportados</p>
        </CardContent>
      </Card>
    </div>
  );
}
