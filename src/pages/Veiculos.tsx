import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, Users, Clock, MapPin, Search, Filter, X, LayoutGrid, List, Plus, Pencil, Trash2, MoreVertical, Truck, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
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
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { VeiculoModal } from '@/components/cadastros/CadastroModals';
import { Viagem } from '@/lib/types/viagem';
import { toast } from 'sonner';

interface VeiculoStats {
  placa: string | null;
  tipoVeiculo: string | null;
  totalViagens: number;
  totalPax: number;
  tempoMedio: number;
  ultimaViagem: Viagem | null;
  ativo: boolean;
}

export default function Veiculos() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { viagens, loading: loadingViagens, lastUpdate, refetch } = useViagens(eventoId);
  const { viagensAtivas } = useCalculos(viagens);
  const { veiculos, loading: loadingVeiculos, createVeiculo, updateVeiculo, deleteVeiculo, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { getEventoById } = useEventos();

  const evento = eventoId ? getEventoById(eventoId) : null;

  // Handler para salvar veículo
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

  // Handler para atualizar veículo
  const handleUpdateVeiculo = async (id: string, data: any, oldPlaca: string) => {
    await updateVeiculo(id, data, oldPlaca);
    refetchVeiculos();
    refetch();
  };

  // Handler para deletar veículo
  const handleDeleteVeiculo = async (id: string) => {
    try {
      await deleteVeiculo(id);
      toast.success('Veículo excluído com sucesso!');
      refetchVeiculos();
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  // Importar veículos e motoristas das viagens
  const handleImportFromViagens = async () => {
    if (!eventoId) return;
    
    try {
      // Buscar veículos e motoristas únicos das viagens
      const { data: viagensData, error: viagensError } = await supabase
        .from('viagens')
        .select('tipo_veiculo, placa, motorista')
        .eq('evento_id', eventoId)
        .not('placa', 'is', null);

      if (viagensError) throw viagensError;

      // Agrupar por placa (veículo único)
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

      // Criar veículos e motoristas
      for (const [placa, dados] of veiculosUnicos) {
        // Verificar se veículo já existe
        const veiculoExistente = veiculos.find(v => v.placa === placa);
        
        if (!veiculoExistente) {
          // Criar veículo
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

          if (veiculoError) {
            console.error('Erro ao criar veículo:', veiculoError);
            continue;
          }

          veiculosCriados++;

          // Criar motorista vinculado
          if (dados.motorista) {
            const { error: motoristaError } = await supabase
              .from('motoristas')
              .insert({
                nome: dados.motorista,
                evento_id: eventoId,
                veiculo_id: novoVeiculo.id,
                ativo: true
              });

            if (!motoristaError) {
              motoristasCriados++;
            }
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

  // Calculate vehicle stats from trips
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

  // Verificar se um veículo está cadastrado
  const isVeiculoCadastrado = (placa: string | null) => {
    if (!placa) return false;
    return veiculos.some(v => v.placa === placa);
  };

  // Obter motorista vinculado ao veículo
  const getMotoristaVinculado = (placa: string | null) => {
    if (!placa) return null;
    const veiculo = veiculos.find(v => v.placa === placa);
    if (!veiculo) return null;
    return motoristas.find(m => m.veiculo_id === veiculo.id);
  };

  // Filtrar e ordenar veículos cadastrados
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

    return filtered.sort((a, b) => a.placa.localeCompare(b.placa));
  }, [veiculos, searchTerm, filterTipoVeiculo]);

  // Filtrar e ordenar veículos com base nos stats (para aba de performance)
  const filteredVeiculosStats = useMemo(() => {
    let filtered = [...veiculosStats];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.placa?.toLowerCase().includes(term) ||
        v.ultimaViagem?.motorista.toLowerCase().includes(term)
      );
    }

    if (filterTipoVeiculo !== 'all') {
      filtered = filtered.filter(v => v.tipoVeiculo === filterTipoVeiculo);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'ativo') {
        filtered = filtered.filter(v => v.ativo);
      } else if (filterStatus === 'cadastrado') {
        filtered = filtered.filter(v => isVeiculoCadastrado(v.placa));
      } else if (filterStatus === 'nao_cadastrado') {
        filtered = filtered.filter(v => !isVeiculoCadastrado(v.placa));
      }
    }

    return filtered.sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return b.totalViagens - a.totalViagens;
    });
  }, [veiculosStats, searchTerm, filterTipoVeiculo, filterStatus, veiculos]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all' || filterStatus !== 'all';

  const loading = loadingViagens || loadingVeiculos;

  if (loading) {
    return (
      <MainLayout>
        <Header title="Veículos" />
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Veículos"
        subtitle={evento ? `${evento.nome_planilha} • ${veiculos.length} cadastrados` : `${veiculos.length} veículos cadastrados`}
        lastUpdate={lastUpdate}
        onRefresh={() => { refetch(); refetchVeiculos(); }}
      />
      
      <div className="p-8 space-y-6">
        {/* Header com botão de adicionar */}
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
            <VeiculoModal 
              eventoId={eventoId}
              onSave={handleSaveVeiculo}
            />
          </div>
        </div>

        {/* Barra de busca e filtros */}
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
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo" />
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
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de veículos cadastrados */}
        {filteredVeiculosCadastrados.length === 0 ? (
          <Card className="p-8 text-center">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Nenhum veículo cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasActiveFilters ? 'Tente ajustar os filtros de busca.' : 'Clique em "Novo Veículo" para começar.'}
            </p>
            {!hasActiveFilters && (
              <VeiculoModal 
                eventoId={eventoId}
                onSave={handleSaveVeiculo}
                trigger={
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Primeiro Veículo
                  </Button>
                }
              />
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
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Fornecedor */}
                    {veiculo.fornecedor && (
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Fornecedor</p>
                        <p className="text-sm font-medium">{veiculo.fornecedor}</p>
                      </div>
                    )}

                    {/* Motorista vinculado */}
                    {motoristaVinculado && (
                      <div className="p-2 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground">Motorista Vinculado</p>
                        <p className="text-sm font-medium">{motoristaVinculado.nome}</p>
                      </div>
                    )}

                    {/* Stats Grid */}
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

                    {/* Status */}
                    <div className="flex gap-2">
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
                      <TableCell>{stats?.totalViagens || 0}</TableCell>
                      <TableCell>{stats?.totalPax || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {stats?.ativo && (
                            <Badge className="bg-status-ok text-status-ok-foreground text-xs">
                              Ativo
                            </Badge>
                          )}
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
    </MainLayout>
  );
}
