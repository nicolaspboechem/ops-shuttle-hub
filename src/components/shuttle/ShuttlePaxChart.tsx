import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Viagem } from '@/lib/types/viagem';

interface ShuttlePaxChartProps {
  viagens: Viagem[];
}

export function ShuttlePaxChart({ viagens }: ShuttlePaxChartProps) {
  const data = useMemo(() => {
    const horas: Record<number, { hora: string; paxIda: number; paxVolta: number }> = {};
    for (let h = 0; h < 24; h++) {
      horas[h] = { hora: `${String(h).padStart(2, '0')}h`, paxIda: 0, paxVolta: 0 };
    }

    viagens.forEach(v => {
      const hora = v.h_inicio_real ? new Date(v.h_inicio_real).getHours() : null;
      if (hora !== null) {
        horas[hora].paxIda += v.qtd_pax || 0;
        horas[hora].paxVolta += v.qtd_pax_retorno || 0;
      }
    });

    // Filter to only hours with data, expanding ±1 hour for context
    const horasComDados = Object.keys(horas).map(Number).filter(h => horas[h].paxIda > 0 || horas[h].paxVolta > 0);
    if (horasComDados.length === 0) return [];

    const min = Math.max(0, Math.min(...horasComDados) - 1);
    const max = Math.min(23, Math.max(...horasComDados) + 1);

    return Array.from({ length: max - min + 1 }, (_, i) => horas[min + i]);
  }, [viagens]);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Passageiros por Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
              formatter={(value: number, name: string) => [value, name === 'paxIda' ? 'Ida' : 'Volta']}
            />
            <Legend formatter={(value) => value === 'paxIda' ? 'Ida' : 'Volta'} />
            <Bar dataKey="paxIda" stackId="pax" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="paxVolta" stackId="pax" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
