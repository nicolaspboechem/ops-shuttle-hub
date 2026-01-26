import { Car, Bus, ArrowRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LocalizadorCardProps {
  motorista: MotoristaComVeiculo;
}

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-500', textColor: 'text-green-400', bgLight: 'bg-green-500/20' },
  em_viagem: { label: 'Em Viagem', color: 'bg-blue-500', textColor: 'text-blue-400', bgLight: 'bg-blue-500/20' },
  indisponivel: { label: 'Indisponível', color: 'bg-red-500', textColor: 'text-red-400', bgLight: 'bg-red-500/20' },
  inativo: { label: 'Inativo', color: 'bg-gray-500', textColor: 'text-gray-400', bgLight: 'bg-gray-500/20' },
};

export function LocalizadorCard({ motorista }: LocalizadorCardProps) {
  const status = statusConfig[motorista.status as keyof typeof statusConfig] || statusConfig.inativo;
  const VeiculoIcon = motorista.veiculo?.tipo_veiculo === 'Ônibus' ? Bus : Car;
  const hasVeiculo = !!motorista.veiculo;

  const tempoNoLocal = motorista.ultima_localizacao_at
    ? formatDistanceToNow(new Date(motorista.ultima_localizacao_at), { 
        locale: ptBR, 
        addSuffix: false 
      })
    : null;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:bg-card transition-colors">
      {/* Header - Nome do motorista (DESTAQUE PRINCIPAL) */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-lg text-foreground truncate">
            {motorista.nome}
          </span>
        </div>
        <div className={cn(
          "w-3 h-3 rounded-full shrink-0",
          status.color
        )} />
      </div>

      {/* Veículo */}
      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
        <VeiculoIcon className="w-5 h-5 shrink-0" />
        {hasVeiculo ? (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-foreground text-sm truncate">
              {motorista.veiculo?.nome || motorista.veiculo?.placa}
            </span>
            <span className="text-xs opacity-70 truncate">
              {motorista.veiculo?.nome && motorista.veiculo?.placa && (
                <>{motorista.veiculo.placa} • </>
              )}
              {motorista.veiculo?.tipo_veiculo}
              {motorista.veiculo?.capacidade && ` • ${motorista.veiculo.capacidade} lugares`}
            </span>
          </div>
        ) : (
          <span className="text-sm italic opacity-50">Sem veículo</span>
        )}
      </div>

      {/* Status Badge + Info Adicional */}
      <div className="flex items-center justify-between">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
          status.bgLight,
          status.textColor
        )}>
          <div className={cn("w-2 h-2 rounded-full", status.color)} />
          {status.label}
        </div>

        {/* Tempo no local ou destino */}
        {motorista.status === 'em_viagem' && motorista.viagem_destino ? (
          <div className="flex items-center gap-1 text-blue-400 text-sm min-w-0">
            {motorista.viagem_origem && (
              <span className="truncate max-w-[50px]" title={motorista.viagem_origem}>
                {motorista.viagem_origem}
              </span>
            )}
            <ArrowRight className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-[50px] font-medium" title={motorista.viagem_destino}>
              {motorista.viagem_destino}
            </span>
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
