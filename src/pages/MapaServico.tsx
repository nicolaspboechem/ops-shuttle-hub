import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { EventLayout } from '@/components/layout/EventLayout';
import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { useMissoes } from '@/hooks/useMissoes';
import { MapaServicoColumn } from '@/components/mapa-servico/MapaServicoColumn';
import { MapaServicoCard } from '@/components/mapa-servico/MapaServicoCard';
import { ChamarBaseModal } from '@/components/mapa-servico/ChamarBaseModal';
import { MapaServicoHeader, FilterState } from '@/components/mapa-servico/MapaServicoHeader';
import { MapaServicoScrollContainer } from '@/components/mapa-servico/MapaServicoScrollContainer';
import { Skeleton } from '@/components/ui/skeleton';

// --- Filter helper ---
function isBackup(m: MotoristaComVeiculo): boolean {
  return !!m.veiculo?.observacoes_gerais?.includes('[BACKUP]');
}

function applyFilters(drivers: MotoristaComVeiculo[], filters: FilterState): MotoristaComVeiculo[] {
  return drivers.filter(m => {
    // Search
    if (filters.deferredSearch) {
      const q = filters.deferredSearch.toLowerCase();
      const nameMatch = m.nome.toLowerCase().includes(q);
      const plateMatch = m.veiculo?.placa?.toLowerCase().includes(q);
      if (!nameMatch && !plateMatch) return false;
    }
    // Status filters (if any active)
    if (filters.statusFilters.size > 0 && !filters.statusFilters.has(m.status || '')) {
      return false;
    }
    // Backup only
    if (filters.backupOnly && !isBackup(m)) return false;
    // Sem veiculo
    if (filters.semVeiculo && !!m.veiculo_id) return false;
    return true;
  });
}

// --- Auto-refresh interval ---
const REFRESH_INTERVAL = 30_000;

export default function MapaServico() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { motoristas, motoristasPorLocalizacao, localizacoes, loading, refetch } = useLocalizadorMotoristas(eventoId);
  const { missoesAtivas, createMissao } = useMissoes(eventoId);

  const [activeMotorista, setActiveMotorista] = useState<MotoristaComVeiculo | null>(null);
  const [chamarBaseMotorista, setChamarBaseMotorista] = useState<MotoristaComVeiculo | null>(null);
  const [baseNome, setBaseNome] = useState('Base');
  const [outrosNome, setOutrosNome] = useState<string | null>(null);
  const [retornandoPontoNome, setRetornandoPontoNome] = useState<string | null>(null);

  // --- Filters ---
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [backupOnly, setBackupOnly] = useState(false);
  const [semVeiculo, setSemVeiculo] = useState(false);

  const filters: FilterState = { search, deferredSearch, statusFilters, backupOnly, semVeiculo };

  // --- Auto-refresh ---
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [refreshCycle, setRefreshCycle] = useState(0);

  useEffect(() => {
    if (!autoRefresh) { setRefreshProgress(0); return; }
    const startTime = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / REFRESH_INTERVAL) * 100, 100);
      setRefreshProgress(pct);
      if (elapsed >= REFRESH_INTERVAL) {
        refetch();
        setRefreshProgress(0);
        setRefreshCycle(c => c + 1);
        clearInterval(tick);
      }
    }, 200);
    return () => clearInterval(tick);
  }, [autoRefresh, refreshCycle, refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch base, "Outros", and "Retornando" point names
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
        const retornando = data.find(p => p.nome.toLowerCase().includes('retornando'));
        if (retornando) setRetornandoPontoNome(retornando.nome);
      });
  }, [eventoId]);

  // Map active missions per driver
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

  // Identify drivers returning to base (mission-based OR location-based)
  const retornandoBaseIds = useMemo(() => {
    const ids = new Set<string>();
    // By active mission to base
    missoesPorMotorista.forEach((missao, motoristaId) => {
      if (missao.ponto_desembarque === baseNome && ['pendente', 'aceita', 'em_andamento'].includes(missao.status)) {
        ids.add(motoristaId);
      }
    });
    // By ultima_localizacao matching "Retornando" point
    if (retornandoPontoNome) {
      motoristas.forEach(m => {
        if (m.ultima_localizacao === retornandoPontoNome && m.status !== 'em_viagem') {
          ids.add(m.id);
        }
      });
    }
    return ids;
  }, [missoesPorMotorista, baseNome, retornandoPontoNome, motoristas]);

  // Build separated driver groups: dynamic (scrollable) vs fixed (em_viagem, retornando, outros)
  const { dynamicMotoristas, emViagemMotoristas, retornandoBaseMotoristas, outrosMotoristas } = useMemo(() => {
    const emViagem: MotoristaComVeiculo[] = [];
    const retornando: MotoristaComVeiculo[] = [];
    const outros: MotoristaComVeiculo[] = [];
    const dynamicGroups: Record<string, MotoristaComVeiculo[]> = {};

    Object.entries(motoristasPorLocalizacao).forEach(([loc, drivers]) => {
      drivers.forEach(m => {
        // Em viagem -> fixed column
        if (m.status === 'em_viagem') {
          emViagem.push(m);
        }
        // Retornando -> fixed column
        else if (retornandoBaseIds.has(m.id)) {
          retornando.push(m);
        }
        // Outros -> fixed column
        else if (outrosNome && m.ultima_localizacao === outrosNome) {
          outros.push(m);
        }
        // Dynamic columns (skip em_transito, retornando point, outros point)
        else if (loc !== 'em_transito') {
          if (!dynamicGroups[loc]) dynamicGroups[loc] = [];
          dynamicGroups[loc].push(m);
        }
      });
    });

    return { dynamicMotoristas: dynamicGroups, emViagemMotoristas: emViagem, retornandoBaseMotoristas: retornando, outrosMotoristas: outros };
  }, [motoristasPorLocalizacao, retornandoBaseIds, outrosNome]);

  // Apply filters to each group
  const filteredDynamic = useMemo(() => {
    const result: Record<string, MotoristaComVeiculo[]> = {};
    Object.entries(dynamicMotoristas).forEach(([loc, drivers]) => {
      result[loc] = applyFilters(drivers, filters);
    });
    return result;
  }, [dynamicMotoristas, filters]);

  const filteredEmViagem = useMemo(() => applyFilters(emViagemMotoristas, filters), [emViagemMotoristas, filters]);
  const filteredRetornando = useMemo(() => applyFilters(retornandoBaseMotoristas, filters), [retornandoBaseMotoristas, filters]);
  const filteredOutros = useMemo(() => applyFilters(outrosMotoristas, filters), [outrosMotoristas, filters]);

  // Dynamic columns: Base first, then alphabetical, Sem Local last
  const dynamicColumns = useMemo(() => {
    const cols: { id: string; title: string; isSpecial?: boolean; color?: string }[] = [];
    // Base first
    const baseExists = localizacoes.includes(baseNome);
    if (baseExists) {
      cols.push({ id: baseNome, title: baseNome });
    }
    // Other points alphabetically (excluding base, outros, retornando)
    localizacoes.forEach(loc => {
      if (loc === baseNome) return;
      if (outrosNome && loc === outrosNome) return;
      if (retornandoPontoNome && loc === retornandoPontoNome) return;
      cols.push({ id: loc, title: loc });
    });
    // Sem Local last
    cols.push({ id: 'sem_local', title: 'Sem Local', isSpecial: true, color: 'bg-muted/60' });
    return cols;
  }, [localizacoes, outrosNome, retornandoPontoNome, baseNome]);

  // Status counters
  const statusCount = useMemo(() => {
    let disponiveis = 0;
    motoristas.forEach(m => {
      if (m.status === 'disponivel') disponiveis++;
    });
    return {
      disponiveis,
      emTransito: emViagemMotoristas.length,
      retornando: retornandoBaseMotoristas.length,
      total: motoristas.length,
    };
  }, [motoristas, emViagemMotoristas, retornandoBaseMotoristas]);

  // --- Handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveMotorista((event.active.data.current?.motorista as MotoristaComVeiculo) || null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveMotorista(null);
    const { active, over } = event;
    if (!over) return;

    const motorista = active.data.current?.motorista as MotoristaComVeiculo;
    const destino = over.id as string;

    if (destino === 'em_transito') { toast.error('Não é possível mover manualmente para Em Trânsito'); return; }
    if (destino === 'retornando_base') { toast.error('Use "Chamar para Base" para mover para esta coluna'); return; }

    const novaLocalizacao = destino === 'sem_local' ? null : (destino === 'outros_fixo' && outrosNome) ? outrosNome : destino;
    const locAtual = motorista.status === 'em_viagem' ? 'em_transito' : (motorista.ultima_localizacao || 'sem_local');
    if (locAtual === destino) return;

    const { error } = await supabase
      .from('motoristas')
      .update({ ultima_localizacao: novaLocalizacao, ultima_localizacao_at: new Date().toISOString(), status: 'disponivel' })
      .eq('id', motorista.id);

    if (error) {
      toast.error('Erro ao atualizar localização');
    } else {
      const destinoLabel = destino === 'sem_local' ? 'Sem Local' : (destino === 'outros_fixo' ? 'Outros' : destino);
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
    // Immediate visual feedback: update location to "Retornando" point
    if (retornandoPontoNome) {
      await supabase
        .from('motoristas')
        .update({ ultima_localizacao: retornandoPontoNome, ultima_localizacao_at: new Date().toISOString() })
        .eq('id', chamarBaseMotorista.id);
    }
    setChamarBaseMotorista(null);
  }, [chamarBaseMotorista, eventoId, createMissao, baseNome, retornandoPontoNome]);

  const toggleStatus = useCallback((status: string) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }, []);

  return (
    <EventLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <MapaServicoHeader
          statusCount={statusCount}
          filters={filters}
          onSearchChange={setSearch}
          onToggleStatus={toggleStatus}
          onToggleBackup={() => setBackupOnly(v => !v)}
          onToggleSemVeiculo={() => setSemVeiculo(v => !v)}
          onRefresh={refetch}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          refreshProgress={refreshProgress}
        />

        {loading ? (
          <div className="flex gap-4 p-4 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="min-w-[300px] h-[400px] rounded-xl" />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-1 min-h-0">
              {/* Dynamic columns with scroll navigation */}
              <MapaServicoScrollContainer>
                {dynamicColumns.map(col => (
                  <MapaServicoColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    motoristas={filteredDynamic[col.id] || []}
                    missoesPorMotorista={missoesPorMotorista}
                    onChamarBase={m => setChamarBaseMotorista(m)}
                    isSpecial={col.isSpecial}
                    color={col.color}
                  />
                ))}
              </MapaServicoScrollContainer>

              {/* Separator */}
              <div className="w-px bg-border shrink-0" />

              {/* Fixed columns: Em Viagem, Retornando, Outros */}
              <div className="flex gap-2 p-3 shrink-0 bg-muted/20 max-w-[50vw] overflow-y-auto">
                <MapaServicoColumn
                  id="em_transito"
                  title="Em Viagem"
                  motoristas={filteredEmViagem}
                  missoesPorMotorista={missoesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isFixed
                  color="bg-blue-500/10"
                />
                <MapaServicoColumn
                  id="retornando_base"
                  title={`Retornando pra ${baseNome}`}
                  motoristas={filteredRetornando}
                  missoesPorMotorista={missoesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isFixed
                  color="bg-amber-500/10"
                />
                {outrosNome && (
                  <MapaServicoColumn
                    id="outros_fixo"
                    title="Outros"
                    motoristas={filteredOutros}
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
