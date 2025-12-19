import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { cn } from '@/lib/utils';
import { Bus, Car, Clock, Users, CheckCircle, Play, MapPin, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VeiculoGridProps {
  viagens: Viagem[];
  onSelect?: (viagem: Viagem) => void;
}

const statusConfig: Record<StatusViagemOperacao, { bg: string; border: string; text: string }> = {
  agendado: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  em_andamento: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  aguardando_retorno: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' },
  encerrado: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
  cancelado: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' },
};

const statusIcon: Record<StatusViagemOperacao, React.ReactNode> = {
  agendado: <Clock className="h-3 w-3" />,
  em_andamento: <Play className="h-3 w-3" />,
  aguardando_retorno: <MapPin className="h-3 w-3" />,
  encerrado: <CheckCircle className="h-3 w-3" />,
  cancelado: <AlertCircle className="h-3 w-3" />,
};

export function VeiculoGrid({ viagens, onSelect }: VeiculoGridProps) {
  // Agrupar por status
  const porStatus = viagens.reduce((acc, v) => {
    const s = (v.status || 'agendado') as StatusViagemOperacao;
    if (!acc[s]) acc[s] = [];
    acc[s].push(v);
    return acc;
  }, {} as Record<StatusViagemOperacao, Viagem[]>);

  return (
    <div className="space-y-6">
      {/* Em andamento */}
      {porStatus.em_andamento?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
            <Play className="h-4 w-4" />
            Em Andamento ({porStatus.em_andamento.length})
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {porStatus.em_andamento.map(v => (
              <VeiculoCard key={v.id} viagem={v} onClick={() => onSelect?.(v)} />
            ))}
          </div>
        </div>
      )}

      {/* Aguardando retorno */}
      {porStatus.aguardando_retorno?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Aguardando Retorno ({porStatus.aguardando_retorno.length})
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {porStatus.aguardando_retorno.map(v => (
              <VeiculoCard key={v.id} viagem={v} onClick={() => onSelect?.(v)} />
            ))}
          </div>
        </div>
      )}

      {/* Agendados */}
      {porStatus.agendado?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Agendados ({porStatus.agendado.length})
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {porStatus.agendado.map(v => (
              <VeiculoCard key={v.id} viagem={v} onClick={() => onSelect?.(v)} />
            ))}
          </div>
        </div>
      )}

      {/* Encerrados */}
      {porStatus.encerrado?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Encerrados ({porStatus.encerrado.length})
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 opacity-60">
            {porStatus.encerrado.slice(0, 20).map(v => (
              <VeiculoCard key={v.id} viagem={v} onClick={() => onSelect?.(v)} />
            ))}
            {porStatus.encerrado.length > 20 && (
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                +{porStatus.encerrado.length - 20} mais
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VeiculoCard({ viagem, onClick }: { viagem: Viagem; onClick?: () => void }) {
  const status = (viagem.status || 'agendado') as StatusViagemOperacao;
  const config = statusConfig[status];
  const VeiculoIcon = viagem.tipo_veiculo === 'Ônibus' ? Bus : Car;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "p-2 rounded-lg border-2 transition-all hover:scale-105",
            "flex flex-col items-center justify-center gap-1 min-h-[80px]",
            config.bg, config.border
          )}
        >
          <VeiculoIcon className={cn("h-5 w-5", config.text)} />
          <span className={cn("text-xs font-medium truncate w-full text-center", config.text)}>
            {viagem.placa || '--'}
          </span>
          <div className="flex items-center gap-1">
            {statusIcon[status]}
            <Users className="h-3 w-3 opacity-50" />
            <span className="text-xs">{viagem.qtd_pax || 0}</span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-sm">
          <p className="font-medium">{viagem.motorista}</p>
          <p className="text-muted-foreground">{viagem.placa}</p>
          <p>Pickup: {viagem.h_pickup || '--'}</p>
          {viagem.ponto_embarque && <p>{viagem.ponto_embarque}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
