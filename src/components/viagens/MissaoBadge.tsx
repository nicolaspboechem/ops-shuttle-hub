import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClipboardList, Clock, MapPin, User, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Missao, MissaoPrioridade } from '@/hooks/useMissoes';
import { cn } from '@/lib/utils';

interface MissaoBadgeProps {
  missaoId: string | null | undefined;
  compact?: boolean;
}

const prioridadeConfig: Record<MissaoPrioridade, { label: string; className: string }> = {
  baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
  alta: { label: 'Alta', className: 'bg-amber-500/10 text-amber-600' },
  urgente: { label: 'Urgente', className: 'bg-destructive/10 text-destructive' },
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export function MissaoBadge({ missaoId, compact = false }: MissaoBadgeProps) {
  const [missao, setMissao] = useState<Missao | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!missaoId) return;

    const fetchMissao = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('missoes')
        .select(`
          *,
          motorista:motoristas(nome)
        `)
        .eq('id', missaoId)
        .single();

      if (!error && data) {
        setMissao({
          ...data,
          motorista_nome: data.motorista?.nome,
        } as unknown as Missao);
      }
      setLoading(false);
    };

    fetchMissao();
  }, [missaoId]);

  if (!missaoId) return null;
  if (loading) return <Badge variant="outline" className="animate-pulse">...</Badge>;
  if (!missao) return null;

  const prioridade = prioridadeConfig[missao.prioridade];

  if (compact) {
    return (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1">
        <ClipboardList className="h-3 w-3" />
        Missão
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">
          <ClipboardList className="h-3 w-3" />
          <span className="text-xs">Missão</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{missao.titulo}</h4>
                <p className="text-xs text-muted-foreground">{statusLabels[missao.status]}</p>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-xs", prioridade.className)}>
              {prioridade.label}
            </Badge>
          </div>

          {/* Descrição */}
          {missao.descricao && (
            <p className="text-xs text-muted-foreground">{missao.descricao}</p>
          )}

          {/* Detalhes */}
          <div className="space-y-2 text-xs">
            {missao.motorista_nome && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Motorista: <strong>{missao.motorista_nome}</strong></span>
              </div>
            )}
            
            {(missao.ponto_embarque || missao.ponto_desembarque) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {missao.ponto_embarque}
                  {missao.ponto_embarque && missao.ponto_desembarque && ' → '}
                  {missao.ponto_desembarque}
                </span>
              </div>
            )}
            
            {missao.horario_previsto && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Previsto: <strong>{missao.horario_previsto.slice(0, 5)}</strong></span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1.5 pt-2 border-t text-xs text-muted-foreground">
            <Flag className="h-3 w-3" />
            <span>Criado em {new Date(missao.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
