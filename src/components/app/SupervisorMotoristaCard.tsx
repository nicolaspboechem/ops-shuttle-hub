import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  Car, 
  MapPin, 
  Navigation,
  Phone,
  MoreVertical,
  Link2,
  Link2Off,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwipeableCard } from './SwipeableCard';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupervisorMotoristaCardProps {
  motorista: MotoristaComVeiculo;
  onEditLocation: (motorista: MotoristaComVeiculo) => void;
  onLinkVehicle: (motorista: MotoristaComVeiculo) => void;
  onUnlinkVehicle: (motorista: MotoristaComVeiculo) => void;
}

const statusConfig = {
  disponivel: { label: 'Disponível', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  em_viagem: { label: 'Em Viagem', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  em_pausa: { label: 'Em Pausa', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  indisponivel: { label: 'Indisponível', className: 'bg-muted text-muted-foreground' },
};

export function SupervisorMotoristaCard({
  motorista,
  onEditLocation,
  onLinkVehicle,
  onUnlinkVehicle,
}: SupervisorMotoristaCardProps) {
  const status = (motorista.status || 'disponivel') as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.disponivel;
  
  const ultimaAtualizacao = motorista.ultima_localizacao_at 
    ? formatDistanceToNow(new Date(motorista.ultima_localizacao_at), { 
        addSuffix: true, 
        locale: ptBR 
      })
    : null;

  const hasVeiculo = !!motorista.veiculo;

  // Swipe left: Edit location
  const leftAction = {
    icon: <MapPin className="h-6 w-6" />,
    label: 'Local',
    color: 'text-white',
    bgColor: 'bg-blue-600',
    action: () => onEditLocation(motorista),
  };

  // Swipe right: Link/Unlink vehicle
  const rightAction = hasVeiculo
    ? {
        icon: <Link2Off className="h-6 w-6" />,
        label: 'Desvincular',
        color: 'text-white',
        bgColor: 'bg-amber-600',
        action: () => onUnlinkVehicle(motorista),
      }
    : {
        icon: <Link2 className="h-6 w-6" />,
        label: 'Vincular',
        color: 'text-white',
        bgColor: 'bg-emerald-600',
        action: () => onLinkVehicle(motorista),
      };

  return (
    <SwipeableCard leftAction={leftAction} rightAction={rightAction}>
      <Card className={cn(
        "transition-all",
        status === 'em_viagem' && "border-blue-500/50 bg-blue-500/5",
        !hasVeiculo && "border-amber-500/30 bg-amber-500/5"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold truncate">{motorista.nome}</p>
                  <Badge variant="outline" className={cn("text-xs", config.className)}>
                    {config.label}
                  </Badge>
                </div>
                
                {motorista.telefone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Phone className="h-3 w-3" />
                    {motorista.telefone}
                  </p>
                )}
                
                {/* Veículo */}
                {motorista.veiculo ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">
                      {motorista.veiculo.nome || motorista.veiculo.placa}
                    </span>
                    {motorista.veiculo.nome && (
                      <span className="text-xs text-muted-foreground">
                        ({motorista.veiculo.placa})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Car className="h-4 w-4" />
                    <span>Sem veículo vinculado</span>
                  </div>
                )}

                {/* Localização ou Rota */}
                <div className="mt-2">
                  {status === 'em_viagem' && motorista.viagem_origem && motorista.viagem_destino ? (
                    <div className="flex items-center gap-2 text-sm bg-blue-500/10 px-2 py-1 rounded">
                      <Navigation className="h-3 w-3 text-blue-600" />
                      <span className="text-blue-700 text-xs">
                        {motorista.viagem_origem} → {motorista.viagem_destino}
                      </span>
                    </div>
                  ) : motorista.ultima_localizacao ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      <span>{motorista.ultima_localizacao}</span>
                      {ultimaAtualizacao && (
                        <span className="text-[10px] opacity-70">• {ultimaAtualizacao}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Localização desconhecida</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditLocation(motorista)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Localização
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {hasVeiculo ? (
                  <DropdownMenuItem onClick={() => onUnlinkVehicle(motorista)}>
                    <Link2Off className="h-4 w-4 mr-2 text-amber-600" />
                    Desvincular Veículo
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onLinkVehicle(motorista)}>
                    <Link2 className="h-4 w-4 mr-2 text-emerald-600" />
                    Vincular Veículo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </SwipeableCard>
  );
}
