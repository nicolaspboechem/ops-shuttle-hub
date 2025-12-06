import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricasPorHora } from '@/lib/types/viagem';

interface PassengersChartProps {
  data: MetricasPorHora[];
}

export function PassengersChart({ data }: PassengersChartProps) {
  const filteredData = data.filter(d => d.totalPax > 0 || parseInt(d.hora) >= 6 && parseInt(d.hora) <= 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Passageiros por Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="hora" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.replace(':00', 'h')}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value} passageiros`, 'Total']}
              />
              <Area
                type="monotone"
                dataKey="totalPax"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPax)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
