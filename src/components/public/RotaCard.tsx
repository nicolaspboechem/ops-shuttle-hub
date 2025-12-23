import { Bus, Clock, MapPin, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  calcularProximasSaidas,
  formatarFrequencia,
  formatarHorarioOperacao,
} from '@/lib/utils/calcularProximasSaidas';

interface RotaCardProps {
  nome: string;
  origem: string;
  destino: string;
  frequenciaMinutos?: number | null;
  horarioInicio?: string | null;
  horarioFim?: string | null;
  observacoes?: string | null;
}

export function RotaCard({
  nome,
  origem,
  destino,
  frequenciaMinutos,
  horarioInicio,
  horarioFim,
  observacoes,
}: RotaCardProps) {
  const proximasSaidas = calcularProximasSaidas(
    horarioInicio,
    horarioFim,
    frequenciaMinutos,
    5
  );

  const frequenciaTexto = formatarFrequencia(frequenciaMinutos);
  const horarioTexto = formatarHorarioOperacao(horarioInicio, horarioFim);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 bg-primary/5 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Bus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{nome}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{origem}</span>
                <ArrowRight className="h-3 w-3 mx-1" />
                <span>{destino}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-4">
          {/* Frequency & Hours */}
          <div className="flex flex-wrap gap-3">
            {frequenciaTexto && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {frequenciaTexto}
              </Badge>
            )}
            {horarioInicio && horarioFim && (
              <Badge variant="outline" className="gap-1">
                {horarioTexto}
              </Badge>
            )}
          </div>

          {/* Next Departures */}
          {proximasSaidas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Próximas saídas
              </p>
              <div className="flex flex-wrap gap-2">
                {proximasSaidas.map((saida, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      idx === 0
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {saida}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No more departures today */}
          {proximasSaidas.length === 0 && horarioInicio && horarioFim && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Sem mais saídas hoje. Retorna amanhã às {horarioInicio.slice(0, 5)}</span>
            </div>
          )}

          {/* Observations */}
          {observacoes && (
            <p className="text-sm text-muted-foreground border-t pt-3">
              {observacoes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
