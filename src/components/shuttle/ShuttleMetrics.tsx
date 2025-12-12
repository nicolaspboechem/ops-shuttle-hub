import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, Users, Clock, CheckCircle } from 'lucide-react';
import { Viagem } from '@/lib/types/viagem';
import { calcularTempoViagem } from '@/lib/utils/calculadores';

interface ShuttleMetricsProps {
  viagens: Viagem[];
}

export function ShuttleMetrics({ viagens }: ShuttleMetricsProps) {
  const metrics = useMemo(() => {
    const totalViagens = viagens.length;
    const viagensEncerradas = viagens.filter(v => v.encerrado).length;
    const viagensEmAndamento = totalViagens - viagensEncerradas;
    
    const totalPassageiros = viagens.reduce((sum, v) => sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);
    
    const temposViagem = viagens
      .filter(v => v.h_pickup && v.h_retorno)
      .map(v => calcularTempoViagem(v.h_pickup!, v.h_retorno!));
    
    const tempoMedioViagem = temposViagem.length > 0
      ? Math.round(temposViagem.reduce((sum, t) => sum + t, 0) / temposViagem.length)
      : 0;
    
    const onibus = viagens.filter(v => v.tipo_veiculo === 'Ônibus').length;
    const vans = viagens.filter(v => v.tipo_veiculo === 'Van').length;
    
    return {
      totalViagens,
      viagensEncerradas,
      viagensEmAndamento,
      totalPassageiros,
      tempoMedioViagem,
      onibus,
      vans,
    };
  }, [viagens]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Shuttles</CardTitle>
          <Bus className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalViagens}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.viagensEncerradas} encerrados • {metrics.viagensEmAndamento} em andamento
          </p>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Passageiros</CardTitle>
          <Users className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalPassageiros}</div>
          <p className="text-xs text-muted-foreground">
            Total transportados
          </p>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo Médio Ciclo</CardTitle>
          <Clock className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.tempoMedioViagem} min</div>
          <p className="text-xs text-muted-foreground">
            Pickup → Chegada → Retorno
          </p>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Frota</CardTitle>
          <CheckCircle className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.onibus + metrics.vans}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.onibus} ônibus • {metrics.vans} vans
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
