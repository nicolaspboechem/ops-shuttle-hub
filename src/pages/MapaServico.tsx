import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { MapPin, ClipboardList, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { EventLayout } from '@/components/layout/EventLayout';
import { useAuth } from '@/lib/auth/AuthContext';
import { InnerSidebar, InnerSidebarSection } from '@/components/layout/InnerSidebar';
import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { useMissoes } from '@/hooks/useMissoes';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { MapaServicoColumn } from '@/components/mapa-servico/MapaServicoColumn';
import { MapaServicoCard } from '@/components/mapa-servico/MapaServicoCard';
import { ChamarBaseModal } from '@/components/mapa-servico/ChamarBaseModal';
import { MapaServicoHeader, FilterState } from '@/components/mapa-servico/MapaServicoHeader';
import { MapaServicoScrollContainer } from '@/components/mapa-servico/MapaServicoScrollContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { MissoesPanel } from '@/components/motoristas/MissoesPanel';
import { MotoristasEscala } from '@/components/motoristas/MotoristasEscala';
import { useMotoristas } from '@/hooks/useCadastros';
import { useEquipe } from '@/hooks/useEquipe';

// --- Sidebar sections ---
const sections: InnerSidebarSection[] = [
  { id: 'localizacao', label: 'Localização', icon: MapPin },
  { id: 'missoes', label: 'Missões', icon: ClipboardList },
  { id: 'escala', label: 'Escala', icon: Calendar },
];

// --- Filter helper ---
function isBackup(m: MotoristaComVeiculo): boolean {
  return !!m.veiculo?.observacoes_gerais?.includes('[BACKUP]');
}

function applyFilters(drivers: MotoristaComVeiculo[], filters: FilterState): MotoristaComVeiculo[] {
  return drivers.filter(m => {
    if (filters.deferredSearch) {
      const q = filters.deferredSearch.toLowerCase();
      const nameMatch = m.nome.toLowerCase().includes(q);
      const plateMatch = m.veiculo?.placa?.toLowerCase().includes(q);
      if (!nameMatch && !plateMatch) return false;
    }
    if (filters.statusFilters.size > 0 && !filters.statusFilters.has(m.status || '')) {
      return false;
    }
    if (filters.backupOnly && !isBackup(m)) return false;
    if (filters.semVeiculo && !!m.veiculo_id) return false;
    return true;
  });
}

// --- Auto-refresh interval ---
const REFRESH_INTERVAL = 120_000;

export default function MapaServico() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { motoristas, motoristasPorLocalizacao, localizacoes, loading, refetch } = useLocalizadorMotoristas(eventoId);
  const { createMissao } = useMissoes(eventoId);
  const { user } = useAuth();
  const { offset, getAgoraSync } = useServerTime();
  const { motoristas: motoristasCadastrados } = useMotoristas(eventoId);
  const { membros: equipeMembros } = useEquipe(eventoId);

  const getPresenca = (motoristaId: string) => {
    const membro = equipeMembros.find(m => m.tipo === 'motorista' && m.id === motoristaId);
    return membro ? { checkin_at: membro.checkin_at, checkout_at: membro.checkout_at } : null;
  };

  // --- InnerSidebar ---
  const [activeSection, setActiveSection] = useState<string>('localizacao');

  const [activeMotorista, setActiveMotorista] = useState<MotoristaComVeiculo | null>(null);
  const [chamarBaseMotorista, setChamarBaseMotorista] = useState<MotoristaComVeiculo | null>(null);
  const [baseNome, setBaseNome] = useState('Base');
  const [outrosNome, setOutrosNome] = useState<string | null>(null);
  const [retornandoPontoNome, setRetornandoPontoNome] = useState<string | null>(null);
  const [horarioVirada, setHorarioVirada] = useState('04:00');
  const [missoesAtivas, setMissoesAtivas] = useState<any[]>([]);

  // --- Filters ---
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [backupOnly, setBackupOnly] = useState(false);
  const [semVeiculo, setSemVeiculo] = useState(false);

  const filters: FilterState = { search, deferredSearch, statusFilters, backupOnly, semVeiculo };

  // --- Auto-refresh ---
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [refreshCycle, setRefreshCycle] = useState(0);

  useEffect(() => {
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
    }, 1000);
    return () => clearInterval(tick);
  }, [refreshCycle, refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch base, "Outros", "Retornando" point names + horario_virada
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

    supabase
      .from('eventos')
      .select('horario_virada_dia')
      .eq('id', eventoId)
      .single()
      .then(({ data }) => {
        if (data?.horario_virada_dia) {
          setHorarioVirada(data.horario_virada_dia.substring(0, 5));
        }
      });
  }, [eventoId]);

  // Fetch active missions filtered by operational day (same as PainelLocalizador)
  useEffect(() => {
    if (!eventoId) return;

    const fetchMissoes = () => {
      const dataOp = getDataOperacional(new Date(Date.now() + offset), horarioVirada);
      supabase
        .from('missoes')
        .select('id, motorista_id, ponto_embarque, ponto_desembarque, status, created_at, horario_previsto, data_atualizacao')
        .eq('evento_id', eventoId)
        .in('status', ['pendente', 'aceita', 'em_andamento'])
        .or(`data_programada.eq.${dataOp},data_programada.is.null`)
        .then(({ data }) => {
          setMissoesAtivas(data || []);
        });
    };
    fetchMissoes();

    const channel = supabase
      .channel('mapa-servico-missoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missoes' }, fetchMissoes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventoId, horarioVirada, offset]);

  // Priority logic (same as PainelLocalizador)
  const statusPriority: Record<string, number> = { em_andamento: 3, aceita: 2, pendente: 1 };
  const missaoTemPrioridade = (a: typeof missoesAtivas[number], existing: typeof missoesAtivas[number]) => {
    const aPrio = statusPriority[a.status] || 0;
    const ePrio = statusPriority[existing.status] || 0;
    if (aPrio !== ePrio) return aPrio > ePrio;
    if (a.horario_previsto && existing.horario_previsto) return a.horario_previsto < existing.horario_previsto;
    if (a.horario_previsto && !existing.horario_previsto) return true;
    if (!a.horario_previsto && existing.horario_previsto) return false;
    return a.created_at > existing.created_at;
  };

  // Map active missions per driver (exclude pendente — same as PainelLocalizador)
  const missoesPorMotorista = useMemo(() => {
    const map = new Map<string, typeof missoesAtivas[number]>();
    missoesAtivas.forEach(m => {
      if (m.status === 'pendente') return;
      const existing = map.get(m.motorista_id);
      if (!existing || missaoTemPrioridade(m, existing)) {
        map.set(m.motorista_id, m);
      }
    });
    return map;
  }, [missoesAtivas]);

  // Pending missions: drivers with pendente and NO active (aceita/em_andamento) mission
  const missoesPendentes = useMemo(() => {
    const motoristasComAtiva = new Set<string>();
    missoesAtivas.forEach(m => {
      if (m.status === 'aceita' || m.status === 'em_andamento') {
        motoristasComAtiva.add(m.motorista_id);
      }
    });
    return missoesAtivas.filter(m =>
      m.status === 'pendente' && !motoristasComAtiva.has(m.motorista_id)
    );
  }, [missoesAtivas]);

  // Build fake MotoristaComVeiculo entries for pending missions column
  const motoristasPendentes = useMemo(() => {
    const allMotoristas = Object.values(motoristasPorLocalizacao).flat();
    const motoristasMap = new Map(allMotoristas.map(m => [m.id, m]));

    const perDriver = new Map<string, typeof missoesAtivas[number]>();
    missoesPendentes.forEach(m => {
      const existing = perDriver.get(m.motorista_id);
      if (!existing || missaoTemPrioridade(m, existing)) {
        perDriver.set(m.motorista_id, m);
      }
    });

    return Array.from(perDriver.values())
      .map(m => motoristasMap.get(m.motorista_id))
      .filter(Boolean) as MotoristaComVeiculo[];
  }, [missoesPendentes, motoristasPorLocalizacao]);

  // Map pending missions for the pendentes column cards
  const missoesPendentesPorMotorista = useMemo(() => {
    const map = new Map<string, typeof missoesAtivas[number]>();
    missoesPendentes.forEach(m => {
      const existing = map.get(m.motorista_id);
      if (!existing || missaoTemPrioridade(m, existing)) {
        map.set(m.motorista_id, m);
      }
    });
    return map;
  }, [missoesPendentes]);

  // Identify drivers returning to base (only em_andamento)
  const retornandoBaseIds = useMemo(() => {
    const ids = new Set<string>();
    missoesPorMotorista.forEach((missao, motoristaId) => {
      if (missao.ponto_desembarque === baseNome && missao.status === 'em_andamento') {
        ids.add(motoristaId);
      }
    });
    return ids;
  }, [missoesPorMotorista, baseNome]);

  // Build separated driver groups (same logic as PainelLocalizador)
  const { dynamicMotoristas, retornandoBaseMotoristas, outrosMotoristas, dynamicLocalizacoes } = useMemo(() => {
    const retornando: MotoristaComVeiculo[] = [];
    const outros: MotoristaComVeiculo[] = [];
    const dynamicGroups: Record<string, MotoristaComVeiculo[]> = {};

    Object.entries(motoristasPorLocalizacao).forEach(([loc, drivers]) => {
      drivers.forEach(m => {
        const missao = missoesPorMotorista.get(m.id);
        const emTransitoPorMissao = missao?.status === 'em_andamento';
        const missaoEnvolveOutros = outrosNome && missao && ['aceita', 'em_andamento'].includes(missao.status) &&
          (missao.ponto_embarque === outrosNome || missao.ponto_desembarque === outrosNome);

        if (retornandoBaseIds.has(m.id)) {
          retornando.push(m);
        } else if (missaoEnvolveOutros) {
          outros.push(m);
        } else if (emTransitoPorMissao && loc !== 'em_transito') {
          if (!dynamicGroups['em_transito']) dynamicGroups['em_transito'] = [];
          dynamicGroups['em_transito'].push(m);
        } else if (outrosNome && m.ultima_localizacao === outrosNome && m.status !== 'em_viagem') {
          outros.push(m);
        } else {
          if (!dynamicGroups[loc]) dynamicGroups[loc] = [];
          dynamicGroups[loc].push(m);
        }
      });
    });

    const dynLocs = localizacoes.filter(loc => !(outrosNome && loc === outrosNome));

    return {
      dynamicMotoristas: dynamicGroups,
      retornandoBaseMotoristas: retornando,
      outrosMotoristas: outros,
      dynamicLocalizacoes: dynLocs,
    };
  }, [motoristasPorLocalizacao, retornandoBaseIds, outrosNome, localizacoes, missoesPorMotorista]);

  // Apply filters to each group
  const filteredDynamic = useMemo(() => {
    const result: Record<string, MotoristaComVeiculo[]> = {};
    Object.entries(dynamicMotoristas).forEach(([loc, drivers]) => {
      result[loc] = applyFilters(drivers, filters);
    });
    return result;
  }, [dynamicMotoristas, filters]);

  const filteredEmViagem = useMemo(() => applyFilters(dynamicMotoristas['em_transito'] || [], filters), [dynamicMotoristas, filters]);
  const filteredPendentes = useMemo(() => applyFilters(motoristasPendentes, filters), [motoristasPendentes, filters]);
  const filteredRetornando = useMemo(() => applyFilters(retornandoBaseMotoristas, filters), [retornandoBaseMotoristas, filters]);
  const filteredOutros = useMemo(() => applyFilters(outrosMotoristas, filters), [outrosMotoristas, filters]);

  // Dynamic columns
  const dynamicColumns = useMemo(() => {
    const cols: { id: string; title: string; isSpecial?: boolean; color?: string }[] = [];
    const baseExists = dynamicLocalizacoes.includes(baseNome);
    if (baseExists) {
      cols.push({ id: baseNome, title: baseNome });
    }
    dynamicLocalizacoes.forEach(loc => {
      if (loc === baseNome) return;
      if (retornandoPontoNome && loc === retornandoPontoNome) return;
      cols.push({ id: loc, title: loc });
    });
    cols.push({ id: 'sem_local', title: 'Sem Local', isSpecial: true, color: 'bg-muted/60' });
    return cols;
  }, [dynamicLocalizacoes, retornandoPontoNome, baseNome]);

  // Status counters
  const statusCount = useMemo(() => {
    let disponiveis = 0;
    motoristas.forEach(m => {
      if (m.status === 'disponivel') disponiveis++;
    });
    const emTransitoDrivers = dynamicMotoristas['em_transito'] || [];
    return {
      disponiveis,
      emTransito: emTransitoDrivers.length,
      retornando: retornandoBaseMotoristas.length,
      total: motoristas.length,
      pendentes: motoristasPendentes.length,
    };
  }, [motoristas, dynamicMotoristas, retornandoBaseMotoristas, motoristasPendentes]);

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
      .update({ ultima_localizacao: novaLocalizacao, ultima_localizacao_at: new Date(Date.now() + offset).toISOString(), status: 'disponivel' })
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
    
    const missao = await createMissao({
      motorista_id: chamarBaseMotorista.id,
      titulo: 'Retorno à Base',
      ponto_embarque: chamarBaseMotorista.ultima_localizacao || 'Local atual',
      ponto_desembarque: baseNome,
      prioridade: 'normal',
      data_programada: getDataOperacional(getAgoraSync(), horarioVirada),
    });

    // Criar viagem no histórico para rastreabilidade
    if (missao) {
      const horaAtual = new Date(Date.now() + offset).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      
      const { data: viagem } = await supabase
        .from('viagens')
        .insert({
          evento_id: eventoId,
          motorista_id: chamarBaseMotorista.id,
          motorista: chamarBaseMotorista.nome,
          tipo_operacao: 'missao',
          ponto_embarque: chamarBaseMotorista.ultima_localizacao || 'Local atual',
          ponto_desembarque: baseNome,
          observacao: 'Retorno a base solicitado',
          origem_missao_id: missao.id,
          status: 'agendado',
          veiculo_id: chamarBaseMotorista.veiculo_id || null,
          placa: chamarBaseMotorista.veiculo?.placa || null,
          tipo_veiculo: chamarBaseMotorista.veiculo?.tipo_veiculo || null,
          h_pickup: horaAtual,
          criado_por: user?.id,
        })
        .select('id')
        .single();

      // Vincular viagem à missão (bidirecional)
      if (viagem) {
        await supabase
          .from('missoes')
          .update({ viagem_id: viagem.id })
          .eq('id', missao.id);
      }
    }

    if (retornandoPontoNome) {
      await supabase
        .from('motoristas')
        .update({ ultima_localizacao: retornandoPontoNome, ultima_localizacao_at: new Date(Date.now() + offset).toISOString() })
        .eq('id', chamarBaseMotorista.id);
    }
    setChamarBaseMotorista(null);
  }, [chamarBaseMotorista, eventoId, createMissao, baseNome, retornandoPontoNome, user]);

  // --- Collapsed columns ---
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const toggleCollapse = useCallback((colId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      next.has(colId) ? next.delete(colId) : next.add(colId);
      return next;
    });
  }, []);

  const toggleStatus = useCallback((status: string) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }, []);

  // --- Localização content ---
  const localizacaoContent = (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0">
      <MapaServicoHeader
        statusCount={statusCount}
        filters={filters}
        onSearchChange={setSearch}
        onToggleStatus={toggleStatus}
        onToggleBackup={() => setBackupOnly(v => !v)}
        onToggleSemVeiculo={() => setSemVeiculo(v => !v)}
        onRefresh={refetch}
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
              {dynamicColumns
                .filter(col => (filteredDynamic[col.id]?.length || 0) > 0)
                .map(col => (
                  <MapaServicoColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    motoristas={filteredDynamic[col.id] || []}
                    missoesPorMotorista={missoesPorMotorista}
                    onChamarBase={m => setChamarBaseMotorista(m)}
                    isSpecial={col.isSpecial}
                    color={col.color}
                    collapsed={collapsedColumns.has(col.id)}
                    onToggleCollapse={() => toggleCollapse(col.id)}
                  />
                ))}
            </MapaServicoScrollContainer>

            {/* Separator */}
            <div className="w-px bg-border shrink-0" />

            {/* Fixed columns: Pendentes, Em Viagem, Retornando, Outros */}
            <div className="flex gap-2 p-3 shrink-0 bg-muted/20 max-w-[50vw] overflow-y-auto">
              {filteredPendentes.length > 0 && (
                <MapaServicoColumn
                  id="pendentes"
                  title="Missões Pendentes"
                  motoristas={filteredPendentes}
                  missoesPorMotorista={missoesPendentesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isFixed
                  color="bg-yellow-500/10"
                  collapsed={collapsedColumns.has('pendentes')}
                  onToggleCollapse={() => toggleCollapse('pendentes')}
                />
              )}
              {filteredEmViagem.length > 0 && (
                <MapaServicoColumn
                  id="em_transito"
                  title="Em Viagem"
                  motoristas={filteredEmViagem}
                  missoesPorMotorista={missoesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isFixed
                  color="bg-blue-500/10"
                  collapsed={collapsedColumns.has('em_transito')}
                  onToggleCollapse={() => toggleCollapse('em_transito')}
                />
              )}
              {filteredRetornando.length > 0 && (
                <MapaServicoColumn
                  id="retornando_base"
                  title={`Retornando pra ${baseNome}`}
                  motoristas={filteredRetornando}
                  missoesPorMotorista={missoesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isFixed
                  color="bg-amber-500/10"
                  collapsed={collapsedColumns.has('retornando_base')}
                  onToggleCollapse={() => toggleCollapse('retornando_base')}
                />
              )}
              {outrosNome && filteredOutros.length > 0 && (
                <MapaServicoColumn
                  id="outros_fixo"
                  title="Outros"
                  motoristas={filteredOutros}
                  missoesPorMotorista={missoesPorMotorista}
                  onChamarBase={m => setChamarBaseMotorista(m)}
                  isFixed
                  color="bg-purple-500/10"
                  collapsed={collapsedColumns.has('outros_fixo')}
                  onToggleCollapse={() => toggleCollapse('outros_fixo')}
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
  );

  return (
    <EventLayout>
      <div className="flex h-screen overflow-hidden">
        <InnerSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          storageKey="mapa-servico-sidebar-collapsed"
        />
        <div className="flex-1 min-h-0 overflow-auto">
          <div className={activeSection === 'localizacao' ? 'block' : 'hidden'}>
            {localizacaoContent}
          </div>
          <div className={activeSection === 'missoes' ? 'block' : 'hidden'}>
            <MissoesPanel eventoId={eventoId} />
          </div>
          <div className={activeSection === 'escala' ? 'flex flex-col h-full p-4' : 'hidden'}>
            <MotoristasEscala
              eventoId={eventoId || ''}
              motoristas={motoristasCadastrados}
              getPresenca={getPresenca}
              horarioVirada={horarioVirada}
            />
          </div>
        </div>
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