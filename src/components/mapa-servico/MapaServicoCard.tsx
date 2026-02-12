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
  disponivel: { label: 'Disponível', color: 'bg-green-500', textColor: 'text-green-500' },
  missao_pendente: { label: 'Missão Pendente', color: 'bg-amber-500', textColor: 'text-amber-500' },
  missao_aceita: { label: 'Missão Aceita', color: 'bg-blue-500', textColor: 'text-blue-500' },
  em_transito: { label: 'Em Trânsito', color: 'bg-blue-600 animate-pulse', textColor: 'text-blue-400' },
  indisponivel: { label: 'Indisponível', color: 'bg-red-500', textColor: 'text-red-500' },
  inativo: { label: 'Inativo', color: 'bg-gray-500', textColor: 'text-gray-400' },
};

function getDisplayStatus(motorista: MotoristaComVeiculo, missao?: Missao | null) {
  if (motorista.status === 'indisponivel') return 'indisponivel';
  if (motorista.status === 'em_viagem') return 'em_transito';
  if (missao?.status === 'em_andamento') return 'em_transito';
  if (missao?.status === 'aceita') return 'missao_aceita';
  if (missao?.status === 'pendente') return 'missao_pendente';
  return 'disponivel';
}

function isBackup(veiculo: MotoristaComVeiculo['veiculo']): boolean {
  return !!veiculo?.observacoes_gerais?.includes('[BACKUP]');
}

export function MapaServicoCard({ motorista, missao, onChamarBase, isDragOverlay }: MapaServicoCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: motorista.id,
    data: { motorista },
    disabled: isDragOverlay,
  });

  const derivedStatus = getDisplayStatus(motorista, missao);
  const status = statusConfig[derivedStatus] || statusConfig.inativo;
  const VeiculoIcon = motorista.veiculo?.tipo_veiculo === 'Ônibus' ? Bus : Car;
  const hasVeiculo = !!motorista.veiculo;
  const backup = hasVeiculo && isBackup(motorista.veiculo);

  const [optimisticBackup, setOptimisticBackup] = useState<boolean | null>(null);
  const [editingObs, setEditingObs] = useState(false);
  const [obsValue, setObsValue] = useState(motorista.observacao || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset optimistic state when real data arrives
  useEffect(() => {
    setOptimisticBackup(null);
  }, [motorista.veiculo?.observacoes_gerais]);

  const isBackupActive = optimisticBackup ?? backup;

  // Sync obsValue with prop when not editing (realtime/refresh updates)
  useEffect(() => {
    if (!editingObs) {
      setObsValue(motorista.observacao || '');
    }
  }, [motorista.observacao, editingObs]);

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
    const newValue = !isBackupActive;
    setOptimisticBackup(newValue);
    const current = motorista.veiculo.observacoes_gerais || '';
    const newVal = isBackupActive
      ? current.replace('[BACKUP]', '').trim()
      : `[BACKUP] ${current}`.trim();
    const { error } = await supabase.from('veiculos').update({ observacoes_gerais: newVal || null }).eq('id', motorista.veiculo.id);
    if (error) {
      toast.error('Erro ao atualizar backup');
      setOptimisticBackup(null);
    }
  };

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  const showMissaoRoute = missao?.ponto_embarque && missao?.ponto_desembarque;

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
        {tempoNoLocal && derivedStatus === 'disponivel' && (
          <span className="text-xs text-muted-foreground ml-auto">há {tempoNoLocal}</span>
        )}
      </div>

      {/* Row 2: Nome */}
      <span className="font-bold text-sm text-foreground leading-tight truncate">{motorista.nome}</span>

      {/* Row 3: Veículo + Backup - ALWAYS visible */}
      <div className="flex items-center gap-1.5 bg-muted/40 rounded px-1.5 py-0.5">
        <VeiculoIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
        {hasVeiculo ? (
          <>
            <span className="text-xs font-semibold text-foreground truncate">
              {motorista.veiculo?.nome || motorista.veiculo?.placa}
            </span>
            {motorista.veiculo?.nome && motorista.veiculo?.placa && (
              <span className="text-[10px] font-medium text-muted-foreground">• {motorista.veiculo.placa}</span>
            )}
          </>
        ) : (
          <span className="text-xs italic text-muted-foreground">Sem veículo</span>
        )}
        {isBackupActive && (
          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-orange-500/50 text-orange-400 bg-orange-500/10">
            BACKUP
          </Badge>
        )}
      </div>

      {/* Row 4: Mission route */}
      {showMissaoRoute && (
        <div className="flex items-center gap-1 text-[10px] text-blue-400 flex-wrap">
          <span>{missao.ponto_embarque}</span>
          <ArrowRight className="w-2.5 h-2.5 shrink-0" />
          <span className="font-medium">{missao.ponto_desembarque}</span>
        </div>
      )}

      {/* Row 5: Trajeto em trânsito (fallback when no mission route) */}
      {!showMissaoRoute && derivedStatus === 'em_transito' && motorista.viagem_destino && (
        <div className="flex items-center gap-1 text-[10px] text-blue-400 flex-wrap">
          {motorista.viagem_origem && <span>{motorista.viagem_origem}</span>}
          <ArrowRight className="w-2.5 h-2.5 shrink-0" />
          <span className="font-medium">{motorista.viagem_destino}</span>
        </div>
      )}

      {/* Row 6: Observação editável */}
      <div
        className="min-h-[20px]"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        {editingObs ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={obsValue}
              onChange={e => setObsValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveObs();
                }
                if (e.key === 'Escape') {
                  setObsValue(motorista.observacao || '');
                  setEditingObs(false);
                }
              }}
              className="h-6 text-[10px] px-1.5 bg-muted flex-1"
              placeholder="Observação..."
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-green-500 hover:text-green-400 shrink-0"
              onClick={handleSaveObs}
            >
              ✓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-400 shrink-0"
              onClick={() => {
                if (obsValue.trim()) {
                  setObsValue('');
                  // Save empty to clear
                  supabase.from('motoristas').update({ observacao: null }).eq('id', motorista.id)
                    .then(({ error }) => { if (error) toast.error('Erro ao apagar observação'); });
                }
                setEditingObs(false);
              }}
            >
              ✕
            </Button>
          </div>
        ) : (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground italic w-full text-left truncate"
            onClick={() => setEditingObs(true)}
          >
            {obsValue || 'Adicionar obs...'}
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
              isBackupActive ? "text-orange-400 hover:text-orange-300" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={e => { e.stopPropagation(); handleToggleBackup(); }}
            onPointerDown={e => e.stopPropagation()}
          >
            <Shield className="w-3 h-3" /> {isBackupActive ? 'Remover Backup' : 'Backup'}
          </Button>
        )}
      </div>
    </div>
  );
}
