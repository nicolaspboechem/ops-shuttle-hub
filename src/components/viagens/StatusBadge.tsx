import { CheckCircle, AlertCircle, AlertTriangle, Clock, XCircle, CalendarClock, Play, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusViagem, StatusViagemOperacao } from '@/lib/types/viagem';
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

// ---- Operation Status Badge (novo) ----

const operationStatusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  agendado: {
    label: 'Agendado',
    icon: CalendarClock,
    className: 'bg-muted text-muted-foreground border-muted-foreground/20'
  },
  em_andamento: {
    label: 'Em Andamento',
    icon: Play,
    className: 'bg-primary/10 text-primary border-primary/20 animate-pulse-soft'
  },
  aguardando_retorno: {
    label: 'Aguardando',
    icon: Pause,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  },
  encerrado: {
    label: 'Encerrada',
    icon: CheckCircle,
    className: 'bg-status-ok-bg text-status-ok border-status-ok/20'
  },
  cancelado: {
    label: 'Cancelada',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20'
  },
};

interface OperationStatusBadgeProps {
  status: StatusViagemOperacao | string | null | undefined;
}

export function OperationStatusBadge({ status }: OperationStatusBadgeProps) {
  const config = operationStatusConfig[status || 'agendado'] || operationStatusConfig.agendado;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
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
