import { Car, Bus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface LocalizadorCardProps {
  motorista: MotoristaComVeiculo;
}

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-500', textColor: 'text-green-400' },
  em_viagem: { label: 'Em Viagem', color: 'bg-blue-500', textColor: 'text-blue-400' },
  indisponivel: { label: 'Indisponível', color: 'bg-red-500', textColor: 'text-red-400' },
  inativo: { label: 'Inativo', color: 'bg-gray-500', textColor: 'text-gray-400' },
};

function isBackup(veiculo: MotoristaComVeiculo['veiculo']): boolean {
  return !!veiculo?.observacoes_gerais?.includes('[BACKUP]');
}

export function LocalizadorCard({ motorista }: LocalizadorCardProps) {
  const status = statusConfig[motorista.status as keyof typeof statusConfig] || statusConfig.inativo;
  const VeiculoIcon = motorista.veiculo?.tipo_veiculo === 'Ônibus' ? Bus : Car;
  const hasVeiculo = !!motorista.veiculo;
  const backup = hasVeiculo && isBackup(motorista.veiculo);

  const tempoNoLocal = motorista.ultima_localizacao_at
    ? formatDistanceToNow(new Date(motorista.ultima_localizacao_at), { 
        locale: ptBR, 
        addSuffix: false 
      })
    : null;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-3 hover:bg-card transition-colors flex flex-col gap-1.5">
      {/* Status */}
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full shrink-0", status.color)} />
        <span className={cn("text-xs font-medium", status.textColor)}>{status.label}</span>
        {tempoNoLocal && motorista.status !== 'em_viagem' && (
          <span className="text-xs text-muted-foreground ml-auto">há {tempoNoLocal}</span>
        )}
      </div>

      {/* Motorista */}
      <span className="font-bold text-base text-foreground leading-tight">{motorista.nome}</span>

      {/* Veículo */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <VeiculoIcon className="w-4 h-4 shrink-0" />
        {hasVeiculo ? (
          <>
            <span className="text-sm font-medium text-foreground">
              {motorista.veiculo?.nome || motorista.veiculo?.placa}
            </span>
            {motorista.veiculo?.nome && motorista.veiculo?.placa && (
              <span className="text-xs text-muted-foreground">• {motorista.veiculo.placa}</span>
            )}
          </>
        ) : (
          <span className="text-xs italic opacity-50">Sem veículo</span>
        )}
        {backup && (
          <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-orange-400/80">bkp</span>
        )}
      </div>

      {/* Trajeto (em trânsito) */}
      {motorista.status === 'em_viagem' && motorista.viagem_destino && (
        <div className="flex items-center gap-1 text-xs text-blue-400 flex-wrap">
          {motorista.viagem_origem && (
            <span>{motorista.viagem_origem}</span>
          )}
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span className="font-medium">{motorista.viagem_destino}</span>
        </div>
      )}
    </div>
  );
}
