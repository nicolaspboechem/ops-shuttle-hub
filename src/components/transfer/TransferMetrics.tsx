import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Users, Clock, UserCheck, MapPin } from 'lucide-react';
import { Viagem } from '@/lib/types/viagem';
import { calcularTempoViagem } from '@/lib/utils/calculadores';

interface TransferMetricsProps {
  viagens: Viagem[];
}

export function TransferMetrics({ viagens }: TransferMetricsProps) {
  const metrics = useMemo(() => {
    const totalViagens = viagens.length;
    const viagensEncerradas = viagens.filter(v => v.encerrado).length;
    const viagensEmAndamento = totalViagens - viagensEncerradas;
    
    const totalPassageirosIda = viagens.reduce((sum, v) => sum + (v.qtd_pax || 0), 0);
    const totalPassageirosVolta = viagens.reduce((sum, v) => sum + (v.qtd_pax_retorno || 0), 0);
    
    const temposViagem = viagens
      .filter(v => v.h_pickup && v.h_chegada)
      .map(v => calcularTempoViagem(v.h_pickup!, v.h_chegada!));
    
    const tempoMedioViagem = temposViagem.length > 0
      ? Math.round(temposViagem.reduce((sum, t) => sum + t, 0) / temposViagem.length)
      : 0;
    
    const coordenadores = [...new Set(viagens.map(v => v.coordenador).filter(Boolean))];
    const pontosEmbarque = [...new Set(viagens.map(v => v.ponto_embarque).filter(Boolean))];
    
    return {
      totalViagens,
      viagensEncerradas,
      viagensEmAndamento,
      totalPassageirosIda,
      totalPassageirosVolta,
      tempoMedioViagem,
      coordenadores: coordenadores.length,
      pontosEmbarque: pontosEmbarque.length,
    };
  }, [viagens]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-amber-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Transfers</CardTitle>
          <Car className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalViagens}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.viagensEncerradas} encerrados • {metrics.viagensEmAndamento} em andamento
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Passageiros</CardTitle>
          <Users className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.totalPassageirosIda + metrics.totalPassageirosVolta}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.totalPassageirosIda} ida • {metrics.totalPassageirosVolta} volta
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.tempoMedioViagem} min</div>
          <p className="text-xs text-muted-foreground">
            Por viagem de transfer
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coordenadores</CardTitle>
          <UserCheck className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.coordenadores}</div>
          <p className="text-xs text-muted-foreground">
            <MapPin className="inline w-3 h-3 mr-1" />
            {metrics.pontosEmbarque} pontos de embarque
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
