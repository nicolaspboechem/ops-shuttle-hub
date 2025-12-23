import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Clock, TrendingUp, Plus, Truck, Phone, LayoutGrid, List, Pencil, MoreVertical, Trash2, AlertTriangle, Search, Filter, X, Eye, MessageCircle, Download, UserCheck, FileBarChart } from 'lucide-react';
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
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { useUserNames } from '@/hooks/useUserNames';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { MotoristaModal } from '@/components/cadastros/CadastroModals';
import { MotoristaViagensModal } from '@/components/motoristas/MotoristaViagensModal';

import { MotoristasAuditoria } from '@/components/motoristas/MotoristasAuditoria';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const sections: InnerSidebarSection[] = [
  { id: 'cadastro', label: 'Motoristas', icon: Users },
  { id: 'auditoria', label: 'Auditoria', icon: FileBarChart },
];

export default function Motoristas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [activeSection, setActiveSection] = useState<string>('cadastro');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  
  const { viagens, loading: loadingViagens, refetch } = useViagens(eventoId);
  const { motoristas: metricasMotoristas } = useCalculos(viagens);
  const { motoristas: motoristasCadastrados, loading: loadingCadastros, createMotorista, updateMotorista, deleteMotorista, refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos, refetch: refetchVeiculos } = useVeiculos(eventoId);
  const { getEventoById } = useEventos();
  
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

    return filtered.sort((a, b) => {
      const metricasA = getMetricasMotorista(a.nome);
      const metricasB = getMetricasMotorista(b.nome);
      return (metricasB?.totalViagens || 0) - (metricasA?.totalViagens || 0);
    });
  }, [motoristasCadastrados, searchTerm, filterTipoVeiculo, veiculos, metricasMotoristas]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all';

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
          <MotoristaModal 
            veiculosDisponiveis={veiculos}
            eventoId={eventoId}
            onSave={handleSaveMotorista}
            onUpdate={handleUpdateMotorista}
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
        </div>
      </div>
    </EventLayout>
  );
}
