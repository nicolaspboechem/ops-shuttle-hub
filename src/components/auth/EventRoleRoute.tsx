import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth, EventRole } from '@/lib/auth/AuthContext';

interface EventRoleRouteProps {
  children: ReactNode;
  allowedRoles: EventRole[];
}

export function EventRoleRoute({ children, allowedRoles }: EventRoleRouteProps) {
  const { user, loading, isAdmin, hasEventAccess } = useAuth();
  const { eventoId } = useParams<{ eventoId: string }>();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!eventoId) {
    return <Navigate to="/app" replace />;
  }

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if user has the required role for this event
  if (!hasEventAccess(eventoId, allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta funcionalidade neste evento.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
