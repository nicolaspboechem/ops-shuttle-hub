import { useMemo, useState } from 'react';
import { Bus, Users, Clock, FileSpreadsheet, Gauge, Filter, X } from 'lucide-react';
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

interface VeiculosAuditoriaProps {
  viagens: Viagem[];
  veiculosCadastrados: any[];
  motoristas: any[];
}

export function VeiculosAuditoria({ viagens, veiculosCadastrados, motoristas }: VeiculosAuditoriaProps) {
  const [filtroTipoVeiculo, setFiltroTipoVeiculo] = useState<string>('all');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  // Fornecedores únicos
  const fornecedoresUnicos = useMemo(() => {
    const fornecedores = new Set(veiculosCadastrados.map(v => v.fornecedor).filter(Boolean));
    return Array.from(fornecedores).sort();
  }, [veiculosCadastrados]);

  // Viagens filtradas
  const viagensFiltradas = useMemo(() => {
    let filtered = [...viagens];

    if (filtroTipoVeiculo !== 'all') {
      filtered = filtered.filter(v => v.tipo_veiculo === filtroTipoVeiculo);
    }

    if (filtroFornecedor !== 'all') {
      const placasFornecedor = veiculosCadastrados
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
  }, [viagens, filtroTipoVeiculo, filtroFornecedor, dataInicio, dataFim, veiculosCadastrados]);

  // Métricas consolidadas por veículo
  const metricasConsolidadas = useMemo(() => {
    const veiculosMap = new Map<string, {
      placa: string;
      tipoVeiculo: string;
      fornecedor: string | null;
      totalViagens: number;
      viagensEncerradas: number;
      totalPax: number;
      tempoTotal: number;
      viagensComTempo: number;
      kmInicial: number | null;
      kmFinal: number | null;
      kmPercorrido: number;
      motorista: string | null;
      ultimaViagem: string | null;
    }>();

    // Primeiro, adicionar veículos cadastrados
    veiculosCadastrados.forEach(v => {
      const motoristaVinculado = motoristas.find(m => m.veiculo_id === v.id);
      
      veiculosMap.set(v.placa, {
        placa: v.placa,
        tipoVeiculo: v.tipo_veiculo,
        fornecedor: v.fornecedor,
        totalViagens: 0,
        viagensEncerradas: 0,
        totalPax: 0,
        tempoTotal: 0,
        viagensComTempo: 0,
        kmInicial: v.km_inicial,
        kmFinal: v.km_final,
        kmPercorrido: v.km_inicial != null && v.km_final != null 
          ? v.km_final - v.km_inicial 
          : 0,
        motorista: motoristaVinculado?.nome || null,
        ultimaViagem: null
      });
    });

    // Depois, agregar dados das viagens
    viagensFiltradas.forEach(v => {
      const placa = v.placa;
      if (!placa) return;

      const current = veiculosMap.get(placa) || {
        placa,
        tipoVeiculo: v.tipo_veiculo || 'Van',
        fornecedor: null,
        totalViagens: 0,
        viagensEncerradas: 0,
        totalPax: 0,
        tempoTotal: 0,
        viagensComTempo: 0,
        kmInicial: null,
        kmFinal: null,
        kmPercorrido: 0,
        motorista: v.motorista,
        ultimaViagem: null
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
      }

      veiculosMap.set(placa, current);
    });

    // Filtrar por tipo e fornecedor se necessário
    let result = Array.from(veiculosMap.values());
    
    if (filtroTipoVeiculo !== 'all') {
      result = result.filter(v => v.tipoVeiculo === filtroTipoVeiculo);
    }
    
    if (filtroFornecedor !== 'all') {
      result = result.filter(v => v.fornecedor === filtroFornecedor);
    }

    return result.sort((a, b) => b.totalViagens - a.totalViagens);
  }, [viagensFiltradas, veiculosCadastrados, motoristas, filtroTipoVeiculo, filtroFornecedor]);

  // Totais
  const totais = useMemo(() => ({
    viagens: metricasConsolidadas.reduce((sum, v) => sum + v.totalViagens, 0),
    pax: metricasConsolidadas.reduce((sum, v) => sum + v.totalPax, 0),
    km: metricasConsolidadas.reduce((sum, v) => sum + v.kmPercorrido, 0),
    veiculos: metricasConsolidadas.length
  }), [metricasConsolidadas]);

  const hasActiveFilters = filtroTipoVeiculo !== 'all' || filtroFornecedor !== 'all' || dataInicio || dataFim;

  const clearFilters = () => {
    setFiltroTipoVeiculo('all');
    setFiltroFornecedor('all');
    setDataInicio('');
    setDataFim('');
  };

  // Exportar para Excel
  const handleExport = () => {
    const data = metricasConsolidadas.map(v => ({
      'Placa': v.placa,
      'Tipo': v.tipoVeiculo,
      'Fornecedor': v.fornecedor || '-',
      'Motorista': v.motorista || '-',
      'Total Viagens': v.totalViagens,
      'Viagens Encerradas': v.viagensEncerradas,
      'Total PAX': v.totalPax,
      'Tempo Médio (min)': v.viagensComTempo > 0 
        ? Math.round(v.tempoTotal / v.viagensComTempo) 
        : 0,
      'KM Inicial': v.kmInicial || '-',
      'KM Final': v.kmFinal || '-',
      'KM Percorrido': v.kmPercorrido || 0,
      'Última Viagem': v.ultimaViagem 
        ? format(new Date(v.ultimaViagem), 'dd/MM/yyyy HH:mm')
        : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Veículos');
    XLSX.writeFile(wb, `auditoria-veiculos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              Veículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.veiculos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Auditoria */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dados Consolidados por Veículo</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-center">Viagens</TableHead>
                <TableHead className="text-center">PAX</TableHead>
                <TableHead className="text-center">Tempo Médio</TableHead>
                <TableHead className="text-center">KM</TableHead>
                <TableHead>Última Viagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricasConsolidadas.map((v) => (
                <TableRow key={v.placa}>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                      {v.placa}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{v.tipoVeiculo}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {v.fornecedor || '-'}
                  </TableCell>
                  <TableCell>
                    {v.motorista || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {v.totalViagens}
                    {v.viagensEncerradas < v.totalViagens && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({v.viagensEncerradas} enc.)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{v.totalPax}</TableCell>
                  <TableCell className="text-center">
                    {v.viagensComTempo > 0 
                      ? formatarMinutos(v.tempoTotal / v.viagensComTempo)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {v.kmPercorrido > 0 ? (
                      <span className="font-medium text-primary">
                        {v.kmPercorrido.toLocaleString()} km
                      </span>
                    ) : v.kmInicial != null || v.kmFinal != null ? (
                      <span className="text-xs text-muted-foreground">
                        {v.kmInicial?.toLocaleString() || '-'} / {v.kmFinal?.toLocaleString() || '-'}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.ultimaViagem 
                      ? format(new Date(v.ultimaViagem), 'dd/MM/yyyy HH:mm')
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
