import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, Users, Clock, Search, Filter, X, LayoutGrid, List, Plus, Pencil, Trash2, MoreVertical, Truck, Download, UserCheck, Gauge, FileBarChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EventLayout } from '@/components/layout/EventLayout';
import { InnerSidebar, InnerSidebarSection } from '@/components/layout/InnerSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useVeiculos, useMotoristas } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { useUserNames } from '@/hooks/useUserNames';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { VeiculoModal } from '@/components/cadastros/CadastroModals';
import { CreateVeiculoWizard } from '@/components/veiculos/CreateVeiculoWizard';
import { VeiculoStatusBadge, FuelIndicator, AvariaIndicator } from '@/components/veiculos/VeiculoStatusBadge';
import { VeiculosAuditoria } from '@/components/veiculos/VeiculosAuditoria';
import { Viagem } from '@/lib/types/viagem';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VeiculoStats {
  placa: string | null;
  tipoVeiculo: string | null;
  totalViagens: number;
  totalPax: number;
  tempoMedio: number;
  ultimaViagem: Viagem | null;
  ativo: boolean;
}

const sections: InnerSidebarSection[] = [
  { id: 'cadastro', label: 'Veículos', icon: Truck },
  { id: 'auditoria', label: 'Auditoria', icon: FileBarChart },
];

export default function Veiculos() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [activeSection, setActiveSection] = useState<string>('cadastro');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  
  const { viagens, loading: loadingViagens, lastUpdate, refetch } = useViagens(eventoId);
  const { viagensAtivas } = useCalculos(viagens);
  const { veiculos, loading: loadingVeiculos, createVeiculo, updateVeiculo, deleteVeiculo, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const { motoristas } = useMotoristas(eventoId);
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

  const veiculosStats: VeiculoStats[] = useMemo(() => {
    const stats: VeiculoStats[] = [];
    const placas = [...new Set(viagens.map(v => v.placa))];
    
    placas.forEach(placa => {
      const viagensVeiculo = viagens.filter(v => v.placa === placa);
      const primeiraViagem = viagensVeiculo[0];
      
      const tempos = viagensVeiculo
        .filter(v => v.h_chegada && v.h_pickup)
        .map(v => calcularTempoViagem(v.h_pickup!, v.h_chegada!));
      
      const tempoMedio = tempos.length > 0 
        ? tempos.reduce((a, b) => a + b, 0) / tempos.length 
        : 0;

      stats.push({
        placa,
        tipoVeiculo: primeiraViagem.tipo_veiculo,
        totalViagens: viagensVeiculo.length,
        totalPax: viagensVeiculo.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0),
        tempoMedio,
        ultimaViagem: viagensVeiculo[viagensVeiculo.length - 1],
        ativo: viagensAtivas.some(v => v.placa === placa)
      });
    });

    return stats;
  }, [viagens, viagensAtivas]);

  const isVeiculoCadastrado = (placa: string | null) => {
    if (!placa) return false;
    return veiculos.some(v => v.placa === placa);
  };

  const filteredVeiculosCadastrados = useMemo(() => {
    let filtered = [...veiculos];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.placa?.toLowerCase().includes(term) ||
        v.fornecedor?.toLowerCase().includes(term)
      );
    }

    if (filterTipoVeiculo !== 'all') {
      filtered = filtered.filter(v => v.tipo_veiculo === filterTipoVeiculo);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(v => (v.status || 'em_inspecao') === filterStatus);
    }

    // Ordenar: liberados primeiro, depois pendentes, depois em inspeção
    const statusOrder = { liberado: 0, pendente: 1, em_inspecao: 2, manutencao: 3 };
    return filtered.sort((a, b) => {
      const statusA = statusOrder[a.status || 'em_inspecao'] ?? 2;
      const statusB = statusOrder[b.status || 'em_inspecao'] ?? 2;
      if (statusA !== statusB) return statusA - statusB;
      return a.placa.localeCompare(b.placa);
    });
  }, [veiculos, searchTerm, filterTipoVeiculo, filterStatus]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all' || filterStatus !== 'all';

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Veículos</h1>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cadastro de Veículos</h2>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterTipoVeiculo} onValueChange={setFilterTipoVeiculo}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Ônibus">Ônibus</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="liberado">Liberado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_inspecao">Em Inspeção</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
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
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredVeiculosCadastrados.length === 0 ? (
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
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVeiculosCadastrados.map((veiculo) => {
            const stats = veiculosStats.find(s => s.placa === veiculo.placa);
            const motoristaVinculado = motoristas.find(m => m.veiculo_id === veiculo.id);
            
            return (
              <Card key={veiculo.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                        veiculo.tipo_veiculo === 'Ônibus' ? 'bg-primary/10 text-primary' : 'bg-status-ok/10 text-status-ok'
                      }`}>
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{veiculo.tipo_veiculo}</CardTitle>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {veiculo.placa}
                        </code>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <VeiculoModal
                          veiculo={veiculo}
                          eventoId={eventoId}
                          onSave={handleSaveVeiculo}
                          onUpdate={handleUpdateVeiculo}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O veículo {veiculo.placa} será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteVeiculo(veiculo.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <VeiculoStatusBadge status={veiculo.status} />
                    <AvariaIndicator hasAvarias={veiculo.possui_avarias} />
                    <FuelIndicator level={veiculo.nivel_combustivel} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {veiculo.fornecedor && (
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Fornecedor</p>
                      <p className="text-sm font-medium">{veiculo.fornecedor}</p>
                    </div>
                  )}

                  {motoristaVinculado && (
                    <div className="p-2 bg-primary/5 rounded-lg">
                      <p className="text-xs text-muted-foreground">Motorista Vinculado</p>
                      <p className="text-sm font-medium">{motoristaVinculado.nome}</p>
                    </div>
                  )}

                  {(veiculo.km_inicial != null || veiculo.km_final != null) && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                        <Gauge className="w-3.5 h-3.5" />
                        <span className="text-xs">Quilometragem</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Inicial: </span>
                          <span className="font-medium">
                            {veiculo.km_inicial?.toLocaleString('pt-BR') || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Final: </span>
                          <span className="font-medium">
                            {veiculo.km_final?.toLocaleString('pt-BR') || '-'}
                          </span>
                        </div>
                        {veiculo.km_inicial != null && veiculo.km_final != null && (
                          <div>
                            <span className="text-muted-foreground text-xs">Total: </span>
                            <span className="font-semibold text-primary">
                              {(veiculo.km_final - veiculo.km_inicial).toLocaleString('pt-BR')} km
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {stats && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Bus className="w-3.5 h-3.5" />
                          <span className="text-xs">Viagens</span>
                        </div>
                        <p className="text-lg font-semibold">{stats.totalViagens}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-xs">PAX</span>
                        </div>
                        <p className="text-lg font-semibold">{stats.totalPax}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">Média</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {formatarMinutos(stats.tempoMedio)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {stats?.ativo && (
                      <Badge className="bg-status-ok text-status-ok-foreground text-xs">
                        Em Operação
                      </Badge>
                    )}
                    {!motoristaVinculado && (
                      <Badge variant="outline" className="text-xs">
                        Sem motorista
                      </Badge>
                    )}
                  </div>
                  
                  {veiculo.atualizado_por && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-3">
                      <UserCheck className="w-3 h-3" />
                      <span>
                        Editado por {getName(veiculo.atualizado_por)}{' '}
                        {formatDistanceToNow(new Date(veiculo.data_atualizacao), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  )}
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
                <TableHead>Tipo</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>KM</TableHead>
                <TableHead>Viagens</TableHead>
                <TableHead>PAX</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVeiculosCadastrados.map((veiculo) => {
                const stats = veiculosStats.find(s => s.placa === veiculo.placa);
                const motoristaVinculado = motoristas.find(m => m.veiculo_id === veiculo.id);
                
                return (
                  <TableRow key={veiculo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                          veiculo.tipo_veiculo === 'Ônibus' ? 'bg-primary/10 text-primary' : 'bg-status-ok/10 text-status-ok'
                        }`}>
                          <Bus className="w-4 h-4" />
                        </div>
                        <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {veiculo.placa}
                      </code>
                    </TableCell>
                    <TableCell>
                      {veiculo.fornecedor || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {motoristaVinculado ? (
                        <span className="font-medium">{motoristaVinculado.nome}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {veiculo.km_inicial != null && veiculo.km_final != null ? (
                        <span className="font-medium text-primary">
                          {(veiculo.km_final - veiculo.km_inicial).toLocaleString('pt-BR')} km
                        </span>
                      ) : veiculo.km_inicial != null || veiculo.km_final != null ? (
                        <span className="text-muted-foreground text-xs">
                          {veiculo.km_inicial?.toLocaleString('pt-BR') || '-'} / {veiculo.km_final?.toLocaleString('pt-BR') || '-'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{stats?.totalViagens || 0}</TableCell>
                    <TableCell>{stats?.totalPax || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <VeiculoStatusBadge status={veiculo.status} size="sm" />
                        {stats?.ativo && (
                          <Badge className="bg-status-ok text-status-ok-foreground text-[10px] px-1.5 py-0">
                            Ativo
                          </Badge>
                        )}
                        <AvariaIndicator hasAvarias={veiculo.possui_avarias} size="sm" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <VeiculoModal
                            veiculo={veiculo}
                            eventoId={eventoId}
                            onSave={handleSaveVeiculo}
                            onUpdate={handleUpdateVeiculo}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O veículo {veiculo.placa} será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVeiculo(veiculo.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
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
          {activeSection === 'cadastro' && <CadastroContent />}
        </div>
      </div>
    </EventLayout>
  );
}
