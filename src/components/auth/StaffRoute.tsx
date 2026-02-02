import { Navigate, useParams } from 'react-router-dom';
import { useStaffAuth, StaffRole } from '@/lib/auth/StaffAuthContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface StaffRouteProps {
  children: React.ReactNode;
  allowedRoles: StaffRole[];
}

export function StaffRoute({ children, allowedRoles }: StaffRouteProps) {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { staffSession, loading: staffLoading, isAuthenticated: staffAuthenticated } = useStaffAuth();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const loading = staffLoading || authLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin users from Supabase Auth can access any role
  if (user && isAdmin) {
    return <>{children}</>;
  }

  // Check staff authentication via custom JWT
  if (staffAuthenticated && staffSession) {
    // Check if accessing the correct event
    if (eventoId && staffSession.evento_id !== eventoId) {
      return <Navigate to={`/app/${staffSession.evento_id}/${staffSession.role}`} replace />;
    }

    // Check if user has required role
    if (allowedRoles.includes(staffSession.role)) {
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

  // Not authenticated - redirect to staff login
  return <Navigate to="/login/equipe" replace />;
}
