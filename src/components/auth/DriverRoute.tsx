import { Navigate, useParams } from 'react-router-dom';
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';
import { Loader2 } from 'lucide-react';

interface DriverRouteProps {
  children: React.ReactNode;
}

export function DriverRoute({ children }: DriverRouteProps) {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { driverSession, loading, isAuthenticated } = useDriverAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to driver login
  if (!isAuthenticated || !driverSession) {
    return <Navigate to="/login/motorista" replace />;
  }

  // Authenticated but wrong event - redirect to correct event
  if (eventoId && driverSession.evento_id !== eventoId) {
    return <Navigate to={`/app/${driverSession.evento_id}/motorista`} replace />;
  }

  return <>{children}</>;
}
