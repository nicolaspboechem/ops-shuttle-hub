import { Bus, Target, LayoutGrid } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type TipoOperacaoFiltro = 'todos' | 'shuttle' | 'missao';

interface OperationTabsProps {
  value: TipoOperacaoFiltro;
  onChange: (value: TipoOperacaoFiltro) => void;
  contadores: {
    shuttle: number;
    missao: number;
  };
  tiposHabilitados?: string[] | null;
  className?: string;
}

const SPECIFIC_TYPES: TipoOperacaoFiltro[] = ['missao', 'shuttle'];

export function OperationTabs({ value, onChange, contadores, tiposHabilitados, className }: OperationTabsProps) {
  const tiposEspecificos = tiposHabilitados?.length
    ? SPECIFIC_TYPES.filter(t => tiposHabilitados.includes(t))
    : SPECIFIC_TYPES;

  if (tiposEspecificos.length <= 1) return null;

  const tipos: TipoOperacaoFiltro[] = ['todos', ...tiposEspecificos];

  if (!tipos.includes(value)) {
    setTimeout(() => onChange('todos'), 0);
  }

  const totalGeral = contadores.shuttle + contadores.missao;
  const cols = tipos.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TipoOperacaoFiltro)} className={className}>
      <TabsList className={cn("grid h-auto p-1", cols)}>
        <TabsTrigger 
          value="todos" 
          className={cn(
            "gap-1.5 py-2.5",
            "data-[state=active]:bg-blue-500 data-[state=active]:text-blue-950"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">Geral</span>
          <span className="text-xs opacity-75">({totalGeral})</span>
        </TabsTrigger>
        {tiposEspecificos.includes('missao') && (
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
        {tiposEspecificos.includes('shuttle') && (
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
