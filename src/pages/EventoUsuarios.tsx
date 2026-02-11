import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Plus, Search, Trash2, UserPlus, Loader2, Car, Phone, KeyRound, Clock, LogIn, LogOut, Radio, ClipboardCheck, MoreVertical, Check, X, MessageCircle, Lock } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useEquipe, EquipeMembro } from '@/hooks/useEquipe';
import { useVeiculos } from '@/hooks/useCadastros';
import { CreateMotoristaWizard } from '@/components/motoristas/CreateMotoristaWizard';
import { AddStaffWizard } from '@/components/equipe/AddStaffWizard';
import { EditMotoristaLoginModal } from '@/components/equipe/EditMotoristaLoginModal';
import { EditStaffLoginModal } from '@/components/equipe/EditStaffLoginModal';
import { supabase } from '@/integrations/supabase/client';

export default function EventoUsuarios() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { membros, loading, stats, refetch, handleCheckin, handleCheckout, handleRemoveMembro } = useEquipe(eventoId);
  const { veiculos } = useVeiculos(eventoId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showMotoristaWizard, setShowMotoristaWizard] = useState(false);
  const [showStaffWizard, setShowStaffWizard] = useState(false);
  const [loginModalMembro, setLoginModalMembro] = useState<EquipeMembro | null>(null);

  const filteredMembros = useMemo(() => {
    let filtered = [...membros];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.nome.toLowerCase().includes(term) ||
        m.telefone?.toLowerCase().includes(term)
      );
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(m => m.role === filterRole);
    }
    
    // Sort: staff first, then motoristas
    return filtered.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'staff' ? -1 : 1;
      return a.nome.localeCompare(b.nome);
    });
  }, [membros, searchTerm, filterRole]);

  const handleCreateMotorista = async (data: { nome: string; telefone: string; veiculo_id?: string }) => {
    const { data: motorista, error } = await supabase
      .from('motoristas')
      .insert({
        nome: data.nome,
        telefone: data.telefone || null,
        veiculo_id: data.veiculo_id || null,
        evento_id: eventoId,
        ativo: true,
      })
      .select('id')
      .single();

    if (error) {
      toast.error(`Erro ao criar motorista: ${error.message}`);
      return undefined;
    }
    
    toast.success('Motorista adicionado à equipe!');
    refetch();
    return motorista?.id;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'operador': return <Radio className="w-4 h-4" />;
      case 'supervisor': return <ClipboardCheck className="w-4 h-4" />;
      case 'motorista': return <Car className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'operador': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'supervisor': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'motorista': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default: return '';
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'disponivel': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'em_viagem': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'indisponivel': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'inativo': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'disponivel': return 'Disponível';
      case 'em_viagem': return 'Em Viagem';
      case 'indisponivel': return 'Indisponível';
      case 'inativo': return 'Inativo';
      default: return 'Pendente';
    }
  };

  const MembroCard = ({ membro }: { membro: EquipeMembro }) => {
    const isMotorista = membro.tipo === 'motorista';
    const isPresente = membro.checkin_at && !membro.checkout_at;

    return (
      <Card className={cn(
        "transition-all hover:shadow-md",
        isMotorista && isPresente && "ring-1 ring-emerald-500/30"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                membro.has_login 
                  ? "bg-primary/10 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {membro.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  {membro.nome}
                  {membro.has_login && (
                    <KeyRound className="w-3 h-3 text-emerald-500" />
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={cn("text-xs", getRoleBadgeClass(membro.role))}>
                    {getRoleIcon(membro.role)}
                    <span className="ml-1 capitalize">{membro.role}</span>
                  </Badge>
                  {isMotorista && membro.status && (
                    <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(membro.status))}>
                      {getStatusLabel(membro.status)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                {membro.telefone && (
                  <DropdownMenuItem onClick={() => {
                    const phone = membro.telefone?.replace(/\D/g, '');
                    window.open(`https://wa.me/55${phone}`, '_blank');
                  }}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setLoginModalMembro(membro)}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  {isMotorista 
                    ? (membro.has_login ? "Gerenciar Login" : "Criar Login")
                    : "Gerenciar Acesso"
                  }
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover da Equipe
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover {membro.nome}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Este membro será removido da equipe do evento.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground"
                        onClick={() => handleRemoveMembro(membro)}
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Info adicional para motoristas */}
          {isMotorista && (
            <div className="mt-3 pt-3 border-t space-y-2">
              {membro.telefone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{membro.telefone}</span>
                </div>
              )}
              
              {membro.veiculo_placa && (
                <div className="flex items-center gap-2 text-sm">
                  <Car className="w-3.5 h-3.5 text-muted-foreground" />
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{membro.veiculo_placa}</code>
                </div>
              )}

              {/* Presença info (somente leitura) */}
              {membro.checkin_at && !membro.checkout_at && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Presente desde {new Date(membro.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {membro.checkin_at && membro.checkout_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Jornada encerrada</span>
                </div>
              )}

              {/* Botão Criar Login - visível apenas se motorista não tem login */}
              {!membro.has_login && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full mt-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => setLoginModalMembro(membro)}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  Criar Login de Acesso
                </Button>
              )}
            </div>
          )}

          {/* Info adicional para staff (operadores/supervisores) */}
          {!isMotorista && (
            <div className="mt-3 pt-3 border-t space-y-2">
              {membro.telefone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{membro.telefone}</span>
                </div>
              )}
              
              {!membro.has_login && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full mt-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => setLoginModalMembro(membro)}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  Criar Login de Acesso
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <EventLayout>
        <div className="p-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipe do Evento</h1>
            <p className="text-muted-foreground">
              Hub centralizado para gerenciar motoristas e staff operacional
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowMotoristaWizard(true)}>
              <Car className="w-4 h-4 mr-2" />
              Adicionar Motorista
            </Button>
            <Button onClick={() => setShowStaffWizard(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Staff
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <Car className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.motoristas}</p>
                <p className="text-xs text-muted-foreground">Motoristas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <Radio className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.operadores}</p>
                <p className="text-xs text-muted-foreground">Operadores</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10">
                <ClipboardCheck className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.supervisores}</p>
                <p className="text-xs text-muted-foreground">Supervisores</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <KeyRound className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.motoristasComLogin}</p>
                <p className="text-xs text-muted-foreground">Com Login</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-500/10">
                <LogIn className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.motoristasPresentes}</p>
                <p className="text-xs text-muted-foreground">Presentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos os papéis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="motorista">Motoristas</SelectItem>
              <SelectItem value="operador">Operadores</SelectItem>
              <SelectItem value="supervisor">Supervisores</SelectItem>
            </SelectContent>
          </Select>
          {(searchTerm || filterRole !== 'all') && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => { setSearchTerm(''); setFilterRole('all'); }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Members Grid */}
        {filteredMembros.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-2">
              {searchTerm || filterRole !== 'all' 
                ? 'Nenhum membro encontrado' 
                : 'Equipe vazia'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterRole !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Adicione motoristas e staff para começar'}
            </p>
            {!searchTerm && filterRole === 'all' && (
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowMotoristaWizard(true)}>
                  <Car className="w-4 h-4 mr-2" />
                  Adicionar Motorista
                </Button>
                <Button onClick={() => setShowStaffWizard(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar Staff
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembros.map(membro => (
              <MembroCard key={`${membro.tipo}-${membro.id}`} membro={membro} />
            ))}
          </div>
        )}

        {/* Wizards */}
        <CreateMotoristaWizard
          open={showMotoristaWizard}
          onOpenChange={setShowMotoristaWizard}
          veiculos={veiculos}
          eventoId={eventoId}
          onSubmit={handleCreateMotorista}
        />
        
        <AddStaffWizard
          open={showStaffWizard}
          onOpenChange={setShowStaffWizard}
          eventoId={eventoId}
          onSuccess={refetch}
        />

        {loginModalMembro && loginModalMembro.tipo === 'motorista' && (
          <EditMotoristaLoginModal
            open={!!loginModalMembro}
            onOpenChange={(open) => !open && setLoginModalMembro(null)}
            motorista={{
              id: loginModalMembro.id,
              nome: loginModalMembro.nome,
              telefone: loginModalMembro.telefone,
              has_login: loginModalMembro.has_login,
            }}
            eventoId={eventoId}
            onSuccess={refetch}
          />
        )}

        {loginModalMembro && loginModalMembro.tipo === 'staff' && (
          <EditStaffLoginModal
            open={!!loginModalMembro}
            onOpenChange={(open) => !open && setLoginModalMembro(null)}
            staff={{
              id: loginModalMembro.id,
              user_id: loginModalMembro.user_id,
              nome: loginModalMembro.nome,
              telefone: loginModalMembro.telefone,
              role: loginModalMembro.role,
              has_login: loginModalMembro.has_login,
            }}
            eventoId={eventoId}
            onSuccess={refetch}
          />
        )}
      </div>
    </EventLayout>
  );
}
