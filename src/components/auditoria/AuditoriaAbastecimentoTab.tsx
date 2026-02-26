import { Fuel, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  alertasTotais: number;
  alertasResolvidos: number;
}

export function AuditoriaAbastecimentoTab({ alertasTotais, alertasResolvidos }: Props) {
  const alertasAbertos = alertasTotais - alertasResolvidos;
  const taxaResolucao = alertasTotais > 0 ? ((alertasResolvidos / alertasTotais) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Fuel className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alertasTotais}</p>
              <p className="text-xs text-muted-foreground">Alertas Emitidos</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-status-ok/10">
              <CheckCircle className="w-6 h-6 text-status-ok" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alertasResolvidos}</p>
              <p className="text-xs text-muted-foreground">Resolvidos</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-status-critical/10">
              <AlertTriangle className="w-6 h-6 text-status-critical" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alertasAbertos}</p>
              <p className="text-xs text-muted-foreground">Ainda Abertos</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-status-alert/10">
              <TrendingUp className="w-6 h-6 text-status-alert" />
            </div>
            <div>
              <p className="text-2xl font-bold">{taxaResolucao}%</p>
              <p className="text-xs text-muted-foreground">Taxa de Resolução</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
