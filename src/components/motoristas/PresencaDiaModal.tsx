import { useMemo } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  Car, 
  Route, 
  Users, 
  MessageSquare,
  Bus,
  CheckCircle2,
  MapPin,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PresencaHistorico } from '@/hooks/useMotoristaPresencaHistorico';
import { Viagem } from '@/lib/types/viagem';
import { cn } from '@/lib/utils';

interface PresencaDiaModalProps {
  presenca: PresencaHistorico | null;
  viagens: Viagem[];
  motoristaNome: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PresencaDiaModal({ 
  presenca, 
  viagens, 
  motoristaNome, 
  isOpen, 
  onClose 
}: PresencaDiaModalProps) {
  
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}min`;
  };

  const duracao = useMemo(() => {
    if (!presenca?.checkin_at || !presenca?.checkout_at) return null;
    return differenceInMinutes(
      parseISO(presenca.checkout_at),
      parseISO(presenca.checkin_at)
    );
  }, [presenca]);

  // Agrupar viagens por veículo e calcular período de uso
  const veiculosUtilizados = useMemo(() => {
    const map = new Map<string, {
      placa: string;
      tipo: string;
      primeiraViagem: string;
      ultimaViagem: string;
      totalViagens: number;
      totalPax: number;
    }>();

    viagens.forEach(v => {
      const placa = v.placa || v.veiculo?.placa;
      const tipoVeiculo = v.tipo_veiculo || v.veiculo?.tipo_veiculo;
      if (!placa) return;
      const current = map.get(placa);
      const horario = v.h_pickup || v.data_criacao;
      
      if (!current) {
        map.set(placa, {
          placa,
          tipo: tipoVeiculo || 'Van',
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

  if (!presenca) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {motoristaNome.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-lg">{motoristaNome}</span>
              <span className="text-muted-foreground mx-2">—</span>
              <span className="text-base text-muted-foreground capitalize">
                {format(parseISO(presenca.data), "EEEE, dd/MM", { locale: ptBR })}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Seção: Jornada */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Jornada
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Check-in</p>
                  <p className="text-xl font-bold text-emerald-600">{formatTime(presenca.checkin_at)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Check-out</p>
                  {presenca.checkout_at ? (
                    <p className="text-xl font-bold text-destructive">{formatTime(presenca.checkout_at)}</p>
                  ) : (
                    <div>
                      <p className="text-xl font-bold text-amber-500">--:--</p>
                      <p className="text-[10px] text-amber-500 font-medium">Não registrado</p>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Duração</p>
                  <p className="text-xl font-bold">{duracao ? formatDuracao(duracao) : '--'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Saldo (12h)</p>
                  {duracao !== null ? (
                    <p className={cn(
                      "text-xl font-bold",
                      (duracao - 720) > 0 ? "text-emerald-600" : (duracao - 720) < 0 ? "text-destructive" : ""
                    )}>
                      {(duracao - 720) > 0 ? '+' : ''}{Math.floor((duracao - 720) / 60)}h {Math.abs(Math.round((duracao - 720) % 60))}m
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground">--</p>
                  )}
                </div>
              </div>
              
              {presenca.observacao_checkout && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">{presenca.observacao_checkout}</p>
                </div>
              )}
            </div>

            {/* Seção: Veículos Utilizados */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Car className="h-4 w-4" />
                Veículos Utilizados
              </h3>
              
              {veiculosUtilizados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum veículo registrado nas viagens do dia
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Placa</th>
                        <th className="text-left px-3 py-2 font-medium">Tipo</th>
                        <th className="text-center px-3 py-2 font-medium">Período</th>
                        <th className="text-center px-3 py-2 font-medium">Viagens</th>
                        <th className="text-center px-3 py-2 font-medium">PAX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {veiculosUtilizados.map((veiculo) => (
                        <tr key={veiculo.placa} className="hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {veiculo.placa}
                            </code>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {veiculo.tipo === 'Ônibus' ? (
                                <Bus className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <Car className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                              <span>{veiculo.tipo}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-muted-foreground">
                              {veiculo.primeiraViagem.substring(0, 5) || '--:--'}
                            </span>
                            <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {veiculo.ultimaViagem.substring(0, 5) || '--:--'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-medium">{veiculo.totalViagens}</td>
                          <td className="px-3 py-2 text-center font-medium">{veiculo.totalPax}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Seção: Viagens do Dia */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Route className="h-4 w-4" />
                Viagens do Dia ({viagens.length})
                {totalPax > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    <Users className="h-3 w-3 mr-1" />
                    {totalPax} PAX total
                  </Badge>
                )}
              </h3>
              
              {viagens.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma viagem registrada neste dia
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Hora</th>
                        <th className="text-left px-3 py-2 font-medium">Rota</th>
                        <th className="text-left px-3 py-2 font-medium">Veículo</th>
                        <th className="text-center px-3 py-2 font-medium">PAX</th>
                        <th className="text-center px-3 py-2 font-medium">Tipo</th>
                        <th className="text-center px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viagens
                        .sort((a, b) => (a.h_pickup || a.data_criacao).localeCompare(b.h_pickup || b.data_criacao))
                        .map((viagem) => (
                        <tr key={viagem.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">
                            {viagem.h_pickup?.substring(0, 5) || '--:--'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[120px]">{viagem.ponto_embarque || '-'}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[120px]">{viagem.ponto_desembarque || '-'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {(viagem.placa || viagem.veiculo?.placa) ? (
                              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                {viagem.placa || viagem.veiculo?.placa}
                              </code>
                            ) : '-'}
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
