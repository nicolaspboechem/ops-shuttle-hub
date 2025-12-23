import { useState, useEffect, useMemo } from 'react';
import { Users, Shield, ShieldCheck, ShieldX, Loader2, UserPlus, Eye, EyeOff, ChevronDown, Search, MoreVertical, Pencil, Trash2, Crown, Car, Headset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';

type UserType = 'motorista' | 'operador' | 'admin';

type AppPermission = 'view_trips' | 'edit_trips' | 'manage_drivers_vehicles' | 'export_data';

interface UserWithPermissions {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  permissions: AppPermission[];
}

const PERMISSION_LABELS: Record<AppPermission, { label: string; description: string }> = {
  view_trips: { label: 'Ver viagens', description: 'Visualizar lista de viagens ativas e finalizadas' },
  edit_trips: { label: 'Editar viagens', description: 'Modificar dados de viagens existentes' },
  manage_drivers_vehicles: { label: 'Gerenciar motoristas/veículos', description: 'Adicionar, editar e remover motoristas e veículos' },
  export_data: { label: 'Exportar dados', description: 'Baixar relatórios em Excel' },
};

export default function Usuarios() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal de criar usuário
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newUserType, setNewUserType] = useState<UserType>('operador');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Modal de editar usuário
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Modal de deletar usuário
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithPermissions | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.email.toLowerCase().includes(query) ||
      (user.full_name && user.full_name.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const { data: permissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*');

      if (permError) throw permError;

      const usersData: UserWithPermissions[] = (profiles || []).map(profile => {
        const role = roles?.find(r => r.user_id === profile.user_id);
        const userPerms = permissions?.filter(p => p.user_id === profile.user_id) || [];
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          role: (role?.role as 'admin' | 'user') || 'user',
          permissions: userPerms.map(p => p.permission as AppPermission),
        };
      });

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Apenas administradores podem criar usuários');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== newConfirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          user_type: newUserType
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuário criado com sucesso!');
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewConfirmPassword('');
      setNewFullName('');
      setNewUserType('operador');
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Map common error messages to Portuguese
      let errorMessage = 'Erro ao criar usuário';
      const msg = error.message?.toLowerCase() || '';
      
      if (msg.includes('email') && msg.includes('already') || msg.includes('email_exists')) {
        errorMessage = 'Já existe um usuário cadastrado com este email';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin || !editingUser) return;

    setUpdating(editingUser.id);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          email: editEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => {
        if (u.id !== editingUser.id) return u;
        return { ...u, full_name: editFullName, email: editEmail };
      }));

      toast.success('Usuário atualizado com sucesso!');
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!isAdmin || !deletingUser) return;

    if (deletingUser.user_id === currentUser?.id) {
      toast.error('Você não pode deletar sua própria conta');
      return;
    }

    setDeleting(true);

    try {
      // Delete user permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', deletingUser.user_id);

      // Delete user role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deletingUser.user_id);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      toast.success('Usuário removido com sucesso!');
      setShowDeleteModal(false);
      setDeletingUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao remover usuário');
    } finally {
      setDeleting(false);
    }
  };

  const toggleAdminRole = async (user: UserWithPermissions) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alterar roles');
      return;
    }

    if (user.user_id === currentUser?.id) {
      toast.error('Você não pode alterar seu próprio role');
      return;
    }

    setUpdating(`admin-${user.user_id}`);

    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', user.user_id);

      if (error) throw error;

      setUsers(prev => prev.map(u => {
        if (u.user_id !== user.user_id) return u;
        return { ...u, role: newRole };
      }));

      toast.success(newRole === 'admin' ? 'Usuário promovido a administrador!' : 'Acesso de administrador removido');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar role');
    } finally {
      setUpdating(null);
    }
  };

  const togglePermission = async (userId: string, permission: AppPermission, currentlyHas: boolean) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alterar permissões');
      return;
    }

    setUpdating(`${userId}-${permission}`);

    try {
      if (currentlyHas) {
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission', permission);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            permission: permission,
            granted_by: currentUser?.id,
          });

        if (error) throw error;
      }

      setUsers(prev => prev.map(u => {
        if (u.user_id !== userId) return u;
        return {
          ...u,
          permissions: currentlyHas
            ? u.permissions.filter(p => p !== permission)
            : [...u.permissions, permission],
        };
      }));

      toast.success(currentlyHas ? 'Permissão removida' : 'Permissão concedida');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const openEditModal = (user: UserWithPermissions) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditEmail(user.email);
    setShowEditModal(true);
  };

  const openDeleteModal = (user: UserWithPermissions) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Users className="w-7 h-7" />
              Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie usuários e suas permissões no sistema
            </p>
          </div>
          
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Usuário
            </Button>
          )}
        </div>

        {/* Barra de pesquisa */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {!isAdmin && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Você está visualizando como usuário comum. Apenas administradores podem alterar permissões.
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {filteredUsers.map((user) => {
            const isExpanded = expandedUsers.has(user.id);
            const activePermissions = user.permissions.length;
            const isCurrentUser = user.user_id === currentUser?.id;
            
            return (
              <Card key={user.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(user.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {user.role === 'admin' ? (
                            <ShieldCheck className="w-5 h-5 text-primary" />
                          ) : (
                            <Shield className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {user.full_name || user.email}
                            {user.role === 'admin' && (
                              <Badge variant="default" className="text-xs">Admin</Badge>
                            )}
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{user.email}</CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {user.role !== 'admin' && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <span className="text-sm text-muted-foreground">
                                {activePermissions} permissões ativas
                              </span>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            </Button>
                          </CollapsibleTrigger>
                        )}

                        {user.role === 'admin' && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span>Acesso completo</span>
                          </div>
                        )}

                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(user)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              
                              {!isCurrentUser && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => toggleAdminRole(user)}
                                    disabled={updating === `admin-${user.user_id}`}
                                  >
                                    <Crown className="w-4 h-4 mr-2" />
                                    {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                    {updating === `admin-${user.user_id}` && (
                                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    )}
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteModal(user)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {user.role !== 'admin' && (
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(Object.keys(PERMISSION_LABELS) as AppPermission[]).map((permission) => {
                            const hasPermission = user.permissions.includes(permission);
                            const isUpdatingThis = updating === `${user.user_id}-${permission}`;
                            
                            return (
                              <div
                                key={permission}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                              >
                                <div className="flex-1 mr-4">
                                  <Label className="text-sm font-medium">
                                    {PERMISSION_LABELS[permission].label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {PERMISSION_LABELS[permission].description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isUpdatingThis ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : hasPermission ? (
                                    <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                      Ativo
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      Inativo
                                    </Badge>
                                  )}
                                  <Switch
                                    checked={hasPermission}
                                    onCheckedChange={() => togglePermission(user.user_id, permission, hasPermission)}
                                    disabled={!isAdmin || isUpdatingThis}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </Card>
            );
          })}

          {filteredUsers.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">
                Tente buscar por outro nome ou email.
              </p>
            </div>
          )}

          {users.length === 0 && !searchQuery && (
            <div className="text-center py-12">
              <ShieldX className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">
                Clique em "Criar Usuário" para adicionar o primeiro usuário.
              </p>
            </div>
          )}
        </div>

        {/* Modal Criar Usuário */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-fullname">Nome completo</Label>
                <Input
                  id="new-fullname"
                  type="text"
                  placeholder="Nome do usuário"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-confirm-password">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="new-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                </div>
                {newConfirmPassword && newPassword !== newConfirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
              </div>

              {/* Tipo de Usuário */}
              <div className="space-y-3">
                <Label>Tipo de Usuário</Label>
                <RadioGroup 
                  value={newUserType} 
                  onValueChange={(value) => setNewUserType(value as UserType)}
                  className="grid grid-cols-3 gap-3"
                >
                  <div>
                    <RadioGroupItem value="motorista" id="type-motorista" className="peer sr-only" />
                    <Label
                      htmlFor="type-motorista"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Car className="mb-2 h-5 w-5" />
                      <span className="text-sm font-medium">Motorista</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">Apenas visualiza</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="operador" id="type-operador" className="peer sr-only" />
                    <Label
                      htmlFor="type-operador"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Headset className="mb-2 h-5 w-5" />
                      <span className="text-sm font-medium">Operador</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">Acesso operacional</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="admin" id="type-admin" className="peer sr-only" />
                    <Label
                      htmlFor="type-admin"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Crown className="mb-2 h-5 w-5" />
                      <span className="text-sm font-medium">Admin</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">Acesso total</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Criar Usuário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Editar Usuário */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullname">Nome completo</Label>
                <Input
                  id="edit-fullname"
                  type="text"
                  placeholder="Nome do usuário"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updating === editingUser?.id}>
                  {updating === editingUser?.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Deletar Usuário */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Usuário</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o usuário <strong>{deletingUser?.full_name || deletingUser?.email}</strong>? 
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
                {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
