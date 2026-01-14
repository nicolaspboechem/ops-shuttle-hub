import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, Clock, Download, Filter, Users, Truck, 
  AlertTriangle, ChevronDown, ChevronRight, Bus, Car, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useVeiculoPresencaHistorico, VeiculoUsoHistorico, VeiculoUsoRegistro } from '@/hooks/useVeiculoPresencaHistorico';
import { VeiculoUsoDetalheModal } from './VeiculoUsoDetalheModal';

export function VeiculosUsoAuditoria() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [diasHistorico, setDiasHistorico] = useState(7);
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterMotorista, setFilterMotorista] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(subDays(new Date(), 7));
  const [dataFim, setDataFim] = useState<Date | undefined>(new Date());
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [selectedUso, setSelectedUso] = useState<VeiculoUsoRegistro | null>(null);
  const [selectedVeiculo, setSelectedVeiculo] = useState<{ placa: string; nome: string | null; tipo: string } | null>(null);

  const { veiculosAgregados, motoristas, estatisticas, loading, refetch } = useVeiculoPresencaHistorico(eventoId, diasHistorico);

  // Lista de motoristas únicos para filtro
  const motoristasUnicos = useMemo(() => {
    const nomes = new Set<string>();
    veiculosAgregados.forEach(v => {
      v.usos.forEach(u => nomes.add(u.motorista_nome));
    });
    return Array.from(nomes).sort();
  }, [veiculosAgregados]);

  // Filtrar veículos
  const veiculosFiltrados = useMemo(() => {
    let filtered = [...veiculosAgregados];

    if (filterTipo !== 'all') {
      filtered = filtered.filter(v => v.veiculo_tipo === filterTipo);
    }

    if (filterMotorista !== 'all') {
      filtered = filtered.map(v => ({
        ...v,
        usos: v.usos.filter(u => u.motorista_nome === filterMotorista)
      })).filter(v => v.usos.length > 0);
    }

    // Filtrar por período
    if (dataInicio || dataFim) {
      filtered = filtered.map(v => ({
        ...v,
        usos: v.usos.filter(u => {
          const data = parseISO(u.data);
          if (dataInicio && data < dataInicio) return false;
          if (dataFim && data > dataFim) return false;
          return true;
        })
      })).filter(v => v.usos.length > 0);
    }

    return filtered;
  }, [veiculosAgregados, filterTipo, filterMotorista, dataInicio, dataFim]);

  // Totais dos filtrados
  const totais = useMemo(() => {
    const totalUsos = veiculosFiltrados.reduce((sum, v) => sum + v.usos.length, 0);
    const totalMinutos = veiculosFiltrados.reduce((sum, v) => 
      sum + v.usos.reduce((s, u) => s + u.duracao_minutos, 0), 0);
    const totalObservacoes = veiculosFiltrados.reduce((sum, v) => 
      sum + v.usos.filter(u => u.observacao_checkout?.trim()).length, 0);
    const veiculosCount = veiculosFiltrados.length;

    return {
      totalUsos,
      totalHoras: Math.round(totalMinutos / 60),
      totalObservacoes,
      veiculosCount
    };
  }, [veiculosFiltrados]);

  const toggleCard = (id: string) => {
    const newOpen = new Set(openCards);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenCards(newOpen);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    return `${hours}h ${mins}min`;
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    try {
      return format(parseISO(timeStr), 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo === 'Ônibus') return <Bus className="w-4 h-4" />;
    return <Car className="w-4 h-4" />;
  };

  const handleExport = () => {
    const rows: any[] = [];
    
    veiculosFiltrados.forEach(v => {
      v.usos.forEach(u => {
        rows.push({
          'Placa': v.veiculo_placa,
          'Nome': v.veiculo_nome || '',
          'Tipo': v.veiculo_tipo,
          'Fornecedor': v.fornecedor || '',
          'Data': format(parseISO(u.data), 'dd/MM/yyyy'),
          'Motorista': u.motorista_nome,
          'Telefone': u.motorista_telefone || '',
          'Check-in': formatTime(u.checkin_at),
          'Check-out': formatTime(u.checkout_at),
          'Duração': formatDuration(u.duracao_minutos),
          'Observação': u.observacao_checkout || ''
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico de Uso');
    XLSX.writeFile(wb, `historico-uso-veiculos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleViewDetail = (uso: VeiculoUsoRegistro, veiculo: VeiculoUsoHistorico) => {
    setSelectedUso(uso);
    setSelectedVeiculo({
      placa: veiculo.veiculo_placa,
      nome: veiculo.veiculo_nome,
      tipo: veiculo.veiculo_tipo
    });
  };

  const clearFilters = () => {
    setFilterTipo('all');
    setFilterMotorista('all');
    setDataInicio(subDays(new Date(), 7));
    setDataFim(new Date());
  };

  const hasActiveFilters = filterTipo !== 'all' || filterMotorista !== 'all';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Uso de Veículos</h1>
            <p className="text-sm text-muted-foreground">
              Rastreie qual motorista usou cada veículo e por quanto tempo
            </p>
          </div>
          <Button onClick={handleExport} disabled={veiculosFiltrados.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Período:</span>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">até</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <div className="h-6 w-px bg-border mx-2" />

              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos tipos</SelectItem>
                  <SelectItem value="Van">Van</SelectItem>
                  <SelectItem value="Ônibus">Ônibus</SelectItem>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMotorista} onValueChange={setFilterMotorista}>
                <SelectTrigger className="w-[180px]">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Motorista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos motoristas</SelectItem>
                  {motoristasUnicos.map(nome => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totais.veiculosCount}</p>
                <p className="text-xs text-muted-foreground">Veículos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totais.totalUsos}</p>
                <p className="text-xs text-muted-foreground">Registros de uso</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totais.totalHoras}h</p>
                <p className="text-xs text-muted-foreground">Total de uso</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totais.totalObservacoes}</p>
                <p className="text-xs text-muted-foreground">Observações</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de veículos */}
        {veiculosFiltrados.length === 0 ? (
          <Card className="p-8 text-center">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Nenhum registro encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters 
                ? 'Tente ajustar os filtros de busca.' 
                : 'Não há registros de uso de veículos no período selecionado.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {veiculosFiltrados.map(veiculo => (
              <Collapsible
                key={veiculo.veiculo_id}
                open={openCards.has(veiculo.veiculo_id)}
                onOpenChange={() => toggleCard(veiculo.veiculo_id)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {openCards.has(veiculo.veiculo_id) ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div className="flex items-center gap-2">
                            {getTipoIcon(veiculo.veiculo_tipo)}
                            <div>
                              <span className="font-bold">{veiculo.veiculo_placa}</span>
                              {veiculo.veiculo_nome && (
                                <span className="text-muted-foreground ml-2">
                                  ({veiculo.veiculo_nome})
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">{veiculo.veiculo_tipo}</Badge>
                          {veiculo.fornecedor && (
                            <span className="text-sm text-muted-foreground">
                              {veiculo.fornecedor}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{veiculo.usos.length} usos</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{formatDuration(veiculo.tempoTotalUso)}</span>
                          </div>
                          {veiculo.usosComObservacao > 0 && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              {veiculo.usosComObservacao} obs
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Motorista</TableHead>
                            <TableHead>Check-in</TableHead>
                            <TableHead>Check-out</TableHead>
                            <TableHead>Duração</TableHead>
                            <TableHead className="w-10">Obs</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {veiculo.usos.map(uso => (
                            <TableRow key={uso.id}>
                              <TableCell className="font-medium">
                                {format(parseISO(uso.data), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell>{uso.motorista_nome}</TableCell>
                              <TableCell className="font-mono text-green-600">
                                {formatTime(uso.checkin_at)}
                              </TableCell>
                              <TableCell className="font-mono text-red-600">
                                {formatTime(uso.checkout_at)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {formatDuration(uso.duracao_minutos)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {uso.observacao_checkout ? (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {uso.observacao_checkout}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewDetail(uso, veiculo)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Modal de detalhes */}
        <VeiculoUsoDetalheModal
          open={!!selectedUso}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUso(null);
              setSelectedVeiculo(null);
            }
          }}
          uso={selectedUso}
          veiculoInfo={selectedVeiculo}
        />
      </div>
    </TooltipProvider>
  );
}
