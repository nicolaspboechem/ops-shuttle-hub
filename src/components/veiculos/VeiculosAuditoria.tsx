import { useMemo, useState } from 'react';
import { Bus, Car, Users, Clock, FileSpreadsheet, Gauge, Filter, X, LayoutGrid, List as ListIcon, UserCheck, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Viagem } from '@/lib/types/viagem';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { VeiculoAuditoriaDiaModal } from './VeiculoAuditoriaDiaModal';

interface VeiculoMetricas {
  placa: string;
  nome: string | null;
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
}

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
  const [viewMode, setViewMode] = useState<'card' | 'lista'>('lista');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string | null>(null);

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
      nome: string | null;
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
        nome: v.nome || null,
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
        nome: null,
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
      'Nome': v.nome || '-',
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

  const getTipoIcon = (tipo: string) => {
    if (tipo?.toLowerCase().includes('van') || tipo === 'Sedan' || tipo === 'SUV') {
      return Car;
    }
    return Bus;
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
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
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

      {/* Dados Consolidados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dados Consolidados por Veículo</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md">
              <Button 
                variant={viewMode === 'card' ? 'default' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('card')}
                className="rounded-r-none h-8 w-8"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'lista' ? 'default' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('lista')}
                className="rounded-l-none h-8 w-8"
              >
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {metricasConsolidadas.map((v) => {
                const TipoIcon = getTipoIcon(v.tipoVeiculo);
                return (
                  <Card 
                    key={v.placa} 
                    className="overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                    onClick={() => setSelectedVeiculo(v.placa)}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-2 rounded-lg",
                            v.tipoVeiculo === 'Ônibus' 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          )}>
                            <TipoIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{v.tipoVeiculo}</p>
                            <code className="font-bold text-sm tracking-wider bg-muted px-1.5 py-0.5 rounded">
                              {v.placa}
                            </code>
                            {v.nome && (
                              <p className="text-xs text-muted-foreground mt-0.5">{v.nome}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* KM */}
                      {(v.kmInicial != null || v.kmFinal != null) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded">
                          <Gauge className="w-3.5 h-3.5 text-blue-500" />
                          <span>
                            {v.kmInicial?.toLocaleString('pt-BR') || '-'} → {v.kmFinal?.toLocaleString('pt-BR') || '-'}
                            {v.kmPercorrido > 0 && (
                              <span className="ml-1 font-semibold text-primary">
                                ({v.kmPercorrido.toLocaleString('pt-BR')} km)
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Estatísticas */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Bus className="w-3.5 h-3.5" />
                          <span className="font-medium">{v.totalViagens}</span>
                          <span>viagens</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-medium">{v.totalPax}</span>
                          <span>pax</span>
                        </div>
                        {v.viagensComTempo > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-medium">{formatarMinutos(v.tempoTotal / v.viagensComTempo)}</span>
                          </div>
                        )}
                      </div>

                      {/* Motorista */}
                      {v.motorista && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                          <UserCheck className="h-3 w-3" />
                          <span className="truncate font-medium">{v.motorista}</span>
                        </div>
                      )}

                      {/* Fornecedor */}
                      {v.fornecedor && (
                        <p className="text-xs text-muted-foreground truncate">
                          Fornecedor: <span className="font-medium">{v.fornecedor}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
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
                  <TableRow 
                    key={v.placa} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedVeiculo(v.placa)}
                  >
                    <TableCell>
                      <div>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                          {v.placa}
                        </code>
                        {v.nome && (
                          <p className="text-xs text-muted-foreground mt-0.5">{v.nome}</p>
                        )}
                      </div>
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
          )}
          {metricasConsolidadas.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum dado encontrado com os filtros selecionados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes do veículo */}
      <VeiculoAuditoriaDiaModal
        veiculo={selectedVeiculo ? metricasConsolidadas.find(m => m.placa === selectedVeiculo) || null : null}
        viagens={selectedVeiculo ? viagensFiltradas.filter(v => v.placa === selectedVeiculo) : []}
        motoristas={motoristas}
        isOpen={!!selectedVeiculo}
        onClose={() => setSelectedVeiculo(null)}
      />
    </div>
  );
}
