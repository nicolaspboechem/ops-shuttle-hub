import { useMemo } from 'react';
import { Fuel, CheckCircle, AlertTriangle, TrendingUp, Car, BarChart3, Download, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlertasFrotaDetalhado } from '@/hooks/useAlertasFrotaDetalhado';
import * as XLSX from 'xlsx';

const NIVEL_MAP: Record<string, number> = {
  'vazio': 0, 'reserva': 0, '1/4': 25, '1/2': 50, '3/4': 75, 'cheio': 100,
};

interface Props {
  alertasTotais: number;
  alertasResolvidos: number;
  eventoId?: string;
}

interface VeiculoAgrupado {
  veiculoId: string;
  nome: string;
  placa: string;
  tipo: string;
  totalAlertas: number;
  nivelMedio: number;
  alertasCriticos: number;
  motoristasDistintos: number;
  pendentes: number;
}

export function AuditoriaAbastecimentoTab({ alertasTotais, alertasResolvidos, eventoId }: Props) {
  const { alertas, loading } = useAlertasFrotaDetalhado(eventoId);
  const alertasAbertos = alertasTotais - alertasResolvidos;
  const taxaResolucao = alertasTotais > 0 ? ((alertasResolvidos / alertasTotais) * 100).toFixed(1) : '0';

  const distribuicao = useMemo(() => {
    const d = { '1/4': 0, '1/2': 0, '3/4': 0, 'cheio': 0, 'vazio': 0, 'reserva': 0 };
    alertas.forEach(a => {
      const n = a.nivel_combustivel || '';
      if (n in d) d[n as keyof typeof d]++;
    });
    return d;
  }, [alertas]);

  const veiculosAgrupados = useMemo(() => {
    const map = new Map<string, VeiculoAgrupado>();
    alertas.forEach(a => {
      const id = a.veiculo_id;
      const existing = map.get(id);
      const nivel = NIVEL_MAP[a.nivel_combustivel || ''] ?? 50;
      const critico = ['vazio', 'reserva', '1/4'].includes(a.nivel_combustivel || '') ? 1 : 0;
      const pendente = a.status !== 'resolvido' ? 1 : 0;

      if (existing) {
        existing.totalAlertas++;
        existing.nivelMedio += nivel;
        existing.alertasCriticos += critico;
        existing.pendentes += pendente;
        const motoristas = new Set<string>();
        alertas.filter(x => x.veiculo_id === id).forEach(x => motoristas.add(x.motorista_id));
        existing.motoristasDistintos = motoristas.size;
      } else {
        map.set(id, {
          veiculoId: id,
          nome: a.veiculo?.nome || a.veiculo?.placa || 'Sem nome',
          placa: a.veiculo?.placa || '---',
          tipo: a.veiculo?.tipo_veiculo || 'Outro',
          totalAlertas: 1,
          nivelMedio: nivel,
          alertasCriticos: critico,
          motoristasDistintos: 1,
          pendentes: pendente,
        });
      }
    });

    // Recalcular motoristas distintos e nível médio
    map.forEach((v, id) => {
      const motoristas = new Set<string>();
      alertas.filter(a => a.veiculo_id === id).forEach(a => motoristas.add(a.motorista_id));
      v.motoristasDistintos = motoristas.size;
      v.nivelMedio = Math.round(v.nivelMedio / v.totalAlertas);
    });

    return Array.from(map.values()).sort((a, b) => b.totalAlertas - a.totalAlertas);
  }, [alertas]);

  const veiculosMonitorados = veiculosAgrupados.length;
  const mediaAlertasVeiculo = veiculosMonitorados > 0 ? (alertas.length / veiculosMonitorados).toFixed(1) : '0';
  const totalCriticos = veiculosAgrupados.reduce((s, v) => s + v.alertasCriticos, 0);

  const getMedalColor = (idx: number) => {
    if (idx === 0) return 'text-yellow-500';
    if (idx === 1) return 'text-gray-400';
    return 'text-amber-700';
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(veiculosAgrupados.map((v, i) => ({
      '#': i + 1,
      'Veículo': v.nome,
      'Placa': v.placa,
      'Tipo': v.tipo,
      'Total Alertas': v.totalAlertas,
      'Nível Médio (%)': v.nivelMedio,
      'Alertas Críticos': v.alertasCriticos,
      'Motoristas': v.motoristasDistintos,
      'Status': v.pendentes === 0 ? 'Resolvido' : 'Pendente',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Abastecimento');
    XLSX.writeFile(wb, 'auditoria_abastecimento.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo existentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Fuel className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertasTotais}</p>
                <p className="text-xs text-muted-foreground">Alertas Emitidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-ok/10">
                <CheckCircle className="w-6 h-6 text-status-ok" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertasResolvidos}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-critical/10">
                <AlertTriangle className="w-6 h-6 text-status-critical" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertasAbertos}</p>
                <p className="text-xs text-muted-foreground">Ainda Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-alert/10">
                <TrendingUp className="w-6 h-6 text-status-alert" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taxaResolucao}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Resolução</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs detalhados */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{veiculosMonitorados}</p>
                  <p className="text-xs text-muted-foreground">Veículos Monitorados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mediaAlertasVeiculo}</p>
                  <p className="text-xs text-muted-foreground">Média Alertas/Veículo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-status-critical/10">
                  <AlertTriangle className="w-6 h-6 text-status-critical" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCriticos}</p>
                  <p className="text-xs text-muted-foreground">Alertas Críticos (≤1/4)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Distribuição por Nível</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {distribuicao['vazio'] > 0 && <Badge variant="destructive">Vazio: {distribuicao['vazio']}</Badge>}
                  <Badge variant="destructive">1/4: {distribuicao['1/4']}</Badge>
                  <Badge variant="outline">1/2: {distribuicao['1/2']}</Badge>
                  <Badge variant="secondary">3/4: {distribuicao['3/4']}</Badge>
                  <Badge variant="default">Cheio: {distribuicao['cheio']}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela por veículo */}
      {!loading && veiculosAgrupados.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Abastecimento por Veículo</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Exportar
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead className="text-right">Total Alertas</TableHead>
                  <TableHead className="text-right">Nível Médio</TableHead>
                  <TableHead className="text-right">Críticos</TableHead>
                  <TableHead className="text-right">Motoristas</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {veiculosAgrupados.map((v, idx) => (
                  <TableRow key={v.veiculoId}>
                    <TableCell className="text-center">
                      {idx < 3 ? <Medal className={`w-5 h-5 mx-auto ${getMedalColor(idx)}`} /> : <span className="font-bold">{idx + 1}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{v.nome}</div>
                      <div className="text-xs text-muted-foreground font-mono">({v.placa})</div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{v.totalAlertas}</TableCell>
                    <TableCell className="text-right">
                      <span className={v.nivelMedio <= 25 ? 'text-status-critical font-bold' : ''}>{v.nivelMedio}%</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {v.alertasCriticos > 0 ? (
                        <span className="text-status-critical font-bold">{v.alertasCriticos}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{v.motoristasDistintos}</TableCell>
                    <TableCell className="text-center">
                      {v.pendentes === 0 ? (
                        <Badge className="bg-status-ok/20 text-status-ok border-0">Resolvido</Badge>
                      ) : (
                        <Badge variant="destructive">{v.pendentes} pendente{v.pendentes > 1 ? 's' : ''}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
