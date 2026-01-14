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
  XCircle,
  AlertTriangle,
  Eye
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

interface MotoristaAuditoriaCardProps {
  motorista: MotoristaPresencaAgregado;
  viagens: Viagem[];
  isOpen?: boolean;
  onToggle?: () => void;
}

export function MotoristaAuditoriaCard({ 
  motorista, 
  viagens,
  isOpen = false,
  onToggle
}: MotoristaAuditoriaCardProps) {
  const [selectedPresenca, setSelectedPresenca] = useState<PresencaHistorico | null>(null);
  
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  };

  const calcularDuracaoDia = (presenca: PresencaHistorico): number | null => {
    if (!presenca.checkin_at || !presenca.checkout_at) return null;
    return differenceInMinutes(
      parseISO(presenca.checkout_at),
      parseISO(presenca.checkin_at)
    );
  };

  // Viagens do motorista
  const viagensMotorista = useMemo(() => {
    return viagens.filter(v => v.motorista === motorista.motorista_nome);
  }, [viagens, motorista.motorista_nome]);

  // Viagens por dia
  const viagensPorDia = useMemo(() => {
    const map: Record<string, { total: number; pax: number }> = {};
    viagensMotorista.forEach(v => {
      const data = v.data_criacao.split('T')[0];
      if (!map[data]) {
        map[data] = { total: 0, pax: 0 };
      }
      map[data].total++;
      map[data].pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
    });
    return map;
  }, [viagensMotorista]);

  // Viagens filtradas por dia específico
  const getViagensDoDia = (data: string) => {
    return viagensMotorista.filter(v => v.data_criacao.startsWith(data));
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig = {
      disponivel: { label: 'Disponível', variant: 'default' as const, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      em_viagem: { label: 'Em Viagem', variant: 'default' as const, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      indisponivel: { label: 'Indisponível', variant: 'secondary' as const, className: '' },
      inativo: { label: 'Inativo', variant: 'outline' as const, className: 'text-muted-foreground' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disponivel;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const totalViagens = viagensMotorista.length;
  const totalPax = viagensMotorista.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);

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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {motorista.telefone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {motorista.telefone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-sm hidden sm:block">
                  <p className="font-medium">{motorista.totalDias} dias</p>
                  <p className="text-muted-foreground">{formatDuracao(motorista.tempoTotalTrabalhado)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(motorista.motorista_status)}
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </div>

            {/* Stats resumido */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{motorista.totalDias}</p>
                <p className="text-xs text-muted-foreground">Dias</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{totalViagens}</p>
                <p className="text-xs text-muted-foreground">Viagens</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{totalPax}</p>
                <p className="text-xs text-muted-foreground">PAX</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{motorista.diasComObservacao}</p>
                <p className="text-xs text-muted-foreground">Obs.</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-2 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Histórico de Presenças
            </h4>

            {motorista.presencas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum registro de presença encontrado
              </p>
            ) : (
              <div className="space-y-2">
                {motorista.presencas.map((presenca) => {
                  const duracao = calcularDuracaoDia(presenca);
                  const viagensDia = viagensPorDia[presenca.data] || { total: 0, pax: 0 };
                  
                  return (
                    <div 
                      key={presenca.id} 
                      className="p-3 rounded-lg bg-muted/30 border space-y-2"
                    >
                      {/* Header do dia */}
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {format(parseISO(presenca.data), "EEEE, dd/MM", { locale: ptBR })}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {presenca.checkout_at ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : presenca.checkin_at ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          {duracao && (
                            <span className="text-sm font-medium">
                              {formatDuracao(duracao)}
                            </span>
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
                          <span className="font-medium">{formatTime(presenca.checkout_at)}</span>
                        </div>
                        {presenca.veiculo && (
                          <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                            <Car className="h-3.5 w-3.5 text-primary" />
                            <span className="font-mono text-xs">
                              {presenca.veiculo.placa}
                            </span>
                          </div>
                        )}
                        {viagensDia.total > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Route className="h-3.5 w-3.5 text-primary" />
                            <span>{viagensDia.total} viagens</span>
                            <span className="text-muted-foreground">({viagensDia.pax} PAX)</span>
                          </div>
                        )}
                      </div>

                      {/* Observação */}
                      {presenca.observacao_checkout && (
                        <div className="flex items-start gap-2 pt-2 border-t mt-2">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            {presenca.observacao_checkout}
                          </p>
                        </div>
                      )}

                      {/* Botão destacado para ver detalhes */}
                      <div className="flex justify-end pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="gap-1.5 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedPresenca(presenca); 
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Detalhes
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

      {/* Modal de detalhes do dia */}
      <PresencaDiaModal
        presenca={selectedPresenca}
        viagens={selectedPresenca ? getViagensDoDia(selectedPresenca.data) : []}
        motoristaNome={motorista.motorista_nome}
        isOpen={!!selectedPresenca}
        onClose={() => setSelectedPresenca(null)}
      />
    </Collapsible>
  );
}
