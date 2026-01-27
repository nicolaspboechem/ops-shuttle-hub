import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Car, 
  Gauge, 
  LogOut,
  Settings,
  Users,
  ClipboardList,
  History,
  Shield,
  ChevronRight
} from 'lucide-react';
import { CreateMotoristaWizard } from '@/components/motoristas/CreateMotoristaWizard';
import { CreateVeiculoWizard } from '@/components/veiculos/CreateVeiculoWizard';
import { VeiculoKmModal } from './VeiculoKmModal';

interface SupervisorMaisTabProps {
  eventoId: string;
  eventoNome?: string;
  userName?: string;
  onLogout: () => void;
  onCadastroComplete?: () => void;
}

export function SupervisorMaisTab({
  eventoId,
  eventoNome,
  userName,
  onLogout,
  onCadastroComplete,
}: SupervisorMaisTabProps) {
  const navigate = useNavigate();
  const [showMotoristaWizard, setShowMotoristaWizard] = useState(false);
  const [showVeiculoWizard, setShowVeiculoWizard] = useState(false);
  const [showKmModal, setShowKmModal] = useState(false);

  const handleCadastroSuccess = () => {
    onCadastroComplete?.();
  };

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Supervisor Operacional
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

      {/* Cadastros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Cadastros Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={() => setShowMotoristaWizard(true)}
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
            onClick={() => setShowVeiculoWizard(true)}
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
            onClick={() => setShowKmModal(true)}
          >
            <div className="flex items-center">
              <Gauge className="h-5 w-5 mr-3" />
              Registrar KM
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      {/* Equipe */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipe do Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={() => navigate(`/evento/${eventoId}/equipe`)}
          >
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3" />
              Ver Operadores
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      {/* Auditoria */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={() => navigate(`/evento/${eventoId}/viagens-finalizadas`)}
          >
            <div className="flex items-center">
              <History className="h-5 w-5 mr-3" />
              Histórico de Viagens
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={() => navigate(`/evento/${eventoId}/veiculos`)}
          >
            <div className="flex items-center">
              <Car className="h-5 w-5 mr-3" />
              Histórico de Vistorias
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      {/* Conta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={() => navigate('/app')}
          >
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-3" />
              Trocar Evento
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

      {/* Wizards */}
      <CreateMotoristaWizard
        open={showMotoristaWizard}
        onOpenChange={setShowMotoristaWizard}
        veiculos={[]}
        eventoId={eventoId}
        onSubmit={async (data) => {
          const { data: created, error } = await supabase
            .from('motoristas')
            .insert({
              nome: data.nome,
              telefone: data.telefone,
              veiculo_id: data.veiculo_id || null,
              evento_id: eventoId,
            })
            .select('id')
            .single();
          
          if (error) {
            toast.error('Erro ao cadastrar motorista');
            return undefined;
          }
          
          toast.success('Motorista cadastrado');
          handleCadastroSuccess();
          return created?.id;
        }}
      />

      <CreateVeiculoWizard
        open={showVeiculoWizard}
        onOpenChange={setShowVeiculoWizard}
        eventoId={eventoId}
        onCreated={() => {
          handleCadastroSuccess();
        }}
      />

      <VeiculoKmModal
        open={showKmModal}
        onOpenChange={setShowKmModal}
        eventoId={eventoId}
      />
    </div>
  );
}
