import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Map as MapIcon, RefreshCw } from 'lucide-react';

import { EventLayout } from '@/components/layout/EventLayout';
import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { useMissoes } from '@/hooks/useMissoes';
import { MapaServicoColumn } from '@/components/mapa-servico/MapaServicoColumn';
import { MapaServicoCard } from '@/components/mapa-servico/MapaServicoCard';
import { ChamarBaseModal } from '@/components/mapa-servico/ChamarBaseModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function MapaServico() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { motoristas, motoristasPorLocalizacao, localizacoes, loading, refetch } = useLocalizadorMotoristas(eventoId);
  const { missoesAtivas, createMissao } = useMissoes(eventoId);

  const [activeMotorista, setActiveMotorista] = useState<MotoristaComVeiculo | null>(null);
  const [chamarBaseMotorista, setChamarBaseMotorista] = useState<MotoristaComVeiculo | null>(null);
  const [baseNome, setBaseNome] = useState('Base');
  const [outrosNome, setOutrosNome] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch base point name and "Outros" point name
  useEffect(() => {
    if (!eventoId) return;
    supabase
      .from('pontos_embarque')
      .select('nome, eh_base')
      .eq('evento_id', eventoId)
      .then(({ data }) => {
        if (!data) return;
        const base = data.find(p => p.eh_base);
        if (base) setBaseNome(base.nome);
        const outros = data.find(p => p.nome.toLowerCase().includes('outros'));
        if (outros) setOutrosNome(outros.nome);
      });
  }, [eventoId]);

  // Map active missions per driver (most recent active one)
  const missoesPorMotorista = useMemo(() => {
    const map = new Map<string, typeof missoesAtivas[number]>();
    missoesAtivas.forEach(m => {
      const existing = map.get(m.motorista_id);
      if (!existing || m.status === 'em_andamento' || (m.status === 'aceita' && existing.status === 'pendente')) {
        map.set(m.motorista_id, m);
      }
    });
    return map;
  }, [missoesAtivas]);

  // Identify drivers returning to base (mission with destination = base name)
  const retornandoBaseIds = useMemo(() => {
    const ids = new Set<string>();
    missoesPorMotorista.forEach((missao, motoristaId) => {
      if (
        missao.ponto_desembarque === baseNome &&
        ['pendente', 'aceita', 'em_andamento'].includes(missao.status)
      ) {
        ids.add(motoristaId);
      }
    });
    return ids;
  }, [missoesPorMotorista, baseNome]);

  // Build separated driver groups: dynamic vs fixed
  const { dynamicMotoristas, retornandoBaseMotoristas, outrosMotoristas } = useMemo(() => {
    const retornando: MotoristaComVeiculo[] = [];
    const outros: MotoristaComVeiculo[] = [];
    const dynamicGroups: Record<string, MotoristaComVeiculo[]> = {};

    // Initialize dynamic groups from motoristasPorLocalizacao
    Object.entries(motoristasPorLocalizacao).forEach(([loc, drivers]) => {
      drivers.forEach(m => {
        // Retornando pra base has priority
        if (retornandoBaseIds.has(m.id)) {
          retornando.push(m);
        }
        // Outros column (if point exists)
        else if (outrosNome && m.ultima_localizacao === outrosNome && m.status !== 'em_viagem') {
          outros.push(m);
        }
        // Dynamic column
        else {
          if (!dynamicGroups[loc]) dynamicGroups[loc] = [];
          dynamicGroups[loc].push(m);
        }
      });
    });

    return {
      dynamicMotoristas: dynamicGroups,
      retornandoBaseMotoristas: retornando,
      outrosMotoristas: outros,
    };
  }, [motoristasPorLocalizacao, retornandoBaseIds, outrosNome]);

  // Build dynamic columns (excluding "Outros" location from dynamic if it's fixed)
  const dynamicColumns = useMemo(() => {
    const cols: { id: string; title: string; isSpecial?: boolean; color?: string }[] = [];

    // Em Trânsito
    cols.push({ id: 'em_transito', title: 'Em Trânsito', isSpecial: true, color: 'bg-blue-500/10' });

    // Location columns (exclude "Outros" if it exists as fixed)
    localizacoes.forEach(loc => {
      if (outrosNome && loc === outrosNome) return; // skip, it's fixed
      cols.push({ id: loc, title: loc });
    });

    // Sem Local
    cols.push({ id: 'sem_local', title: 'Sem Local', isSpecial: true, color: 'bg-muted/60' });

    return cols;
  }, [localizacoes, outrosNome]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const m = event.active.data.current?.motorista as MotoristaComVeiculo;
    setActiveMotorista(m || null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveMotorista(null);
    const { active, over } = event;
    if (!over) return;

    const motorista = active.data.current?.motorista as MotoristaComVeiculo;
    const destino = over.id as string;

    // Can't drag to em_transito or retornando_base
    if (destino === 'em_transito') {
      toast.error('Não é possível mover manualmente para Em Trânsito');
      return;
    }
    if (destino === 'retornando_base') {
      toast.error('Use "Chamar para Base" para mover para esta coluna');
      return;
    }

    // Determine new location value
    const novaLocalizacao = destino === 'sem_local' ? null : 
      (destino === 'outros_fixo' && outrosNome) ? outrosNome : destino;

    // Skip if same location
    const locAtual = motorista.status === 'em_viagem' ? 'em_transito' : (motorista.ultima_localizacao || 'sem_local');
    if (locAtual === destino) return;

    const { error } = await supabase
      .from('motoristas')
      .update({
        ultima_localizacao: novaLocalizacao,
        ultima_localizacao_at: new Date().toISOString(),
        status: 'disponivel',
      })
      .eq('id', motorista.id);

    if (error) {
      toast.error('Erro ao atualizar localização');
    } else {
      const destinoLabel = destino === 'sem_local' ? 'Sem Local' : 
        (destino === 'outros_fixo' ? 'Outros' : destino);
      toast.success(`${motorista.nome} movido para ${destinoLabel}`);
    }
  }, [outrosNome]);

  const handleChamarBase = useCallback(async () => {
    if (!chamarBaseMotorista || !eventoId) return;

    await createMissao({
      motorista_id: chamarBaseMotorista.id,
      titulo: 'Retorno à Base',
      ponto_embarque: chamarBaseMotorista.ultima_localizacao || 'Local atual',
      ponto_desembarque: baseNome,
      prioridade: 'normal',
    });

    setChamarBaseMotorista(null);
  }, [chamarBaseMotorista, eventoId, createMissao, baseNome]);

  const totalAtivos = motoristas.length;

  return (
    <EventLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <MapIcon className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Mapa de Serviço</h1>
          <span className="text-sm text-muted-foreground">
            {totalAtivos} motorista{totalAtivos !== 1 ? 's' : ''} ativo{totalAtivos !== 1 ? 's' : ''}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={refetch}>
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {/* Kanban */}
        {loading ? (
          <div className="flex gap-4 p-4 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="min-w-[300px] h-[400px] rounded-xl" />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-1 min-h-0">
              {/* Dynamic columns - scrollable */}
              <div className="flex gap-3 p-4 overflow-x-auto flex-1 min-h-0">
                {dynamicColumns.map(col => (
                  <MapaServicoColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    motoristas={dynamicMotoristas[col.id] || []}
                    missoesPorMotorista={missoesPorMotorista}
                    onChamarBase={m => setChamarBaseMotorista(m)}
                    isSpecial={col.isSpecial}
                    color={col.color}
                  />
                ))}
              </div>

              {/* Separator */}
              <div className="w-px bg-border shrink-0" />

              {/* Fixed columns - always visible */}
              <div className="flex gap-3 p-4 shrink-0 bg-muted/20">
                <MapaServicoColumn
                  id="retornando_base"
                  title={`Retornando pra ${baseNome}`}
                  motoristas={retornandoBaseMotoristas}
                  missoesPorMotorista={missoesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isFixed
                  color="bg-amber-500/10"
                />
                {outrosNome && (
                  <MapaServicoColumn
                    id="outros_fixo"
                    title="Outros"
                    motoristas={outrosMotoristas}
                    missoesPorMotorista={missoesPorMotorista}
                    onChamarBase={m => setChamarBaseMotorista(m)}
                    isFixed
                    color="bg-purple-500/10"
                  />
                )}
              </div>
            </div>

            <DragOverlay>
              {activeMotorista ? (
                <MapaServicoCard
                  motorista={activeMotorista}
                  missao={missoesPorMotorista.get(activeMotorista.id) || null}
                  onChamarBase={() => {}}
                  isDragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <ChamarBaseModal
        open={!!chamarBaseMotorista}
        onOpenChange={open => !open && setChamarBaseMotorista(null)}
        motorista={chamarBaseMotorista}
        baseNome={baseNome}
        onConfirm={handleChamarBase}
      />
    </EventLayout>
  );
}
