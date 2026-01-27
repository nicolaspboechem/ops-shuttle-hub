import { Viagem } from '@/lib/types/viagem';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle,
  Bus, 
  MapPin, 
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

  // Ordenar por hora de chegada (mais recente primeiro)
  const sortedViagens = [...viagensFinalizadas].sort((a, b) => {
    const timeA = a.h_chegada || a.h_fim_real || '00:00';
    const timeB = b.h_chegada || b.h_fim_real || '00:00';
    return timeB.localeCompare(timeA);
  });

  const totalPax = sortedViagens
    .filter(v => v.status === 'encerrado')
    .reduce((sum, v) => sum + (v.qtd_pax || 0), 0);

  const encerradas = sortedViagens.filter(v => v.status === 'encerrado').length;
  const canceladas = sortedViagens.filter(v => v.status === 'cancelado').length;

  if (sortedViagens.length === 0) {
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

      {/* Lista */}
      <div className="space-y-3">
        {sortedViagens.map(viagem => (
          <Card 
            key={viagem.id} 
            className={viagem.status === 'cancelado' ? 'opacity-60' : ''}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {viagem.status === 'encerrado' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-medium">{viagem.motorista}</span>
                </div>
                <Badge variant="secondary">
                  {viagem.tipo_veiculo === 'Ônibus' ? '🚌' : '🚐'} {viagem.tipo_operacao}
                </Badge>
              </div>

              <div className="flex flex-col gap-1 mb-2 text-sm text-muted-foreground">
                {viagem.ponto_embarque && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-green-600" />
                    <span>{viagem.ponto_embarque}</span>
                    {viagem.ponto_desembarque && (
                      <>
                        <span>→</span>
                        <span>{viagem.ponto_desembarque}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{viagem.qtd_pax || 0}</span>
                </div>
                {viagem.h_pickup && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Início: {viagem.h_pickup.slice(0, 5)}</span>
                  </div>
                )}
                {viagem.h_chegada && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Fim: {viagem.h_chegada.slice(0, 5)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
