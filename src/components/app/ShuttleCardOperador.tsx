import { Viagem } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { Users, Clock, Square } from 'lucide-react';
import { format } from 'date-fns';

interface ShuttleCardOperadorProps {
  viagem: Viagem;
  getName: (id: string) => string;
  onEncerrar: (viagem: Viagem) => void;
}

export function ShuttleCardOperador({ viagem, getName, onEncerrar }: ShuttleCardOperadorProps) {
  const horarioInicio = viagem.h_inicio_real
    ? format(new Date(viagem.h_inicio_real), 'HH:mm')
    : viagem.h_pickup?.slice(0, 5) || '--:--';

  const nomeViagem = viagem.coordenador || 'Shuttle';
  const criador = viagem.criado_por ? getName(viagem.criado_por) : '';

  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl px-4 py-3 space-y-3 shadow-sm">
      {/* Header: nome + hora */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{nomeViagem}</h3>
          {criador && (
            <p className="text-xs text-muted-foreground truncate">por {criador}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-mono">{horarioInicio}</span>
        </div>
      </div>

      {/* PAX + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-full p-1.5">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-bold">{viagem.qtd_pax || 0} PAX ida</span>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/15 text-amber-600">
          Em andamento
        </span>
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
