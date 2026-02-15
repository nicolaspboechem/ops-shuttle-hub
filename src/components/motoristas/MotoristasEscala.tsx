import { useState, useMemo } from 'react';
import { Plus, GripVertical, Trash2, Clock, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useEscalas, Escala } from '@/hooks/useEscalas';
import { Motorista } from '@/hooks/useCadastros';
import { CreateEscalaWizard } from './CreateEscalaWizard';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MotoristasEscalaProps {
  eventoId: string;
  motoristas: Motorista[];
  getPresenca: (motoristaId: string) => { checkin_at?: string | null; checkout_at?: string | null } | null;
}

function MotoristaEscalaCard({
  motorista,
  presenca,
  isDragging,
}: {
  motorista: Motorista;
  presenca: { checkin_at?: string | null; checkout_at?: string | null } | null;
  isDragging?: boolean;
}) {
  const statusColor = presenca?.checkout_at
    ? 'bg-red-500'
    : presenca?.checkin_at
    ? 'bg-green-500'
    : 'bg-muted-foreground/40';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-primary/30 opacity-80'
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0 cursor-grab" />
      <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', statusColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{motorista.nome}</p>
        {motorista.telefone && (
          <p className="text-xs text-muted-foreground">{motorista.telefone}</p>
        )}
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {presenca?.checkout_at ? 'Saiu' : presenca?.checkin_at ? 'Ativo' : 'Sem check-in'}
      </Badge>
    </div>
  );
}

function EscalaPanel({
  escalas,
  selectedEscalaId,
  onSelectEscala,
  motoristas,
  motoristaIds,
  getPresenca,
  onDelete,
  onRemoveMotorista,
  panelLabel,
}: {
  escalas: Escala[];
  selectedEscalaId: string | null;
  onSelectEscala: (id: string) => void;
  motoristas: Motorista[];
  motoristaIds: string[];
  getPresenca: MotoristasEscalaProps['getPresenca'];
  onDelete: (id: string) => void;
  onRemoveMotorista: (escalaId: string, motoristaId: string) => void;
  panelLabel: string;
}) {
  const selectedEscala = escalas.find(e => e.id === selectedEscalaId);
  const panelMotoristas = motoristas.filter(m => motoristaIds.includes(m.id));

  // Counts by status
  const ativos = panelMotoristas.filter(m => {
    const p = getPresenca(m.id);
    return p?.checkin_at && !p?.checkout_at;
  }).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Select value={selectedEscalaId || ''} onValueChange={onSelectEscala}>
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder={`Selecionar escala (${panelLabel})`} />
            </SelectTrigger>
            <SelectContent>
              {escalas.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome} ({e.horario_inicio?.slice(0, 5)} - {e.horario_fim?.slice(0, 5)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEscalaId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir escala?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A escala "{selectedEscala?.nome}" será desativada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(selectedEscalaId)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {selectedEscala && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {selectedEscala.horario_inicio?.slice(0, 5)} - {selectedEscala.horario_fim?.slice(0, 5)}
            </span>
            <span>{panelMotoristas.length} motoristas</span>
            <span className="text-green-600 font-medium">{ativos} ativos</span>
          </div>
        )}
      </div>

      {/* Droppable area */}
      <div
        className="flex-1 overflow-auto p-3 space-y-2"
        data-escala-id={selectedEscalaId || ''}
      >
        {!selectedEscalaId ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <Clock className="w-8 h-8 opacity-30" />
            <p>Selecione uma escala</p>
          </div>
        ) : panelMotoristas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <p>Nenhum motorista nesta escala</p>
          </div>
        ) : (
          panelMotoristas.map(m => (
            <div key={m.id} className="group relative" data-motorista-id={m.id} data-escala-source={selectedEscalaId}>
              <MotoristaEscalaCard
                motorista={m}
                presenca={getPresenca(m.id)}
              />
              <button
                onClick={() => onRemoveMotorista(selectedEscalaId, m.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
                title="Remover da escala"
              >
                <UserMinus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function MotoristasEscala({ eventoId, motoristas, getPresenca }: MotoristasEscalaProps) {
  const {
    escalas,
    loading,
    createEscala,
    deleteEscala,
    moveMotorista,
    removeMotoristaFromEscala,
    getMotoristasByEscala,
    getEscalaByMotorista,
  } = useEscalas(eventoId);

  const [showWizard, setShowWizard] = useState(false);
  const [leftEscalaId, setLeftEscalaId] = useState<string | null>(null);
  const [rightEscalaId, setRightEscalaId] = useState<string | null>(null);
  const [draggedMotoristaId, setDraggedMotoristaId] = useState<string | null>(null);

  // Auto-select first two escalas
  useMemo(() => {
    if (escalas.length > 0 && !leftEscalaId) {
      setLeftEscalaId(escalas[0]?.id || null);
    }
    if (escalas.length > 1 && !rightEscalaId) {
      setRightEscalaId(escalas[1]?.id || null);
    }
  }, [escalas]);

  const leftMotoristaIds = leftEscalaId ? getMotoristasByEscala(leftEscalaId).map(em => em.motorista_id) : [];
  const rightMotoristaIds = rightEscalaId ? getMotoristasByEscala(rightEscalaId).map(em => em.motorista_id) : [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedMotoristaId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedMotoristaId(null);

    if (!over || !active) return;

    const motoristaId = active.id as string;
    const targetEscalaId = over.id as string;

    // Find source escala
    const sourceEscalaId = leftMotoristaIds.includes(motoristaId)
      ? leftEscalaId
      : rightMotoristaIds.includes(motoristaId)
      ? rightEscalaId
      : null;

    if (!sourceEscalaId || sourceEscalaId === targetEscalaId) return;

    await moveMotorista(motoristaId, sourceEscalaId, targetEscalaId);
  };

  const handleDeleteEscala = async (escalaId: string) => {
    await deleteEscala(escalaId);
    if (leftEscalaId === escalaId) setLeftEscalaId(null);
    if (rightEscalaId === escalaId) setRightEscalaId(null);
  };

  const draggedMotorista = draggedMotoristaId ? motoristas.find(m => m.id === draggedMotoristaId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando escalas...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Escalas de Turno</h2>
          <p className="text-sm text-muted-foreground">
            {escalas.length} escala{escalas.length !== 1 ? 's' : ''} cadastrada{escalas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nova Escala
        </Button>
      </div>

      {escalas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Clock className="w-12 h-12 opacity-20" />
          <p>Nenhuma escala cadastrada</p>
          <Button variant="outline" onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Criar primeira escala
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={50} minSize={30}>
                <EscalaPanel
                  escalas={escalas}
                  selectedEscalaId={leftEscalaId}
                  onSelectEscala={setLeftEscalaId}
                  motoristas={motoristas}
                  motoristaIds={leftMotoristaIds}
                  getPresenca={getPresenca}
                  onDelete={handleDeleteEscala}
                  onRemoveMotorista={removeMotoristaFromEscala}
                  panelLabel="Esquerda"
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={50} minSize={30}>
                <EscalaPanel
                  escalas={escalas}
                  selectedEscalaId={rightEscalaId}
                  onSelectEscala={setRightEscalaId}
                  motoristas={motoristas}
                  motoristaIds={rightMotoristaIds}
                  getPresenca={getPresenca}
                  onDelete={handleDeleteEscala}
                  onRemoveMotorista={removeMotoristaFromEscala}
                  panelLabel="Direita"
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          <DragOverlay>
            {draggedMotorista && (
              <MotoristaEscalaCard
                motorista={draggedMotorista}
                presenca={getPresenca(draggedMotorista.id)}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <CreateEscalaWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        motoristas={motoristas}
        escalasExistentes={escalas}
        getEscalaByMotorista={getEscalaByMotorista}
        onSubmit={createEscala}
      />
    </div>
  );
}
