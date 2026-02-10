import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricasPorHora } from '@/lib/types/viagem';

interface VehiclesChartProps {
  data: MetricasPorHora[];
}

export function VehiclesChart({ data }: VehiclesChartProps) {
  const filteredData = data.filter(d => d.totalViagens > 0 || parseInt(d.hora) >= 6 && parseInt(d.hora) <= 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Veículos por Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar 
                dataKey="onibus" 
                name="Ônibus" 
                fill="hsl(var(--chart-1))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="vans" 
                name="Vans" 
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="sedan" 
                name="Sedan" 
                fill="hsl(var(--chart-3))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="suv" 
                name="SUV" 
                fill="hsl(var(--chart-4))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="blindado" 
                name="Blindado" 
                fill="hsl(var(--chart-5))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
