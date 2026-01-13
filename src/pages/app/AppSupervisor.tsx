import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Veiculo } from '@/hooks/useCadastros';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Car, 
  Plus, 
  Search, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wrench,
  Camera,
  ChevronLeft,
  MoreVertical,
  Fuel,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoAS from '@/assets/as_logo_reduzida_preta.png';
import { VistoriaVeiculoWizard } from '@/components/app/VistoriaVeiculoWizard';
import { VeiculoCardSupervisor } from '@/components/app/VeiculoCardSupervisor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AppSupervisor() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user, signOut, profile } = useAuth();
  
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [evento, setEvento] = useState<{ nome_planilha: string } | null>(null);

  useEffect(() => {
    if (eventoId) {
      fetchEvento();
      fetchVeiculos();
    }
  }, [eventoId]);

  const fetchEvento = async () => {
    const { data } = await supabase
      .from('eventos')
      .select('nome_planilha')
      .eq('id', eventoId)
      .single();
    
    if (data) setEvento(data);
  };

  const fetchVeiculos = async () => {
    if (!eventoId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('veiculos')
      .select('*')
      .eq('evento_id', eventoId)
      .eq('ativo', true)
      .order('data_criacao', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar veículos');
      console.error(error);
    } else {
      setVeiculos(data || []);
    }
    setLoading(false);
  };

  const handleStatusChange = async (veiculoId: string, newStatus: string) => {
    const { error } = await supabase
      .from('veiculos')
      .update({
        status: newStatus,
        atualizado_por: user?.id,
        liberado_em: newStatus === 'liberado' ? new Date().toISOString() : null,
        liberado_por: newStatus === 'liberado' ? user?.id : null,
      })
      .eq('id', veiculoId);
    
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(`Status atualizado para ${newStatus}`);
      fetchVeiculos();
    }
  };

  const handleReInspecao = (veiculo: Veiculo) => {
    setSelectedVeiculo(veiculo);
    setWizardOpen(true);
  };

  const stats = {
    liberados: veiculos.filter(v => v.status === 'liberado').length,
    pendentes: veiculos.filter(v => v.status === 'pendente').length,
    emInspecao: veiculos.filter(v => v.status === 'em_inspecao').length,
    manutencao: veiculos.filter(v => v.status === 'manutencao').length,
  };

  const filteredVeiculos = veiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.tipo_veiculo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by status
  const groupedVeiculos = {
    liberado: filteredVeiculos.filter(v => v.status === 'liberado'),
    pendente: filteredVeiculos.filter(v => v.status === 'pendente'),
    em_inspecao: filteredVeiculos.filter(v => v.status === 'em_inspecao'),
    manutencao: filteredVeiculos.filter(v => v.status === 'manutencao'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/app')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-8 w-8 rounded-lg object-contain"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold truncate">Supervisor</h1>
                  <Badge variant="secondary" className="text-xs">Veículos</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {evento?.nome_planilha || 'Carregando...'}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/app')}>
                  Trocar Evento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-emerald-600">{stats.liberados}</p>
              <p className="text-[10px] text-muted-foreground">Liberados</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-xl font-bold text-destructive">{stats.pendentes}</p>
              <p className="text-[10px] text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-600">{stats.emInspecao}</p>
              <p className="text-[10px] text-muted-foreground">Em Inspeção</p>
            </CardContent>
          </Card>
          <Card className="border-muted bg-muted/20">
            <CardContent className="p-3 text-center">
              <Wrench className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-muted-foreground">{stats.manutencao}</p>
              <p className="text-[10px] text-muted-foreground">Manutenção</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, nome ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Vehicle List */}
      <div className="flex-1 container mx-auto px-4 pb-24 space-y-6">
        {/* Pendentes primeiro - prioridade */}
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
                />
              ))}
            </div>
          </div>
        )}

        {filteredVeiculos.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'}
            </p>
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6">
        <Button 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => {
            setSelectedVeiculo(null);
            setWizardOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Wizard de Vistoria */}
      <VistoriaVeiculoWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        eventoId={eventoId || ''}
        veiculoExistente={selectedVeiculo}
        onComplete={() => {
          fetchVeiculos();
          setSelectedVeiculo(null);
        }}
      />
    </div>
  );
}
