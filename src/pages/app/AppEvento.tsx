import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppMotorista from './AppMotorista';
import AppOperador from './AppOperador';
import AppSupervisor from './AppSupervisor';
import AppCliente from './AppCliente';

type EventRole = 'motorista' | 'operador' | 'supervisor' | 'cliente';

export default function AppEvento() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { user, loading, isAdmin, getEventRole } = useAuth();
  const [resolvedRole, setResolvedRole] = useState<EventRole | null | 'loading'>('loading');

  useEffect(() => {
    if (loading || !user || !eventoId) return;

    // Admin always gets supervisor
    if (isAdmin) {
      setResolvedRole('supervisor');
      return;
    }

    // Try cached role first
    const cachedRole = getEventRole(eventoId);
    if (cachedRole) {
      setResolvedRole(cachedRole);
      return;
    }

    // Fallback: query evento_usuarios directly (handles stale cache / race conditions)
    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('evento_usuarios')
        .select('role')
        .eq('user_id', user.id)
        .eq('evento_id', eventoId)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setResolvedRole(null);
      } else {
        setResolvedRole(data.role as EventRole);
      }
    };

    fetchRole();
  }, [loading, user, eventoId, isAdmin, getEventRole]);

  if (loading || resolvedRole === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!eventoId) return <Navigate to="/app" replace />;

  switch (resolvedRole) {
    case 'motorista':
      return <AppMotorista />;
    case 'operador':
      return <AppOperador />;
    case 'supervisor':
      return <AppSupervisor />;
    case 'cliente':
      return <AppCliente />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md mx-auto px-4">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar este evento.
            </p>
          </div>
        </div>
      );
  }
}
