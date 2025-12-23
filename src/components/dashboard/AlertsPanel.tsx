import { AlertTriangle, AlertCircle, Clock, MapPin, User, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertaViagem } from '@/lib/types/viagem';
import { cn } from '@/lib/utils';

// Constantes de tempo para alertas (baseado nas configurações)
const TEMPO_ALERTA = 15; // minutos acima da média para alerta
const TEMPO_CRITICO = 25; // minutos acima da média para crítico

interface AlertsPanelProps {
  criticos: AlertaViagem[];
  alertas: AlertaViagem[];
}

function AlertItem({ alerta }: { alerta: AlertaViagem }) {
  const isCritical = alerta.status === 'critico';
  const tempoExcedido = Math.round(alerta.diferenca);
  
  // Mensagem descritiva baseada no tempo configurado
  const getMensagem = () => {
    if (isCritical) {
      return `Excedeu ${tempoExcedido} min acima da média (limite: +${TEMPO_CRITICO} min)`;
    }
    return `Excedeu ${tempoExcedido} min acima da média (limite: +${TEMPO_ALERTA} min)`;
  };
  
  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 rounded-lg transition-colors",
      isCritical ? "bg-status-critical-bg" : "bg-status-alert-bg"
    )}>
      {/* Header com ícone e motorista */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
          isCritical ? "bg-status-critical text-status-critical-foreground" : "bg-status-alert text-status-alert-foreground"
        )}>
          {isCritical ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">
              {alerta.viagem.motorista}
            </span>
            <Badge variant="outline" className="text-xs shrink-0">
              {alerta.viagem.placa}
            </Badge>
          </div>
          
          {/* Mensagem de alerta descritiva */}
          <p className={cn(
            "text-xs mt-1 font-medium",
            isCritical ? "text-status-critical" : "text-status-alert"
          )}>
            {getMensagem()}
          </p>
        </div>
      </div>
      
      {/* Detalhes da viagem */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground ml-11">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Em viagem há {Math.round(alerta.tempoReal)} min
        </span>
        {alerta.viagem.ponto_embarque && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {alerta.viagem.ponto_embarque}
          </span>
        )}
        {alerta.viagem.qtd_pax && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {alerta.viagem.qtd_pax} PAX
          </span>
        )}
      </div>
    </div>
  );
}

export function AlertsPanel({ criticos, alertas }: AlertsPanelProps) {
  const totalAlertas = criticos.length + alertas.length;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Alertas Críticos */}
      <Card className="border-status-critical/20 bg-status-critical-bg/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-status-critical" />
            <span className="hidden sm:inline">Alertas Críticos</span>
            <span className="sm:hidden">Críticos</span>
            <Badge className="ml-auto bg-status-critical text-status-critical-foreground text-xs">
              {criticos.length}
            </Badge>
          </CardTitle>
          {criticos.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Viagens +{TEMPO_CRITICO} min acima da média do motorista
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {criticos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum alerta crítico
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {criticos.map(alerta => (
                <AlertItem key={alerta.viagemId} alerta={alerta} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card className="border-status-alert/20 bg-status-alert-bg/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-status-alert" />
            Alertas
            <Badge className="ml-auto bg-status-alert text-status-alert-foreground text-xs">
              {alertas.length}
            </Badge>
          </CardTitle>
          {alertas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Viagens +{TEMPO_ALERTA} min acima da média do motorista
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {alertas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum alerta
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alertas.map(alerta => (
                <AlertItem key={alerta.viagemId} alerta={alerta} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
