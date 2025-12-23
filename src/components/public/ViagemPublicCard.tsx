import { Clock, MapPin, Users, Bus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ViagemPublica } from '@/hooks/useViagensPublicas';

interface ViagemPublicCardProps {
  viagem: ViagemPublica;
}

export function ViagemPublicCard({ viagem }: ViagemPublicCardProps) {
  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.slice(0, 5);
  };

  const isShuttle = viagem.tipo_operacao === 'shuttle';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Horário e Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xl font-bold text-primary">
                <Clock className="h-5 w-5" />
                {formatTime(viagem.h_pickup)}
              </div>
              <Badge variant={viagem.status === 'em_andamento' ? 'default' : 'secondary'}>
                {viagem.status === 'em_andamento' ? 'Em andamento' : 'Agendado'}
              </Badge>
            </div>

            {/* Ponto de embarque */}
            {viagem.ponto_embarque && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{viagem.ponto_embarque}</span>
              </div>
            )}

            {/* Informações adicionais */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {viagem.tipo_veiculo && (
                <div className="flex items-center gap-1">
                  <Bus className="h-4 w-4" />
                  <span>{viagem.tipo_veiculo}</span>
                </div>
              )}
              {viagem.qtd_pax !== null && viagem.qtd_pax > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{viagem.qtd_pax} PAX</span>
                </div>
              )}
            </div>
          </div>

          {/* Tipo badge */}
          <Badge variant={isShuttle ? 'outline' : 'secondary'} className="shrink-0">
            {isShuttle ? 'Shuttle' : 'Transfer'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
