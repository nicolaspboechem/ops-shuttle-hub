import { useMemo, useState } from 'react';
import { Users, Clock, TrendingUp, FileSpreadsheet, Car, Calendar, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Viagem } from '@/lib/types/viagem';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface MotoristasAuditoriaProps {
  viagens: Viagem[];
  motoristasCadastrados: any[];
  veiculos: any[];
}

export function MotoristasAuditoria({ viagens, motoristasCadastrados, veiculos }: MotoristasAuditoriaProps) {
  const [filtroMotorista, setFiltroMotorista] = useState<string>('all');
  const [filtroTipoVeiculo, setFiltroTipoVeiculo] = useState<string>('all');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  // Listas para filtros
  const motoristasUnicos = useMemo(() => {
    const nomes = new Set(viagens.map(v => v.motorista).filter(Boolean));
    return Array.from(nomes).sort();
  }, [viagens]);

  const fornecedoresUnicos = useMemo(() => {
    const fornecedores = new Set(veiculos.map(v => v.fornecedor).filter(Boolean));
    return Array.from(fornecedores).sort();
  }, [veiculos]);

  // Viagens filtradas
  const viagensFiltradas = useMemo(() => {
    let filtered = [...viagens];

    if (filtroMotorista !== 'all') {
      filtered = filtered.filter(v => v.motorista === filtroMotorista);
    }

    if (filtroTipoVeiculo !== 'all') {
      filtered = filtered.filter(v => v.tipo_veiculo === filtroTipoVeiculo);
    }

    if (filtroFornecedor !== 'all') {
      const placasFornecedor = veiculos
        .filter(v => v.fornecedor === filtroFornecedor)
        .map(v => v.placa);
      filtered = filtered.filter(v => placasFornecedor.includes(v.placa));
    }

    if (dataInicio) {
      filtered = filtered.filter(v => v.data_criacao >= dataInicio);
    }

    if (dataFim) {
      filtered = filtered.filter(v => v.data_criacao <= dataFim + 'T23:59:59');
    }

    return filtered;
  }, [viagens, filtroMotorista, filtroTipoVeiculo, filtroFornecedor, dataInicio, dataFim, veiculos]);

  // Métricas consolidadas por motorista
  const metricasConsolidadas = useMemo(() => {
    const motoristasMap = new Map<string, {
      nome: string;
      totalViagens: number;
      viagensEncerradas: number;
      totalPax: number;
      tempoTotal: number;
      viagensComTempo: number;
      kmPercorrido: number;
      ultimaViagem: string | null;
      veiculoPrincipal: string | null;
    }>();

    viagensFiltradas.forEach(v => {
      const nome = v.motorista;
      if (!nome) return;

      const current = motoristasMap.get(nome) || {
        nome,
        totalViagens: 0,
        viagensEncerradas: 0,
        totalPax: 0,
        tempoTotal: 0,
        viagensComTempo: 0,
        kmPercorrido: 0,
        ultimaViagem: null,
        veiculoPrincipal: null
      };

      current.totalViagens++;
      current.totalPax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      
      if (v.encerrado) {
        current.viagensEncerradas++;
      }

      if (v.h_pickup && v.h_chegada) {
        current.tempoTotal += calcularTempoViagem(v.h_pickup, v.h_chegada);
        current.viagensComTempo++;
      }

      if (!current.ultimaViagem || v.data_criacao > current.ultimaViagem) {
        current.ultimaViagem = v.data_criacao;
        current.veiculoPrincipal = v.placa;
      }

      motoristasMap.set(nome, current);
    });

    // Calcular KM percorrido baseado nos veículos
    motoristasMap.forEach((metricas, nome) => {
      const motoristaCadastrado = motoristasCadastrados.find(m => m.nome === nome);
      if (motoristaCadastrado?.veiculo_id) {
        const veiculo = veiculos.find(v => v.id === motoristaCadastrado.veiculo_id);
        if (veiculo?.km_inicial != null && veiculo?.km_final != null) {
          metricas.kmPercorrido = veiculo.km_final - veiculo.km_inicial;
        }
      }
    });

    return Array.from(motoristasMap.values())
      .sort((a, b) => b.totalViagens - a.totalViagens);
  }, [viagensFiltradas, motoristasCadastrados, veiculos]);

  // Totais
  const totais = useMemo(() => ({
    viagens: metricasConsolidadas.reduce((sum, m) => sum + m.totalViagens, 0),
    pax: metricasConsolidadas.reduce((sum, m) => sum + m.totalPax, 0),
    km: metricasConsolidadas.reduce((sum, m) => sum + m.kmPercorrido, 0),
    motoristas: metricasConsolidadas.length
  }), [metricasConsolidadas]);

  const hasActiveFilters = filtroMotorista !== 'all' || filtroTipoVeiculo !== 'all' || 
    filtroFornecedor !== 'all' || dataInicio || dataFim;

  const clearFilters = () => {
    setFiltroMotorista('all');
    setFiltroTipoVeiculo('all');
    setFiltroFornecedor('all');
    setDataInicio('');
    setDataFim('');
  };

  // Exportar para Excel
  const handleExport = () => {
    const data = metricasConsolidadas.map(m => ({
      'Motorista': m.nome,
      'Total Viagens': m.totalViagens,
      'Viagens Encerradas': m.viagensEncerradas,
      'Total PAX': m.totalPax,
      'Tempo Médio (min)': m.viagensComTempo > 0 
        ? Math.round(m.tempoTotal / m.viagensComTempo) 
        : 0,
      'KM Percorrido': m.kmPercorrido,
      'Veículo Principal': m.veiculoPrincipal || '-',
      'Última Viagem': m.ultimaViagem 
        ? format(new Date(m.ultimaViagem), 'dd/MM/yyyy HH:mm')
        : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Motoristas');
    XLSX.writeFile(wb, `auditoria-motoristas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Período Início</label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Período Fim</label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Motorista</label>
              <Select value={filtroMotorista} onValueChange={setFiltroMotorista}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {motoristasUnicos.map(m => (
                    <SelectItem key={m} value={m!}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tipo Veículo</label>
              <Select value={filtroTipoVeiculo} onValueChange={setFiltroTipoVeiculo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Van">Van</SelectItem>
                  <SelectItem value="Ônibus">Ônibus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Fornecedor</label>
              <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {fornecedoresUnicos.map(f => (
                    <SelectItem key={f} value={f!}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3">
              <X className="w-4 h-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cards de Totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Viagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.viagens}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de PAX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.pax.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              KM Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.km.toLocaleString()} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Motoristas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.motoristas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Auditoria */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dados Consolidados por Motorista</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-center">Viagens</TableHead>
                <TableHead className="text-center">PAX</TableHead>
                <TableHead className="text-center">Tempo Médio</TableHead>
                <TableHead className="text-center">KM</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Última Viagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricasConsolidadas.map((m, idx) => (
                <TableRow key={m.nome}>
                  <TableCell>
                    <Badge variant="outline">#{idx + 1}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-center">
                    {m.totalViagens}
                    {m.viagensEncerradas < m.totalViagens && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({m.viagensEncerradas} enc.)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{m.totalPax}</TableCell>
                  <TableCell className="text-center">
                    {m.viagensComTempo > 0 
                      ? formatarMinutos(m.tempoTotal / m.viagensComTempo)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {m.kmPercorrido > 0 
                      ? <span className="font-medium text-primary">{m.kmPercorrido.toLocaleString()} km</span>
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {m.veiculoPrincipal ? (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {m.veiculoPrincipal}
                      </code>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.ultimaViagem 
                      ? format(new Date(m.ultimaViagem), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {metricasConsolidadas.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum dado encontrado com os filtros selecionados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
