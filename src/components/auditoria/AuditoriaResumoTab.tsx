import { useMemo } from 'react';
import { Bus, Users, Truck, TrendingUp, Fuel, Trophy, Medal, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Viagem } from '@/lib/types/viagem';
import { calcularTempoViagem } from '@/lib/utils/calculadores';
import { formatarMinutos } from '@/lib/utils/calculadores';
import * as XLSX from 'xlsx';

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

  const rankingMotoristas = useMemo(() => {
    const map = new Map<string, { nome: string; viagens: number; pax: number }>();
    viagensFiltradas.forEach(v => {
      const nome = v.motorista || 'Não informado';
      const existing = map.get(nome) || { nome, viagens: 0, pax: 0 };
      existing.viagens += 1;
      existing.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      map.set(nome, existing);
    });
    return Array.from(map.values())
      .map(m => ({ ...m, mediaPax: m.viagens > 0 ? (m.pax / m.viagens).toFixed(1) : '0' }))
      .sort((a, b) => b.viagens - a.viagens || b.pax - a.pax);
  }, [viagensFiltradas]);

  const rankingVeiculos = useMemo(() => {
    const map = new Map<string, { placa: string; tipo: string; viagens: number; pax: number }>();
    viagensFiltradas.forEach(v => {
      const placa = v.placa || 'Sem placa';
      const existing = map.get(placa) || { placa, tipo: v.tipo_veiculo || 'Outro', viagens: 0, pax: 0 };
      existing.viagens += 1;
      existing.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      map.set(placa, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.viagens - a.viagens || b.pax - a.pax);
  }, [viagensFiltradas]);

  const getMedalColor = (pos: number) => {
    if (pos === 0) return 'text-yellow-500';
    if (pos === 1) return 'text-gray-400';
    if (pos === 2) return 'text-amber-700';
    return '';
  };

  const exportRankingMotoristas = () => {
    const ws = XLSX.utils.json_to_sheet(rankingMotoristas.map((m, i) => ({
      '#': i + 1, 'Motorista': m.nome, 'Total Viagens': m.viagens, 'Total PAX': m.pax, 'Média PAX/Viagem': m.mediaPax,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking Motoristas');
    XLSX.writeFile(wb, 'ranking_motoristas.xlsx');
  };

  const exportRankingVeiculos = () => {
    const ws = XLSX.utils.json_to_sheet(rankingVeiculos.map((v, i) => ({
      '#': i + 1, 'Placa': v.placa, 'Tipo': v.tipo, 'Total Viagens': v.viagens, 'Total PAX': v.pax,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking Veículos');
    XLSX.writeFile(wb, 'ranking_veiculos.xlsx');
  };

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

      {/* Rankings lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ranking Motoristas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking de Motoristas
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportRankingMotoristas}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-right">Total Viagens</TableHead>
                <TableHead className="text-right">Total PAX</TableHead>
                <TableHead className="text-right">Média PAX/Viagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankingMotoristas.map((m, idx) => (
                <TableRow key={m.nome} className={idx < 3 ? 'bg-muted/30' : ''}>
                  <TableCell className="text-center">
                    {idx < 3 ? <Medal className={`w-5 h-5 mx-auto ${getMedalColor(idx)}`} /> : <span className="font-bold">{idx + 1}</span>}
                  </TableCell>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-right">{m.viagens}</TableCell>
                  <TableCell className="text-right">{m.pax}</TableCell>
                  <TableCell className="text-right">{m.mediaPax}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ranking Veículos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Ranking de Veículos
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportRankingVeiculos}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Total Viagens</TableHead>
                <TableHead className="text-right">Total PAX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankingVeiculos.map((v, idx) => (
                <TableRow key={v.placa} className={idx < 3 ? 'bg-muted/30' : ''}>
                  <TableCell className="text-center">
                    {idx < 3 ? <Medal className={`w-5 h-5 mx-auto ${getMedalColor(idx)}`} /> : <span className="font-bold">{idx + 1}</span>}
                  </TableCell>
                  <TableCell className="font-mono font-medium">{v.placa}</TableCell>
                  <TableCell>{v.tipo}</TableCell>
                  <TableCell className="text-right">{v.viagens}</TableCell>
                  <TableCell className="text-right">{v.pax}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
