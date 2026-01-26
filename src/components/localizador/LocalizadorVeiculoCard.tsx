import { Car, Bus, User, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VeiculoComRota } from '@/hooks/useLocalizadorVeiculos';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LocalizadorVeiculoCardProps {
  veiculo: VeiculoComRota;
}

const statusMotoConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-500', textColor: 'text-green-400' },
  em_viagem: { label: 'Em Viagem', color: 'bg-blue-500', textColor: 'text-blue-400' },
  indisponivel: { label: 'Indisponível', color: 'bg-red-500', textColor: 'text-red-400' },
  inativo: { label: 'Inativo', color: 'bg-gray-500', textColor: 'text-gray-400' },
};

export function LocalizadorVeiculoCard({ veiculo }: LocalizadorVeiculoCardProps) {
  const VeiculoIcon = veiculo.tipo_veiculo === 'Ônibus' ? Bus : Car;
  const motorista = veiculo.motorista_localizador;
  const motoristaStatus = motorista 
    ? statusMotoConfig[motorista.status as keyof typeof statusMotoConfig] || statusMotoConfig.inativo
    : null;

  const tempoNoLocal = veiculo.ultima_localizacao_at
    ? formatDistanceToNow(new Date(veiculo.ultima_localizacao_at), { 
        locale: ptBR, 
        addSuffix: false 
      })
    : null;

  // Card color based on state
  const cardBorderClass = veiculo.em_rota 
    ? 'border-blue-500/50 bg-blue-500/5'
    : !motorista 
      ? 'border-amber-500/50 bg-amber-500/5'
      : 'border-border/50';

  return (
    <div className={cn(
      "bg-card/80 backdrop-blur-sm border rounded-lg p-4 hover:bg-card transition-colors",
      cardBorderClass
    )}>
      {/* Header - Veículo */}
      <div className="flex items-center gap-2 mb-2">
        <VeiculoIcon className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-lg text-foreground block truncate">
            {veiculo.nome || veiculo.placa}
          </span>
          <span className="text-xs text-muted-foreground">
            {veiculo.nome ? veiculo.placa : ''} 
            {veiculo.nome && veiculo.tipo_veiculo && ' • '}
            {veiculo.tipo_veiculo}
          </span>
        </div>
      </div>

      {/* Motorista */}
      <div className="flex items-center gap-2 mb-3 py-2 border-y border-border/30">
        <User className={cn(
          "w-4 h-4",
          motorista ? "text-muted-foreground" : "text-amber-500"
        )} />
        {motorista ? (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground block truncate">
              {motorista.nome}
            </span>
            {motoristaStatus && !veiculo.em_rota && (
              <span className={cn("text-xs", motoristaStatus.textColor)}>
                {motoristaStatus.label}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">Sem motorista</span>
          </div>
        )}
      </div>

      {/* Rota ou Status */}
      {veiculo.em_rota && veiculo.viagem ? (
        <div>
          {/* Rota visual */}
          <div className="flex items-center gap-2 mb-2 text-sm">
            <span className="text-muted-foreground truncate max-w-[80px]" title={veiculo.viagem.origem}>
              {veiculo.viagem.origem || '???'}
            </span>
            <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
            <span className="text-foreground font-medium truncate max-w-[80px]" title={veiculo.viagem.destino}>
              {veiculo.viagem.destino || '???'}
            </span>
          </div>
          
          {/* Status Em Rota + Tempo */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Em Rota
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>{veiculo.viagem.tempo_em_rota}min</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {/* Status Badge */}
          {!motorista ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              Livre
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Disponível
            </div>
          )}

          {/* Tempo no local */}
          {tempoNoLocal && (
            <span className="text-xs text-muted-foreground">
              há {tempoNoLocal}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
