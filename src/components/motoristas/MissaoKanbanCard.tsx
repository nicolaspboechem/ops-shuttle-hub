import { useDraggable } from '@dnd-kit/core';
import { Missao, MissaoPrioridade } from '@/hooks/useMissoes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, Clock, MoreVertical, Pencil, Trash2, User, CheckCircle, XCircle, Calendar, Play, Users, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissaoKanbanCardProps {
  missao: Missao;
  motoristaNome?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  isDragOverlay?: boolean;
}

const prioridadeConfig: Record<MissaoPrioridade, { label: string; className: string }> = {
  baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
  alta: { label: 'Alta', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  urgente: { label: 'Urgente', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function MissaoKanbanCard({ missao, motoristaNome, onEdit, onDelete, onStatusChange, isDragOverlay }: MissaoKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: missao.id,
    data: { missao },
    disabled: isDragOverlay,
  });

  const prioridade = prioridadeConfig[missao.prioridade];
  const displayNome = motoristaNome || missao.motorista_nome || 'Não atribuído';

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isDragOverlay ? { ...listeners, ...attributes } : {})}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md flex flex-col gap-2 select-none",
        isDragging && "opacity-40",
        isDragOverlay && "shadow-xl ring-2 ring-primary/50",
        missao.prioridade === 'urgente' && "border-destructive/50",
        missao.prioridade === 'alta' && "border-amber-500/50",
      )}
    >
      {/* Header: Priority + Actions */}
      <div className="flex items-center justify-between gap-1">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", prioridade.className)}>
          {prioridade.label}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {onStatusChange && missao.status === 'pendente' && (
              <DropdownMenuItem onClick={() => onStatusChange('aceita')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aceitar
              </DropdownMenuItem>
            )}
            {onStatusChange && missao.status === 'aceita' && (
              <DropdownMenuItem onClick={() => onStatusChange('em_andamento')}>
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </DropdownMenuItem>
            )}
            {onStatusChange && missao.status !== 'concluida' && (
              <DropdownMenuItem onClick={() => onStatusChange('concluida')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir
              </DropdownMenuItem>
            )}
            {onStatusChange && missao.status !== 'cancelada' && (
              <DropdownMenuItem onClick={() => onStatusChange('cancelada')} className="text-destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm leading-tight break-words">{missao.titulo}</h4>

      {/* Driver */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <User className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-medium text-foreground">{displayNome}</span>
      </div>

      {/* Vehicle */}
      {(missao.veiculo_nome || missao.veiculo_placa) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Car className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {missao.veiculo_nome && <span className="font-medium text-foreground">{missao.veiculo_nome}</span>}
            {missao.veiculo_nome && missao.veiculo_placa && ' - '}
            {missao.veiculo_placa}
          </span>
        </div>
      )}

      {/* Route */}
      {(missao.ponto_embarque || missao.ponto_desembarque) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {missao.ponto_embarque}
            {missao.ponto_embarque && missao.ponto_desembarque && ' → '}
            {missao.ponto_desembarque}
          </span>
        </div>
      )}

      {/* Footer: Time + PAX + Date */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
        {missao.horario_previsto && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{missao.horario_previsto.slice(0, 5)}</span>
          </div>
        )}
        {missao.qtd_pax > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{missao.qtd_pax}</span>
          </div>
        )}
        {missao.data_programada && (
          <div className="flex items-center gap-1 ml-auto">
            <Calendar className="h-3 w-3" />
            <span>
              {missao.data_programada === new Date().toISOString().slice(0, 10)
                ? 'Hoje'
                : missao.data_programada.split('-').reverse().slice(0, 2).join('/')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
