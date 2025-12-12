import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Clock, TrendingUp, Plus, Truck, Phone, LayoutGrid, List, Pencil, MoreVertical, Trash2, AlertTriangle, Search, Filter, X, Eye } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { MotoristaComVeiculoModal } from '@/components/cadastros/CadastroModals';
import { MotoristaViagensModal } from '@/components/motoristas/MotoristaViagensModal';
import { toast } from 'sonner';

export default function Motoristas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  const [filterCadastrado, setFilterCadastrado] = useState<string>('all');
  
  const { viagens, loading: loadingViagens, lastUpdate, refetch } = useViagens(eventoId);
  const { motoristas: metricasMotoristas } = useCalculos(viagens);
  const { motoristas: motoristasCadastrados, loading: loadingCadastros, createMotorista, updateMotorista, deleteMotorista, refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos, createVeiculo, updateVeiculo, deleteVeiculo, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const { getEventoById } = useEventos();

  const evento = eventoId ? getEventoById(eventoId) : null;
  const maxViagens = Math.max(...metricasMotoristas.map(m => m.totalViagens), 1);

  // Função para salvar motorista + veículo juntos (legacy)
  const handleSaveMotoristaComVeiculo = async (
    motoristaData: { nome: string; telefone: string | null; ativo: boolean },
    veiculoData: { placa: string; tipo_veiculo: string }
  ) => {
    const motorista = await createMotorista({
      ...motoristaData,
      cnh: null,
      observacao: null,
      veiculo_id: null,
    });
    await createVeiculo({
      ...veiculoData,
      motorista_id: motorista.id,
      ativo: true,
      marca: null,
      modelo: null,
      ano: null,
      capacidade: null,
      fornecedor: null,
    });
    refetchMotoristas();
    refetchVeiculos();
  };

  // Função para atualizar motorista + veículo juntos (com sincronização bidirecional)
  const handleUpdateMotoristaComVeiculo = async (
    motoristaId: string,
    motoristaData: any,
    veiculoId: string | null,
    veiculoData: any,
    oldNome: string,
    oldPlaca: string | null
  ) => {
    await updateMotorista(motoristaId, motoristaData, oldNome);
    
    if (veiculoId && veiculoData) {
      await updateVeiculo(veiculoId, veiculoData, oldPlaca || undefined);
    } else if (veiculoData && veiculoData.placa) {
      await createVeiculo({
        ...veiculoData,
        motorista_id: motoristaId,
        ativo: true,
      });
    }
    
    refetchMotoristas();
    refetchVeiculos();
    refetch();
  };

  // Função para deletar motorista (e veículos vinculados)
  const handleDeleteMotorista = async (motoristaId: string) => {
    try {
      const veiculosDoMotorista = veiculos.filter(v => v.motorista_id === motoristaId);
      for (const veiculo of veiculosDoMotorista) {
        await deleteVeiculo(veiculo.id);
      }
      await deleteMotorista(motoristaId);
      toast.success('Motorista excluído com sucesso!');
      refetchMotoristas();
      refetchVeiculos();
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  // Obter veículo principal do motorista (1:1)
  const getVeiculoDoMotorista = (motoristaId: string) => {
    return veiculos.find(v => v.motorista_id === motoristaId);
  };

  // Contar viagens por motorista (usando nome para match)
  const contarViagensPorMotorista = (nomeMotorista: string) => {
    return viagens.filter(v => v.motorista === nomeMotorista).length;
  };

  // Filtrar e ordenar motoristas (Performance tab)
  const filteredMetricas = useMemo(() => {
    let filtered = [...metricasMotoristas];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => m.motorista.toLowerCase().includes(term));
    }

    // Filtro por tipo de veículo
    if (filterTipoVeiculo !== 'all') {
      filtered = filtered.filter(m => {
        const motoristaCadastrado = motoristasCadastrados.find(mc => mc.nome === m.motorista);
        if (!motoristaCadastrado) return false;
        const veiculo = getVeiculoDoMotorista(motoristaCadastrado.id);
        return veiculo?.tipo_veiculo === filterTipoVeiculo;
      });
    }

    // Filtro por status de cadastro
    if (filterCadastrado !== 'all') {
      const isCadastrado = filterCadastrado === 'cadastrado';
      filtered = filtered.filter(m => {
        const existe = motoristasCadastrados.some(mc => mc.nome === m.motorista);
        return isCadastrado ? existe : !existe;
      });
    }

    return filtered.sort((a, b) => b.totalViagens - a.totalViagens);
  }, [metricasMotoristas, searchTerm, filterTipoVeiculo, filterCadastrado, motoristasCadastrados, veiculos]);

  // Filtrar motoristas cadastrados (Cadastro tab)
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

    return filtered;
  }, [motoristasCadastrados, searchTerm, filterTipoVeiculo, veiculos]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
    setFilterCadastrado('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all' || filterCadastrado !== 'all';

  if (loadingViagens || loadingCadastros) {
    return (
      <MainLayout>
        <Header title="Motoristas" />
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </MainLayout>
    );
  }

  const SearchAndFilters = ({ showCadastradoFilter = true }: { showCadastradoFilter?: boolean }) => (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar motorista..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Select value={filterTipoVeiculo} onValueChange={setFilterTipoVeiculo}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Veículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Van">Van</SelectItem>
            <SelectItem value="Ônibus">Ônibus</SelectItem>
          </SelectContent>
        </Select>
        {showCadastradoFilter && (
          <Select value={filterCadastrado} onValueChange={setFilterCadastrado}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cadastrado">Cadastrados</SelectItem>
              <SelectItem value="nao_cadastrado">Não cadastrados</SelectItem>
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <Header 
        title="Motoristas"
        subtitle={evento ? `${evento.nome_planilha} • ${metricasMotoristas.length} motoristas` : `${metricasMotoristas.length} motoristas ativos`}
        lastUpdate={lastUpdate}
        onRefresh={refetch}
      />
      
      <div className="p-8">
        <Tabs defaultValue="performance" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            </TabsList>
          </div>

          {/* Aba Performance */}
          <TabsContent value="performance">
            <div className="flex items-center justify-between mb-4">
              <SearchAndFilters showCadastradoFilter={true} />
              <div className="flex items-center border rounded-md ml-3">
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

            {filteredMetricas.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">Nenhum motorista encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'Tente ajustar os filtros de busca.' : 'Ainda não há motoristas com viagens registradas.'}
                </p>
              </Card>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMetricas.map((motorista, index) => {
                  const motoristaCadastrado = motoristasCadastrados.find(m => m.nome === motorista.motorista);
                  const veiculo = motoristaCadastrado ? getVeiculoDoMotorista(motoristaCadastrado.id) : undefined;
                  
                  return (
                    <Card key={motorista.motorista} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                              {motorista.motorista.charAt(0)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{motorista.motorista}</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {motorista.viagensHoje} viagens hoje
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover z-50">
                                <MotoristaViagensModal
                                  motorista={motorista.motorista}
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
                                    <MotoristaComVeiculoModal 
                                      motorista={motoristaCadastrado}
                                      veiculo={veiculo}
                                      eventoId={eventoId}
                                      onSave={handleSaveMotoristaComVeiculo}
                                      onUpdate={handleUpdateMotoristaComVeiculo}
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
                                            Tem certeza que deseja excluir <strong>{motorista.motorista}</strong>? 
                                            Esta ação não pode ser desfeita e também removerá o veículo vinculado.
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
                                  <MotoristaComVeiculoModal 
                                    defaultName={motorista.motorista}
                                    eventoId={eventoId}
                                    onSave={handleSaveMotoristaComVeiculo}
                                    onUpdate={handleUpdateMotoristaComVeiculo}
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
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Viagens</span>
                            <span className="font-medium">{motorista.totalViagens}</span>
                          </div>
                          <Progress 
                            value={(motorista.totalViagens / maxViagens) * 100} 
                            className="h-2"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              <span className="text-xs">Total PAX</span>
                            </div>
                            <p className="text-lg font-semibold">{motorista.totalPax}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-xs">Tempo Médio</span>
                            </div>
                            <p className="text-lg font-semibold">
                              {formatarMinutos(motorista.tempoMedio)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span className="text-xs">Min / Max</span>
                            </div>
                            <p className="text-sm font-medium">
                              {Math.round(motorista.tempoMin)} / {Math.round(motorista.tempoMax)} min
                            </p>
                          </div>
                        </div>

                        {/* Veículo vinculado */}
                        {veiculo && (
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-muted-foreground" />
                                <code className="text-xs">{veiculo.placa}</code>
                                <Badge variant="outline" className="text-xs">{veiculo.tipo_veiculo}</Badge>
                              </div>
                            </div>
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
                      <TableHead>#</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Tipo Veículo</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Total Viagens</TableHead>
                      <TableHead>Total PAX</TableHead>
                      <TableHead>Tempo Médio</TableHead>
                      <TableHead className="w-[50px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMetricas.map((motorista, index) => {
                      const motoristaCadastrado = motoristasCadastrados.find(m => m.nome === motorista.motorista);
                      const veiculo = motoristaCadastrado ? getVeiculoDoMotorista(motoristaCadastrado.id) : undefined;
                      
                      return (
                        <TableRow key={motorista.motorista}>
                          <TableCell>
                            <Badge variant="outline">#{index + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                {motorista.motorista.charAt(0)}
                              </div>
                              {motorista.motorista}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {motoristaCadastrado?.telefone || '-'}
                          </TableCell>
                          <TableCell>
                            {veiculo ? (
                              <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {veiculo ? (
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">{veiculo.placa}</code>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{motorista.totalViagens}</TableCell>
                          <TableCell>{motorista.totalPax}</TableCell>
                          <TableCell>{formatarMinutos(motorista.tempoMedio)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover z-50">
                                <MotoristaViagensModal
                                  motorista={motorista.motorista}
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
                                    <MotoristaComVeiculoModal 
                                      motorista={motoristaCadastrado}
                                      veiculo={veiculo}
                                      eventoId={eventoId}
                                      onSave={handleSaveMotoristaComVeiculo}
                                      onUpdate={handleUpdateMotoristaComVeiculo}
                                      trigger={
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Editar
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
                                          Excluir
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-destructive" />
                                            Confirmar Exclusão
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Tem certeza que deseja excluir <strong>{motorista.motorista}</strong>? 
                                            Esta ação não pode ser desfeita e também removerá o veículo vinculado.
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
                                  <MotoristaComVeiculoModal 
                                    defaultName={motorista.motorista}
                                    eventoId={eventoId}
                                    onSave={handleSaveMotoristaComVeiculo}
                                    onUpdate={handleUpdateMotoristaComVeiculo}
                                    trigger={
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Cadastrar
                                      </DropdownMenuItem>
                                    }
                                  />
                                )}
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
          </TabsContent>

          {/* Aba Cadastro */}
          <TabsContent value="cadastro">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Motoristas Cadastrados</h3>
                  <p className="text-sm text-muted-foreground">
                    Cadastre motoristas com seus veículos vinculados
                  </p>
                </div>
                <MotoristaComVeiculoModal 
                  eventoId={eventoId}
                  onSave={handleSaveMotoristaComVeiculo}
                  onUpdate={handleUpdateMotoristaComVeiculo}
                />
              </div>

              <div className="flex items-center justify-between">
                <SearchAndFilters showCadastradoFilter={false} />
                <div className="flex items-center border rounded-md ml-3">
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

              {filteredCadastrados.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">
                    {hasActiveFilters ? 'Nenhum motorista encontrado' : 'Nenhum motorista cadastrado'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasActiveFilters 
                      ? 'Tente ajustar os filtros de busca.' 
                      : 'Cadastre motoristas com nome, celular, tipo de veículo e placa.'}
                  </p>
                  {!hasActiveFilters && (
                    <MotoristaComVeiculoModal 
                      eventoId={eventoId}
                      onSave={handleSaveMotoristaComVeiculo}
                      onUpdate={handleUpdateMotoristaComVeiculo}
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
                  {filteredCadastrados.map((motorista) => {
                    const veiculo = getVeiculoDoMotorista(motorista.id);
                    const viagensCount = contarViagensPorMotorista(motorista.nome);
                    
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover z-50">
                                <MotoristaComVeiculoModal 
                                  motorista={motorista}
                                  veiculo={veiculo}
                                  eventoId={eventoId}
                                  onSave={handleSaveMotoristaComVeiculo}
                                  onUpdate={handleUpdateMotoristaComVeiculo}
                                  trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Pencil className="w-4 h-4 mr-2" />
                                      Editar
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
                                      Excluir
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-destructive" />
                                        Confirmar Exclusão
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir <strong>{motorista.nome}</strong>? 
                                        Esta ação não pode ser desfeita e também removerá o veículo vinculado.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleDeleteMotorista(motorista.id)}
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Veículo vinculado */}
                          {veiculo ? (
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-muted-foreground" />
                                <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                                  {veiculo.placa}
                                </code>
                                <Badge variant="outline" className="text-xs">
                                  {veiculo.tipo_veiculo}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                              Sem veículo vinculado
                            </p>
                          )}
                          
                          {/* Contagem de viagens */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Viagens no evento</span>
                            <Badge variant="secondary">{viagensCount}</Badge>
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
                        <TableHead>Motorista</TableHead>
                        <TableHead>Celular</TableHead>
                        <TableHead>Tipo Veículo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Viagens</TableHead>
                        <TableHead className="w-[50px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCadastrados.map((motorista) => {
                        const veiculo = getVeiculoDoMotorista(motorista.id);
                        const viagensCount = contarViagensPorMotorista(motorista.nome);
                        
                        return (
                          <TableRow key={motorista.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                  {motorista.nome.charAt(0)}
                                </div>
                                {motorista.nome}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {motorista.telefone || '-'}
                            </TableCell>
                            <TableCell>
                              {veiculo ? (
                                <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {veiculo ? (
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">{veiculo.placa}</code>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{viagensCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover z-50">
                                  <MotoristaComVeiculoModal 
                                    motorista={motorista}
                                    veiculo={veiculo}
                                    eventoId={eventoId}
                                    onSave={handleSaveMotoristaComVeiculo}
                                    onUpdate={handleUpdateMotoristaComVeiculo}
                                    trigger={
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Editar
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
                                        Excluir
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                          <AlertTriangle className="w-5 h-5 text-destructive" />
                                          Confirmar Exclusão
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir <strong>{motorista.nome}</strong>? 
                                          Esta ação não pode ser desfeita e também removerá o veículo vinculado.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => handleDeleteMotorista(motorista.id)}
                                        >
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
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
