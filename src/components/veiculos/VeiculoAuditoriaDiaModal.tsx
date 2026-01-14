import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  Car, 
  Route, 
  Users, 
  Bus,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Gauge,
  UserCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Viagem } from '@/lib/types/viagem';
import { cn } from '@/lib/utils';

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

interface VeiculoAuditoriaDiaModalProps {
  veiculo: VeiculoMetricas | null;
  viagens: Viagem[];
  motoristas: any[];
  isOpen: boolean;
  onClose: () => void;
}

export function VeiculoAuditoriaDiaModal({ 
  veiculo, 
  viagens, 
  motoristas,
  isOpen, 
  onClose 
}: VeiculoAuditoriaDiaModalProps) {

  // Agrupar viagens por motorista e calcular período de uso
  const motoristasUtilizadores = useMemo(() => {
    const map = new Map<string, {
      nome: string;
      primeiraViagem: string;
      ultimaViagem: string;
      totalViagens: number;
      totalPax: number;
    }>();

    viagens.forEach(v => {
      if (!v.motorista) return;
      const current = map.get(v.motorista);
      const horario = v.h_pickup || v.data_criacao;
      
      if (!current) {
        map.set(v.motorista, {
          nome: v.motorista,
          primeiraViagem: horario,
          ultimaViagem: v.h_chegada || v.h_pickup || horario,
          totalViagens: 1,
          totalPax: (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0)
        });
      } else {
        if (horario < current.primeiraViagem) current.primeiraViagem = horario;
        const fim = v.h_chegada || v.h_pickup || horario;
        if (fim > current.ultimaViagem) current.ultimaViagem = fim;
        current.totalViagens++;
        current.totalPax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => 
      a.primeiraViagem.localeCompare(b.primeiraViagem)
    );
  }, [viagens]);

  const totalPax = viagens.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const configs: Record<string, { label: string; className: string }> = {
      encerrado: { label: 'Encerrada', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      em_andamento: { label: 'Em Andamento', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      agendado: { label: 'Agendada', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      cancelado: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    };
    const config = configs[status] || { label: status, className: '' };
    return <Badge variant="outline" className={cn("text-xs", config.className)}>{config.label}</Badge>;
  };

  const getTipoOperacaoBadge = (tipo: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      transfer: { label: 'Transfer', className: 'bg-amber-500/10 text-amber-600' },
      shuttle: { label: 'Shuttle', className: 'bg-emerald-500/10 text-emerald-600' },
      missao: { label: 'Missão', className: 'bg-purple-500/10 text-purple-600' },
    };
    const config = configs[tipo] || { label: tipo, className: 'bg-muted' };
    return <Badge variant="secondary" className={cn("text-xs", config.className)}>{config.label}</Badge>;
  };

  const formatarMinutos = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  if (!veiculo) return null;

  const VeiculoIcon = veiculo.tipoVeiculo === 'Ônibus' ? Bus : Car;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              veiculo.tipoVeiculo === 'Ônibus' 
                ? 'bg-primary/10 text-primary' 
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            )}>
              <VeiculoIcon className="h-5 w-5" />
            </div>
            <div>
              <code className="font-bold text-lg tracking-wider bg-muted px-2 py-0.5 rounded">
                {veiculo.placa}
              </code>
              {veiculo.nome && (
                <span className="text-muted-foreground ml-2 text-base">({veiculo.nome})</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Seção: Informações Gerais */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Car className="h-4 w-4" />
                Informações Gerais
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                  <p className="font-medium">{veiculo.tipoVeiculo}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Fornecedor</p>
                  <p className="font-medium">{veiculo.fornecedor || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Viagens</p>
                  <p className="text-xl font-bold text-primary">{veiculo.totalViagens}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total PAX</p>
                  <p className="text-xl font-bold">{veiculo.totalPax}</p>
                </div>
              </div>

              {/* KM Info */}
              {(veiculo.kmInicial != null || veiculo.kmFinal != null) && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Gauge className="h-5 w-5 text-blue-500" />
                  <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">KM Inicial: </span>
                      <span className="font-medium">{veiculo.kmInicial?.toLocaleString('pt-BR') || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">KM Final: </span>
                      <span className="font-medium">{veiculo.kmFinal?.toLocaleString('pt-BR') || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Percorrido: </span>
                      <span className="font-bold text-primary">{veiculo.kmPercorrido.toLocaleString('pt-BR')} km</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tempo médio */}
              {veiculo.viagensComTempo > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Tempo médio por viagem:</span>
                  <span className="font-medium text-foreground">
                    {formatarMinutos(veiculo.tempoTotal / veiculo.viagensComTempo)}
                  </span>
                </div>
              )}
            </div>

            {/* Seção: Motoristas que Utilizaram */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Motoristas que Utilizaram
              </h3>
              
              {motoristasUtilizadores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum motorista registrado nas viagens
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Motorista</th>
                        <th className="text-center px-3 py-2 font-medium">Período</th>
                        <th className="text-center px-3 py-2 font-medium">Viagens</th>
                        <th className="text-center px-3 py-2 font-medium">PAX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {motoristasUtilizadores.map((motorista) => (
                        <tr key={motorista.nome} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {motorista.nome.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              {motorista.nome}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-muted-foreground">
                              {motorista.primeiraViagem.substring(11, 16) || '--:--'}
                            </span>
                            <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {motorista.ultimaViagem.substring(11, 16) || '--:--'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-medium">{motorista.totalViagens}</td>
                          <td className="px-3 py-2 text-center font-medium">{motorista.totalPax}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Seção: Viagens Realizadas */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Route className="h-4 w-4" />
                Viagens Realizadas ({viagens.length})
                {totalPax > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    <Users className="h-3 w-3 mr-1" />
                    {totalPax} PAX total
                  </Badge>
                )}
              </h3>
              
              {viagens.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma viagem registrada para este veículo
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Data/Hora</th>
                        <th className="text-left px-3 py-2 font-medium">Motorista</th>
                        <th className="text-left px-3 py-2 font-medium">Rota</th>
                        <th className="text-center px-3 py-2 font-medium">PAX</th>
                        <th className="text-center px-3 py-2 font-medium">Tipo</th>
                        <th className="text-center px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viagens
                        .sort((a, b) => (b.h_pickup || b.data_criacao).localeCompare(a.h_pickup || a.data_criacao))
                        .map((viagem) => (
                        <tr key={viagem.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <div className="text-xs">
                              <p className="font-medium">
                                {viagem.h_pickup?.substring(11, 16) || '--:--'}
                              </p>
                              <p className="text-muted-foreground">
                                {format(parseISO(viagem.data_criacao), "dd/MM", { locale: ptBR })}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-medium text-xs">
                            {viagem.motorista || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[100px]">{viagem.ponto_embarque || '-'}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[100px]">{viagem.ponto_desembarque || '-'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{(viagem.qtd_pax || 0) + (viagem.qtd_pax_retorno || 0)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {getTipoOperacaoBadge(viagem.tipo_operacao)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {viagem.encerrado ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              getStatusBadge(viagem.status || undefined)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
