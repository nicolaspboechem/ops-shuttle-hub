import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';

const Index = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/eventos" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default Index;
