import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Map as MapIcon, RefreshCw } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch base point name
  useEffect(() => {
    if (!eventoId) return;
    supabase
      .from('pontos_embarque')
      .select('nome')
      .eq('evento_id', eventoId)
      .eq('eh_base', true)
      .single()
      .then(({ data }) => {
        if (data) setBaseNome(data.nome);
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

  // Build ordered columns: special first, then locations
  const columns = useMemo(() => {
    const cols: { id: string; title: string; isSpecial?: boolean; color?: string }[] = [];
    
    // Em Trânsito
    cols.push({ id: 'em_transito', title: 'Em Trânsito', isSpecial: true, color: 'bg-blue-500/10' });
    
    // Location columns
    localizacoes.forEach(loc => {
      cols.push({ id: loc, title: loc });
    });

    // Sem Local
    cols.push({ id: 'sem_local', title: 'Sem Local', isSpecial: true, color: 'bg-muted/60' });

    return cols;
  }, [localizacoes]);

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

    // Can't drag to em_transito
    if (destino === 'em_transito') {
      toast.error('Não é possível mover manualmente para Em Trânsito');
      return;
    }

    // Determine new location value
    const novaLocalizacao = destino === 'sem_local' ? null : destino;
    
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
      toast.success(`${motorista.nome} movido para ${destino === 'sem_local' ? 'Sem Local' : destino}`);
    }
  }, []);

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

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <MapIcon className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Mapa de Serviço</h1>
          <span className="text-sm text-muted-foreground">
            {motoristas.length} motorista{motoristas.length !== 1 ? 's' : ''} ativo{motoristas.length !== 1 ? 's' : ''}
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
            <div className="flex gap-3 p-4 overflow-x-auto flex-1 min-h-0">
              {columns.map(col => (
                <MapaServicoColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  motoristas={motoristasPorLocalizacao[col.id] || []}
                  missoesPorMotorista={missoesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isSpecial={col.isSpecial}
                  color={col.color}
                />
              ))}
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
    </MainLayout>
  );
}
