import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FileBarChart, Users, Truck, Bus, Clock, MapPin, Download, TrendingUp, Route } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useVeiculos, useMotoristas } from '@/hooks/useCadastros';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--status-ok))', 'hsl(var(--status-alert))', 'hsl(var(--status-critical))'];

export default function Auditoria() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading: loadingViagens } = useViagens(eventoId);
  const { veiculos, loading: loadingVeiculos } = useVeiculos(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { kpis, metricasPorHora, viagensFinalizadas } = useCalculos(viagens);
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');

  const viagensFiltradas = useMemo(() => {
    if (tipoOperacao === 'todos') return viagens;
    return viagens.filter(v => v.tipo_operacao === tipoOperacao);
  }, [viagens, tipoOperacao]);

  // Stats consolidados
  const stats = useMemo(() => {
    const totalPax = viagensFiltradas.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);
    const kmTotal = veiculos.reduce((sum, v) => {
      if (v.km_inicial && v.km_final) {
        return sum + (v.km_final - v.km_inicial);
      }
      return sum;
    }, 0);

    return {
      totalViagens: viagensFiltradas.length,
      viagensFinalizadas: viagensFiltradas.filter(v => v.encerrado).length,
      totalPax,
      veiculosUtilizados: new Set(viagensFiltradas.map(v => v.placa).filter(Boolean)).size,
      motoristasAtivos: new Set(viagensFiltradas.map(v => v.motorista)).size,
      kmTotal,
    };
  }, [viagensFiltradas, veiculos]);

  // Veículos com KM
  const veiculosComKm = useMemo(() => {
    return veiculos.map(v => {
      const viagensVeiculo = viagens.filter(vg => vg.placa === v.placa);
      const totalViagens = viagensVeiculo.length;
      const totalPax = viagensVeiculo.reduce((sum, vg) => sum + (vg.qtd_pax || 0) + (vg.qtd_pax_retorno || 0), 0);
      const kmPercorrido = (v.km_inicial && v.km_final) ? v.km_final - v.km_inicial : null;
      const motoristaVinculado = motoristas.find(m => m.veiculo_id === v.id);
      
      return {
        ...v,
        totalViagens,
        totalPax,
        kmPercorrido,
        motoristaNome: motoristaVinculado?.nome || '-',
      };
    }).filter(v => v.totalViagens > 0 || v.km_inicial || v.km_final);
  }, [veiculos, viagens, motoristas]);

  // Totais por ponto de embarque
  const totaisPorPonto = useMemo(() => {
    const pontos = new Map<string, { ponto: string; viagens: number; pax: number; tempoMedio: number; tempos: number[] }>();
    
    viagensFiltradas.forEach(v => {
      const ponto = v.ponto_embarque || 'Não informado';
      const existing = pontos.get(ponto) || { ponto, viagens: 0, pax: 0, tempoMedio: 0, tempos: [] };
      existing.viagens += 1;
      existing.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      
      if (v.h_pickup && v.h_chegada) {
        existing.tempos.push(calcularTempoViagem(v.h_pickup, v.h_chegada));
      }
      
      pontos.set(ponto, existing);
    });

    return Array.from(pontos.values())
      .map(p => ({
        ...p,
        tempoMedio: p.tempos.length > 0 ? p.tempos.reduce((a, b) => a + b, 0) / p.tempos.length : 0,
      }))
      .sort((a, b) => b.viagens - a.viagens);
  }, [viagensFiltradas]);

  // Dados por tipo de veículo (para pie chart)
  const veiculosPorTipo = useMemo(() => {
    const tipos = new Map<string, number>();
    viagensFiltradas.forEach(v => {
      const tipo = v.tipo_veiculo || 'Outro';
      tipos.set(tipo, (tipos.get(tipo) || 0) + 1);
    });
    return Array.from(tipos.entries()).map(([name, value]) => ({ name, value }));
  }, [viagensFiltradas]);

  const contadores = useMemo(() => ({
    todos: viagens.length,
    transfer: viagens.filter(v => v.tipo_operacao === 'transfer').length,
    shuttle: viagens.filter(v => v.tipo_operacao === 'shuttle').length,
  }), [viagens]);

  const handleExportExcel = () => {
    // TODO: Implementar exportação Excel
    console.log('Export Excel');
  };

  const loading = loadingViagens || loadingVeiculos;

  if (loading) {
    return (
      <EventLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileBarChart className="w-7 h-7" />
              Auditoria
            </h1>
            <p className="text-sm text-muted-foreground">
              Relatório consolidado da operação
            </p>
          </div>
          <Button onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />

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
                  <Route className="w-6 h-6 text-status-critical" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.kmTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">KM Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Viagens por Hora */}
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="totalViagens" name="Viagens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalPax" name="PAX" fill="hsl(var(--status-ok))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Veículos por Tipo */}
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
                  <Pie
                    data={veiculosPorTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
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

        {/* Tabela de Veículos com KM */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Veículos - KM Percorrido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-right">KM Inicial</TableHead>
                  <TableHead className="text-right">KM Final</TableHead>
                  <TableHead className="text-right">KM Percorrido</TableHead>
                  <TableHead className="text-right">Viagens</TableHead>
                  <TableHead className="text-right">PAX</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {veiculosComKm.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum veículo com dados de KM registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  veiculosComKm.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell className="font-mono font-medium">{veiculo.placa}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
                      </TableCell>
                      <TableCell>{veiculo.motoristaNome}</TableCell>
                      <TableCell className="text-right">
                        {veiculo.km_inicial?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {veiculo.km_final?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {veiculo.kmPercorrido !== null ? (
                          <span className="text-primary">{veiculo.kmPercorrido.toLocaleString()} km</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{veiculo.totalViagens}</TableCell>
                      <TableCell className="text-right">{veiculo.totalPax}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabela de Pontos de Embarque */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Totais por Ponto de Embarque
            </CardTitle>
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
                    <TableCell className="text-right">
                      {ponto.tempoMedio > 0 ? formatarMinutos(ponto.tempoMedio) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </EventLayout>
  );
}
