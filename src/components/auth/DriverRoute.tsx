import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';

interface DriverRouteProps {
  children: React.ReactNode;
}

export function DriverRoute({ children }: DriverRouteProps) {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { user, loading, isAdmin, fieldRole, fieldEventoId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login/motorista" replace />;
  }

  // Admin can access any driver route
  if (isAdmin) {
    return <>{children}</>;
  }

  // Must be a motorista
  if (fieldRole !== 'motorista') {
    return <Navigate to="/login/motorista" replace />;
  }

  // Wrong event - redirect to correct event
  if (eventoId && fieldEventoId && fieldEventoId !== eventoId) {
    return <Navigate to={`/app/${fieldEventoId}/motorista`} replace />;
  }

  return <>{children}</>;
}
