import { useState, useEffect } from 'react';
import { Users, Shield, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch all permissions
      const { data: permissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*');

      if (permError) throw permError;

      // Combine data
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

  const togglePermission = async (userId: string, permission: AppPermission, currentlyHas: boolean) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alterar permissões');
      return;
    }

    setUpdating(`${userId}-${permission}`);

    try {
      if (currentlyHas) {
        // Remove permission
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission', permission);

        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            permission: permission,
            granted_by: currentUser?.id,
          });

        if (error) throw error;
      }

      // Update local state
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-7 h-7" />
            Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>

        {!isAdmin && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Você está visualizando como usuário comum. Apenas administradores podem alterar permissões.
            </p>
          </div>
        )}

        <div className="grid gap-6">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-4">
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
                        {user.user_id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {user.role !== 'admin' && (
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(Object.keys(PERMISSION_LABELS) as AppPermission[]).map((permission) => {
                      const hasPermission = user.permissions.includes(permission);
                      const isUpdatingThis = updating === `${user.user_id}-${permission}`;
                      
                      return (
                        <div
                          key={permission}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex-1 mr-4">
                            <Label className="text-sm font-medium cursor-pointer">
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
              )}

              {user.role === 'admin' && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Administradores têm acesso completo a todas as funcionalidades</span>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {users.length === 0 && (
            <div className="text-center py-12">
              <ShieldX className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">
                Os usuários aparecerão aqui quando se cadastrarem no sistema.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
