import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Filter, X, Plus, Truck, Download, FileBarChart, LayoutGrid, List, History } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { EventLayout } from '@/components/layout/EventLayout';
import { InnerSidebar, InnerSidebarSection } from '@/components/layout/InnerSidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useVeiculos, useMotoristas } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { useUserNames } from '@/hooks/useUserNames';
import { calcularTempoViagem } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateVeiculoWizard } from '@/components/veiculos/CreateVeiculoWizard';
import { VeiculoKanbanColumnFull } from '@/components/veiculos/VeiculoKanbanColumnFull';
import { VeiculoKanbanCardFull } from '@/components/veiculos/VeiculoKanbanCardFull';
import { VeiculosAuditoria } from '@/components/veiculos/VeiculosAuditoria';
import { VeiculosListView } from '@/components/veiculos/VeiculosListView';
import { VeiculosUsoAuditoria } from '@/components/veiculos/VeiculosUsoAuditoria';
import { toast } from 'sonner';

const sections: InnerSidebarSection[] = [
  { id: 'cadastro', label: 'Veículos', icon: Truck },
  { id: 'auditoria', label: 'Auditoria', icon: FileBarChart },
  { id: 'historico-uso', label: 'Histórico de Uso', icon: History },
];

export default function Veiculos() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [activeSection, setActiveSection] = useState<string>('cadastro');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [wizardOpen, setWizardOpen] = useState(false);
  
  const { viagens, loading: loadingViagens, lastUpdate, refetch } = useViagens(eventoId);
  const { viagensAtivas } = useCalculos(viagens);
  const { veiculos, loading: loadingVeiculos, createVeiculo, updateVeiculo, deleteVeiculo, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const [activeVeiculoId, setActiveVeiculoId] = useState<string | null>(null);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  const { getEventoById } = useEventos();
  
  const userIds = useMemo(() => 
    veiculos.flatMap(v => [v.criado_por, v.atualizado_por]),
    [veiculos]
  );
  const { getName } = useUserNames(userIds);

  const evento = eventoId ? getEventoById(eventoId) : null;

  const handleSaveVeiculo = async (data: { placa: string; tipo_veiculo: string; fornecedor: string | null; evento_id?: string }) => {
    await createVeiculo({
      ...data,
      motorista_id: null,
      ativo: true,
      marca: null,
      modelo: null,
      ano: null,
      capacidade: null,
    });
    refetchVeiculos();
  };

  const handleUpdateVeiculo = async (id: string, data: any, oldPlaca: string) => {
    await updateVeiculo(id, data, oldPlaca);
    refetchVeiculos();
    refetch();
  };

  const handleDeleteVeiculo = async (id: string) => {
    try {
      await deleteVeiculo(id);
      toast.success('Veículo excluído com sucesso!');
      refetchVeiculos();
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveVeiculoId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveVeiculoId(null);

    if (!over) return;

    const veiculoId = active.id as string;
    const newStatus = over.id as string;
    
    // Validate status
    const validStatuses = ['liberado', 'pendente', 'em_inspecao', 'manutencao'];
    if (!validStatuses.includes(newStatus)) return;

    const veiculo = veiculos.find(v => v.id === veiculoId);
    if (!veiculo || veiculo.status === newStatus) return;

    try {
      await handleUpdateVeiculo(veiculoId, { status: newStatus }, veiculo.placa);
      toast.success(`Veículo ${veiculo.placa} movido para "${newStatus === 'liberado' ? 'Liberados' : newStatus === 'pendente' ? 'Pendentes' : newStatus === 'em_inspecao' ? 'Em Inspeção' : 'Manutenção'}"`);
    } catch (error: any) {
      toast.error(`Erro ao mover veículo: ${error.message}`);
    }
  }, [veiculos, handleUpdateVeiculo]);

  const activeVeiculo = useMemo(() => 
    activeVeiculoId ? veiculos.find(v => v.id === activeVeiculoId) : null,
  [activeVeiculoId, veiculos]);

  const handleImportFromViagens = async () => {
    if (!eventoId) return;
    
    try {
      const { data: viagensData, error: viagensError } = await supabase
        .from('viagens')
        .select('tipo_veiculo, placa, motorista')
        .eq('evento_id', eventoId)
        .not('placa', 'is', null);

      if (viagensError) throw viagensError;

      const veiculosUnicos = new Map<string, { tipo_veiculo: string; placa: string; motorista: string }>();
      viagensData?.forEach(v => {
        if (v.placa && !veiculosUnicos.has(v.placa)) {
          veiculosUnicos.set(v.placa, {
            tipo_veiculo: v.tipo_veiculo || 'Van',
            placa: v.placa,
            motorista: v.motorista
          });
        }
      });

      let veiculosCriados = 0;
      let motoristasCriados = 0;

      for (const [placa, dados] of veiculosUnicos) {
        const veiculoExistente = veiculos.find(v => v.placa === placa);
        
        if (!veiculoExistente) {
          const { data: novoVeiculo, error: veiculoError } = await supabase
            .from('veiculos')
            .insert({
              placa: dados.placa,
              tipo_veiculo: dados.tipo_veiculo,
              evento_id: eventoId,
              fornecedor: null,
              ativo: true
            })
            .select()
            .single();

          if (veiculoError) continue;

          veiculosCriados++;

          if (dados.motorista) {
            const { error: motoristaError } = await supabase
              .from('motoristas')
              .insert({
                nome: dados.motorista,
                evento_id: eventoId,
                veiculo_id: novoVeiculo.id,
                ativo: true
              });

            if (!motoristaError) motoristasCriados++;
          }
        }
      }

      toast.success(`Importados: ${veiculosCriados} veículos e ${motoristasCriados} motoristas`);
      refetchVeiculos();
      refetch();
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    }
  };

  const isVeiculoCadastrado = (placa: string | null) => {
    if (!placa) return false;
    return veiculos.some(v => v.placa === placa);
  };

  const filteredVeiculos = useMemo(() => {
    let filtered = [...veiculos];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.placa?.toLowerCase().includes(term) ||
        v.nome?.toLowerCase().includes(term) ||
        v.fornecedor?.toLowerCase().includes(term)
      );
    }

    if (filterTipoVeiculo !== 'all') {
      filtered = filtered.filter(v => v.tipo_veiculo === filterTipoVeiculo);
    }

    return filtered;
  }, [veiculos, searchTerm, filterTipoVeiculo]);

  // Agrupar veículos por status para o Kanban
  const veiculosPorStatus = useMemo(() => {
    const grupos = {
      liberado: [] as typeof veiculos,
      pendente: [] as typeof veiculos,
      em_inspecao: [] as typeof veiculos,
      manutencao: [] as typeof veiculos,
    };

    filteredVeiculos.forEach(v => {
      const status = (v.status || 'em_inspecao') as keyof typeof grupos;
      if (grupos[status]) {
        grupos[status].push(v);
      } else {
        grupos.em_inspecao.push(v);
      }
    });

    // Ordenar cada grupo por placa
    Object.values(grupos).forEach(grupo => {
      grupo.sort((a, b) => a.placa.localeCompare(b.placa));
    });

    return grupos;
  }, [filteredVeiculos]);

  // Mapa de estatísticas por placa
  const veiculosStatsMap = useMemo(() => {
    const statsMap = new Map<string, { totalViagens: number; totalPax: number; tempoMedio: number; ativo: boolean }>();
    
    const placas = [...new Set(viagens.map(v => v.placa))];
    placas.forEach(placa => {
      if (!placa) return;
      const viagensVeiculo = viagens.filter(v => v.placa === placa);
      const tempos = viagensVeiculo
        .filter(v => v.h_chegada && v.h_pickup)
        .map(v => calcularTempoViagem(v.h_pickup!, v.h_chegada!));
      
      const tempoMedio = tempos.length > 0 
        ? tempos.reduce((a, b) => a + b, 0) / tempos.length 
        : 0;

      statsMap.set(placa, {
        totalViagens: viagensVeiculo.length,
        totalPax: viagensVeiculo.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0),
        tempoMedio,
        ativo: viagensAtivas.some(v => v.placa === placa)
      });
    });

    return statsMap;
  }, [viagens, viagensAtivas]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all';

  const loading = loadingViagens || loadingVeiculos;

  if (loading) {
    return (
      <EventLayout>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </EventLayout>
    );
  }

  const CadastroContent = () => (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Veículos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre os veículos antes de vincular aos motoristas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportFromViagens}>
            <Download className="w-4 h-4 mr-2" />
            Importar das Viagens
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Veículo
          </Button>
        </div>
      </div>

      <CreateVeiculoWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        eventoId={eventoId || ''}
        onCreated={refetchVeiculos}
      />

      <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, nome ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button 
              variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('kanban')}
              className="rounded-r-none"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'lista' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('lista')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Select value={filterTipoVeiculo} onValueChange={setFilterTipoVeiculo}>
            <SelectTrigger className="w-[120px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Ônibus">Ônibus</SelectItem>
              <SelectItem value="Sedan">Sedan</SelectItem>
              <SelectItem value="SUV">SUV</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {filteredVeiculos.length === 0 ? (
        <Card className="p-8 text-center">
          <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-2">Nenhum veículo cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {hasActiveFilters ? 'Tente ajustar os filtros de busca.' : 'Clique em "Novo Veículo" para começar.'}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Veículo
            </Button>
          )}
        </Card>
      ) : viewMode === 'lista' ? (
        <VeiculosListView
          veiculos={filteredVeiculos}
          motoristas={motoristas}
          eventoId={eventoId}
          onSave={handleSaveVeiculo}
          onUpdate={handleUpdateVeiculo}
          onDelete={handleDeleteVeiculo}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            <VeiculoKanbanColumnFull
              status="liberado"
              veiculos={veiculosPorStatus.liberado}
              veiculosStats={veiculosStatsMap}
              motoristas={motoristas}
              eventoId={eventoId}
              onSave={handleSaveVeiculo}
              onUpdate={handleUpdateVeiculo}
              onDelete={handleDeleteVeiculo}
              getName={getName}
            />
            <VeiculoKanbanColumnFull
              status="pendente"
              veiculos={veiculosPorStatus.pendente}
              veiculosStats={veiculosStatsMap}
              motoristas={motoristas}
              eventoId={eventoId}
              onSave={handleSaveVeiculo}
              onUpdate={handleUpdateVeiculo}
              onDelete={handleDeleteVeiculo}
              getName={getName}
            />
            <VeiculoKanbanColumnFull
              status="em_inspecao"
              veiculos={veiculosPorStatus.em_inspecao}
              veiculosStats={veiculosStatsMap}
              motoristas={motoristas}
              eventoId={eventoId}
              onSave={handleSaveVeiculo}
              onUpdate={handleUpdateVeiculo}
              onDelete={handleDeleteVeiculo}
              getName={getName}
            />
            <VeiculoKanbanColumnFull
              status="manutencao"
              veiculos={veiculosPorStatus.manutencao}
              veiculosStats={veiculosStatsMap}
              motoristas={motoristas}
              eventoId={eventoId}
              onSave={handleSaveVeiculo}
              onUpdate={handleUpdateVeiculo}
              onDelete={handleDeleteVeiculo}
              getName={getName}
            />
          </div>
          <DragOverlay>
            {activeVeiculo && (
              <VeiculoKanbanCardFull
                veiculo={activeVeiculo}
                stats={veiculosStatsMap.get(activeVeiculo.placa)}
                motoristaVinculado={motoristas.find(m => m.veiculo_id === activeVeiculo.id)}
                onSave={handleSaveVeiculo}
                onUpdate={handleUpdateVeiculo}
                onDelete={handleDeleteVeiculo}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );

  return (
    <EventLayout>
      <div className="flex h-full">
        <InnerSidebar 
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          storageKey="veiculos-sidebar-collapsed"
        />
        <div className="flex-1 p-6 overflow-auto">
          {activeSection === 'auditoria' && (
            <VeiculosAuditoria viagens={viagens} veiculosCadastrados={veiculos} motoristas={motoristas} />
          )}
          {activeSection === 'historico-uso' && <VeiculosUsoAuditoria />}
          {activeSection === 'cadastro' && <CadastroContent />}
        </div>
      </div>
    </EventLayout>
  );
}
