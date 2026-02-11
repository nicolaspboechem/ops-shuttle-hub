import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Car, Bus, ArrowRight, Home, Pencil, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { Missao } from '@/hooks/useMissoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MapaServicoCardProps {
  motorista: MotoristaComVeiculo;
  missao?: Missao | null;
  onChamarBase: (motorista: MotoristaComVeiculo) => void;
  isDragOverlay?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; textColor: string }> = {
  disponivel: { label: 'Disponível', color: 'bg-green-500', textColor: 'text-green-400' },
  em_viagem: { label: 'Em Viagem', color: 'bg-blue-500', textColor: 'text-blue-400' },
  indisponivel: { label: 'Indisponível', color: 'bg-red-500', textColor: 'text-red-400' },
  inativo: { label: 'Inativo', color: 'bg-gray-500', textColor: 'text-gray-400' },
};

const missaoStatusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Missão Pendente', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  aceita: { label: 'Missão Aceita', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  em_andamento: { label: 'Em Andamento', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
};

function isBackup(veiculo: MotoristaComVeiculo['veiculo']): boolean {
  return !!veiculo?.observacoes_gerais?.includes('[BACKUP]');
}

export function MapaServicoCard({ motorista, missao, onChamarBase, isDragOverlay }: MapaServicoCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: motorista.id,
    data: { motorista },
    disabled: isDragOverlay,
  });

  const status = statusConfig[motorista.status as string] || statusConfig.inativo;
  const VeiculoIcon = motorista.veiculo?.tipo_veiculo === 'Ônibus' ? Bus : Car;
  const hasVeiculo = !!motorista.veiculo;
  const backup = hasVeiculo && isBackup(motorista.veiculo);

  const [editingObs, setEditingObs] = useState(false);
  const [obsValue, setObsValue] = useState(motorista.observacao || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingObs && inputRef.current) inputRef.current.focus();
  }, [editingObs]);

  const tempoNoLocal = motorista.ultima_localizacao_at
    ? formatDistanceToNow(new Date(motorista.ultima_localizacao_at), { locale: ptBR, addSuffix: false })
    : null;

  const handleSaveObs = async () => {
    setEditingObs(false);
    if (obsValue === (motorista.observacao || '')) return;
    const { error } = await supabase.from('motoristas').update({ observacao: obsValue || null }).eq('id', motorista.id);
    if (error) toast.error('Erro ao salvar observação');
  };

  const handleToggleBackup = async () => {
    if (!motorista.veiculo) return;
    const current = motorista.veiculo.observacoes_gerais || '';
    const newVal = backup
      ? current.replace('[BACKUP]', '').trim()
      : `[BACKUP] ${current}`.trim();
    const { error } = await supabase.from('veiculos').update({ observacoes_gerais: newVal || null }).eq('id', motorista.veiculo.id);
    if (error) toast.error('Erro ao atualizar backup');
  };

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  const activeMissaoStatus = missao ? missaoStatusConfig[missao.status] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isDragOverlay ? { ...listeners, ...attributes } : {})}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md flex flex-col gap-1.5 select-none",
        isDragging && "opacity-40",
        isDragOverlay && "shadow-xl ring-2 ring-primary/50"
      )}
    >
      {/* Row 1: Status + tempo */}
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full shrink-0", status.color)} />
        <span className={cn("text-xs font-medium", status.textColor)}>{status.label}</span>
        {tempoNoLocal && motorista.status !== 'em_viagem' && (
          <span className="text-xs text-muted-foreground ml-auto">há {tempoNoLocal}</span>
        )}
      </div>

      {/* Row 2: Nome */}
      <span className="font-bold text-sm text-foreground leading-tight truncate">{motorista.nome}</span>

      {/* Row 3: Veículo + Backup */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <VeiculoIcon className="w-3.5 h-3.5 shrink-0" />
        {hasVeiculo ? (
          <>
            <span className="text-xs font-medium text-foreground truncate">
              {motorista.veiculo?.nome || motorista.veiculo?.placa}
            </span>
            {motorista.veiculo?.nome && motorista.veiculo?.placa && (
              <span className="text-[10px] text-muted-foreground">• {motorista.veiculo.placa}</span>
            )}
          </>
        ) : (
          <span className="text-xs italic opacity-50">Sem veículo</span>
        )}
        {backup && (
          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-orange-500/50 text-orange-400 bg-orange-500/10">
            BACKUP
          </Badge>
        )}
      </div>

      {/* Row 4: Missão badge */}
      {activeMissaoStatus && (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", activeMissaoStatus.className)}>
            {activeMissaoStatus.label}
          </Badge>
          {missao?.status === 'em_andamento' && missao.ponto_embarque && missao.ponto_desembarque && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
              {missao.ponto_embarque} <ArrowRight className="w-2.5 h-2.5 inline" /> {missao.ponto_desembarque}
            </span>
          )}
        </div>
      )}

      {/* Row 5: Trajeto em trânsito */}
      {motorista.status === 'em_viagem' && motorista.viagem_destino && !activeMissaoStatus && (
        <div className="flex items-center gap-1 text-[10px] text-blue-400 flex-wrap">
          {motorista.viagem_origem && <span>{motorista.viagem_origem}</span>}
          <ArrowRight className="w-2.5 h-2.5 shrink-0" />
          <span className="font-medium">{motorista.viagem_destino}</span>
        </div>
      )}

      {/* Row 6: Observação editável */}
      <div className="min-h-[20px]">
        {editingObs ? (
          <Input
            ref={inputRef}
            value={obsValue}
            onChange={e => setObsValue(e.target.value)}
            onBlur={handleSaveObs}
            onKeyDown={e => e.key === 'Enter' && handleSaveObs()}
            className="h-6 text-[10px] px-1.5 bg-muted"
            placeholder="Observação..."
            onPointerDown={e => e.stopPropagation()}
          />
        ) : (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground italic w-full text-left truncate"
            onClick={e => { e.stopPropagation(); setEditingObs(true); }}
            onPointerDown={e => e.stopPropagation()}
          >
            {motorista.observacao || 'Adicionar obs...'}
          </button>
        )}
      </div>

      {/* Row 7: Actions */}
      <div className="flex items-center gap-1 pt-0.5 border-t border-border/50">
        {motorista.status !== 'em_viagem' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 gap-1 text-muted-foreground hover:text-foreground"
            onClick={e => { e.stopPropagation(); onChamarBase(motorista); }}
            onPointerDown={e => e.stopPropagation()}
          >
            <Home className="w-3 h-3" /> Base
          </Button>
        )}
        {hasVeiculo && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 text-[10px] px-2 gap-1 ml-auto",
              backup ? "text-orange-400 hover:text-orange-300" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={e => { e.stopPropagation(); handleToggleBackup(); }}
            onPointerDown={e => e.stopPropagation()}
          >
            <Shield className="w-3 h-3" /> {backup ? 'Remover Backup' : 'Backup'}
          </Button>
        )}
      </div>
    </div>
  );
}
