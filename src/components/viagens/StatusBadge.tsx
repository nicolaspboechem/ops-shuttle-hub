import { CheckCircle, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusViagem } from '@/lib/types/viagem';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: StatusViagem;
  showLabel?: boolean;
}

const statusConfig = {
  ok: {
    label: 'OK',
    icon: CheckCircle,
    className: 'bg-status-ok-bg text-status-ok border-status-ok/20'
  },
  alerta: {
    label: 'Alerta',
    icon: AlertCircle,
    className: 'bg-status-alert-bg text-status-alert border-status-alert/20'
  },
  critico: {
    label: 'Crítico',
    icon: AlertTriangle,
    className: 'bg-status-critical-bg text-status-critical border-status-critical/20'
  }
};

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.className)}>
      <Icon className="w-3 h-3" />
      {showLabel && config.label}
    </Badge>
  );
}

interface TripStatusBadgeProps {
  hChegada: string | null;
  hRetorno: string | null;
  encerrado: boolean;
}

export function TripStatusBadge({ hChegada, hRetorno, encerrado }: TripStatusBadgeProps) {
  if (encerrado) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20 gap-1">
        <CheckCircle className="w-3 h-3" />
        Encerrada
      </Badge>
    );
  }

  if (hRetorno) {
    return (
      <Badge variant="outline" className="bg-status-ok-bg text-status-ok border-status-ok/20 gap-1">
        <CheckCircle className="w-3 h-3" />
        Retornou
      </Badge>
    );
  }

  if (hChegada) {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1">
        <Clock className="w-3 h-3" />
        Aguardando
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-status-alert-bg text-status-alert border-status-alert/20 gap-1 animate-pulse-soft">
      <Clock className="w-3 h-3" />
      Em trânsito
    </Badge>
  );
}
