import { MapPin, Navigation, MapPinOff, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocalizadorCard } from './LocalizadorCard';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LocalizadorColumnProps {
  titulo: string;
  motoristas: MotoristaComVeiculo[];
  tipo: 'local' | 'em_transito' | 'sem_local' | 'retornando_base' | 'outros';
  isFixed?: boolean;
  missoesPorMotorista?: Map<string, { status: string; ponto_embarque?: string; ponto_desembarque?: string }>;
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
  sem_local: {
    icon: MapPinOff,
    headerClass: 'bg-muted/50 border-border',
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground',
  },
  retornando_base: {
    icon: Home,
    headerClass: 'bg-amber-500/20 border-amber-500/30',
    iconClass: 'text-amber-500',
    badgeClass: 'bg-amber-500 text-white',
  },
  outros: {
    icon: MapPinOff,
    headerClass: 'bg-purple-500/20 border-purple-500/30',
    iconClass: 'text-purple-500',
    badgeClass: 'bg-purple-500 text-white',
  },
};

export function LocalizadorColumn({ 
  titulo, 
  motoristas,
  tipo,
  isFixed,
  missoesPorMotorista
}: LocalizadorColumnProps) {
  const config = columnConfig[tipo];
  const Icon = config.icon;
  const count = motoristas.length;

  return (
    <div className={cn(
      "flex flex-col min-w-[260px] max-w-[300px] h-full",
      isFixed && "border-2 border-dashed border-primary/30"
    )}>
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
        <div className="p-3 space-y-2">
          {count === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum motorista
            </div>
          ) : (
            motoristas.map(motorista => (
              <LocalizadorCard key={motorista.id} motorista={motorista} missao={missoesPorMotorista?.get(motorista.id)} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
