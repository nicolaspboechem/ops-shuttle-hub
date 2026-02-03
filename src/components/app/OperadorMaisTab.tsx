import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Car, 
  Gauge, 
  LogOut,
  Settings,
  HelpCircle,
  Shield,
  ChevronRight
} from 'lucide-react';
import { HelpDrawer } from './HelpDrawer';

interface OperadorMaisTabProps {
  userName?: string;
  eventoNome?: string;
  onCadastrarMotorista: () => void;
  onCadastrarVeiculo: () => void;
  onRegistrarKm: () => void;
  onLogout: () => void;
}

export function OperadorMaisTab({
  userName,
  eventoNome,
  onCadastrarMotorista,
  onCadastrarVeiculo,
  onRegistrarKm,
  onLogout,
}: OperadorMaisTabProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Perfil Operador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {userName && (
            <p className="text-sm">
              <span className="text-muted-foreground">Usuário:</span> {userName}
            </p>
          )}
          {eventoNome && (
            <p className="text-sm">
              <span className="text-muted-foreground">Evento:</span> {eventoNome}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={onCadastrarMotorista}
          >
            <div className="flex items-center">
              <User className="h-5 w-5 mr-3" />
              Cadastrar Motorista
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={onCadastrarVeiculo}
          >
            <div className="flex items-center">
              <Car className="h-5 w-5 mr-3" />
              Cadastrar Veículo
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={onRegistrarKm}
          >
            <div className="flex items-center">
              <Gauge className="h-5 w-5 mr-3" />
              Registrar KM
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      {/* Suporte */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Suporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Precisa de ajuda? Acesse nossa central de suporte.
          </p>
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={() => setShowHelp(true)}
          >
            <div className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-3" />
              Central de Ajuda
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Logout */}
      <Button 
        variant="destructive" 
        className="w-full h-12"
        onClick={onLogout}
      >
        <LogOut className="h-5 w-5 mr-3" />
        Sair do Sistema
      </Button>

      {/* Help Drawer */}
      <HelpDrawer 
        open={showHelp} 
        onOpenChange={setShowHelp}
        role="operador"
      />
    </div>
  );
}
