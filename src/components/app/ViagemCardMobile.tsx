import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, MapPin, CheckCircle, Clock, Users, Bus, Car, UserPlus, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserNames } from '@/hooks/useUserNames';
import { MissaoBadge } from '@/components/viagens/MissaoBadge';
import { SwipeableCard } from './SwipeableCard';

interface ViagemCardMobileProps {
  viagem: Viagem;
  onIniciar?: () => void;
  onChegada?: () => void;
  loading?: boolean;
}

const statusConfig: Record<StatusViagemOperacao, { label: string; color: string; icon: React.ReactNode }> = {
  agendado: { label: 'Agendado', color: 'bg-slate-500', icon: <Clock className="h-4 w-4" /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500', icon: <Play className="h-4 w-4" /> },
  aguardando_retorno: { label: 'Standby', color: 'bg-amber-500', icon: <Clock className="h-4 w-4" /> },
  encerrado: { label: 'Encerrado', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: <CheckCircle className="h-4 w-4" /> },
};

export function ViagemCardMobile({ viagem, onIniciar, onChegada, loading }: ViagemCardMobileProps) {
  const status = (viagem.status || 'agendado') as StatusViagemOperacao;
  const config = statusConfig[status];

  const VeiculoIcon = viagem.tipo_veiculo === 'Ônibus' ? Bus : Car;

  // Buscar nomes dos usuários envolvidos
  const { getName } = useUserNames([viagem.criado_por, viagem.iniciado_por, viagem.finalizado_por]);

  // Swipe actions based on status
  const getSwipeActions = () => {
    if (status === 'agendado' && onIniciar) {
      return {
        leftAction: undefined,
        rightAction: {
          icon: <Play className="h-6 w-6" />,
          label: 'Iniciar',
          color: 'text-white',
          bgColor: 'bg-blue-600',
          action: onIniciar,
        },
      };
    }
    
    if (status === 'em_andamento' && onChegada) {
      return {
        leftAction: undefined,
        rightAction: {
          icon: <MapPin className="h-6 w-6" />,
          label: 'Chegou',
          color: 'text-white',
          bgColor: 'bg-amber-600',
          action: onChegada,
        },
      };
    }
    
    return { leftAction: undefined, rightAction: undefined };
  };

  const swipeActions = getSwipeActions();
  const hasSwipeActions = !!swipeActions.rightAction || !!swipeActions.leftAction;

  const cardContent = (
    <Card className={cn(
      "overflow-hidden transition-all",
      status === 'em_andamento' && "ring-2 ring-blue-500 shadow-lg"
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
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn("text-white", config.color)}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
            {viagem.origem_missao_id && (
              <MissaoBadge missaoId={viagem.origem_missao_id} compact />
            )}
          </div>
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
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="truncate"><strong>De:</strong> {viagem.ponto_embarque}</span>
            </div>
          )}
          {viagem.ponto_desembarque && (
            <div className="col-span-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              <span className="truncate"><strong>Para:</strong> {viagem.ponto_desembarque}</span>
            </div>
          )}
        </div>

        {/* Tempo de chegada registrado */}
        {viagem.h_chegada && (
          <div className="flex gap-4 text-sm border-t pt-3">
            <span className="text-green-600">
              Chegada: <strong>{viagem.h_chegada}</strong>
            </span>
          </div>
        )}

        {/* Auditoria - quem fez o quê */}
        {(viagem.criado_por || viagem.iniciado_por || viagem.finalizado_por) && (
          <div className="border-t pt-2 text-xs text-muted-foreground space-y-0.5">
            {viagem.criado_por && (
              <div className="flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                <span>Criado: {getName(viagem.criado_por)}</span>
              </div>
            )}
            {viagem.iniciado_por && (
              <div className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                <span>Iniciado: {getName(viagem.iniciado_por)}</span>
              </div>
            )}
            {viagem.finalizado_por && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Encerrado: {getName(viagem.finalizado_por)}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Motorista só pode Iniciar e Chegou (fallback para swipe) */}
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

          {status === 'encerrado' && (
            <div className="flex-1 h-12 flex items-center justify-center text-green-600 font-medium">
              <CheckCircle className="h-5 w-5 mr-2" />
              Rota Concluída
            </div>
          )}

          {status === 'cancelado' && (
            <div className="flex-1 h-12 flex items-center justify-center text-muted-foreground font-medium">
              Viagem Cancelada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <SwipeableCard
      leftAction={swipeActions.leftAction}
      rightAction={swipeActions.rightAction}
      disabled={loading}
    >
      {cardContent}
    </SwipeableCard>
  );
}
