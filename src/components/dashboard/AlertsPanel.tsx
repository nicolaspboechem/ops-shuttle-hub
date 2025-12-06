import { AlertTriangle, AlertCircle, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertaViagem } from '@/lib/types/viagem';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  criticos: AlertaViagem[];
  alertas: AlertaViagem[];
}

function AlertItem({ alerta }: { alerta: AlertaViagem }) {
  const isCritical = alerta.status === 'critico';
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg transition-colors",
      isCritical ? "bg-status-critical-bg" : "bg-status-alert-bg"
    )}>
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
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground truncate">
            {alerta.viagem.motorista}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            {alerta.viagem.placa}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            +{Math.round(alerta.diferenca)} min
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {alerta.viagem.ponto_embarque}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AlertsPanel({ criticos, alertas }: AlertsPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Alertas Críticos */}
      <Card className="border-status-critical/20 bg-status-critical-bg/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-status-critical" />
            Alertas Críticos
            <Badge className="ml-auto bg-status-critical text-status-critical-foreground">
              {criticos.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {criticos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum alerta crítico no momento
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
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="w-5 h-5 text-status-alert" />
            Alertas
            <Badge className="ml-auto bg-status-alert text-status-alert-foreground">
              {alertas.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {alertas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum alerta no momento
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
