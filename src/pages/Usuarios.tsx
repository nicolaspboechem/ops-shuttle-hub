import { useState, useEffect, useMemo } from 'react';
import { Users, Shield, ShieldCheck, Loader2, UserPlus, Eye, EyeOff, Search, MoreVertical, Pencil, Trash2, Crown, Car, Headset, Phone, Mail, Copy, Check, KeyRound, UserCog, Binoculars, Filter } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { maskPhone, formatPhoneDisplay, isValidPhone } from '@/lib/utils/formatPhone';

type UserType = 'motorista' | 'operador' | 'admin' | 'supervisor' | 'cliente';
type LoginType = 'email' | 'phone';

interface UserData {
  id: string;
  user_id: string;
  email: string | null;
  telefone: string | null;
  login_type: string | null;
  full_name: string | null;
  user_type: UserType | null;
  role: 'admin' | 'user';
}

const USER_TYPE_CONFIG: Record<UserType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  admin: { label: 'Admin', icon: Crown, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  supervisor: { label: 'Supervisor', icon: UserCog, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  operador: { label: 'Operador', icon: Headset, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  motorista: { label: 'Motorista', icon: Car, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
  cliente: { label: 'Cliente', icon: Binoculars, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

export default function Usuarios() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Modal de criar usuário
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newUserType, setNewUserType] = useState<UserType>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Modal de credenciais (exibido após criação)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ login: string; password: string; name: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal de editar usuário
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUserType, setEditUserType] = useState<UserType>('operador');
  const [editEmail, setEditEmail] = useState('');

  // Modal de deletar usuário
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithPermissions | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal de reset de senha
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithPermissions | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Login type derived from user type: only motorista uses phone
  const isPhoneLogin = newUserType === 'motorista';

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.user_type === filterType);
    }
    
    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.full_name && user.full_name.toLowerCase().includes(query)) ||
        (user.telefone && user.telefone.includes(query))
      );
    }
    
    return filtered;
  }, [users, searchQuery, filterType]);

  // Stats por tipo
  const userStats = useMemo(() => {
    const stats: Record<string, number> = { all: users.length };
    for (const type of Object.keys(USER_TYPE_CONFIG)) {
      stats[type] = users.filter(u => u.user_type === type).length;
    }
    return stats;
  }, [users]);

  const fetchUsers = async () => {
    try {
      const [profilesRes, rolesRes, permRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('user_permissions').select('*'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (permRes.error) throw permRes.error;

      const usersData: UserWithPermissions[] = (profilesRes.data || []).map(profile => {
        const role = rolesRes.data?.find(r => r.user_id === profile.user_id);
        const userPerms = permRes.data?.filter(p => p.user_id === profile.user_id) || [];
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          telefone: (profile as any).telefone || null,
          login_type: (profile as any).login_type || 'email',
          full_name: profile.full_name,
          user_type: ((profile as any).user_type as UserType) || 'operador',
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTelefone(maskPhone(e.target.value));
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

    if (isPhoneLogin) {
      if (!newTelefone || !isValidPhone(newTelefone)) {
        toast.error('Digite um telefone válido');
        return;
      }
    } else {
      if (!newEmail) {
        toast.error('Digite um email válido');
        return;
      }
    }

    setCreating(true);

    try {
      const body = isPhoneLogin
        ? {
            telefone: newTelefone.replace(/\D/g, ''),
            login_type: 'phone',
            password: newPassword,
            full_name: newFullName,
            user_type: newUserType,
          }
        : {
            email: newEmail,
            login_type: 'email',
            password: newPassword,
            full_name: newFullName,
            user_type: newUserType,
          };

      const { data, error } = await supabase.functions.invoke('create-user', { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedCredentials({
        login: isPhoneLogin ? newTelefone : newEmail,
        password: newPassword,
        name: newFullName,
      });
      setShowCreateModal(false);
      setShowCredentialsModal(true);
      
      // Limpar campos
      setNewEmail('');
      setNewTelefone('');
      setNewPassword('');
      setNewConfirmPassword('');
      setNewFullName('');
      setNewUserType('admin');
      
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = 'Erro ao criar usuário';
      const msg = error.message?.toLowerCase() || '';
      
      if (msg.includes('email') && msg.includes('already') || msg.includes('email_exists')) {
        errorMessage = 'Já existe um usuário cadastrado com este email';
      } else if (msg.includes('phone') && msg.includes('already') || msg.includes('telefone')) {
        errorMessage = 'Já existe um usuário cadastrado com este celular';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingUser) return;

    setUpdating(editingUser.id);

    try {
      // Determine the correct login_type based on role
      const newLoginType = editUserType === 'motorista' ? 'phone' : 'email';

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          email: editEmail,
          user_type: editUserType,
          login_type: newLoginType,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Map user type to the correct app_role enum value
      const dbRole = editUserType === 'admin' ? 'admin' : editUserType;

      // Don't let admin demote themselves
      if (editingUser.user_id === currentUser?.id && editingUser.role === 'admin' && editUserType !== 'admin') {
        toast.error('Você não pode remover seu próprio acesso de admin');
        setUpdating(null);
        return;
      }

      await supabase.from('user_roles').update({ role: dbRole }).eq('user_id', editingUser.user_id);

      const newRoleState: 'admin' | 'user' = editUserType === 'admin' ? 'admin' : 'user';

      setUsers(prev => prev.map(u => {
        if (u.id !== editingUser.id) return u;
        return { ...u, full_name: editFullName, email: editEmail, user_type: editUserType, login_type: newLoginType, role: newRoleState };
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deletingUser.user_id },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      toast.success('Usuário removido com sucesso!');
      setShowDeleteModal(false);
      setDeletingUser(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao remover usuário');
    } finally {
      setDeleting(false);
    }
  };

  const toggleAdminRole = async (user: UserWithPermissions) => {
    if (!isAdmin || user.user_id === currentUser?.id) return;

    setUpdating(`admin-${user.user_id}`);
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', user.user_id);
      if (error) throw error;

      setUsers(prev => prev.map(u => u.user_id !== user.user_id ? u : { ...u, role: newRole }));
      toast.success(newRole === 'admin' ? 'Usuário promovido a administrador!' : 'Acesso de administrador removido');
    } catch (error) {
      toast.error('Erro ao atualizar role');
    } finally {
      setUpdating(null);
    }
  };

  const togglePermission = async (userId: string, permission: AppPermission, currentlyHas: boolean) => {
    if (!isAdmin) return;

    setUpdating(`${userId}-${permission}`);
    try {
      if (currentlyHas) {
        const { error } = await supabase.from('user_permissions').delete().eq('user_id', userId).eq('permission', permission);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_permissions').insert({
          user_id: userId,
          permission,
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
      toast.error('Erro ao atualizar permissão');
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const openEditModal = (user: UserWithPermissions) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditEmail(user.email || '');
    setEditUserType(user.user_type || 'operador');
    setShowEditModal(true);
  };

  const openDeleteModal = (user: UserWithPermissions) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const openResetPasswordModal = (user: UserWithPermissions) => {
    setResetPasswordUser(user);
    setResetPassword('');
    setResetConfirmPassword('');
    setShowResetPassword(false);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !resetPasswordUser) return;
    if (resetPassword.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return; }
    if (resetPassword !== resetConfirmPassword) { toast.error('As senhas não coincidem'); return; }

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { user_id: resetPasswordUser.user_id, new_password: resetPassword }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedCredentials({
        login: getUserLoginDisplay(resetPasswordUser),
        password: resetPassword,
        name: resetPasswordUser.full_name || getUserLoginDisplay(resetPasswordUser)
      });
      setShowResetPasswordModal(false);
      setShowCredentialsModal(true);
      setResetPasswordUser(null);
      toast.success('Senha alterada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao resetar senha');
    } finally {
      setResettingPassword(false);
    }
  };

  const getUserLoginDisplay = (user: UserWithPermissions) => {
    if (user.login_type === 'phone' && user.telefone) return formatPhoneDisplay(user.telefone);
    return user.email || '-';
  };

  const getUserTypeBadge = (userType: UserType | null) => {
    const type = userType || 'operador';
    const config = USER_TYPE_CONFIG[type];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn("text-xs gap-1", config.color, config.bgColor)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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
              <Users className="w-7 h-7 text-primary" />
              Usuários do Sistema
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os usuários e permissões do sistema
            </p>
          </div>
          
          {isAdmin && (
            <Button onClick={() => { setNewUserType('admin'); setShowCreateModal(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          )}
        </div>

        {/* Stats por tipo */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {Object.entries(USER_TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            const count = userStats[type] || 0;
            const isActive = filterType === type;
            return (
              <button
                key={type}
                onClick={() => setFilterType(isActive ? 'all' : type)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className={cn("w-4 h-4", config.color)} />
                <div>
                  <p className="text-lg font-bold leading-none">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </button>
            );
          })}
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
              filterType === 'all'
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold leading-none">{userStats.all || 0}</p>
              <p className="text-xs text-muted-foreground">Todos</p>
            </div>
          </button>
        </div>

        {/* Barra de pesquisa */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome, email ou celular..."
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
                            {user.full_name || getUserLoginDisplay(user)}
                            {getUserTypeBadge(user.user_type)}
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            {user.login_type === 'phone' ? (
                              <>
                                <Phone className="w-3 h-3" />
                                {formatPhoneDisplay(user.telefone || '')}
                              </>
                            ) : (
                              <>
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {user.role !== 'admin' && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <span className="text-sm text-muted-foreground">
                                {activePermissions} permissões
                              </span>
                              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
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
                                  <DropdownMenuItem onClick={() => openResetPasswordModal(user)}>
                                    <KeyRound className="w-4 h-4 mr-2" />
                                    Resetar Senha
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toggleAdminRole(user)}
                                    disabled={updating === `admin-${user.user_id}`}
                                  >
                                    <Crown className="w-4 h-4 mr-2" />
                                    {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                    {updating === `admin-${user.user_id}` && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
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
                              <div key={permission} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                                <div className="flex-1 mr-4">
                                  <Label className="text-sm font-medium">{PERMISSION_LABELS[permission].label}</Label>
                                  <p className="text-xs text-muted-foreground">{PERMISSION_LABELS[permission].description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isUpdatingThis ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : hasPermission ? (
                                    <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Inativo</Badge>
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

          {filteredUsers.length === 0 && (searchQuery || filterType !== 'all') && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">Tente buscar por outro termo ou ajuste o filtro.</p>
            </div>
          )}

          {filteredUsers.length === 0 && !searchQuery && filterType === 'all' && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário cadastrado</h3>
              <p className="text-muted-foreground">Clique em "Novo Usuário" para adicionar o primeiro.</p>
            </div>
          )}
        </div>

        {/* Modal Criar Usuário */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Tipo de Usuário */}
              <div className="space-y-3">
                <Label>Tipo de Usuário</Label>
                <RadioGroup 
                  value={newUserType} 
                  onValueChange={(value) => setNewUserType(value as UserType)}
                  className="grid grid-cols-3 gap-2"
                >
                  {Object.entries(USER_TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <div key={type}>
                        <RadioGroupItem value={type} id={`new-type-${type}`} className="peer sr-only" />
                        <Label
                          htmlFor={`new-type-${type}`}
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Icon className="mb-1 h-4 w-4" />
                          <span className="text-xs font-medium">{config.label}</span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                {isPhoneLogin ? (
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> Login por telefone + senha</p>
                ) : (
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> Login por email + senha</p>
                )}
              </div>

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

              {isPhoneLogin ? (
                <div className="space-y-2">
                  <Label htmlFor="new-telefone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Telefone
                  </Label>
                  <Input
                    id="new-telefone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={newTelefone}
                    onChange={handlePhoneChange}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="new-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
              )}

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
                <Input
                  id="new-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={newConfirmPassword}
                  onChange={(e) => setNewConfirmPassword(e.target.value)}
                  required
                />
                {newConfirmPassword && newPassword !== newConfirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
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

        {/* Modal de Credenciais (após criação) */}
        <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                Usuário criado com sucesso!
              </DialogTitle>
              <DialogDescription>Envie as credenciais abaixo para o usuário</DialogDescription>
            </DialogHeader>
            
            {createdCredentials && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{createdCredentials.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Login</p>
                      <p className="font-medium font-mono">{createdCredentials.login}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(createdCredentials.login, 'login')}>
                      {copiedField === 'login' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Senha</p>
                      <p className="font-medium font-mono">{createdCredentials.password}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(createdCredentials.password, 'password')}>
                      {copiedField === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={() => {
                  const text = `Login: ${createdCredentials.login}\nSenha: ${createdCredentials.password}`;
                  copyToClipboard(text, 'all');
                }}>
                  {copiedField === 'all' ? <><Check className="w-4 h-4 mr-2" />Copiado!</> : <><Copy className="w-4 h-4 mr-2" />Copiar Tudo</>}
                </Button>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCredentialsModal(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Editar Usuário */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-3">
                <Label>Tipo de Usuário</Label>
                <RadioGroup 
                  value={editUserType} 
                  onValueChange={(value) => setEditUserType(value as UserType)}
                  className="grid grid-cols-3 gap-2"
                >
                  {Object.entries(USER_TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    const isSelf = editingUser?.user_id === currentUser?.id;
                    // Can't demote yourself from admin
                    const disabled = isSelf && editingUser?.role === 'admin' && type !== 'admin';
                    // Motorista requires phone login; others require email login
                    const isMotoristaWithoutPhone = type === 'motorista' && !editingUser?.telefone;
                    const isEmailRoleWithoutEmail = type !== 'motorista' && !editingUser?.email;
                    const loginMismatch = isMotoristaWithoutPhone || isEmailRoleWithoutEmail;
                    return (
                      <div key={type}>
                        <RadioGroupItem value={type} id={`edit-type-${type}`} className="peer sr-only" disabled={disabled} />
                        <Label
                          htmlFor={`edit-type-${type}`}
                          className={cn(
                            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer",
                            disabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Icon className="mb-1 h-4 w-4" />
                          <span className="text-xs font-medium">{config.label}</span>
                        </Label>
                        {loginMismatch && editUserType === type && (
                          <p className="text-xs text-amber-600 mt-1">
                            {isMotoristaWithoutPhone ? 'Usuário não possui telefone cadastrado' : 'Usuário não possui email cadastrado'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
                {editingUser?.user_id === currentUser?.id && editingUser?.role === 'admin' && (
                  <p className="text-xs text-muted-foreground">Você não pode alterar seu próprio tipo de admin</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-fullname">Nome completo</Label>
                <Input id="edit-fullname" type="text" placeholder="Nome do usuário" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" placeholder="email@exemplo.com" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
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
                Tem certeza que deseja excluir o usuário <strong>{deletingUser?.full_name || (deletingUser ? getUserLoginDisplay(deletingUser) : '')}</strong>? 
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
                {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Resetar Senha */}
        <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Resetar Senha
              </DialogTitle>
              <DialogDescription>
                Definir nova senha para <strong>{resetPasswordUser?.full_name || (resetPasswordUser ? getUserLoginDisplay(resetPasswordUser) : '')}</strong>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="reset-confirm-password"
                  type={showResetPassword ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                />
                {resetConfirmPassword && resetPassword !== resetConfirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowResetPasswordModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={resettingPassword}>
                  {resettingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Alterar Senha
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
