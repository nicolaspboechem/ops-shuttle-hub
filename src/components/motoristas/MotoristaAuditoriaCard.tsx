import { useMemo, useState } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronDown, 
  Clock, 
  Car, 
  Route, 
  MessageSquare, 
  Phone,
  CheckCircle2,
  AlertTriangle,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { MotoristaPresencaAgregado, PresencaHistorico } from '@/hooks/useMotoristaPresencaHistorico';
import { Viagem } from '@/lib/types/viagem';
import { PresencaDiaModal } from './PresencaDiaModal';

const CARGA_HORARIA_MINUTOS = 720; // 12h

interface MotoristaAuditoriaCardProps {
  motorista: MotoristaPresencaAgregado;
  viagens: Viagem[];
  isOpen?: boolean;
  onToggle?: () => void;
}

interface TurnoGroup {
  data: string;
  turnoIndex: number;
  totalTurnos: number;
  presenca: PresencaHistorico;
}

function formatDuracaoHM(minutos: number): string {
  const h = Math.floor(Math.abs(minutos) / 60);
  const m = Math.round(Math.abs(minutos) % 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function formatSaldo(minutos: number): string {
  if (minutos === 0) return '0h';
  const sinal = minutos > 0 ? '+' : '-';
  return `${sinal}${formatDuracaoHM(minutos)}`;
}

export function MotoristaAuditoriaCard({ 
  motorista, 
  viagens,
  isOpen = false,
  onToggle
}: MotoristaAuditoriaCardProps) {
  const [selectedPresenca, setSelectedPresenca] = useState<PresencaHistorico | null>(null);
  const [selectedViagens, setSelectedViagens] = useState<Viagem[]>([]);
  
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  // Viagens do motorista
  const viagensMotorista = useMemo(() => {
    return viagens.filter(v => v.motorista === motorista.motorista_nome);
  }, [viagens, motorista.motorista_nome]);

  // Group presences by date and assign shift numbers
  const turnoGroups = useMemo((): TurnoGroup[] => {
    const byDate: Record<string, PresencaHistorico[]> = {};
    motorista.presencas.forEach(p => {
      if (!byDate[p.data]) byDate[p.data] = [];
      byDate[p.data].push(p);
    });

    Object.values(byDate).forEach(arr => {
      arr.sort((a, b) => {
        if (!a.checkin_at) return 1;
        if (!b.checkin_at) return -1;
        return a.checkin_at.localeCompare(b.checkin_at);
      });
    });

    const groups: TurnoGroup[] = [];
    const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
    
    for (const data of sortedDates) {
      const presencas = byDate[data];
      presencas.forEach((p, idx) => {
        groups.push({
          data,
          turnoIndex: idx + 1,
          totalTurnos: presencas.length,
          presenca: p,
        });
      });
    }

    return groups;
  }, [motorista.presencas]);

  // Get trips for a specific shift
  const getViagensTurno = (presenca: PresencaHistorico): Viagem[] => {
    if (!presenca.checkin_at) return [];
    
    const checkinTime = new Date(presenca.checkin_at).getTime();
    // Quando checkout é null, NÃO usar Date.now() - filtrar apenas por checkin
    const checkoutTime = presenca.checkout_at 
      ? new Date(presenca.checkout_at).getTime() 
      : null;

    return viagensMotorista.filter(v => {
      const viagemTime = new Date(v.data_criacao).getTime();
      if (checkoutTime) {
        return viagemTime >= checkinTime && viagemTime <= checkoutTime;
      }
      return viagemTime >= checkinTime;
    });
  };

  // Saldo color helper
  const getSaldoColor = (saldoMin: number) => {
    if (saldoMin > 0) return 'text-emerald-600';
    if (saldoMin < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getSaldoBg = (saldoMin: number) => {
    if (saldoMin > 0) return 'bg-emerald-500/10';
    if (saldoMin < 0) return 'bg-destructive/10';
    return 'bg-muted/50';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={cn(
        "transition-all duration-200",
        isOpen && "ring-1 ring-primary/20"
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {motorista.motorista_nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium">{motorista.motorista_nome}</h3>
                  {motorista.telefone && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {motorista.telefone}
                    </span>
                  )}
                </div>
              </div>

              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>

            {/* Métricas de horas - foco total em HORAS e SALDO */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">
                  {formatDuracaoHM(motorista.horasTrabalhadasMinutos)}
                </p>
                <p className="text-xs text-muted-foreground">Total Horas</p>
              </div>
              <div className="text-center">
                <p className={cn("text-lg font-bold", getSaldoColor(motorista.saldoMinutos))}>
                  {formatSaldo(motorista.saldoMinutos)}
                </p>
                <p className="text-xs text-muted-foreground">Saldo</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{motorista.turnosCompletos}</p>
                <p className="text-xs text-muted-foreground">Completos</p>
              </div>
              <div className="text-center">
                {motorista.turnosIncompletos > 0 ? (
                  <p className="text-lg font-bold text-amber-500">{motorista.turnosIncompletos}</p>
                ) : (
                  <p className="text-lg font-bold text-muted-foreground">0</p>
                )}
                <p className="text-xs text-muted-foreground">Incompletos</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-2 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Histórico de Turnos
            </h4>

            {turnoGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum registro de presença encontrado
              </p>
            ) : (
              <div className="space-y-2">
                {turnoGroups.map(({ data, turnoIndex, totalTurnos, presenca }) => {
                  const isCompleto = !!(presenca.checkin_at && presenca.checkout_at);
                  const duracaoMin = isCompleto
                    ? differenceInMinutes(parseISO(presenca.checkout_at!), parseISO(presenca.checkin_at!))
                    : null;
                  const saldoTurno = duracaoMin !== null ? duracaoMin - CARGA_HORARIA_MINUTOS : null;
                  const viagensTurno = getViagensTurno(presenca);
                  const paxTurno = viagensTurno.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);
                  
                  return (
                    <div 
                      key={presenca.id} 
                      className={cn(
                        "p-3 rounded-lg border space-y-2",
                        !isCompleto ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/30"
                      )}
                    >
                      {/* Header do dia + turno */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {format(parseISO(data), "EEEE, dd/MM", { locale: ptBR })}
                          </span>
                          {totalTurnos > 1 && (
                            <Badge variant="outline" className="text-xs font-medium px-1.5 py-0">
                              {turnoIndex}º Turno
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!isCompleto ? (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              SEM CHECKOUT
                            </Badge>
                          ) : saldoTurno !== null && saldoTurno > 0 ? (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              EXTRA {formatSaldo(saldoTurno)}
                            </Badge>
                          ) : saldoTurno !== null && saldoTurno < 0 ? (
                            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              DÉBITO {formatSaldo(saldoTurno)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Minus className="h-3 w-3 mr-1" />
                              12h
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Detalhes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-muted-foreground">In:</span>
                          <span className="font-medium">{formatTime(presenca.checkin_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-muted-foreground">Out:</span>
                          <span className={cn("font-medium", !presenca.checkout_at && "text-amber-500")}>
                            {formatTime(presenca.checkout_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span className="text-muted-foreground">Dur:</span>
                          <span className="font-medium">
                            {duracaoMin !== null ? formatDuracaoHM(duracaoMin) : '--'}
                          </span>
                        </div>
                        {presenca.veiculo && (
                          <div className="flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-primary" />
                            <span className="font-mono text-xs">
                              {presenca.veiculo.placa}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Viagens do turno */}
                      {viagensTurno.length > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Route className="h-3.5 w-3.5" />
                          <span>{viagensTurno.length} viagens</span>
                          <span>({paxTurno} PAX)</span>
                        </div>
                      )}

                      {/* Observação */}
                      {presenca.observacao_checkout && (
                        <div className="flex items-start gap-2 pt-2 border-t mt-2">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            {presenca.observacao_checkout}
                          </p>
                        </div>
                      )}

                      {/* Botão detalhes */}
                      <div className="flex justify-end pt-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedPresenca(presenca);
                            setSelectedViagens(viagensTurno);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>

      <PresencaDiaModal
        presenca={selectedPresenca}
        viagens={selectedViagens}
        motoristaNome={motorista.motorista_nome}
        isOpen={!!selectedPresenca}
        onClose={() => { setSelectedPresenca(null); setSelectedViagens([]); }}
      />
    </Collapsible>
  );
}
