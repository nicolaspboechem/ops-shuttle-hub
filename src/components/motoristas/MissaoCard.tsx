import { Missao, MissaoPrioridade } from '@/hooks/useMissoes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, Clock, MoreVertical, Pencil, Trash2, User, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MissaoCardProps {
  missao: Missao;
  motoristaNome?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
}

const prioridadeConfig: Record<MissaoPrioridade, { label: string; className: string }> = {
  baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
  alta: { label: 'Alta', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  urgente: { label: 'Urgente', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  aceita: { label: 'Aceita', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  em_andamento: { label: 'Em Andamento', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  concluida: { label: 'Concluída', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function MissaoCard({ missao, motoristaNome, onEdit, onDelete, onStatusChange }: MissaoCardProps) {
  const prioridade = prioridadeConfig[missao.prioridade];
  const status = statusConfig[missao.status];
  const displayNome = motoristaNome || missao.motorista_nome || 'Não atribuído';

  return (
    <Card className={cn(
      "transition-all",
      missao.prioridade === 'urgente' && "border-destructive/50",
      missao.prioridade === 'alta' && "border-amber-500/50",
      missao.status === 'em_andamento' && "bg-amber-500/5",
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={prioridade.className}>
              {prioridade.label}
            </Badge>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onStatusChange && missao.status !== 'concluida' && (
                <DropdownMenuItem onClick={() => onStatusChange('concluida')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como Concluída
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

        {/* Título e Descrição */}
        <h4 className="font-semibold mb-1">{missao.titulo}</h4>
        {missao.descricao && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{missao.descricao}</p>
        )}

        {/* Motorista */}
        <div className="flex items-center gap-2 text-sm mb-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{displayNome}</span>
        </div>

        {/* Pontos */}
        {(missao.ponto_embarque || missao.ponto_desembarque) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {missao.ponto_embarque}
              {missao.ponto_embarque && missao.ponto_desembarque && ' → '}
              {missao.ponto_desembarque}
            </span>
          </div>
        )}

        {/* Horário */}
        {missao.horario_previsto && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Previsto: {missao.horario_previsto.slice(0, 5)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
