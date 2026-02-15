import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { format } from 'date-fns';
import { Viagem } from '@/lib/types/viagem';

interface ShuttleViagensDiaChartProps {
  viagens: Viagem[];
}

export function ShuttleViagensDiaChart({ viagens }: ShuttleViagensDiaChartProps) {
  const data = useMemo(() => {
    const porDia: Record<string, { dia: string; viagens: number; pax: number }> = {};

    viagens.forEach(v => {
      const dateStr = v.data_criacao ? v.data_criacao.slice(0, 10) : null;
      if (!dateStr) return;

      if (!porDia[dateStr]) {
        porDia[dateStr] = {
          dia: format(new Date(dateStr + 'T12:00:00'), 'dd/MM'),
          viagens: 0,
          pax: 0,
        };
      }
      porDia[dateStr].viagens += 1;
      porDia[dateStr].pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
    });

    return Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [viagens]);

  // Only show when there are multiple days
  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Viagens por Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
            <Bar yAxisId="left" dataKey="viagens" name="Viagens" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="pax" name="PAX Total" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
