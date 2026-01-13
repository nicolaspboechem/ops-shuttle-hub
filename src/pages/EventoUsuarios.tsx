import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Plus, Search, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventoUsuario {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    email: string;
    full_name: string | null;
  };
}

interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
}

export default function EventoUsuarios() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [usuarios, setUsuarios] = useState<EventoUsuario[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('operador');
  const [saving, setSaving] = useState(false);

  const fetchUsuarios = async () => {
    if (!eventoId) return;

    setLoading(true);
    try {
      // Fetch users linked to this event
      const { data: eventUsuarios, error: eventError } = await supabase
        .from('evento_usuarios')
        .select('*')
        .eq('evento_id', eventoId);

      if (eventError) throw eventError;

      // Fetch all profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name');

      if (profilesError) throw profilesError;

      setProfiles(allProfiles || []);

      // Merge profile data with event users
      const merged = (eventUsuarios || []).map(eu => ({
        ...eu,
        profile: allProfiles?.find(p => p.user_id === eu.user_id)
      }));

      setUsuarios(merged);
    } catch (error: any) {
      toast.error(`Erro ao carregar usuários: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [eventoId]);

  const availableProfiles = useMemo(() => {
    const linkedUserIds = usuarios.map(u => u.user_id);
    return profiles.filter(p => !linkedUserIds.includes(p.user_id));
  }, [profiles, usuarios]);

  const handleAddUsuario = async () => {
    if (!selectedUserId || !eventoId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('evento_usuarios').insert({
        evento_id: eventoId,
        user_id: selectedUserId,
        role: selectedRole,
      });

      if (error) throw error;

      toast.success('Usuário adicionado ao evento!');
      setAddModalOpen(false);
      setSelectedUserId('');
      setSelectedRole('operador');
      fetchUsuarios();
    } catch (error: any) {
      toast.error(`Erro ao adicionar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (usuarioId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('evento_usuarios')
        .update({ role: newRole })
        .eq('id', usuarioId);

      if (error) throw error;

      toast.success('Papel atualizado!');
      fetchUsuarios();
    } catch (error: any) {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  };

  const handleRemoveUsuario = async (usuarioId: string) => {
    try {
      const { error } = await supabase
        .from('evento_usuarios')
        .delete()
        .eq('id', usuarioId);

      if (error) throw error;

      toast.success('Usuário removido do evento!');
      fetchUsuarios();
    } catch (error: any) {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  };

  const filteredUsuarios = useMemo(() => {
    if (!searchTerm) return usuarios;
    const term = searchTerm.toLowerCase();
    return usuarios.filter(u => 
      u.profile?.email.toLowerCase().includes(term) ||
      u.profile?.full_name?.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  }, [usuarios, searchTerm]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'operador': return 'default';
      case 'motorista': return 'secondary';
      case 'supervisor': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'motorista': return 'Motorista';
      case 'operador': return 'Operador';
      case 'supervisor': return 'Supervisor';
      default: return role;
    }
  };

  if (loading) {
    return (
      <EventLayout>
        <div className="p-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipe do Evento</h1>
            <p className="text-muted-foreground">Gerencie usuários vinculados a este evento</p>
          </div>

          <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Usuário ao Evento</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProfiles.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          Nenhum usuário disponível
                        </SelectItem>
                      ) : (
                        availableProfiles.map(profile => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Papel no Evento</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Operador</span>
                          <span className="text-xs text-muted-foreground">Gerencia viagens, motoristas e veículos</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="supervisor">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Supervisor</span>
                          <span className="text-xs text-muted-foreground">Vistoria veículos e organiza motoristas</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="motorista">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Motorista</span>
                          <span className="text-xs text-muted-foreground">Visualiza e registra próprias viagens</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddUsuario} disabled={!selectedUserId || saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usuarios.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usuarios.filter(u => u.role === 'operador').length}</p>
                <p className="text-sm text-muted-foreground">Operadores</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usuarios.filter(u => u.role === 'motorista').length}</p>
                <p className="text-sm text-muted-foreground">Motoristas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      {usuario.profile?.full_name || 'Sem nome'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {usuario.profile?.email || '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={usuario.role}
                        onValueChange={(value) => handleUpdateRole(usuario.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <Badge variant={getRoleBadgeVariant(usuario.role)}>
                            {getRoleLabel(usuario.role)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operador">Operador</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="motorista">Motorista</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário {usuario.profile?.full_name || usuario.profile?.email} será removido deste evento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveUsuario(usuario.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </EventLayout>
  );
}
