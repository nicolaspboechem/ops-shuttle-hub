import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useAuth } from '@/lib/auth/AuthContext';
import { Evento } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateViagemForm } from '@/components/app/CreateViagemForm';
import { ViagemCardOperador } from '@/components/app/ViagemCardOperador';
import { QuickMotoristaForm } from '@/components/app/QuickMotoristaForm';
import { QuickVeiculoForm } from '@/components/app/QuickVeiculoForm';
import { VeiculoKmModal } from '@/components/app/VeiculoKmModal';
import { 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  Loader2,
  Bus,
  Clock,
  CheckCircle,
  Radio,
  Settings,
  User,
  Car,
  Gauge
} from 'lucide-react';

type StatusFilter = 'todos' | 'agendado' | 'em_andamento' | 'aguardando_retorno' | 'encerrado';

export default function AppOperador() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { viagens, loading, refetch } = useViagens(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const { refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { refetch: refetchVeiculos } = useVeiculos(eventoId);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMotoristaForm, setShowMotoristaForm] = useState(false);
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [showKmModal, setShowKmModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [pontoFilter, setPontoFilter] = useState<string>('todos');

  useEffect(() => {
    if (eventoId) {
      supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single()
        .then(({ data }) => setEvento(data));
    }
  }, [eventoId]);

  const filteredViagens = viagens.filter(v => {
    if (statusFilter !== 'todos' && v.status !== statusFilter) return false;
    if (pontoFilter !== 'todos' && v.ponto_embarque !== pontoFilter) return false;
    return true;
  });

  const sortedViagens = [...filteredViagens].sort((a, b) => {
    const statusOrder = { 
      em_andamento: 0, 
      aguardando_retorno: 1, 
      agendado: 2, 
      encerrado: 3, 
      cancelado: 4 
    };
    const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 5;
    const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 5;
    if (orderA !== orderB) return orderA - orderB;
    return (a.h_pickup || '').localeCompare(b.h_pickup || '');
  });

  const counts = {
    agendado: viagens.filter(v => v.status === 'agendado').length,
    em_andamento: viagens.filter(v => v.status === 'em_andamento').length,
    aguardando_retorno: viagens.filter(v => v.status === 'aguardando_retorno').length,
    encerrado: viagens.filter(v => v.status === 'encerrado').length,
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                <Radio className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Operador</h1>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {evento?.nome_planilha || 'Carregando...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Menu de cadastros */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowMotoristaForm(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Cadastrar Motorista
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowVeiculoForm(true)}>
                    <Car className="h-4 w-4 mr-2" />
                    Cadastrar Veículo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowKmModal(true)}>
                    <Gauge className="h-4 w-4 mr-2" />
                    Registrar KM
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={refetch}>
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={() => setShowForm(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Status Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div 
            className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'agendado' ? 'ring-2 ring-primary' : 'bg-muted/50'}`}
            onClick={() => setStatusFilter(statusFilter === 'agendado' ? 'todos' : 'agendado')}
          >
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-bold">{counts.agendado}</p>
            <p className="text-[10px] text-muted-foreground">Agendado</p>
          </div>
          <div 
            className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'em_andamento' ? 'ring-2 ring-primary' : 'bg-primary/10'}`}
            onClick={() => setStatusFilter(statusFilter === 'em_andamento' ? 'todos' : 'em_andamento')}
          >
            <Bus className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-primary">{counts.em_andamento}</p>
            <p className="text-[10px] text-muted-foreground">Andamento</p>
          </div>
          <div 
            className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'aguardando_retorno' ? 'ring-2 ring-primary' : 'bg-amber-500/10'}`}
            onClick={() => setStatusFilter(statusFilter === 'aguardando_retorno' ? 'todos' : 'aguardando_retorno')}
          >
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-600" />
            <p className="text-xl font-bold text-amber-600">{counts.aguardando_retorno}</p>
            <p className="text-[10px] text-muted-foreground">Aguardando</p>
          </div>
          <div 
            className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'encerrado' ? 'ring-2 ring-primary' : 'bg-emerald-500/10'}`}
            onClick={() => setStatusFilter(statusFilter === 'encerrado' ? 'todos' : 'encerrado')}
          >
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
            <p className="text-xl font-bold text-emerald-600">{counts.encerrado}</p>
            <p className="text-[10px] text-muted-foreground">Encerrado</p>
          </div>
        </div>

        {/* Filtro por ponto */}
        {pontos.length > 0 && (
          <Select value={pontoFilter} onValueChange={setPontoFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por ponto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os pontos</SelectItem>
              {pontos.filter(p => p.ativo).map(p => (
                <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Lista de viagens */}
        <div className="space-y-3">
          {sortedViagens.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma viagem</p>
              <p className="text-sm mb-4">
                {statusFilter !== 'todos' 
                  ? 'Nenhuma viagem com este status'
                  : 'Crie a primeira viagem do evento'}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Viagem
              </Button>
            </div>
          ) : (
            sortedViagens.map(viagem => (
              <ViagemCardOperador 
                key={viagem.id} 
                viagem={viagem} 
                onUpdate={refetch}
              />
            ))
          )}
        </div>
      </main>

      {/* Form de criação de viagem (Drawer) */}
      <CreateViagemForm
        open={showForm}
        onOpenChange={setShowForm}
        eventoId={eventoId!}
        onCreated={refetch}
      />

      {/* Form de cadastro rápido de motorista */}
      <QuickMotoristaForm
        open={showMotoristaForm}
        onOpenChange={setShowMotoristaForm}
        eventoId={eventoId!}
        onCreated={() => refetchMotoristas()}
      />

      {/* Form de cadastro rápido de veículo */}
      <QuickVeiculoForm
        open={showVeiculoForm}
        onOpenChange={setShowVeiculoForm}
        eventoId={eventoId!}
        onCreated={() => refetchVeiculos()}
      />

      {/* Modal de registro de KM */}
      <VeiculoKmModal
        open={showKmModal}
        onOpenChange={setShowKmModal}
        eventoId={eventoId!}
        onUpdated={() => refetchVeiculos()}
      />
    </div>
  );
}
