import { Viagem } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { Users, Clock, Square, Bus, Car } from 'lucide-react';
import { format } from 'date-fns';

interface ShuttleCardOperadorProps {
  viagem: Viagem & { veiculo?: { nome: string | null; placa: string; tipo_veiculo: string } | null };
  getName: (id: string) => string;
  onEncerrar: (viagem: Viagem) => void;
}

export function ShuttleCardOperador({ viagem, getName, onEncerrar }: ShuttleCardOperadorProps) {
  const horarioInicio = viagem.h_inicio_real
    ? format(new Date(viagem.h_inicio_real), 'HH:mm')
    : viagem.h_pickup?.slice(0, 5) || '--:--';

  const nomeViagem = viagem.coordenador || 'Shuttle';
  const criador = viagem.criado_por ? getName(viagem.criado_por) : '';
  const VeiculoIcon = viagem.tipo_veiculo === 'Ônibus' ? Bus : Car;

  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl px-4 py-3 space-y-3 shadow-sm">
      {/* Veículo - identificação principal */}
      <div className="bg-primary/10 rounded-lg px-3 py-2 flex items-center gap-2">
        <VeiculoIcon className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="font-bold text-base text-foreground block truncate">
            {viagem.veiculo?.nome || viagem.placa || 'Sem veículo'}
          </span>
          {viagem.veiculo?.nome && viagem.placa && (
            <span className="text-xs text-muted-foreground font-mono">{viagem.placa}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-mono">{horarioInicio}</span>
        </div>
      </div>

      {/* Nome da viagem + criador */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{nomeViagem}</h3>
          {criador && (
            <p className="text-xs text-muted-foreground truncate">por {criador}</p>
          )}
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/15 text-amber-600">
          Em andamento
        </span>
      </div>

      {/* PAX */}
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 rounded-full p-1.5">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-bold">{viagem.qtd_pax || 0} PAX ida</span>
      </div>

      {viagem.observacao && (
        <p className="text-xs text-muted-foreground truncate">{viagem.observacao}</p>
      )}

      {/* Botão encerrar */}
      <Button
        variant="destructive"
        className="w-full h-11 text-sm font-semibold gap-2"
        onClick={() => onEncerrar(viagem)}
      >
        <Square className="h-4 w-4" />
        Encerrar Viagem
      </Button>
    </div>
  );
}
