import { useMemo } from 'react';
import { Bus, Users, Truck, TrendingUp, Fuel } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Viagem } from '@/lib/types/viagem';
import { calcularTempoViagem } from '@/lib/utils/calculadores';
import { formatarMinutos } from '@/lib/utils/calculadores';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--status-ok))', 'hsl(var(--status-alert))', 'hsl(var(--status-critical))'];

interface Props {
  viagensFiltradas: Viagem[];
  metricasPorHora: any[];
  alertasTotais: number;
  alertasResolvidos: number;
}

export function AuditoriaResumoTab({ viagensFiltradas, metricasPorHora, alertasTotais, alertasResolvidos }: Props) {
  const stats = useMemo(() => {
    const totalPax = viagensFiltradas.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);
    return {
      totalViagens: viagensFiltradas.length,
      totalPax,
      veiculosUtilizados: new Set(viagensFiltradas.map(v => v.placa).filter(Boolean)).size,
      motoristasAtivos: new Set(viagensFiltradas.map(v => v.motorista)).size,
    };
  }, [viagensFiltradas]);

  const totaisPorPonto = useMemo(() => {
    const pontos = new Map<string, { ponto: string; viagens: number; pax: number; tempos: number[] }>();
    viagensFiltradas.forEach(v => {
      const ponto = v.ponto_embarque || 'Não informado';
      const existing = pontos.get(ponto) || { ponto, viagens: 0, pax: 0, tempos: [] };
      existing.viagens += 1;
      existing.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      if (v.h_pickup && v.h_chegada) {
        existing.tempos.push(calcularTempoViagem(v.h_pickup, v.h_chegada));
      }
      pontos.set(ponto, existing);
    });
    return Array.from(pontos.values())
      .map(p => ({ ...p, tempoMedio: p.tempos.length > 0 ? p.tempos.reduce((a, b) => a + b, 0) / p.tempos.length : 0 }))
      .sort((a, b) => b.viagens - a.viagens);
  }, [viagensFiltradas]);

  const veiculosPorTipo = useMemo(() => {
    const tipos = new Map<string, number>();
    viagensFiltradas.forEach(v => {
      const tipo = v.tipo_veiculo || 'Outro';
      tipos.set(tipo, (tipos.get(tipo) || 0) + 1);
    });
    return Array.from(tipos.entries()).map(([name, value]) => ({ name, value }));
  }, [viagensFiltradas]);

  return (
    <div className="space-y-6">
      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Bus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalViagens}</p>
                <p className="text-xs text-muted-foreground">Total Viagens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-ok/10">
                <Users className="w-6 h-6 text-status-ok" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPax}</p>
                <p className="text-xs text-muted-foreground">Total PAX</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-alert/10">
                <Truck className="w-6 h-6 text-status-alert" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.veiculosUtilizados}</p>
                <p className="text-xs text-muted-foreground">Veículos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.motoristasAtivos}</p>
                <p className="text-xs text-muted-foreground">Motoristas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-critical/10">
                <Fuel className="w-6 h-6 text-status-critical" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertasResolvidos}/{alertasTotais}</p>
                <p className="text-xs text-muted-foreground">Alertas Combustível</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Viagens e PAX por Hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metricasPorHora}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hora" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="totalViagens" name="Viagens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalPax" name="PAX" fill="hsl(var(--status-ok))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Viagens por Tipo de Veículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={veiculosPorTipo} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {veiculosPorTipo.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Pontos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totais por Ponto de Embarque</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ponto de Embarque</TableHead>
                <TableHead className="text-right">Total Viagens</TableHead>
                <TableHead className="text-right">Total PAX</TableHead>
                <TableHead className="text-right">Tempo Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totaisPorPonto.map((ponto) => (
                <TableRow key={ponto.ponto}>
                  <TableCell className="font-medium">{ponto.ponto}</TableCell>
                  <TableCell className="text-right">{ponto.viagens}</TableCell>
                  <TableCell className="text-right">{ponto.pax}</TableCell>
                  <TableCell className="text-right">{ponto.tempoMedio > 0 ? formatarMinutos(ponto.tempoMedio) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
