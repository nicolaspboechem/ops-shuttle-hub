import { MapPin, Car, Bus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LocalizadorCardProps {
  motorista: MotoristaComVeiculo;
}

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-500', textColor: 'text-green-500' },
  em_viagem: { label: 'Em Viagem', color: 'bg-blue-500', textColor: 'text-blue-500' },
  indisponivel: { label: 'Indisponível', color: 'bg-red-500', textColor: 'text-red-500' },
  inativo: { label: 'Inativo', color: 'bg-gray-500', textColor: 'text-gray-500' },
};

export function LocalizadorCard({ motorista }: LocalizadorCardProps) {
  const status = statusConfig[motorista.status as keyof typeof statusConfig] || statusConfig.inativo;
  const VeiculoIcon = motorista.veiculo?.tipo_veiculo === 'Ônibus' ? Bus : Car;

  const tempoNoLocal = motorista.ultima_localizacao_at
    ? formatDistanceToNow(new Date(motorista.ultima_localizacao_at), { 
        locale: ptBR, 
        addSuffix: false 
      })
    : null;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:bg-card transition-colors">
      {/* Header - Nome do motorista */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-lg text-foreground truncate">
          {motorista.nome}
        </span>
        <div className={cn(
          "w-3 h-3 rounded-full shrink-0",
          status.color
        )} />
      </div>

      {/* Veículo */}
      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
        <VeiculoIcon className="w-5 h-5" />
        <span className="font-mono text-base">
          {motorista.veiculo?.placa || '---'}
        </span>
        {motorista.veiculo?.tipo_veiculo && (
          <span className="text-sm opacity-70">
            ({motorista.veiculo.tipo_veiculo})
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
          status.color === 'bg-green-500' && "bg-green-500/20 text-green-400",
          status.color === 'bg-blue-500' && "bg-blue-500/20 text-blue-400",
          status.color === 'bg-red-500' && "bg-red-500/20 text-red-400",
          status.color === 'bg-gray-500' && "bg-gray-500/20 text-gray-400",
        )}>
          <div className={cn("w-2 h-2 rounded-full", status.color)} />
          {status.label}
        </div>

        {/* Tempo no local ou destino */}
        {motorista.status === 'em_viagem' && motorista.viagem_destino ? (
          <div className="flex items-center gap-1 text-blue-400 text-sm">
            <ArrowRight className="w-4 h-4" />
            <span className="truncate max-w-[100px]">{motorista.viagem_destino}</span>
          </div>
        ) : tempoNoLocal ? (
          <span className="text-xs text-muted-foreground">
            há {tempoNoLocal}
          </span>
        ) : null}
      </div>
    </div>
  );
}
