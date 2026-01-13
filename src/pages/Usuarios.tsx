import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, ShieldCheck, ShieldX, Loader2, UserPlus, Eye, EyeOff, ChevronDown, Search, MoreVertical, Pencil, Trash2, Crown, Car, Headset, Phone, Mail, Copy, Check, KeyRound, UserCog, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { maskPhone, formatPhoneDisplay, isValidPhone } from '@/lib/utils/formatPhone';

type UserType = 'motorista' | 'operador' | 'admin' | 'supervisor' | 'coordenador';
type LoginType = 'email' | 'phone';

type AppPermission = 'view_trips' | 'edit_trips' | 'manage_drivers_vehicles' | 'export_data';

interface UserWithPermissions {
  id: string;
  user_id: string;
  email: string | null;
  telefone: string | null;
  login_type: string | null;
  full_name: string | null;
  user_type: UserType | null;
  role: 'admin' | 'user';
  permissions: AppPermission[];
}

const PERMISSION_LABELS: Record<AppPermission, { label: string; description: string }> = {
  view_trips: { label: 'Ver viagens', description: 'Visualizar lista de viagens ativas e finalizadas' },
  edit_trips: { label: 'Editar viagens', description: 'Modificar dados de viagens existentes' },
  manage_drivers_vehicles: { label: 'Gerenciar motoristas/veículos', description: 'Adicionar, editar e remover motoristas e veículos' },
  export_data: { label: 'Exportar dados', description: 'Baixar relatórios em Excel' },
};

const USER_TYPE_CONFIG: Record<UserType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  admin: { label: 'Admin', icon: Crown, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  supervisor: { label: 'Supervisor', icon: UserCog, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  coordenador: { label: 'Coordenador', icon: MapPin, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  operador: { label: 'Operador', icon: Headset, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  motorista: { label: 'Motorista', icon: Car, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
};

export default function Usuarios() {
  const navigate = useNavigate();
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Admin sempre usa email
  const loginType: LoginType = 'email';

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apenas administradores
  const adminUsers = useMemo(() => {
    return users.filter(user => user.user_type === 'admin' || user.role === 'admin');
  }, [users]);

  const filteredUsers = useMemo(() => {
    let filtered = adminUsers;
    
    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.full_name && user.full_name.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [adminUsers, searchQuery]);

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

    // Admin sempre usa email
    if (!newEmail) {
      toast.error('Digite um email válido');
      return;
    }

    setCreating(true);

    try {
      const body = {
        email: newEmail,
        login_type: 'email',
        password: newPassword,
        full_name: newFullName,
        user_type: 'admin' as const
      };

      const { data, error } = await supabase.functions.invoke('create-user', {
        body
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Exibir modal com credenciais
      setCreatedCredentials({
        login: newEmail,
        password: newPassword,
        name: newFullName
      });
      setShowCreateModal(false);
      setShowCredentialsModal(true);
      
      // Limpar campos
      setNewEmail('');
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
      } else if (msg.includes('phone') && msg.includes('already')) {
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
      // Atualizar profile com user_type
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          email: editEmail,
          user_type: editUserType,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Se mudou para admin, garantir que tem role admin
      if (editUserType === 'admin' && editingUser.role !== 'admin') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', editingUser.user_id);

        if (roleError) throw roleError;
      }
      
      // Se mudou de admin para outro tipo, remover role admin
      if (editUserType !== 'admin' && editingUser.role === 'admin' && editingUser.user_id !== currentUser?.id) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'user' })
          .eq('user_id', editingUser.user_id);

        if (roleError) throw roleError;
      }

      // Determinar o novo role baseado nas mudanças
      let newRole: 'admin' | 'user' = editingUser.role;
      if (editUserType === 'admin') {
        newRole = 'admin';
      } else if (editingUser.role === 'admin' && editingUser.user_id !== currentUser?.id) {
        newRole = 'user';
      }

      setUsers(prev => prev.map(u => {
        if (u.id !== editingUser.id) return u;
        return { 
          ...u, 
          full_name: editFullName, 
          email: editEmail,
          user_type: editUserType,
          role: newRole
        };
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
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', deletingUser.user_id);

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deletingUser.user_id);

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

    if (resetPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setResettingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          user_id: resetPasswordUser.user_id,
          new_password: resetPassword
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Exibir credenciais para o admin copiar
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
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao resetar senha');
    } finally {
      setResettingPassword(false);
    }
  };

  const getUserLoginDisplay = (user: UserWithPermissions) => {
    if (user.login_type === 'phone' && user.telefone) {
      return formatPhoneDisplay(user.telefone);
    }
    return user.email || '-';
  };

  const getUserTypeBadge = (userType: UserType | null) => {
    const type = userType || 'operador';
    const config = USER_TYPE_CONFIG[type];
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
              <Crown className="w-7 h-7 text-amber-500" />
              Administradores do Sistema
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os administradores globais do sistema
            </p>
          </div>
          
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Admin
            </Button>
          )}
        </div>

        {/* Alerta informativo sobre equipe de eventos */}
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Cadastro de Equipe por Evento</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            Para cadastrar <strong>Motoristas, Operadores, Supervisores e Coordenadores</strong>, acesse a página <strong>Equipe</strong> dentro de cada evento. 
            Cada tipo de equipe é vinculado ao seu evento específico.
          </AlertDescription>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
            onClick={() => navigate('/eventos')}
          >
            Ir para Eventos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Alert>

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
                Tente buscar por outro nome, email ou celular.
              </p>
            </div>
          )}

          {filteredUsers.length === 0 && !searchQuery && (
            <div className="text-center py-12">
              <Crown className="w-12 h-12 text-amber-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum administrador cadastrado</h3>
              <p className="text-muted-foreground">
                Clique em "Criar Admin" para adicionar o primeiro administrador.
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
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Novo Administrador</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Acesso total ao sistema via email</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-fullname">Nome completo</Label>
                <Input
                  id="new-fullname"
                  type="text"
                  placeholder="Nome do administrador"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
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
              <DialogDescription>
                Envie as credenciais abaixo para o usuário
              </DialogDescription>
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(createdCredentials.login, 'login')}
                    >
                      {copiedField === 'login' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Senha</p>
                      <p className="font-medium font-mono">{createdCredentials.password}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => {
                    const text = `Login: ${createdCredentials.login}\nSenha: ${createdCredentials.password}`;
                    copyToClipboard(text, 'all');
                  }}
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Tudo
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCredentialsModal(false)}>
                Fechar
              </Button>
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
              {/* Tipo de Usuário */}
              <div className="space-y-3">
                <Label>Tipo de Usuário</Label>
                <RadioGroup 
                  value={editUserType} 
                  onValueChange={(value) => setEditUserType(value as UserType)}
                  className="grid grid-cols-3 gap-2"
                >
                  <div>
                    <RadioGroupItem value="motorista" id="edit-type-motorista" className="peer sr-only" />
                    <Label
                      htmlFor="edit-type-motorista"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Car className="mb-1 h-4 w-4" />
                      <span className="text-xs font-medium">Motorista</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="operador" id="edit-type-operador" className="peer sr-only" />
                    <Label
                      htmlFor="edit-type-operador"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Headset className="mb-1 h-4 w-4" />
                      <span className="text-xs font-medium">Operador</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="supervisor" id="edit-type-supervisor" className="peer sr-only" />
                    <Label
                      htmlFor="edit-type-supervisor"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <UserCog className="mb-1 h-4 w-4" />
                      <span className="text-xs font-medium">Supervisor</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="coordenador" id="edit-type-coordenador" className="peer sr-only" />
                    <Label
                      htmlFor="edit-type-coordenador"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <MapPin className="mb-1 h-4 w-4" />
                      <span className="text-xs font-medium">Coordenador</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem 
                      value="admin" 
                      id="edit-type-admin" 
                      className="peer sr-only" 
                      disabled={editingUser?.user_id === currentUser?.id}
                    />
                    <Label
                      htmlFor="edit-type-admin"
                      className={cn(
                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer",
                        editingUser?.user_id === currentUser?.id && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Crown className="mb-1 h-4 w-4" />
                      <span className="text-xs font-medium">Admin</span>
                    </Label>
                  </div>
                </RadioGroup>
                {editingUser?.user_id === currentUser?.id && editUserType === 'admin' && (
                  <p className="text-xs text-muted-foreground">Você não pode alterar seu próprio tipo de admin</p>
                )}
              </div>

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
                Tem certeza que deseja excluir o usuário <strong>{deletingUser?.full_name || (deletingUser ? getUserLoginDisplay(deletingUser) : '')}</strong>? 
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
                <Button type="button" variant="outline" onClick={() => setShowResetPasswordModal(false)}>
                  Cancelar
                </Button>
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
