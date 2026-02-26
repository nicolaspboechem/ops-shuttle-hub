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
  tiposHabilitados?: string[] | null;
  className?: string;
}

const ALL_TYPES: TipoOperacaoFiltro[] = ['missao', 'transfer', 'shuttle'];

export function OperationTabs({ value, onChange, contadores, tiposHabilitados, className }: OperationTabsProps) {
  // Filter to only enabled types
  const tipos = tiposHabilitados?.length
    ? ALL_TYPES.filter(t => tiposHabilitados.includes(t))
    : ALL_TYPES;

  // If only 1 type enabled, don't render tabs
  if (tipos.length <= 1) return null;

  // If current value is not in enabled types, auto-select first
  if (!tipos.includes(value)) {
    // Use effect-free approach: call onChange on next tick
    setTimeout(() => onChange(tipos[0]), 0);
  }

  const cols = tipos.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TipoOperacaoFiltro)} className={className}>
      <TabsList className={cn("grid h-auto p-1", cols)}>
        {tipos.includes('missao') && (
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
        )}
        {tipos.includes('transfer') && (
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
        )}
        {tipos.includes('shuttle') && (
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
        )}
      </TabsList>
    </Tabs>
  );
}
