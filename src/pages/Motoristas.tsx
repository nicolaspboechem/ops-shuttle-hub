import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Clock, TrendingUp, Plus, Truck, Phone, CreditCard, LayoutGrid, List, Pencil } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { MotoristaModal, VeiculoModal } from '@/components/cadastros/CadastroModals';

export default function Motoristas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { viagens, loading: loadingViagens, lastUpdate, refetch } = useViagens(eventoId);
  const { motoristas: metricasMotoristas } = useCalculos(viagens);
  const { motoristas: motoristasCadastrados, loading: loadingCadastros, createMotorista, updateMotorista, refetch: refetchMotoristas } = useMotoristas();
  const { veiculos, createVeiculo, updateVeiculo, refetch: refetchVeiculos } = useVeiculos();
  const { getEventoById } = useEventos();

  const evento = eventoId ? getEventoById(eventoId) : null;
  const sortedMetricas = [...metricasMotoristas].sort((a, b) => b.totalViagens - a.totalViagens);
  const maxViagens = Math.max(...metricasMotoristas.map(m => m.totalViagens), 1);

  const handleSaveMotorista = async (data: any) => {
    const result = await createMotorista({ ...data, ativo: true });
    refetchMotoristas();
    return result;
  };

  const handleUpdateMotorista = async (id: string, data: any) => {
    await updateMotorista(id, data);
    refetchMotoristas();
  };

  const handleSaveVeiculo = async (data: any) => {
    const result = await createVeiculo({ ...data, ativo: true });
    refetchVeiculos();
    return result;
  };

  const handleUpdateVeiculo = async (id: string, data: any) => {
    await updateVeiculo(id, data);
    refetchVeiculos();
  };

  // Agrupar veículos por motorista
  const veiculosPorMotorista = (motoristaId: string) => {
    return veiculos.filter(v => v.motorista_id === motoristaId);
  };

  // Contar viagens por motorista cadastrado (usando nome para match)
  const contarViagensPorMotorista = (nomeMotorista: string) => {
    return viagens.filter(v => v.motorista === nomeMotorista).length;
  };

  // Contar viagens por veículo (usando placa para match)
  const contarViagensPorVeiculo = (placa: string) => {
    return viagens.filter(v => v.placa === placa).length;
  };

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

          {/* Aba Performance - com toggle de visualização e edição */}
          <TabsContent value="performance">
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center border rounded-md">
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

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedMetricas.map((motorista, index) => {
                  const motoristaCadastrado = motoristasCadastrados.find(m => m.nome === motorista.motorista);
                  const veiculosDoMotorista = motoristaCadastrado ? veiculosPorMotorista(motoristaCadastrado.id) : [];
                  
                  return (
                    <Card key={motorista.motorista} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                              {motorista.motorista.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{motorista.motorista}</CardTitle>
                                {motoristaCadastrado && (
                                  <MotoristaModal 
                                    motorista={motoristaCadastrado}
                                    onSave={handleSaveMotorista}
                                    onUpdate={handleUpdateMotorista}
                                    trigger={
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    }
                                  />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {motorista.viagensHoje} viagens hoje
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
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

                        {/* Veículos vinculados */}
                        {veiculosDoMotorista.length > 0 && (
                          <div className="border-t pt-3 space-y-2">
                            <span className="text-xs font-medium text-muted-foreground">Veículos</span>
                            <div className="space-y-1">
                              {veiculosDoMotorista.map((veiculo) => (
                                <div key={veiculo.id} className="flex items-center justify-between p-1.5 bg-muted/50 rounded">
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-3 h-3 text-muted-foreground" />
                                    <code className="text-xs">{veiculo.placa}</code>
                                    <span className="text-xs text-muted-foreground">{veiculo.tipo_veiculo}</span>
                                  </div>
                                  <VeiculoModal 
                                    motorista={motoristaCadastrado!}
                                    veiculo={veiculo}
                                    onSave={handleSaveVeiculo}
                                    onUpdate={handleUpdateVeiculo}
                                    trigger={
                                      <Button variant="ghost" size="icon" className="h-5 w-5">
                                        <Pencil className="w-2.5 h-2.5" />
                                      </Button>
                                    }
                                  />
                                </div>
                              ))}
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
                      <TableHead>Total Viagens</TableHead>
                      <TableHead>Viagens Hoje</TableHead>
                      <TableHead>Total PAX</TableHead>
                      <TableHead>Tempo Médio</TableHead>
                      <TableHead>Min / Max</TableHead>
                      <TableHead>Veículos</TableHead>
                      <TableHead className="w-[50px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMetricas.map((motorista, index) => {
                      const motoristaCadastrado = motoristasCadastrados.find(m => m.nome === motorista.motorista);
                      const veiculosDoMotorista = motoristaCadastrado ? veiculosPorMotorista(motoristaCadastrado.id) : [];
                      
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
                          <TableCell>{motorista.totalViagens}</TableCell>
                          <TableCell>{motorista.viagensHoje}</TableCell>
                          <TableCell>{motorista.totalPax}</TableCell>
                          <TableCell>{formatarMinutos(motorista.tempoMedio)}</TableCell>
                          <TableCell>{Math.round(motorista.tempoMin)} / {Math.round(motorista.tempoMax)} min</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {veiculosDoMotorista.map((v) => (
                                <div key={v.id} className="flex items-center gap-1">
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{v.placa}</code>
                                  <VeiculoModal 
                                    motorista={motoristaCadastrado!}
                                    veiculo={v}
                                    onSave={handleSaveVeiculo}
                                    onUpdate={handleUpdateVeiculo}
                                    trigger={
                                      <Button variant="ghost" size="icon" className="h-5 w-5">
                                        <Pencil className="w-2.5 h-2.5" />
                                      </Button>
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {motoristaCadastrado && (
                              <MotoristaModal 
                                motorista={motoristaCadastrado}
                                onSave={handleSaveMotorista}
                                onUpdate={handleUpdateMotorista}
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                }
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Aba Cadastro - apenas para criar novos motoristas/veículos */}
          <TabsContent value="cadastro">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Motoristas Cadastrados</h3>
                  <p className="text-sm text-muted-foreground">
                    Cadastre motoristas e vincule veículos a eles
                  </p>
                </div>
                <MotoristaModal onSave={handleSaveMotorista} />
              </div>

              {motoristasCadastrados.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">Nenhum motorista cadastrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comece cadastrando motoristas para vincular veículos a eles.
                  </p>
                  <MotoristaModal 
                    onSave={handleSaveMotorista}
                    trigger={
                      <span className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer hover:bg-primary/90">
                        <Plus className="w-4 h-4" />
                        Cadastrar Motorista
                      </span>
                    }
                  />
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {motoristasCadastrados.map((motorista) => {
                    const veiculosDoMotorista = veiculosPorMotorista(motorista.id);
                    
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
                            <Badge variant={motorista.ativo ? 'default' : 'secondary'}>
                              {motorista.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {motorista.cnh && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CreditCard className="w-4 h-4" />
                              <span>CNH: {motorista.cnh}</span>
                            </div>
                          )}

                          {/* Veículos vinculados */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Veículos Vinculados</span>
                              <VeiculoModal 
                                motorista={motorista} 
                                onSave={handleSaveVeiculo}
                              />
                            </div>
                            
                            {veiculosDoMotorista.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">
                                Nenhum veículo vinculado
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {veiculosDoMotorista.map((veiculo) => (
                                  <div 
                                    key={veiculo.id}
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Truck className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                                          {veiculo.placa}
                                        </code>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          {veiculo.tipo_veiculo}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {veiculo.capacidade && (
                                        <span className="text-xs text-muted-foreground">
                                          {veiculo.capacidade} PAX
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
