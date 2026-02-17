import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { Veiculo } from '@/hooks/useCadastros';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Users, 
  Car, 
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  User,
  Fuel
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupervisorMotoristaCard } from './SupervisorMotoristaCard';
import { VeiculoCardSupervisor } from './VeiculoCardSupervisor';
import { VistoriaVeiculoWizard } from './VistoriaVeiculoWizard';
import { EditarLocalizacaoModal } from '@/components/motoristas/EditarLocalizacaoModal';

interface SupervisorFrotaTabProps {
  eventoId: string;
}

type MotoristaFilterType = 'disponivel' | 'em_viagem' | 'sem_veiculo' | null;
type VeiculoFilterType = 'liberado' | 'pendente' | 'em_inspecao' | 'manutencao' | 'abastecimento' | null;

export function SupervisorFrotaTab({ eventoId }: SupervisorFrotaTabProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getAgoraSync } = useServerTime();
  const [subTab, setSubTab] = useState<'motoristas' | 'veiculos'>('motoristas');
  const [searchTerm, setSearchTerm] = useState('');
  const { pontos } = usePontosEmbarque(eventoId);
  
  // Filter states
  const [motoristaFilter, setMotoristaFilter] = useState<MotoristaFilterType>(null);
  const [veiculoFilter, setVeiculoFilter] = useState<VeiculoFilterType>(null);
  
  // Motoristas state
  const { motoristas, loading: loadingMotoristas, refetch: refetchMotoristas } = useLocalizadorMotoristas(eventoId);
  const [editLocationMotorista, setEditLocationMotorista] = useState<MotoristaComVeiculo | null>(null);
  
  // Veículos state
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loadingVeiculos, setLoadingVeiculos] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);

  // Fetch veículos
  useEffect(() => {
    const fetchVeiculos = async () => {
      if (!eventoId) return;
      
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('evento_id', eventoId)
        .eq('ativo', true)
        .order('data_criacao', { ascending: false });
      
      if (!error) {
        setVeiculos(data || []);
      }
      setLoadingVeiculos(false);
    };
    fetchVeiculos();
  }, [eventoId]);

  const refetchVeiculos = async () => {
    const { data } = await supabase
      .from('veiculos')
      .select('*')
      .eq('evento_id', eventoId)
      .eq('ativo', true)
      .order('data_criacao', { ascending: false });
    
    if (data) setVeiculos(data);
  };

  // Handlers for motoristas
  const handleEditLocation = (motorista: MotoristaComVeiculo) => {
    setEditLocationMotorista(motorista);
  };

  const handleLinkVehicle = (motorista: MotoristaComVeiculo) => {
    navigate(`/app/${eventoId}/vincular-veiculo/${motorista.id}`);
  };

  const handleUnlinkVehicle = async (motorista: MotoristaComVeiculo) => {
    const veiculoId = motorista.veiculo_id;
    const veiculoPlaca = motorista.veiculo?.placa || '';

    const { error } = await supabase
      .from('motoristas')
      .update({ 
        veiculo_id: null,
        atualizado_por: user?.id 
      })
      .eq('id', motorista.id);
    
    if (error) {
      toast.error('Erro ao desvincular veículo');
      return;
    }

    // Limpar motorista_id no veículo (desvinculação bidirecional) + registrar histórico
    const promises: PromiseLike<any>[] = [];
    
    if (veiculoId) {
      promises.push(
        supabase
          .from('veiculos')
          .update({ motorista_id: null, atualizado_por: user?.id })
          .eq('id', veiculoId)
          .then()
      );
      
      // Registrar desvinculação no histórico
      promises.push(
        supabase
          .from('veiculo_vistoria_historico')
          .insert({
            evento_id: eventoId,
            veiculo_id: veiculoId,
            tipo_vistoria: 'desvinculacao',
            status_novo: 'liberado',
            motorista_id: motorista.id,
            motorista_nome: motorista.nome,
            realizado_por_nome: `Supervisor`,
            observacoes: `Desvinculação via app supervisor - ${veiculoPlaca}`,
          })
          .then()
      );
    }

    await Promise.all(promises);

    toast.success('Veículo desvinculado');
    refetchMotoristas();
    refetchVeiculos();
  };

  // Handlers for veículos
  const handleStatusChange = async (veiculoId: string, newStatus: string) => {
    const { error } = await supabase
      .from('veiculos')
      .update({
        status: newStatus,
        atualizado_por: user?.id,
        liberado_em: newStatus === 'liberado' ? getAgoraSync().toISOString() : null,
        liberado_por: newStatus === 'liberado' ? user?.id : null,
      })
      .eq('id', veiculoId);
    
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(`Status atualizado`);
      refetchVeiculos();
    }
  };

  const handleReInspecao = (veiculo: Veiculo) => {
    setSelectedVeiculo(veiculo);
    setWizardOpen(true);
  };

  const handleEditNome = async (veiculoId: string, novoNome: string) => {
    const { error } = await supabase
      .from('veiculos')
      .update({ nome: novoNome || null, atualizado_por: user?.id })
      .eq('id', veiculoId);
    
    if (error) {
      toast.error('Erro ao atualizar nome');
    } else {
      toast.success('Nome atualizado');
      refetchVeiculos();
    }
  };

  // Stats
  const activeMotoristas = motoristas.filter(m => m.ativo !== false);
  const motoristasStats = {
    disponivel: activeMotoristas.filter(m => m.status === 'disponivel').length,
    em_viagem: activeMotoristas.filter(m => m.status === 'em_viagem').length,
    sem_veiculo: activeMotoristas.filter(m => !m.veiculo).length,
  };

  const veiculosStats = {
    liberados: veiculos.filter(v => v.status === 'liberado').length,
    pendentes: veiculos.filter(v => v.status === 'pendente').length,
    emInspecao: veiculos.filter(v => v.status === 'em_inspecao').length,
    manutencao: veiculos.filter(v => v.status === 'manutencao').length,
    abastecimento: veiculos.filter(v => v.status === 'abastecimento').length,
  };

  // Filtered data - text search first
  const textFilteredMotoristas = activeMotoristas.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.telefone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.veiculo?.placa?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Then apply status filter
  const displayedMotoristas = motoristaFilter
    ? textFilteredMotoristas.filter(m => {
        if (motoristaFilter === 'disponivel') return m.status === 'disponivel';
        if (motoristaFilter === 'em_viagem') return m.status === 'em_viagem';
        if (motoristaFilter === 'sem_veiculo') return !m.veiculo;
        return true;
      })
    : textFilteredMotoristas;

  const textFilteredVeiculos = veiculos.filter(v =>
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.tipo_veiculo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Then apply status filter for veiculos
  const displayedVeiculos = veiculoFilter
    ? textFilteredVeiculos.filter(v => v.status === veiculoFilter)
    : textFilteredVeiculos;

  const groupedVeiculos = {
    pendente: displayedVeiculos.filter(v => v.status === 'pendente'),
    em_inspecao: displayedVeiculos.filter(v => v.status === 'em_inspecao'),
    liberado: displayedVeiculos.filter(v => v.status === 'liberado'),
    manutencao: displayedVeiculos.filter(v => v.status === 'manutencao'),
    abastecimento: displayedVeiculos.filter(v => v.status === 'abastecimento'),
  };

  const isLoading = subTab === 'motoristas' ? loadingMotoristas : loadingVeiculos;

  // Toggle filter helpers
  const toggleMotoristaFilter = (filter: MotoristaFilterType) => {
    setMotoristaFilter(prev => prev === filter ? null : filter);
  };

  const toggleVeiculoFilter = (filter: VeiculoFilterType) => {
    setVeiculoFilter(prev => prev === filter ? null : filter);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex bg-muted rounded-lg p-1">
          <Skeleton className="flex-1 h-9" />
          <Skeleton className="flex-1 h-9" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex bg-muted rounded-lg p-1">
        <button 
          onClick={() => {
            setSubTab('motoristas');
            setSearchTerm('');
          }}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2",
            subTab === 'motoristas' && "bg-background shadow"
          )}
        >
          <Users className="h-4 w-4" /> Motoristas
        </button>
        <button 
          onClick={() => {
            setSubTab('veiculos');
            setSearchTerm('');
          }}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2",
            subTab === 'veiculos' && "bg-background shadow"
          )}
        >
          <Car className="h-4 w-4" /> Veículos
        </button>
      </div>

      {/* Stats - Now clickable filters */}
      {subTab === 'motoristas' ? (
        <div className="grid grid-cols-3 gap-2">
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              motoristaFilter === 'disponivel' 
                ? "ring-2 ring-emerald-500 border-emerald-500" 
                : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
            )}
            onClick={() => toggleMotoristaFilter('disponivel')}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{motoristasStats.disponivel}</p>
              <p className="text-[10px] text-muted-foreground">Disponíveis</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              motoristaFilter === 'em_viagem' 
                ? "ring-2 ring-blue-500 border-blue-500" 
                : "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50"
            )}
            onClick={() => toggleMotoristaFilter('em_viagem')}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{motoristasStats.em_viagem}</p>
              <p className="text-[10px] text-muted-foreground">Em Viagem</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              motoristaFilter === 'sem_veiculo' 
                ? "ring-2 ring-amber-500 border-amber-500" 
                : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
            )}
            onClick={() => toggleMotoristaFilter('sem_veiculo')}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-amber-600">{motoristasStats.sem_veiculo}</p>
              <p className="text-[10px] text-muted-foreground">Sem Veículo</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              veiculoFilter === 'liberado' 
                ? "ring-2 ring-emerald-500 border-emerald-500" 
                : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
            )}
            onClick={() => toggleVeiculoFilter('liberado')}
          >
            <CardContent className="p-2 text-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto mb-0.5" />
              <p className="text-lg font-bold text-emerald-600">{veiculosStats.liberados}</p>
              <p className="text-[9px] text-muted-foreground">Liberados</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              veiculoFilter === 'pendente' 
                ? "ring-2 ring-destructive border-destructive" 
                : "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
            )}
            onClick={() => toggleVeiculoFilter('pendente')}
          >
            <CardContent className="p-2 text-center">
              <AlertTriangle className="h-4 w-4 text-destructive mx-auto mb-0.5" />
              <p className="text-lg font-bold text-destructive">{veiculosStats.pendentes}</p>
              <p className="text-[9px] text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              veiculoFilter === 'em_inspecao' 
                ? "ring-2 ring-amber-500 border-amber-500" 
                : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
            )}
            onClick={() => toggleVeiculoFilter('em_inspecao')}
          >
            <CardContent className="p-2 text-center">
              <Clock className="h-4 w-4 text-amber-600 mx-auto mb-0.5" />
              <p className="text-lg font-bold text-amber-600">{veiculosStats.emInspecao}</p>
              <p className="text-[9px] text-muted-foreground">Inspeção</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              veiculoFilter === 'manutencao' 
                ? "ring-2 ring-muted-foreground border-muted-foreground" 
                : "border-muted bg-muted/20 hover:border-muted-foreground/50"
            )}
            onClick={() => toggleVeiculoFilter('manutencao')}
          >
            <CardContent className="p-2 text-center">
              <Wrench className="h-4 w-4 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-lg font-bold">{veiculosStats.manutencao}</p>
              <p className="text-[9px] text-muted-foreground">Manutenção</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all active:scale-95",
              veiculoFilter === 'abastecimento' 
                ? "ring-2 ring-orange-500 border-orange-500" 
                : "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50"
            )}
            onClick={() => toggleVeiculoFilter('abastecimento')}
          >
            <CardContent className="p-2 text-center">
              <Fuel className="h-4 w-4 text-orange-600 mx-auto mb-0.5" />
              <p className="text-lg font-bold text-orange-600">{veiculosStats.abastecimento}</p>
              <p className="text-[9px] text-muted-foreground">Abastec.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active filter indicator */}
      {(subTab === 'motoristas' && motoristaFilter) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtro:</span>
          <button 
            onClick={() => setMotoristaFilter(null)}
            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
          >
            {motoristaFilter === 'disponivel' && 'Disponíveis'}
            {motoristaFilter === 'em_viagem' && 'Em Viagem'}
            {motoristaFilter === 'sem_veiculo' && 'Sem Veículo'}
            <span className="ml-1">×</span>
          </button>
        </div>
      )}
      {(subTab === 'veiculos' && veiculoFilter) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtro:</span>
          <button 
            onClick={() => setVeiculoFilter(null)}
            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
          >
            {veiculoFilter === 'liberado' && 'Liberados'}
            {veiculoFilter === 'pendente' && 'Pendentes'}
            {veiculoFilter === 'em_inspecao' && 'Em Inspeção'}
            {veiculoFilter === 'manutencao' && 'Manutenção'}
            {veiculoFilter === 'abastecimento' && 'Abastecimento'}
            <span className="ml-1">×</span>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={subTab === 'motoristas' ? "Buscar motorista..." : "Buscar veículo..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {subTab === 'motoristas' ? (
        <div className="space-y-3">
          {displayedMotoristas.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {motoristaFilter ? 'Nenhum motorista neste filtro' : 'Nenhum motorista encontrado'}
              </p>
            </div>
          ) : (
            displayedMotoristas
              .sort((a, b) => {
                // Sem veículo primeiro, depois em viagem, depois disponíveis
                if (!a.veiculo && b.veiculo) return -1;
                if (a.veiculo && !b.veiculo) return 1;
                const order = { em_viagem: 0, disponivel: 1 };
                const orderA = order[a.status as keyof typeof order] ?? 2;
                const orderB = order[b.status as keyof typeof order] ?? 2;
                if (orderA !== orderB) return orderA - orderB;
                return a.nome.localeCompare(b.nome);
              })
              .map(motorista => (
                <SupervisorMotoristaCard
                  key={motorista.id}
                  motorista={motorista}
                  onEditLocation={handleEditLocation}
                  onLinkVehicle={handleLinkVehicle}
                  onUnlinkVehicle={handleUnlinkVehicle}
                />
              ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* When filter is active, show flat list */}
          {veiculoFilter ? (
            <div className="space-y-2">
              {displayedVeiculos.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum veículo neste filtro</p>
                </div>
              ) : (
                displayedVeiculos.map(veiculo => (
                  <VeiculoCardSupervisor
                    key={veiculo.id}
                    veiculo={veiculo}
                    onStatusChange={handleStatusChange}
                    onReInspecao={handleReInspecao}
                    onEditNome={handleEditNome}
                  />
                ))
              )}
            </div>
          ) : (
            <>
              {/* Pendentes primeiro */}
              {groupedVeiculos.pendente.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Pendentes ({groupedVeiculos.pendente.length})
                  </h3>
                  <div className="space-y-2">
                    {groupedVeiculos.pendente.map(veiculo => (
                      <VeiculoCardSupervisor
                        key={veiculo.id}
                        veiculo={veiculo}
                        onStatusChange={handleStatusChange}
                        onReInspecao={handleReInspecao}
                        onEditNome={handleEditNome}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Em Inspeção */}
              {groupedVeiculos.em_inspecao.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-600">
                    <Clock className="h-4 w-4" />
                    Em Inspeção ({groupedVeiculos.em_inspecao.length})
                  </h3>
                  <div className="space-y-2">
                    {groupedVeiculos.em_inspecao.map(veiculo => (
                      <VeiculoCardSupervisor
                        key={veiculo.id}
                        veiculo={veiculo}
                        onStatusChange={handleStatusChange}
                        onReInspecao={handleReInspecao}
                        onEditNome={handleEditNome}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Liberados */}
              {groupedVeiculos.liberado.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Liberados ({groupedVeiculos.liberado.length})
                  </h3>
                  <div className="space-y-2">
                    {groupedVeiculos.liberado.map(veiculo => (
                      <VeiculoCardSupervisor
                        key={veiculo.id}
                        veiculo={veiculo}
                        onStatusChange={handleStatusChange}
                        onReInspecao={handleReInspecao}
                        onEditNome={handleEditNome}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Manutenção */}
              {groupedVeiculos.manutencao.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    Manutenção ({groupedVeiculos.manutencao.length})
                  </h3>
                  <div className="space-y-2">
                    {groupedVeiculos.manutencao.map(veiculo => (
                      <VeiculoCardSupervisor
                        key={veiculo.id}
                        veiculo={veiculo}
                        onStatusChange={handleStatusChange}
                        onReInspecao={handleReInspecao}
                        onEditNome={handleEditNome}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Abastecimento */}
              {groupedVeiculos.abastecimento.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-orange-600">
                    <Fuel className="h-4 w-4" />
                    Abastecimento ({groupedVeiculos.abastecimento.length})
                  </h3>
                  <div className="space-y-2">
                    {groupedVeiculos.abastecimento.map(veiculo => (
                      <VeiculoCardSupervisor
                        key={veiculo.id}
                        veiculo={veiculo}
                        onStatusChange={handleStatusChange}
                        onReInspecao={handleReInspecao}
                        onEditNome={handleEditNome}
                      />
                    ))}
                  </div>
                </div>
              )}

              {displayedVeiculos.length === 0 && (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum veículo encontrado</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de edição de localização */}
      {editLocationMotorista && (
        <EditarLocalizacaoModal
          open={!!editLocationMotorista}
          onOpenChange={() => setEditLocationMotorista(null)}
          motorista={editLocationMotorista}
          pontosEmbarque={pontos}
          localizacaoAtual={editLocationMotorista.ultima_localizacao || null}
          onSave={async (motoristaId: string, novaLocalizacao: string) => {
            const { error } = await supabase
              .from('motoristas')
              .update({ 
                ultima_localizacao: novaLocalizacao,
                ultima_localizacao_at: new Date().toISOString(),
                atualizado_por: user?.id 
              })
              .eq('id', motoristaId);
            
            if (error) {
              toast.error('Erro ao atualizar localização');
              throw error;
            }
            toast.success('Localização atualizada');
            refetchMotoristas();
          }}
        />
      )}

      {/* Wizard de Vistoria */}
      <VistoriaVeiculoWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        eventoId={eventoId}
        veiculoExistente={selectedVeiculo}
        onComplete={() => {
          refetchVeiculos();
          setSelectedVeiculo(null);
        }}
      />
    </div>
  );
}
