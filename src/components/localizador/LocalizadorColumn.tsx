import { MapPin, Navigation, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocalizadorCard } from './LocalizadorCard';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LocalizadorColumnProps {
  titulo: string;
  motoristas: MotoristaComVeiculo[];
  tipo: 'local' | 'em_transito' | 'sem_local';
}

const columnConfig = {
  local: {
    icon: MapPin,
    headerClass: 'bg-primary/20 border-primary/30',
    iconClass: 'text-primary',
  },
  em_transito: {
    icon: Navigation,
    headerClass: 'bg-blue-500/20 border-blue-500/30',
    iconClass: 'text-blue-500',
  },
  sem_local: {
    icon: Users,
    headerClass: 'bg-muted/50 border-border',
    iconClass: 'text-muted-foreground',
  },
};

export function LocalizadorColumn({ titulo, motoristas, tipo }: LocalizadorColumnProps) {
  const config = columnConfig[tipo];
  const Icon = config.icon;

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
          tipo === 'em_transito' && "bg-blue-500 text-white",
          tipo === 'local' && "bg-primary text-primary-foreground",
          tipo === 'sem_local' && "bg-muted text-muted-foreground",
        )}>
          {motoristas.length}
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 border-x border-b border-border/50 rounded-b-xl bg-background/30">
        <div className="p-3 space-y-3">
          {motoristas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum motorista
            </div>
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
