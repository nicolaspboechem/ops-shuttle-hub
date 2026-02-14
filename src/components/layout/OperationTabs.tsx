import { Car, Bus, Target } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type TipoOperacaoFiltro = 'transfer' | 'shuttle' | 'missao';

interface OperationTabsProps {
  value: TipoOperacaoFiltro;
  onChange: (value: TipoOperacaoFiltro) => void;
  contadores: {
    transfer: number;
    shuttle: number;
    missao: number;
  };
  className?: string;
}

export function OperationTabs({ value, onChange, contadores, className }: OperationTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TipoOperacaoFiltro)} className={className}>
      <TabsList className="grid grid-cols-3 h-auto p-1">
        <TabsTrigger 
          value="transfer" 
          className={cn(
            "gap-1.5 py-2.5",
            "data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950"
          )}
        >
          <Car className="w-4 h-4" />
          <span className="hidden sm:inline">Transfer</span>
          <span className="text-xs opacity-75">({contadores.transfer})</span>
        </TabsTrigger>
        <TabsTrigger 
          value="shuttle" 
          className={cn(
            "gap-1.5 py-2.5",
            "data-[state=active]:bg-emerald-500 data-[state=active]:text-emerald-950"
          )}
        >
          <Bus className="w-4 h-4" />
          <span className="hidden sm:inline">Shuttle</span>
          <span className="text-xs opacity-75">({contadores.shuttle})</span>
        </TabsTrigger>
        <TabsTrigger 
          value="missao" 
          className={cn(
            "gap-1.5 py-2.5",
            "data-[state=active]:bg-purple-500 data-[state=active]:text-purple-950"
          )}
        >
          <Target className="w-4 h-4" />
          <span className="hidden sm:inline">Missão</span>
          <span className="text-xs opacity-75">({contadores.missao})</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
