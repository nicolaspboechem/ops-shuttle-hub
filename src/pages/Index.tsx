import { Navigate, Link } from 'react-router-dom';
import { Loader2, Bus, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/eventos" replace />;
  }

  // Show landing page for non-logged users
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <Bus className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-3xl font-bold">TransControl</h1>
        <p className="text-muted-foreground">
          Sistema de gestão de transporte e viagens para eventos
        </p>
        
        <div className="flex flex-col gap-3 pt-4">
          <Link to="/painel">
            <Button variant="default" className="w-full" size="lg">
              <Bus className="h-5 w-5 mr-2" />
              Ver Próximas Viagens
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" className="w-full" size="lg">
              <LogIn className="h-5 w-5 mr-2" />
              Entrar no Sistema
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
