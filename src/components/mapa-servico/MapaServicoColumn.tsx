import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { Missao } from '@/hooks/useMissoes';
import { MapaServicoCard } from './MapaServicoCard';
import { Badge } from '@/components/ui/badge';
import { Home, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface MapaServicoColumnProps {
  id: string;
  title: string;
  motoristas: MotoristaComVeiculo[];
  missoesPorMotorista: Map<string, Missao>;
  onChamarBase: (motorista: MotoristaComVeiculo) => void;
  isSpecial?: boolean;
  isFixed?: boolean;
  color?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function MapaServicoColumn({
  id,
  title,
  motoristas,
  missoesPorMotorista,
  onChamarBase,
  isSpecial,
  isFixed,
  color,
  collapsed,
  onToggleCollapse,
}: MapaServicoColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const FixedIcon = id === 'retornando_base' ? Home : MapPin;

  // Collapsed view
  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col items-center rounded-xl border bg-muted/30 shrink-0 w-[48px] min-w-[48px] cursor-pointer transition-all",
          isFixed ? "border-2 border-dashed border-primary/30" : "border-border",
          isOver && "ring-2 ring-primary/50 bg-primary/5"
        )}
        onClick={onToggleCollapse}
      >
        <div className={cn(
          "flex items-center justify-center w-full py-2 border-b border-border rounded-t-xl",
          color || "bg-muted/50"
        )}>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-center gap-2 py-3 flex-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {motoristas.length}
          </Badge>
          <span className="text-[10px] font-semibold text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
            {title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border bg-muted/30 shrink-0",
        isFixed
          ? "border-2 border-dashed border-primary/30 w-[200px] min-w-[160px]"
          : "border-border min-w-[300px] max-w-[360px] w-[320px]",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 border-b border-border rounded-t-xl",
        color || "bg-muted/50"
      )}>
        {isFixed && <FixedIcon className="w-4 h-4 text-primary shrink-0" />}
        <span className={cn("font-semibold text-foreground truncate", isFixed ? "text-xs" : "text-sm")}>{title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">
          {motoristas.length}
        </Badge>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-0.5 rounded hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Recolher coluna"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto min-h-[80px] flex-1">
        {motoristas.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6 italic">
            Nenhum motorista
          </div>
        ) : (
          motoristas.map(m => (
            <MapaServicoCard
              key={m.id}
              motorista={m}
              missao={missoesPorMotorista.get(m.id) || null}
              onChamarBase={onChamarBase}
            />
          ))
        )}
      </div>
    </div>
  );
}
