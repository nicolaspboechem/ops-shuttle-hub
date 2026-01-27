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
  Shield
} from 'lucide-react';

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
            className="w-full justify-start h-12"
            onClick={onCadastrarMotorista}
          >
            <User className="h-5 w-5 mr-3" />
            Cadastrar Motorista
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={onCadastrarVeiculo}
          >
            <Car className="h-5 w-5 mr-3" />
            Cadastrar Veículo
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={onRegistrarKm}
          >
            <Gauge className="h-5 w-5 mr-3" />
            Registrar KM
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
            Precisa de ajuda? Entre em contato com o CCO.
          </p>
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
    </div>
  );
}
