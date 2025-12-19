import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, MapPin, RotateCcw, CheckCircle, Clock, Users, Bus, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViagemCardMobileProps {
  viagem: Viagem;
  onIniciar?: () => void;
  onChegada?: () => void;
  onRetorno?: () => void;
  loading?: boolean;
}

const statusConfig: Record<StatusViagemOperacao, { label: string; color: string; icon: React.ReactNode }> = {
  agendado: { label: 'Agendado', color: 'bg-slate-500', icon: <Clock className="h-4 w-4" /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500', icon: <Play className="h-4 w-4" /> },
  aguardando_retorno: { label: 'Aguardando Retorno', color: 'bg-amber-500', icon: <MapPin className="h-4 w-4" /> },
  encerrado: { label: 'Encerrado', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: <CheckCircle className="h-4 w-4" /> },
};

export function ViagemCardMobile({ viagem, onIniciar, onChegada, onRetorno, loading }: ViagemCardMobileProps) {
  const status = (viagem.status || 'agendado') as StatusViagemOperacao;
  const config = statusConfig[status];

  const VeiculoIcon = viagem.tipo_veiculo === 'Ônibus' ? Bus : Car;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      status === 'em_andamento' && "ring-2 ring-blue-500 shadow-lg",
      status === 'aguardando_retorno' && "ring-2 ring-amber-500"
    )}>
      <div className={cn("h-2", config.color)} />
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <VeiculoIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-semibold">{viagem.motorista}</p>
              <p className="text-sm text-muted-foreground">{viagem.placa}</p>
            </div>
          </div>
          <Badge className={cn("text-white", config.color)}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Pickup: <strong>{viagem.h_pickup || '--:--'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>PAX: <strong>{viagem.qtd_pax || 0}</strong></span>
          </div>
          {viagem.ponto_embarque && (
            <div className="col-span-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{viagem.ponto_embarque}</span>
            </div>
          )}
        </div>

        {/* Tempos registrados */}
        {(viagem.h_chegada || viagem.h_retorno) && (
          <div className="flex gap-4 text-sm border-t pt-3">
            {viagem.h_chegada && (
              <span className="text-green-600">
                Chegada: <strong>{viagem.h_chegada}</strong>
              </span>
            )}
            {viagem.h_retorno && (
              <span className="text-blue-600">
                Retorno: <strong>{viagem.h_retorno}</strong>
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {status === 'agendado' && onIniciar && (
            <Button 
              onClick={onIniciar} 
              className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              <Play className="h-5 w-5 mr-2" />
              INICIAR
            </Button>
          )}
          
          {status === 'em_andamento' && onChegada && (
            <Button 
              onClick={onChegada} 
              className="flex-1 h-12 text-base bg-amber-600 hover:bg-amber-700"
              disabled={loading}
            >
              <MapPin className="h-5 w-5 mr-2" />
              CHEGOU
            </Button>
          )}
          
          {status === 'aguardando_retorno' && onRetorno && (
            <Button 
              onClick={onRetorno} 
              className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              RETORNOU
            </Button>
          )}

          {status === 'encerrado' && (
            <div className="flex-1 h-12 flex items-center justify-center text-green-600 font-medium">
              <CheckCircle className="h-5 w-5 mr-2" />
              Viagem Concluída
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
