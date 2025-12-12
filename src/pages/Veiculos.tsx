import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bus, Users, Clock, MapPin, AlertCircle, Search, Filter, X, LayoutGrid, List } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useVeiculos } from '@/hooks/useCadastros';
import { useEventos } from '@/hooks/useEventos';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { Viagem } from '@/lib/types/viagem';

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
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoVeiculo, setFilterTipoVeiculo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { viagens, loading, lastUpdate, refetch } = useViagens(eventoId);
  const { viagensAtivas } = useCalculos(viagens);
  const { veiculos: veiculosCadastrados } = useVeiculos(eventoId);
  const { getEventoById } = useEventos();

  const evento = eventoId ? getEventoById(eventoId) : null;

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
    return veiculosCadastrados.some(v => v.placa === placa);
  };

  // Filtrar e ordenar veículos
  const filteredVeiculos = useMemo(() => {
    let filtered = [...veiculosStats];

    // Filtro de busca (por placa ou motorista da última viagem)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.placa?.toLowerCase().includes(term) ||
        v.ultimaViagem?.motorista.toLowerCase().includes(term)
      );
    }

    // Filtro por tipo de veículo
    if (filterTipoVeiculo !== 'all') {
      filtered = filtered.filter(v => v.tipoVeiculo === filterTipoVeiculo);
    }

    // Filtro por status
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
  }, [veiculosStats, searchTerm, filterTipoVeiculo, filterStatus, veiculosCadastrados]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipoVeiculo('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchTerm || filterTipoVeiculo !== 'all' || filterStatus !== 'all';

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
        subtitle={evento ? `${evento.nome_planilha} • ${veiculosStats.length} veículos` : `${veiculosStats.length} veículos cadastrados`}
        lastUpdate={lastUpdate}
        onRefresh={refetch}
      />
      
      <div className="p-8 space-y-6">
        {/* Alerta informativo */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cadastro de Veículos</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              O cadastro de veículos é feito na aba de <strong>Motoristas</strong>, vinculando cada veículo a um motorista responsável.
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(eventoId ? `/evento/${eventoId}/motoristas` : '/motoristas')}
            >
              Ir para Motoristas
            </Button>
          </AlertDescription>
        </Alert>

        {/* Barra de busca e filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa ou motorista..."
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos agora</SelectItem>
                <SelectItem value="cadastrado">Cadastrados</SelectItem>
                <SelectItem value="nao_cadastrado">Não cadastrados</SelectItem>
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

        {/* Lista de veículos */}
        {filteredVeiculos.length === 0 ? (
          <Card className="p-8 text-center">
            <Bus className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Nenhum veículo encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? 'Tente ajustar os filtros de busca.' : 'Ainda não há veículos com viagens registradas.'}
            </p>
          </Card>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVeiculos.map((veiculo) => {
              const cadastrado = isVeiculoCadastrado(veiculo.placa);
              const veiculoCadastro = veiculosCadastrados.find(v => v.placa === veiculo.placa);
              
              return (
                <Card key={veiculo.placa} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                          veiculo.tipoVeiculo === 'Ônibus' ? 'bg-primary/10 text-primary' : 'bg-status-ok/10 text-status-ok'
                        }`}>
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{veiculo.tipoVeiculo}</CardTitle>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {veiculo.placa}
                          </code>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {veiculo.tipoVeiculo}
                        </Badge>
                        {veiculo.ativo && (
                          <Badge className="bg-status-ok text-status-ok-foreground text-xs animate-pulse-soft">
                            Ativo
                          </Badge>
                        )}
                        {cadastrado && (
                          <Badge variant="secondary" className="text-xs">
                            Cadastrado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Motorista vinculado */}
                    {veiculoCadastro?.motorista && (
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Motorista vinculado</p>
                        <p className="text-sm font-medium">{veiculoCadastro.motorista.nome}</p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Bus className="w-3.5 h-3.5" />
                          <span className="text-xs">Viagens</span>
                        </div>
                        <p className="text-lg font-semibold">{veiculo.totalViagens}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-xs">PAX</span>
                        </div>
                        <p className="text-lg font-semibold">{veiculo.totalPax}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">Média</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {formatarMinutos(veiculo.tempoMedio)}
                        </p>
                      </div>
                    </div>

                    {/* Last Trip Info */}
                    {veiculo.ultimaViagem && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Última viagem</p>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate">{veiculo.ultimaViagem.ponto_embarque || 'Sem ponto'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {veiculo.ultimaViagem.motorista} • {veiculo.ultimaViagem.h_pickup}
                        </p>
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
                  <TableHead>Motorista Vinculado</TableHead>
                  <TableHead>Viagens</TableHead>
                  <TableHead>Total PAX</TableHead>
                  <TableHead>Tempo Médio</TableHead>
                  <TableHead>Última Viagem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVeiculos.map((veiculo) => {
                  const cadastrado = isVeiculoCadastrado(veiculo.placa);
                  const veiculoCadastro = veiculosCadastrados.find(v => v.placa === veiculo.placa);
                  
                  return (
                    <TableRow key={veiculo.placa}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                            veiculo.tipoVeiculo === 'Ônibus' ? 'bg-primary/10 text-primary' : 'bg-status-ok/10 text-status-ok'
                          }`}>
                            <Bus className="w-4 h-4" />
                          </div>
                          <Badge variant="outline">{veiculo.tipoVeiculo}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {veiculo.placa}
                        </code>
                      </TableCell>
                      <TableCell>
                        {veiculoCadastro?.motorista ? (
                          <span className="font-medium">{veiculoCadastro.motorista.nome}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{veiculo.totalViagens}</TableCell>
                      <TableCell>{veiculo.totalPax}</TableCell>
                      <TableCell>{formatarMinutos(veiculo.tempoMedio)}</TableCell>
                      <TableCell>
                        {veiculo.ultimaViagem ? (
                          <div>
                            <p className="text-sm truncate max-w-[150px]">
                              {veiculo.ultimaViagem.ponto_embarque || 'Sem ponto'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {veiculo.ultimaViagem.h_pickup}
                            </p>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {veiculo.ativo && (
                            <Badge className="bg-status-ok text-status-ok-foreground text-xs w-fit">
                              Ativo
                            </Badge>
                          )}
                          {cadastrado && (
                            <Badge variant="secondary" className="text-xs w-fit">
                              Cadastrado
                            </Badge>
                          )}
                          {!veiculo.ativo && !cadastrado && (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
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
