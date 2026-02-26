import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

type StaffRole = 'operador' | 'supervisor' | 'cliente';

interface StaffRouteProps {
  children: React.ReactNode;
  allowedRoles: StaffRole[];
}

export function StaffRoute({ children, allowedRoles }: StaffRouteProps) {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { user, loading, isAdmin, fieldRole, fieldEventoId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin users can access any role
  if (user && isAdmin) {
    return <>{children}</>;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login/equipe" replace />;
  }

  // Check if accessing the correct event
  if (eventoId && fieldEventoId && fieldEventoId !== eventoId) {
    return <Navigate to={`/app/${fieldEventoId}/${fieldRole}`} replace />;
  }

  // Check if user has required role
  if (fieldRole && allowedRoles.includes(fieldRole as StaffRole)) {
    return <>{children}</>;
  }

  // Wrong role - show access denied
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso negado</h1>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta funcionalidade.
        </p>
      </div>
    </div>
  );
}

export type { StaffRole };
