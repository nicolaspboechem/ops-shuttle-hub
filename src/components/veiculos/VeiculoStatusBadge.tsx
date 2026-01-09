import { CheckCircle, Loader, AlertTriangle, Wrench, Fuel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type VeiculoStatus = string | null | undefined;

interface VeiculoStatusBadgeProps {
  status: VeiculoStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  liberado: {
    label: 'Liberado',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20',
  },
  pendente: {
    label: 'Pendente',
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  },
  em_inspecao: {
    label: 'Em Inspeção',
    icon: Loader,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
  },
  manutencao: {
    label: 'Manutenção',
    icon: Wrench,
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
};

export function VeiculoStatusBadge({ status, size = 'md', showIcon = true }: VeiculoStatusBadgeProps) {
  const config = statusConfig[status || 'em_inspecao'] || statusConfig.em_inspecao;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        config.className,
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        size === 'md' && 'text-xs px-2 py-0.5'
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
      {config.label}
    </Badge>
  );
}

// Fuel level indicator
interface FuelIndicatorProps {
  level: string | null | undefined;
  size?: 'sm' | 'md';
}

const fuelLevels: Record<string, { label: string; percentage: number; color: string }> = {
  vazio: { label: 'Vazio', percentage: 0, color: 'bg-destructive' },
  '1/4': { label: '1/4', percentage: 25, color: 'bg-amber-500' },
  '1/2': { label: '1/2', percentage: 50, color: 'bg-amber-500' },
  '3/4': { label: '3/4', percentage: 75, color: 'bg-emerald-500' },
  cheio: { label: 'Cheio', percentage: 100, color: 'bg-emerald-500' },
};

export function FuelIndicator({ level, size = 'md' }: FuelIndicatorProps) {
  if (!level) return null;
  
  const config = fuelLevels[level] || fuelLevels['1/2'];
  
  return (
    <div className={cn('flex items-center gap-1', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
      <Fuel className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3', 'text-muted-foreground')} />
      <div className={cn('rounded-full bg-muted overflow-hidden', size === 'sm' ? 'w-8 h-1.5' : 'w-10 h-2')}>
        <div
          className={cn('h-full transition-all', config.color)}
          style={{ width: `${config.percentage}%` }}
        />
      </div>
      <span className="text-muted-foreground">{config.label}</span>
    </div>
  );
}

// Avaria indicator
interface AvariaIndicatorProps {
  hasAvarias: boolean | null | undefined;
  size?: 'sm' | 'md';
}

export function AvariaIndicator({ hasAvarias, size = 'md' }: AvariaIndicatorProps) {
  if (!hasAvarias) return null;
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-destructive/10 text-destructive border-destructive/20',
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        size === 'md' && 'text-xs px-2 py-0.5'
      )}
    >
      <AlertTriangle className={cn('mr-1', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      Avarias
    </Badge>
  );
}
