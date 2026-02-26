import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, TrendingUp, Plus, Truck, Phone, LayoutGrid, List, Pencil, MoreVertical, Trash2, AlertTriangle, Search, Filter, X, Eye, MessageCircle, Download, UserCheck, FileBarChart, Link2, Columns, UserPlus, User, CheckCircle, XCircle, LogIn, LogOut, Play, RotateCcw } from 'lucide-react';
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
import { useViagensAuditoria } from '@/hooks/useViagensAuditoria';
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
import { EscalasAuditoria } from '@/components/motoristas/EscalasAuditoria';

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';

import { EditarLocalizacaoModal } from '@/components/motoristas/EditarLocalizacaoModal';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEquipe } from '@/hooks/useEquipe';

const sections: InnerSidebarSection[] = [
  { id: 'cadastro', label: 'Motoristas', icon: Users },
  { id: 'auditoria', label: 'Auditoria', icon: FileBarChart },
  { id: 'escalas', label: 'Escalas', icon: Clock },
];

const MOTORISTA_STATUSES = ['disponivel', 'em_viagem', 'indisponivel', 'inativo', 'expediente_encerrado'] as const;

export default function Motoristas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('cadastro');
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVinculo, setFilterVinculo] = useState<string>('all');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  const [activeMotorista, setActiveMotorista] = useState<Motorista | null>(null);
  
  const { getEventoById } = useEventos();
  const { getAgoraSync } = useServerTime();
  const evento = eventoId ? getEventoById(eventoId) : null;
  const viagensOptions = useMemo(() => ({
    dataOperacional: getDataOperacional(getAgoraSync(), evento?.horario_virada_dia || '04:00'),
    horarioVirada: evento?.horario_virada_dia || '04:00',
  }), [evento?.horario_virada_dia]);
  const { viagens, loading: loadingViagens, refetch } = useViagens(eventoId, viagensOptions);
  const { viagens: viagensAuditoria } = useViagensAuditoria(eventoId);
  const { motoristas: metricasMotoristas } = useCalculos(viagens);
  const { motoristas: motoristasCadastrados, loading: loadingCadastros, createMotorista, updateMotorista, deleteMotorista, refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos, refetch: refetchVeiculos } = useVeiculos(eventoId);
  // useEventos already called above for getEventoById
  const { membros: equipeMembros, handleCheckin, handleCheckout, refetch: refetchEquipe } = useEquipe(eventoId);
  const { pontos: pontosEmbarque } = usePontosEmbarque(eventoId);

  // Realtime subscription para atualização automática do status
  // CONSOLIDATED: Single channel for motoristas + presença (was separate channel)
  useEffect(() => {
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (!isValidUUID) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refetchMotoristas();
        refetchEquipe();
      }, 3000); // 3s debounce (increased from 2s)
    };

    // Single consolidated channel for motoristas page
    const channel = supabase
      .channel(`motoristas-consolidated-${eventoId}`)
      .on('postgres_changes', { 
        event: '*', schema: 'public', table: 'motoristas',
        filter: `evento_id=eq.${eventoId}`
      }, debouncedRefetch)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'motorista_presenca',
        filter: `evento_id=eq.${eventoId}`
      }, debouncedRefetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [eventoId, refetchMotoristas, refetchEquipe]);

  const userIds = useMemo(() => 
    motoristasCadastrados.flatMap(m => [m.criado_por, m.atualizado_por]),
    [motoristasCadastrados]
  );
  const { getName } = useUserNames(userIds);

  const maxViagens = Math.max(...metricasMotoristas.map(m => m.totalViagens), 1);

  const handleSaveMotorista = async (data: { 
    nome: string; 
    telefone: string | null; 
    veiculo_id: string | null; 
    ativo: boolean; 
    evento_id?: string 
  }): Promise<string | undefined> => {
    const created = await createMotorista({
      nome: data.nome,
      telefone: data.telefone,
      veiculo_id: data.veiculo_id,
      ativo: data.ativo,
      cnh: null,
      observacao: null,
    });
    refetchMotoristas();
    refetchVeiculos();
    return created?.id;
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

  // Get presença data for a motorista from useEquipe
  const getPresenca = (motoristaId: string) => {
    const membro = equipeMembros.find(m => m.tipo === 'motorista' && m.id === motoristaId);
    return membro ? { checkin_at: membro.checkin_at, checkout_at: membro.checkout_at } : null;
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
    if (!motorista) return;

    const statusLabels: Record<string, string> = {
      disponivel: 'Disponíveis',
      em_viagem: 'Em Viagem',
      indisponivel: 'Indisponíveis',
      inativo: 'Inativos',
      expediente_encerrado: 'Expediente Encerrado',
    };

    try {
      if (newStatus === 'expediente_encerrado') {
        // Dragging to "expediente encerrado" triggers checkout
        await handleCheckout(motoristaId);
        toast.success(`${motorista.nome} movido para Expediente Encerrado`);
      } else {
        // If coming from expediente_encerrado or inativo, may need checkin
        const presenca = getPresenca(motoristaId);
        if (!presenca?.checkin_at || presenca?.checkout_at) {
          // Needs checkin first
          await handleCheckin(motoristaId);
        }
        await updateMotorista(motoristaId, { status: newStatus }, motorista.nome);
        toast.success(`${motorista.nome} movido para ${statusLabels[newStatus] || newStatus}`);
      }
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  };

  // Group motoristas by status for kanban - applying search filters
  // Logic: presence-based grouping using check-in/check-out data
  const motoristasByStatus = useMemo(() => {
    const grouped: Record<string, Motorista[]> = {
      disponivel: [],
      em_viagem: [],
      indisponivel: [],
      inativo: [],
      expediente_encerrado: [],
    };

    // Apply the same filters as filteredCadastrados
    let filtered = [...motoristasCadastrados];

    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
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

    filtered.forEach(m => {
      // Motoristas inativos (desativados) always go to inativo
      if (m.ativo === false) {
        grouped.inativo.push(m);
        return;
      }

      const presenca = getPresenca(m.id);

      if (presenca?.checkout_at) {
        // Has checkout -> expediente encerrado
        grouped.expediente_encerrado.push(m);
      } else if (presenca?.checkin_at) {
        // Has checkin, no checkout -> use real status
        const status = m.status || 'disponivel';
        if (grouped[status]) {
          grouped[status].push(m);
        } else {
          grouped.disponivel.push(m);
        }
      } else {
        // No checkin today -> inativo
        grouped.inativo.push(m);
      }
    });

    return grouped;
  }, [motoristasCadastrados, deferredSearchTerm, filterTipoVeiculo, filterStatus, veiculos, equipeMembros]);

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
  const [editLocMotorista, setEditLocMotorista] = useState<Motorista | null>(null);
  
  const { user } = useAuth();
  // getAgoraSync already declared above

  // Handler para atualizar localização manualmente
  const handleUpdateLocalizacao = async (motoristaId: string, novaLocalizacao: string) => {
    const { error } = await supabase
      .from('motoristas')
      .update({ 
        ultima_localizacao: novaLocalizacao,
        ultima_localizacao_at: getAgoraSync().toISOString(), // ✅ Usa hora sincronizada
        atualizado_por: user?.id || null
      })
      .eq('id', motoristaId);
    
    if (error) {
      toast.error('Erro ao atualizar localização');
      throw error;
    }
    
    toast.success('Localização atualizada');
    refetchMotoristas();
  };

  // Handler para liberar check-in (preserva registro anterior, apenas libera status)
  const handleLiberarCheckin = async (motoristaId: string) => {
    if (!eventoId) return;

    try {
      // Apenas atualiza o status do motorista para disponível
      // O registro antigo com checkout permanece intacto
      await supabase
        .from('motoristas')
        .update({ status: 'disponivel' })
        .eq('id', motoristaId);

      toast.success('Check-in liberado! Motorista pode fazer check-in novamente.');
      refetchEquipe();
      refetchMotoristas();
    } catch (error: any) {
      toast.error(`Erro ao liberar check-in: ${error.message}`);
    }
  };

  const filteredCadastrados = useMemo(() => {
    let filtered = [...motoristasCadastrados];

    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
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

    if (filterVinculo === 'com_veiculo') {
      filtered = filtered.filter(m => m.veiculo_id !== null);
    } else if (filterVinculo === 'sem_veiculo') {
      filtered = filtered.filter(m => m.veiculo_id === null);
    }

    if (filterAtivo === 'ativo') {
      filtered = filtered.filter(m => m.ativo !== false);
    } else if (filterAtivo === 'inativo') {
      filtered = filtered.filter(m => m.ativo === false);
    }

    return filtered.sort((a, b) => {
      const metricasA = getMetricasMotorista(a.nome);
      const metricasB = getMetricasMotorista(b.nome);
      return (metricasB?.totalViagens || 0) - (metricasA?.totalViagens || 0);
    });
  }, [motoristasCadastrados, deferredSearchTerm, filterTipoVeiculo, filterStatus, filterVinculo, filterAtivo, veiculos, metricasMotoristas]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
    setFilterStatus('all');
    setFilterVinculo('all');
    setFilterAtivo('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all' || filterStatus !== 'all' || filterVinculo !== 'all' || filterAtivo !== 'all';
  
  const isLoading = loadingViagens || loadingCadastros;

  const MotoristaDropdownActions = ({
    motoristaNome, 
    motoristaCadastrado, 
    veiculo,
    presenca: presencaData,
    onLiberarCheckin,
  }: { 
    motoristaNome: string;
    motoristaCadastrado?: typeof motoristasCadastrados[0];
    veiculo?: typeof veiculos[0];
    presenca?: { checkin_at?: string | null; checkout_at?: string | null } | null;
    onLiberarCheckin?: () => void;
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
          motoristaId={motoristaCadastrado?.id}
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
              {motoristaCadastrado.veiculo_id ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Trocar Veículo
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Vincular Veículo
                </>
              )}
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
        {/* Liberar Check-in: só aparece quando tem checkout (jornada encerrada) */}
        {motoristaCadastrado && presencaData?.checkin_at && presencaData?.checkout_at && onLiberarCheckin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLiberarCheckin}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Liberar Check-in
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Conteúdo da seção Cadastro (agora focado em gestão operacional)
  const cadastroContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie status e acompanhe motoristas em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/evento/${eventoId}/equipe`)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar via Equipe
          </Button>
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
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Ônibus">Ônibus</SelectItem>
              <SelectItem value="Sedan">Sedan</SelectItem>
              <SelectItem value="SUV">SUV</SelectItem>
              <SelectItem value="Blindado">Blindado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterVinculo} onValueChange={setFilterVinculo}>
            <SelectTrigger className="w-[160px]">
              <Link2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Vínculo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vínculos</SelectItem>
              <SelectItem value="com_veiculo">Com veículo</SelectItem>
              <SelectItem value="sem_veiculo">Sem veículo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAtivo} onValueChange={setFilterAtivo}>
            <SelectTrigger className="w-[140px]">
              <UserCheck className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
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
                onEditLocalizacao={(motorista) => setEditLocMotorista(motorista)}
                getPresenca={getPresenca}
                onCheckin={handleCheckin}
                onCheckout={handleCheckout}
                onLiberarCheckin={handleLiberarCheckin}
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
                            presenca={getPresenca(motorista.id)}
                            onLiberarCheckin={() => handleLiberarCheckin(motorista.id)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {metricas ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Viagens</span>
                            <span className="font-medium">{metricas.totalViagens}</span>
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
                              {veiculo.nome ? (
                                <>
                                  <span className="text-xs font-medium">{veiculo.nome}</span>
                                  <code className="text-[10px] text-muted-foreground">{veiculo.placa}</code>
                                </>
                              ) : (
                                <code className="text-xs">{veiculo.placa}</code>
                              )}
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

                        {/* Check-in / Check-out */}
                        {(() => {
                          const presenca = getPresenca(motorista.id);
                          return (
                            <div className="flex items-center gap-2 mt-2">
                              {!presenca?.checkin_at ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                  onClick={() => handleCheckin(motorista.id)}
                                >
                                  <LogIn className="w-3.5 h-3.5 mr-1" />
                                  Check-in
                                </Button>
                              ) : presenca.checkout_at ? (
                                <div className="flex-1 text-center text-xs text-muted-foreground">
                                  <CheckCircle className="w-4 h-4 inline mr-1 text-emerald-500" />
                                  Jornada encerrada
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      Entrada: {new Date(presenca.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                    onClick={() => handleCheckout(motorista.id)}
                                  >
                                    <LogOut className="w-3.5 h-3.5 mr-1" />
                                    Check-out
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        })()}
                        
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
                    <TableHead>Presença</TableHead>
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
                          {(() => {
                            const presenca = getPresenca(motorista.id);
                            if (!presenca?.checkin_at) {
                              return (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                  onClick={() => handleCheckin(motorista.id)}
                                >
                                  <LogIn className="w-3 h-3 mr-1" />
                                  Check-in
                                </Button>
                              );
                            }
                            if (presenca.checkout_at) {
                              return (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  Encerrado
                                </span>
                              );
                            }
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-emerald-600">
                                  {new Date(presenca.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-6 text-[10px] px-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                  onClick={() => handleCheckout(motorista.id)}
                                >
                                  <LogOut className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })()}
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
                              {veiculo.nome ? (
                                <>
                                  <span className="text-sm font-medium">{veiculo.nome}</span>
                                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground">{veiculo.placa}</code>
                                </>
                              ) : (
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">{veiculo.placa}</code>
                              )}
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
                            presenca={getPresenca(motorista.id)}
                            onLiberarCheckin={() => handleLiberarCheckin(motorista.id)}
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

  return (
    <EventLayout>
      {isLoading ? (
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden">
          <InnerSidebar 
            sections={sections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            storageKey="motoristas-sidebar-collapsed"
          />
          <div className="flex-1 p-6 overflow-auto min-h-0">
            <div className={activeSection === 'auditoria' ? 'block' : 'hidden'}>
              <MotoristasAuditoria viagens={viagensAuditoria} motoristasCadastrados={motoristasCadastrados} veiculos={veiculos} />
            </div>
            <div className={activeSection === 'escalas' ? 'block' : 'hidden'}>
              <EscalasAuditoria eventoId={eventoId} evento={evento} motoristas={motoristasCadastrados} veiculos={veiculos} />
            </div>
            <div className={activeSection === 'cadastro' ? 'block' : 'hidden'}>
              {cadastroContent}
            </div>
          </div>
        </div>
      )}

      {/* Wizard de criação de motorista */}
      <CreateMotoristaWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        veiculos={veiculos}
        eventoId={eventoId || ''}
        onSubmit={async (data) => {
          const id = await handleSaveMotorista({
            nome: data.nome,
            telefone: data.telefone || null,
            veiculo_id: data.veiculo_id || null,
            ativo: true,
            evento_id: eventoId,
          });
          return id;
        }}
      />

      {/* Modal para editar localização */}
      <EditarLocalizacaoModal
        open={!!editLocMotorista}
        onOpenChange={(open) => !open && setEditLocMotorista(null)}
        motorista={editLocMotorista}
        pontosEmbarque={pontosEmbarque}
        localizacaoAtual={editLocMotorista ? (ultimasLocalizacoes[editLocMotorista.nome] || (editLocMotorista as any).ultima_localizacao || null) : null}
        onSave={handleUpdateLocalizacao}
      />
    </EventLayout>
  );
}
