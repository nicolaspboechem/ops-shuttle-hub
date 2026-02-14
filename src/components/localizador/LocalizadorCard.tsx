import { Car, Bus, ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LocalizadorCardProps {
  motorista: MotoristaComVeiculo;
  missao?: { status: string; ponto_embarque?: string; ponto_desembarque?: string; horario_previsto?: string | null } | null;
}

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-500', textColor: 'text-green-400' },
  missao_pendente: { label: 'Missão Pendente', color: 'bg-amber-500', textColor: 'text-amber-400' },
  missao_aceita: { label: 'Missão Aceita', color: 'bg-violet-500', textColor: 'text-violet-400' },
  em_transito: { label: 'Em Trânsito', color: 'bg-blue-600 animate-pulse', textColor: 'text-blue-400' },
  indisponivel: { label: 'Indisponível', color: 'bg-red-500', textColor: 'text-red-400' },
};

function getDisplayStatus(motorista: MotoristaComVeiculo, missao?: { status: string } | null) {
  if (motorista.status === 'indisponivel') return 'indisponivel';
  if (motorista.status === 'em_viagem') return 'em_transito';
  if (missao?.status === 'em_andamento') return 'em_transito';
  if (missao?.status === 'aceita') return 'missao_aceita';
  if (missao?.status === 'pendente') return 'missao_pendente';
  return 'disponivel';
}

function isBackup(veiculo: MotoristaComVeiculo['veiculo']): boolean {
  return !!veiculo?.observacoes_gerais?.includes('[BACKUP]');
}

export function LocalizadorCard({ motorista, missao }: LocalizadorCardProps) {
  const displayStatus = getDisplayStatus(motorista, missao);
  const status = statusConfig[displayStatus];
  const VeiculoIcon = motorista.veiculo?.tipo_veiculo === 'Ônibus' ? Bus : Car;
  const hasVeiculo = !!motorista.veiculo;
  const backup = hasVeiculo && isBackup(motorista.veiculo);

  const tempoNoLocal = motorista.ultima_localizacao_at
    ? formatDistanceToNow(new Date(motorista.ultima_localizacao_at), { 
        locale: ptBR, 
        addSuffix: false 
      })
    : null;

  // Show route from mission if available
  const showRoute = missao?.ponto_embarque && missao?.ponto_desembarque;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-3 hover:bg-card transition-colors flex flex-col gap-1.5">
      {/* Status */}
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full shrink-0", status.color)} />
        <span className={cn("text-xs font-medium", status.textColor)}>{status.label}</span>
        {tempoNoLocal && displayStatus === 'disponivel' && (
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

      {/* Route (from mission or trip) */}
      {showRoute && (
        <div className="flex items-center gap-1.5 text-sm text-blue-400 bg-blue-500/10 rounded px-2 py-1">
          {missao.horario_previsto && (
            <>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold shrink-0">{missao.horario_previsto.substring(0, 5)}</span>
            </>
          )}
          <span className="truncate">{missao.ponto_embarque}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold truncate">{missao.ponto_desembarque}</span>
        </div>
      )}

      {/* Trip route fallback (no mission but in transit) */}
      {!showRoute && displayStatus === 'em_transito' && motorista.viagem_destino && (
        <div className="flex items-center gap-1.5 text-sm text-blue-400 bg-blue-500/10 rounded px-2 py-1">
          {motorista.viagem_origem && <span className="truncate">{motorista.viagem_origem}</span>}
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold truncate">{motorista.viagem_destino}</span>
        </div>
      )}
    </div>
  );
}
