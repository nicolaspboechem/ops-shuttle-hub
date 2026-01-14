import { Veiculo } from '@/hooks/useCadastros';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Car, 
  Bus, 
  MoreVertical, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wrench,
  Camera,
  Fuel,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwipeableCard } from './SwipeableCard';

interface VeiculoCardSupervisorProps {
  veiculo: Veiculo;
  onStatusChange: (id: string, status: string) => void;
  onReInspecao: (veiculo: Veiculo) => void;
}

const statusConfig = {
  liberado: {
    label: 'Liberado',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  pendente: {
    label: 'Pendente',
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
  em_inspecao: {
    label: 'Em Inspeção',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  manutencao: {
    label: 'Manutenção',
    icon: Wrench,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-muted',
  },
};

const fuelLabels: Record<string, string> = {
  'vazio': 'Vazio',
  '1/4': '1/4',
  '1/2': '1/2',
  '3/4': '3/4',
  'cheio': 'Cheio',
};

export function VeiculoCardSupervisor({
  veiculo,
  onStatusChange,
  onReInspecao,
}: VeiculoCardSupervisorProps) {
  const status = statusConfig[veiculo.status as keyof typeof statusConfig] || statusConfig.em_inspecao;
  const StatusIcon = status.icon;

  const VehicleIcon = veiculo.tipo_veiculo === 'Ônibus' || veiculo.tipo_veiculo === 'Van' ? Bus : Car;

  // Swipe actions based on current status
  const getSwipeActions = () => {
    // Swipe right to liberate (if not already liberado)
    const rightAction = veiculo.status !== 'liberado' ? {
      icon: <CheckCircle2 className="h-6 w-6" />,
      label: 'Liberar',
      color: 'text-white',
      bgColor: 'bg-emerald-600',
      action: () => onStatusChange(veiculo.id, 'liberado'),
    } : undefined;

    // Swipe left to mark pending (if not already pendente)
    const leftAction = veiculo.status !== 'pendente' ? {
      icon: <AlertTriangle className="h-6 w-6" />,
      label: 'Pendente',
      color: 'text-white',
      bgColor: 'bg-destructive',
      action: () => onStatusChange(veiculo.id, 'pendente'),
    } : undefined;

    return { leftAction, rightAction };
  };

  const swipeActions = getSwipeActions();

  return (
    <SwipeableCard
      leftAction={swipeActions.leftAction}
      rightAction={swipeActions.rightAction}
    >
      <Card className={cn('transition-all', status.border, status.bg)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Vehicle Icon */}
            <div className={cn(
              'flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center',
              status.bg
            )}>
              <VehicleIcon className={cn('h-6 w-6', status.color)} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{veiculo.nome || veiculo.placa}</span>
                {veiculo.nome && (
                  <span className="text-xs text-muted-foreground">
                    {veiculo.placa}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{veiculo.tipo_veiculo}</span>
                {veiculo.capacidade && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {veiculo.capacidade}
                  </span>
                )}
                {veiculo.nivel_combustivel && (
                  <span className="flex items-center gap-1">
                    <Fuel className="h-3 w-3" />
                    {fuelLabels[veiculo.nivel_combustivel] || veiculo.nivel_combustivel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn('text-xs gap-1', status.color, status.border)}
                >
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
                {veiculo.possui_avarias && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Avarias
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions dropdown (alternative to swipe) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onReInspecao(veiculo)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Re-vistoriar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {veiculo.status !== 'liberado' && (
                  <DropdownMenuItem onClick={() => onStatusChange(veiculo.id, 'liberado')}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                    Liberar
                  </DropdownMenuItem>
                )}
                {veiculo.status !== 'pendente' && (
                  <DropdownMenuItem onClick={() => onStatusChange(veiculo.id, 'pendente')}>
                    <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                    Marcar Pendente
                  </DropdownMenuItem>
                )}
                {veiculo.status !== 'manutencao' && (
                  <DropdownMenuItem onClick={() => onStatusChange(veiculo.id, 'manutencao')}>
                    <Wrench className="h-4 w-4 mr-2" />
                    Enviar Manutenção
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </SwipeableCard>
  );
}
