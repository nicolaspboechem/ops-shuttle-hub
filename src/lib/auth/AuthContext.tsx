import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppPermission = 'view_trips' | 'edit_trips' | 'manage_drivers_vehicles' | 'export_data';
type EventRole = 'motorista' | 'operador' | 'supervisor' | 'cliente';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface EventRoleMapping {
  eventoId: string;
  role: EventRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  permissions: AppPermission[];
  eventRoles: EventRoleMapping[];
  loading: boolean;
  motoristaId: string | null;
  signIn: (identifier: string, password: string, type?: 'email' | 'phone') => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: AppPermission) => boolean;
  getEventRole: (eventoId: string) => EventRole | null;
  hasEventAccess: (eventoId: string, allowedRoles: EventRole[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [eventRoles, setEventRoles] = useState<EventRoleMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          resetState();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setProfile(null);
    setIsAdmin(false);
    setPermissions([]);
    setEventRoles([]);
    setMotoristaId(null);
    setLoading(false);
  };

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, roleRes, permRes, eventRolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).limit(1).maybeSingle(),
        supabase.from('user_permissions').select('permission').eq('user_id', userId),
        supabase.from('evento_usuarios').select('evento_id, role').eq('user_id', userId),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as UserProfile);
      }

      const userIsAdmin = roleRes.data?.role === 'admin';
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        setPermissions(['view_trips', 'edit_trips', 'manage_drivers_vehicles', 'export_data']);
      } else if (permRes.data) {
        setPermissions(permRes.data.map(p => p.permission as AppPermission));
      }

      if (eventRolesRes.data) {
        setEventRoles(eventRolesRes.data.map(er => ({
          eventoId: er.evento_id,
          role: er.role as EventRole
        })));
      }

      // If user is a motorista, fetch motorista_id
      const userRole = roleRes.data?.role;
      if (userRole === 'motorista') {
        const { data: motoristaData } = await supabase
          .from('motoristas')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (motoristaData) {
          setMotoristaId(motoristaData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (identifier: string, password: string, type: 'email' | 'phone' = 'email') => {
    let signInResult;
    if (type === 'phone') {
      signInResult = await supabase.auth.signInWithPassword({ phone: identifier, password });
    } else {
      signInResult = await supabase.auth.signInWithPassword({ email: identifier, password });
    }

    if (signInResult.error) {
      return { error: signInResult.error as Error | null };
    }

    // Validar role vs modo de login
    const userId = signInResult.data.user?.id;
    if (userId) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const userRole = roleData?.role;
      const isMotorista = userRole === 'motorista';
      const isAdminRole = userRole === 'admin';

      // Motorista só pode entrar por telefone; não-motorista (exceto admin que pode tudo) só por email
      if (type === 'phone' && !isMotorista && !isAdminRole) {
        await supabase.auth.signOut();
        return { error: new Error('Este usuário deve acessar com e-mail, não telefone.') };
      }
      if (type === 'email' && isMotorista) {
        await supabase.auth.signOut();
        return { error: new Error('Motoristas devem acessar com telefone, não e-mail.') };
      }
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetState();
  };

  const hasPermission = (permission: AppPermission): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const getEventRole = (eventoId: string): EventRole | null => {
    if (isAdmin) return 'supervisor'; // Admin has full access, acts as supervisor
    const mapping = eventRoles.find(er => er.eventoId === eventoId);
    return mapping?.role || null;
  };

  const hasEventAccess = (eventoId: string, allowedRoles: EventRole[]): boolean => {
    if (isAdmin) return true;
    const role = getEventRole(eventoId);
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      permissions,
      eventRoles,
      loading,
      motoristaId,
      signIn,
      signUp,
      signOut,
      hasPermission,
      getEventRole,
      hasEventAccess,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { EventRole };
