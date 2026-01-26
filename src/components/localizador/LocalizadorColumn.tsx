import { MapPin, Navigation, Users, Car, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocalizadorCard } from './LocalizadorCard';
import { LocalizadorVeiculoCard } from './LocalizadorVeiculoCard';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { VeiculoComRota } from '@/hooks/useLocalizadorVeiculos';
import { ScrollArea } from '@/components/ui/scroll-area';

type ViewMode = 'motoristas' | 'veiculos';

interface LocalizadorColumnProps {
  titulo: string;
  motoristas?: MotoristaComVeiculo[];
  veiculos?: VeiculoComRota[];
  tipo: 'local' | 'em_transito' | 'sem_local' | 'em_rota' | 'sem_motorista';
  viewMode?: ViewMode;
}

const columnConfig = {
  local: {
    icon: MapPin,
    headerClass: 'bg-primary/20 border-primary/30',
    iconClass: 'text-primary',
    badgeClass: 'bg-primary text-primary-foreground',
  },
  em_transito: {
    icon: Navigation,
    headerClass: 'bg-blue-500/20 border-blue-500/30',
    iconClass: 'text-blue-500',
    badgeClass: 'bg-blue-500 text-white',
  },
  em_rota: {
    icon: Navigation,
    headerClass: 'bg-blue-500/20 border-blue-500/30',
    iconClass: 'text-blue-500',
    badgeClass: 'bg-blue-500 text-white',
  },
  sem_local: {
    icon: Users,
    headerClass: 'bg-muted/50 border-border',
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground',
  },
  sem_motorista: {
    icon: AlertTriangle,
    headerClass: 'bg-amber-500/20 border-amber-500/30',
    iconClass: 'text-amber-500',
    badgeClass: 'bg-amber-500 text-white',
  },
};

export function LocalizadorColumn({ 
  titulo, 
  motoristas = [], 
  veiculos = [],
  tipo,
  viewMode = 'motoristas'
}: LocalizadorColumnProps) {
  const config = columnConfig[tipo];
  const Icon = viewMode === 'veiculos' && tipo === 'local' ? Car : config.icon;
  const count = viewMode === 'veiculos' ? veiculos.length : motoristas.length;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] h-full">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 rounded-t-xl border",
        config.headerClass
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", config.iconClass)} />
          <span className="font-bold text-base uppercase tracking-wide text-foreground">
            {titulo}
          </span>
        </div>
        <div className={cn(
          "flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full font-bold text-lg",
          config.badgeClass
        )}>
          {count}
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 border-x border-b border-border/50 rounded-b-xl bg-background/30">
        <div className="p-3 space-y-3">
          {count === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {viewMode === 'veiculos' ? 'Nenhum veículo' : 'Nenhum motorista'}
            </div>
          ) : viewMode === 'veiculos' ? (
            veiculos.map(veiculo => (
              <LocalizadorVeiculoCard key={veiculo.id} veiculo={veiculo} />
            ))
          ) : (
            motoristas.map(motorista => (
              <LocalizadorCard key={motorista.id} motorista={motorista} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
