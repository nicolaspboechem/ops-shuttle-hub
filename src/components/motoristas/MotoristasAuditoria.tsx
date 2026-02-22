import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  X,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Viagem } from '@/lib/types/viagem';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { useMotoristaPresencaHistorico } from '@/hooks/useMotoristaPresencaHistorico';
import { MotoristaAuditoriaCard } from './MotoristaAuditoriaCard';
import { useEventos } from '@/hooks/useEventos';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface MotoristasAuditoriaProps {
  viagens: Viagem[];
  motoristasCadastrados: any[];
  veiculos: any[];
}

export function MotoristasAuditoria({ viagens, motoristasCadastrados, veiculos }: MotoristasAuditoriaProps) {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [filtroMotorista, setFiltroMotorista] = useState<string>('all');
  const [filtroTipoVeiculo, setFiltroTipoVeiculo] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [diasHistorico, setDiasHistorico] = useState<number>(0);

  // Buscar data de início do evento
  const { getEventoById } = useEventos();
  const evento = eventoId ? getEventoById(eventoId) : undefined;
  const dataInicioEvento = evento?.data_inicio || undefined;

  // Hook para buscar histórico de presença
  const { 
    motoristasAgregados, 
    estatisticas, 
    loading: loadingPresenca 
  } = useMotoristaPresencaHistorico(eventoId, diasHistorico, dataInicioEvento);

  // Listas para filtros
  const motoristasUnicos = useMemo(() => {
    const nomes = new Set(motoristasCadastrados.map(m => m.nome).filter(Boolean));
    return Array.from(nomes).sort();
  }, [motoristasCadastrados]);

  // Motoristas filtrados
  const motoristasFiltrados = useMemo(() => {
    let filtered = [...motoristasAgregados];

    if (filtroMotorista !== 'all') {
      filtered = filtered.filter(m => m.motorista_nome === filtroMotorista);
    }

    if (filtroTipoVeiculo !== 'all') {
      filtered = filtered.filter(m => {
        const motoristaCadastrado = motoristasCadastrados.find(mc => mc.id === m.motorista_id);
        if (motoristaCadastrado?.veiculo_id) {
          const veiculo = veiculos.find(v => v.id === motoristaCadastrado.veiculo_id);
          return veiculo?.tipo_veiculo === filtroTipoVeiculo;
        }
        return false;
      });
    }

    return filtered.sort((a, b) => b.totalDias - a.totalDias);
  }, [motoristasAgregados, filtroMotorista, filtroTipoVeiculo, motoristasCadastrados, veiculos]);

  // Métricas consolidadas (mantém cálculo de viagens para compatibilidade)
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

    // Filtrar viagens por data
    let viagensFiltradas = [...viagens];
    if (dataInicio) {
      viagensFiltradas = viagensFiltradas.filter(v => v.data_criacao >= dataInicio);
    }
    if (dataFim) {
      viagensFiltradas = viagensFiltradas.filter(v => v.data_criacao <= dataFim + 'T23:59:59');
    }
    if (filtroMotorista !== 'all') {
      viagensFiltradas = viagensFiltradas.filter(v => v.motorista === filtroMotorista);
    }
    if (filtroTipoVeiculo !== 'all') {
      viagensFiltradas = viagensFiltradas.filter(v => v.tipo_veiculo === filtroTipoVeiculo);
    }

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

    return Array.from(motoristasMap.values())
      .sort((a, b) => b.totalViagens - a.totalViagens);
  }, [viagens, filtroMotorista, filtroTipoVeiculo, dataInicio, dataFim]);

  // Totais
  const totais = useMemo(() => ({
    viagens: metricasConsolidadas.reduce((sum, m) => sum + m.totalViagens, 0),
    pax: metricasConsolidadas.reduce((sum, m) => sum + m.totalPax, 0),
    motoristas: motoristasFiltrados.length,
    diasTrabalhados: motoristasFiltrados.reduce((sum, m) => sum + m.totalDias, 0),
    observacoes: motoristasFiltrados.reduce((sum, m) => sum + m.diasComObservacao, 0)
  }), [metricasConsolidadas, motoristasFiltrados]);

  const hasActiveFilters = filtroMotorista !== 'all' || filtroTipoVeiculo !== 'all' || dataInicio || dataFim;

  const clearFilters = () => {
    setFiltroMotorista('all');
    setFiltroTipoVeiculo('all');
    setDataInicio('');
    setDataFim('');
  };

  // Exportar para Excel
  const handleExport = () => {
    const data = motoristasFiltrados.map(m => {
      const metrica = metricasConsolidadas.find(mc => mc.nome === m.motorista_nome);
      return {
        'Motorista': m.motorista_nome,
        'Horas Trabalhadas': `${Math.floor(m.horasTrabalhadasMinutos / 60)}h ${Math.round(m.horasTrabalhadasMinutos % 60)}m`,
        'Saldo (min)': m.saldoMinutos,
        'Turnos Completos': m.turnosCompletos,
        'Turnos Incompletos': m.turnosIncompletos,
        'Dias Trabalhados': m.totalDias,
        'Total Viagens': metrica?.totalViagens || 0,
        'Total PAX': metrica?.totalPax || 0,
        'Observações': m.diasComObservacao,
      };
    });

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
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Blindado">Blindado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Histórico</label>
              <Select 
                value={String(diasHistorico)} 
                onValueChange={(v) => setDiasHistorico(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="7 dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  {dataInicioEvento && (
                    <SelectItem value="0">Desde o início</SelectItem>
                  )}
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Motoristas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.motoristas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Horas Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Math.floor(estatisticas.totalHorasMinutos / 60)}h {Math.round(estatisticas.totalHorasMinutos % 60)}m
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Saldo Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              "text-3xl font-bold",
              estatisticas.saldoGlobalMinutos > 0 ? "text-emerald-600" : 
              estatisticas.saldoGlobalMinutos < 0 ? "text-destructive" : ""
            )}>
              {estatisticas.saldoGlobalMinutos > 0 ? '+' : ''}{Math.floor(estatisticas.saldoGlobalMinutos / 60)}h {Math.abs(Math.round(estatisticas.saldoGlobalMinutos % 60))}m
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Turnos Completos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{estatisticas.diasCompletos}</p>
          </CardContent>
        </Card>
        <Card className={cn(estatisticas.totalTurnosIncompletos > 0 && "border-amber-500/30")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className={cn("h-4 w-4", estatisticas.totalTurnosIncompletos > 0 && "text-amber-500")} />
              Incompletos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-3xl font-bold", estatisticas.totalTurnosIncompletos > 0 && "text-amber-500")}>
              {estatisticas.totalTurnosIncompletos}
            </p>
          </CardContent>
        </Card>
        {estatisticas.totalTurnosAnomalos > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Anomalias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">
                {estatisticas.totalTurnosAnomalos}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Header com Exportar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Detalhes por Motorista</h2>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Cards de Motoristas */}
      {loadingPresenca ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : motoristasFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum motorista encontrado com os filtros selecionados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {motoristasFiltrados.map((motorista) => (
            <MotoristaAuditoriaCard
              key={motorista.motorista_id}
              motorista={motorista}
              viagens={viagens}
              isOpen={openCardId === motorista.motorista_id}
              onToggle={() => setOpenCardId(
                openCardId === motorista.motorista_id ? null : motorista.motorista_id
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
