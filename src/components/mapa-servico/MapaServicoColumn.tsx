import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { Missao } from '@/hooks/useMissoes';
import { MapaServicoCard } from './MapaServicoCard';
import { Badge } from '@/components/ui/badge';

interface MapaServicoColumnProps {
  id: string;
  title: string;
  motoristas: MotoristaComVeiculo[];
  missoesPorMotorista: Map<string, Missao>;
  onChamarBase: (motorista: MotoristaComVeiculo) => void;
  isSpecial?: boolean;
  color?: string;
}

export function MapaServicoColumn({
  id,
  title,
  motoristas,
  missoesPorMotorista,
  onChamarBase,
  isSpecial,
  color,
}: MapaServicoColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-muted/30 min-w-[300px] max-w-[360px] w-[320px] shrink-0",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 border-b border-border rounded-t-xl",
        color || "bg-muted/50"
      )}>
        <span className="text-sm font-semibold text-foreground truncate">{title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">
          {motoristas.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto min-h-[80px] max-h-[calc(100vh-14rem)]">
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
