import { useMemo } from 'react';
import { Viagem } from '@/lib/types/viagem';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle,
  Users, 
  Clock,
  ClipboardList
} from 'lucide-react';

interface OperadorHistoricoTabProps {
  viagens: Viagem[];
}

export function OperadorHistoricoTab({ viagens }: OperadorHistoricoTabProps) {
  const viagensFinalizadas = viagens.filter(v => 
    v.status === 'encerrado' || v.status === 'cancelado'
  );

  const encerradas = viagensFinalizadas.filter(v => v.status === 'encerrado').length;
  const canceladas = viagensFinalizadas.filter(v => v.status === 'cancelado').length;
  const totalPax = viagensFinalizadas
    .filter(v => v.status === 'encerrado')
    .reduce((sum, v) => sum + (v.qtd_pax || 0), 0);

  // Hora do primeiro e último shuttle
  const horarios = useMemo(() => {
    const encerradasList = viagensFinalizadas
      .filter(v => v.status === 'encerrado' && v.h_pickup)
      .map(v => v.h_pickup!)
      .sort();
    
    return {
      primeiro: encerradasList[0]?.slice(0, 5) || '--:--',
      ultimo: encerradasList[encerradasList.length - 1]?.slice(0, 5) || '--:--',
    };
  }, [viagensFinalizadas]);

  if (viagensFinalizadas.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhuma viagem finalizada</p>
        <p className="text-sm">As viagens encerradas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-lg bg-emerald-500/10">
          <p className="text-xl font-bold text-emerald-600">{encerradas}</p>
          <p className="text-[10px] text-muted-foreground">Encerradas</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-destructive/10">
          <p className="text-xl font-bold text-destructive">{canceladas}</p>
          <p className="text-[10px] text-muted-foreground">Canceladas</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-primary/10">
          <p className="text-xl font-bold text-primary">{totalPax}</p>
          <p className="text-[10px] text-muted-foreground">PAX Total</p>
        </div>
      </div>

      {/* Horários */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-3 rounded-lg bg-muted">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold">{horarios.primeiro}</p>
          <p className="text-[10px] text-muted-foreground">Primeira Corrida</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold">{horarios.ultimo}</p>
          <p className="text-[10px] text-muted-foreground">Última Corrida</p>
        </div>
      </div>
    </div>
  );
}
