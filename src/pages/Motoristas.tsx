import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, TrendingUp, Plus, Truck, Phone, LayoutGrid, List, Pencil, MoreVertical, Trash2, AlertTriangle, Search, Filter, X, Eye, MessageCircle, Download, UserCheck, FileBarChart, Link2, Columns } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { InnerSidebar, InnerSidebarSection } from '@/components/layout/InnerSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useMotoristas, useVeiculos, Motorista } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { useUserNames } from '@/hooks/useUserNames';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { MotoristaModal } from '@/components/cadastros/CadastroModals';
import { MotoristaViagensModal } from '@/components/motoristas/MotoristaViagensModal';
import { MotoristaKanbanColumn } from '@/components/motoristas/MotoristaKanbanColumn';
import { MotoristaKanbanCard } from '@/components/motoristas/MotoristaKanbanCard';
import { CreateMotoristaWizard } from '@/components/motoristas/CreateMotoristaWizard';

import { MotoristasAuditoria } from '@/components/motoristas/MotoristasAuditoria';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';

import { ClipboardList } from 'lucide-react';
import { useMissoes, Missao, MissaoStatus } from '@/hooks/useMissoes';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { MissaoModal } from '@/components/motoristas/MissaoModal';
import { MissaoCard } from '@/components/motoristas/MissaoCard';

const sections: InnerSidebarSection[] = [
  { id: 'cadastro', label: 'Motoristas', icon: Users },
  { id: 'missoes', label: 'Missões', icon: ClipboardList },
  { id: 'auditoria', label: 'Auditoria', icon: FileBarChart },
];

const MOTORISTA_STATUSES = ['disponivel', 'em_viagem', 'indisponivel', 'inativo'] as const;

export default function Motoristas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('cadastro');
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'kanban'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeMotorista, setActiveMotorista] = useState<Motorista | null>(null);
  
  const { viagens, loading: loadingViagens, refetch } = useViagens(eventoId);
  const { motoristas: metricasMotoristas } = useCalculos(viagens);
  const { motoristas: motoristasCadastrados, loading: loadingCadastros, createMotorista, updateMotorista, deleteMotorista, refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const { getEventoById } = useEventos();
  
  // Hooks de missões - devem estar antes de qualquer return condicional
  const { missoes, loading: loadingMissoes, createMissao, updateMissao, deleteMissao } = useMissoes(eventoId);
  const { pontos: pontosEmbarque } = usePontosEmbarque(eventoId);
  const [showMissaoModal, setShowMissaoModal] = useState(false);
  const [editingMissao, setEditingMissao] = useState<Missao | null>(null);
  const [missaoFilter, setMissaoFilter] = useState<string>('all');
  
  // Realtime subscription para atualização automática do status
  useEffect(() => {
    if (!eventoId) return;

    const channel = supabase
      .channel('motoristas-status-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'motoristas',
          filter: `evento_id=eq.${eventoId}`
        },
        () => {
          // Refetch silencioso quando o status mudar
          refetchMotoristas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventoId, refetchMotoristas]);

  const userIds = useMemo(() => 
    motoristasCadastrados.flatMap(m => [m.criado_por, m.atualizado_por]),
    [motoristasCadastrados]
  );
  const { getName } = useUserNames(userIds);

  const evento = eventoId ? getEventoById(eventoId) : null;
  const maxViagens = Math.max(...metricasMotoristas.map(m => m.totalViagens), 1);

  const handleSaveMotorista = async (data: { 
    nome: string; 
    telefone: string | null; 
    veiculo_id: string | null; 
    ativo: boolean; 
    evento_id?: string 
  }) => {
    await createMotorista({
      nome: data.nome,
      telefone: data.telefone,
      veiculo_id: data.veiculo_id,
      ativo: data.ativo,
      cnh: null,
      observacao: null,
    });
    refetchMotoristas();
    refetchVeiculos();
  };

  const handleUpdateMotorista = async (motoristaId: string, motoristaData: any, oldNome: string) => {
    await updateMotorista(motoristaId, motoristaData, oldNome);
    refetchMotoristas();
    refetchVeiculos();
    refetch();
  };

  const handleDeleteMotorista = async (motoristaId: string) => {
    try {
      await deleteMotorista(motoristaId);
      toast.success('Motorista excluído com sucesso!');
      refetchMotoristas();
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  const handleImportFromViagens = async () => {
    if (!eventoId) return;
    
    try {
      const motoristasUnicos = [...new Set(viagens.map(v => v.motorista).filter(Boolean))];
      let criados = 0;

      for (const nome of motoristasUnicos) {
        const existe = motoristasCadastrados.some(m => m.nome === nome);
        if (!existe) {
          const { error } = await supabase
            .from('motoristas')
            .insert({ nome, evento_id: eventoId, ativo: true });
          
          if (!error) criados++;
        }
      }

      toast.success(`${criados} motoristas importados`);
      refetchMotoristas();
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    }
  };

  const getVeiculoDoMotorista = (motoristaId: string) => {
    const motorista = motoristasCadastrados.find(m => m.id === motoristaId);
    if (motorista?.veiculo_id) {
      return veiculos.find(v => v.id === motorista.veiculo_id);
    }
    return undefined;
  };

  const getMetricasMotorista = (nomeMotorista: string) => {
    return metricasMotoristas.find(m => m.motorista === nomeMotorista);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const motorista = motoristasCadastrados.find(m => m.id === event.active.id);
    if (motorista) {
      setActiveMotorista(motorista);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMotorista(null);

    if (!over) return;

    const motoristaId = active.id as string;
    const newStatus = over.id as string;

    // Check if dropped on a valid status column
    if (!MOTORISTA_STATUSES.includes(newStatus as typeof MOTORISTA_STATUSES[number])) return;

    const motorista = motoristasCadastrados.find(m => m.id === motoristaId);
    if (!motorista || motorista.status === newStatus) return;

    try {
      await updateMotorista(motoristaId, { status: newStatus }, motorista.nome);
      toast.success(`${motorista.nome} movido para ${newStatus === 'disponivel' ? 'Disponíveis' : newStatus === 'em_viagem' ? 'Em Viagem' : newStatus === 'indisponivel' ? 'Indisponíveis' : 'Inativos'}`);
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  };

  // Group motoristas by status for kanban
  const motoristasByStatus = useMemo(() => {
    const grouped: Record<string, Motorista[]> = {
      disponivel: [],
      em_viagem: [],
      indisponivel: [],
      inativo: [],
    };

    motoristasCadastrados.forEach(m => {
      const status = m.status || 'disponivel';
      if (grouped[status]) {
        grouped[status].push(m);
      } else {
        grouped.disponivel.push(m);
      }
    });

    return grouped;
  }, [motoristasCadastrados]);

  // Calcular última localização de cada motorista baseada em viagens encerradas
  const ultimasLocalizacoes = useMemo(() => {
    const localizacoes: Record<string, string> = {};
    
    // Ordenar viagens por data de chegada (mais recente primeiro)
    const viagensEncerradas = viagens
      .filter(v => v.status === 'encerrado' && (v.ponto_desembarque || v.ponto_embarque))
      .sort((a, b) => {
        const dateA = a.h_chegada ? new Date(a.h_chegada).getTime() : 0;
        const dateB = b.h_chegada ? new Date(b.h_chegada).getTime() : 0;
        return dateB - dateA;
      });
    
    // Para cada motorista cadastrado, encontrar a última viagem
    motoristasCadastrados.forEach(m => {
      const ultimaViagem = viagensEncerradas.find(v => v.motorista === m.nome);
      if (ultimaViagem) {
        localizacoes[m.nome] = ultimaViagem.ponto_desembarque || ultimaViagem.ponto_embarque || '';
      }
    });
    
    return localizacoes;
  }, [viagens, motoristasCadastrados]);

  // Sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Estados para modal de edição e wizard
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedMotoristaForViagens, setSelectedMotoristaForViagens] = useState<Motorista | null>(null);

  const filteredCadastrados = useMemo(() => {
    let filtered = [...motoristasCadastrados];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.nome.toLowerCase().includes(term) ||
        m.telefone?.toLowerCase().includes(term)
      );
    }

    if (filterTipoVeiculo !== 'all') {
      filtered = filtered.filter(m => {
        const veiculo = getVeiculoDoMotorista(m.id);
        return veiculo?.tipo_veiculo === filterTipoVeiculo;
      });
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => (m.status || 'disponivel') === filterStatus);
    }

    return filtered.sort((a, b) => {
      const metricasA = getMetricasMotorista(a.nome);
      const metricasB = getMetricasMotorista(b.nome);
      return (metricasB?.totalViagens || 0) - (metricasA?.totalViagens || 0);
    });
  }, [motoristasCadastrados, searchTerm, filterTipoVeiculo, filterStatus, veiculos, metricasMotoristas]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all' || filterStatus !== 'all';

  if (loadingViagens || loadingCadastros) {
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

  const MotoristaDropdownActions = ({ 
    motoristaNome, 
    motoristaCadastrado, 
    veiculo 
  }: { 
    motoristaNome: string;
    motoristaCadastrado?: typeof motoristasCadastrados[0];
    veiculo?: typeof veiculos[0];
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover z-50">
        <MotoristaViagensModal
          motorista={motoristaNome}
          viagens={viagens}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Viagens
            </DropdownMenuItem>
          }
        />
        <DropdownMenuSeparator />
        {motoristaCadastrado ? (
          <>
            <DropdownMenuItem 
              onSelect={() => navigate(`/evento/${eventoId}/vincular-veiculo/${motoristaCadastrado.id}`)}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Vincular Veículo
            </DropdownMenuItem>
            <MotoristaModal 
              motorista={motoristaCadastrado}
              veiculosDisponiveis={veiculos}
              eventoId={eventoId}
              onSave={handleSaveMotorista}
              onUpdate={handleUpdateMotorista}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar Motorista
                </DropdownMenuItem>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  className="text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Motorista
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Confirmar Exclusão
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir <strong>{motoristaNome}</strong>? 
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => handleDeleteMotorista(motoristaCadastrado.id)}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <MotoristaModal 
            defaultName={motoristaNome}
            veiculosDisponiveis={veiculos}
            eventoId={eventoId}
            onSave={handleSaveMotorista}
            onUpdate={handleUpdateMotorista}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Motorista
              </DropdownMenuItem>
            }
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Conteúdo da seção Cadastro
  const CadastroContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre motoristas para facilitar a criação de viagens
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportFromViagens}>
            <Download className="w-4 h-4 mr-2" />
            Importar das Viagens
          </Button>
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Motorista
          </Button>
          <CreateMotoristaWizard
            open={showCreateWizard}
            onOpenChange={setShowCreateWizard}
            veiculos={veiculos}
            onSubmit={async (data) => {
              await handleSaveMotorista({
                nome: data.nome,
                telefone: data.telefone || null,
                veiculo_id: data.veiculo_id || null,
                ativo: true,
              });
              toast.success('Motorista criado com sucesso!');
            }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar motorista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="disponivel">Disponíveis</SelectItem>
              <SelectItem value="em_viagem">Em Viagem</SelectItem>
              <SelectItem value="indisponivel">Indisponíveis</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTipoVeiculo} onValueChange={setFilterTipoVeiculo}>
            <SelectTrigger className="w-[140px]">
              <Truck className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Ônibus">Ônibus</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center border rounded-md ml-2">
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-r-none"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none border-x"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-l-none"
            >
              <Columns className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart} 
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {MOTORISTA_STATUSES.map(status => (
              <MotoristaKanbanColumn
                key={status}
                status={status}
                motoristas={motoristasByStatus[status]}
                veiculos={veiculos}
                metricas={metricasMotoristas}
                ultimasLocalizacoes={ultimasLocalizacoes}
                onDelete={handleDeleteMotorista}
                onVincularVeiculo={(motoristaId) => navigate(`/evento/${eventoId}/vincular-veiculo/${motoristaId}`)}
                onEdit={(motorista) => setEditingMotorista(motorista)}
                onVerViagens={(motorista) => setSelectedMotoristaForViagens(motorista)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeMotorista && (
              <MotoristaKanbanCard
                motorista={activeMotorista}
                metricas={getMetricasMotorista(activeMotorista.nome)}
                veiculo={getVeiculoDoMotorista(activeMotorista.id)}
                ultimaLocalizacao={ultimasLocalizacoes[activeMotorista.nome]}
                onDelete={() => {}}
                onVincularVeiculo={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Card/List Views */}
      {viewMode !== 'kanban' && (
        <>
          {filteredCadastrados.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">
                {hasActiveFilters ? 'Nenhum motorista encontrado' : 'Nenhum motorista cadastrado'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Tente ajustar os filtros de busca.' 
                  : 'Cadastre motoristas ou importe das viagens existentes.'}
              </p>
              {!hasActiveFilters && (
                <MotoristaModal 
                  veiculosDisponiveis={veiculos}
                  eventoId={eventoId}
                  onSave={handleSaveMotorista}
                  onUpdate={handleUpdateMotorista}
                  trigger={
                    <span className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer hover:bg-primary/90">
                      <Plus className="w-4 h-4" />
                      Cadastrar Motorista
                    </span>
                  }
                />
              )}
            </Card>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCadastrados.map((motorista, index) => {
                const veiculo = getVeiculoDoMotorista(motorista.id);
                const metricas = getMetricasMotorista(motorista.nome);
                
                return (
                  <Card key={motorista.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                            {motorista.nome.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{motorista.nome}</CardTitle>
                            {motorista.telefone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {motorista.telefone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {metricas && (
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                          )}
                          <MotoristaDropdownActions 
                            motoristaNome={motorista.nome}
                            motoristaCadastrado={motorista}
                            veiculo={veiculo}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {metricas ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Viagens</span>
                              <span className="font-medium">{metricas.totalViagens}</span>
                            </div>
                            <Progress 
                              value={(metricas.totalViagens / maxViagens) * 100} 
                              className="h-2"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Users className="w-3.5 h-3.5" />
                                <span className="text-xs">PAX</span>
                              </div>
                              <p className="text-lg font-semibold">{metricas.totalPax}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-xs">Tempo Médio</span>
                              </div>
                              <p className="text-lg font-semibold">
                                {formatarMinutos(metricas.tempoMedio)}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          Nenhuma viagem registrada
                        </div>
                      )}

                      <div className="border-t pt-3 space-y-2">
                        {veiculo ? (
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                              <code className="text-xs">{veiculo.placa}</code>
                              <Badge variant="outline" className="text-xs">{veiculo.tipo_veiculo}</Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-muted-foreground text-sm">
                            <Truck className="w-4 h-4" />
                            Sem veículo vinculado
                          </div>
                        )}
                        
                        {motorista.telefone && (
                          <div className="flex items-center justify-between p-2 bg-green-500/10 rounded">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium">{motorista.telefone}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-500/20"
                              onClick={() => {
                                const phone = motorista.telefone?.replace(/\D/g, '');
                                const url = `https://wa.me/55${phone}`;
                                window.open(url, '_blank');
                              }}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              WhatsApp
                            </Button>
                          </div>
                        )}
                        
                        {motorista.atualizado_por && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                            <UserCheck className="w-3 h-3" />
                            <span>
                              Editado por {getName(motorista.atualizado_por)}{' '}
                              {formatDistanceToNow(new Date(motorista.data_atualizacao), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Viagens</TableHead>
                    <TableHead>PAX</TableHead>
                    <TableHead>Tempo Médio</TableHead>
                    <TableHead className="w-[50px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCadastrados.map((motorista, index) => {
                    const veiculo = getVeiculoDoMotorista(motorista.id);
                    const metricas = getMetricasMotorista(motorista.nome);
                    const status = motorista.status || 'disponivel';
                    
                    return (
                      <TableRow key={motorista.id}>
                        <TableCell>
                          <Badge variant="outline">#{index + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {motorista.nome.charAt(0)}
                            </div>
                            {motorista.nome}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              status === 'disponivel' ? 'border-emerald-500 text-emerald-600' :
                              status === 'em_viagem' ? 'border-blue-500 text-blue-600' :
                              status === 'indisponivel' ? 'border-amber-500 text-amber-600' :
                              'border-gray-500 text-gray-600'
                            }
                          >
                            {status === 'disponivel' ? 'Disponível' :
                             status === 'em_viagem' ? 'Em Viagem' :
                             status === 'indisponivel' ? 'Indisponível' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {motorista.telefone || '-'}
                        </TableCell>
                        <TableCell>
                          {veiculo ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">{veiculo.placa}</code>
                              <Badge variant="outline" className="text-xs">{veiculo.tipo_veiculo}</Badge>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{metricas?.totalViagens || 0}</TableCell>
                        <TableCell>{metricas?.totalPax || 0}</TableCell>
                        <TableCell>{metricas ? formatarMinutos(metricas.tempoMedio) : '-'}</TableCell>
                        <TableCell>
                          <MotoristaDropdownActions 
                            motoristaNome={motorista.nome}
                            motoristaCadastrado={motorista}
                            veiculo={veiculo}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

    </div>
  );

  // Conteúdo da seção Missões - hooks já declarados no topo do componente
  const filteredMissoes = useMemo(() => {
    if (missaoFilter === 'all') return missoes;
    return missoes.filter(m => m.status === missaoFilter);
  }, [missoes, missaoFilter]);

  const handleSaveMissao = async (data: any) => {
    if (editingMissao) {
      await updateMissao(editingMissao.id, data);
    } else {
      await createMissao(data);
    }
    setShowMissaoModal(false);
    setEditingMissao(null);
  };

  const handleDeleteMissao = async (id: string) => {
    await deleteMissao(id);
  };

  const MissoesContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Missões</h1>
          <p className="text-sm text-muted-foreground">
            Designe missões específicas para motoristas
          </p>
        </div>
        <Button onClick={() => { setEditingMissao(null); setShowMissaoModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Missão
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={missaoFilter} onValueChange={setMissaoFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aceita">Aceitas</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadingMissoes ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredMissoes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma missão encontrada</p>
          <p className="text-sm">Crie uma missão para designar um motorista</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissoes.map(missao => {
            const motorista = motoristasCadastrados.find(m => m.id === missao.motorista_id);
            return (
              <MissaoCard
                key={missao.id}
                missao={missao}
                motoristaNome={motorista?.nome || 'Motorista não encontrado'}
                onEdit={() => { setEditingMissao(missao); setShowMissaoModal(true); }}
                onDelete={() => handleDeleteMissao(missao.id)}
                onStatusChange={(status) => updateMissao(missao.id, { status: status as MissaoStatus })}
              />
            );
          })}
        </div>
      )}

      <MissaoModal
        open={showMissaoModal}
        onOpenChange={(open) => { setShowMissaoModal(open); if (!open) setEditingMissao(null); }}
        missao={editingMissao}
        motoristas={motoristasCadastrados}
        pontos={pontosEmbarque}
        onSave={handleSaveMissao}
      />
    </div>
  );

  return (
    <EventLayout>
      <div className="flex h-full">
        <InnerSidebar 
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          storageKey="motoristas-sidebar-collapsed"
        />
        <div className="flex-1 p-6 overflow-auto">
          {activeSection === 'auditoria' && (
            <MotoristasAuditoria viagens={viagens} motoristasCadastrados={motoristasCadastrados} veiculos={veiculos} />
          )}
          {activeSection === 'cadastro' && <CadastroContent />}
          {activeSection === 'missoes' && <MissoesContent />}
        </div>
      </div>
    </EventLayout>
  );
}
