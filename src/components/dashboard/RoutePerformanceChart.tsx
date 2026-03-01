import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapPin } from 'lucide-react';
import { Viagem } from '@/lib/types/viagem';

interface RoutePerformanceChartProps {
  viagens: Viagem[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function RoutePerformanceChart({ viagens }: RoutePerformanceChartProps) {
  const data = useMemo(() => {
    const routeStats = new Map<string, { pax: number; viagens: number }>();

    viagens.forEach(v => {
      const origem = v.ponto_embarque || 'Não informado';
      const rota = v.ponto_desembarque ? `${origem} > ${v.ponto_desembarque}` : origem;
      const current = routeStats.get(rota) || { pax: 0, viagens: 0 };
      current.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      current.viagens++;
      routeStats.set(rota, current);
    });

    return Array.from(routeStats.entries())
      .map(([rota, stats]) => ({
        rota: rota.length > 20 ? rota.slice(0, 20) + '...' : rota,
        rotaCompleta: rota,
        pax: stats.pax,
        viagens: stats.viagens,
      }))
      .sort((a, b) => b.pax - a.pax)
      .slice(0, 8);
  }, [viagens]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Desempenho por Rota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma viagem registrada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Desempenho por Rota (PAX)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="rota" 
              width={120}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium text-sm">{item.rotaCompleta}</p>
                    <div className="mt-1 space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Passageiros: <span className="font-medium text-foreground">{item.pax}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Viagens: <span className="font-medium text-foreground">{item.viagens}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="pax" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
