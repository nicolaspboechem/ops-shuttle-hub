import { useParams } from 'react-router-dom';
import { Users, Clock, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { formatarMinutos } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';

export default function Motoristas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading, lastUpdate, refetch } = useViagens(eventoId);
  const { motoristas } = useCalculos(viagens);
  const { getEventoById } = useEventos();

  const evento = eventoId ? getEventoById(eventoId) : null;
  const sortedMotoristas = [...motoristas].sort((a, b) => b.totalViagens - a.totalViagens);
  const maxViagens = Math.max(...motoristas.map(m => m.totalViagens), 1);

  if (loading) {
    return (
      <MainLayout>
        <Header title="Motoristas" />
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Motoristas"
        subtitle={evento ? `${evento.nome_planilha} • ${motoristas.length} motoristas` : `${motoristas.length} motoristas ativos`}
        lastUpdate={lastUpdate}
        onRefresh={refetch}
      />
      
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMotoristas.map((motorista, index) => (
            <Card key={motorista.motorista} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                      {motorista.motorista.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{motorista.motorista}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {motorista.viagensHoje} viagens hoje
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Viagens</span>
                    <span className="font-medium">{motorista.totalViagens}</span>
                  </div>
                  <Progress 
                    value={(motorista.totalViagens / maxViagens) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs">Total PAX</span>
                    </div>
                    <p className="text-lg font-semibold">{motorista.totalPax}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">Tempo Médio</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatarMinutos(motorista.tempoMedio)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-xs">Min / Max</span>
                    </div>
                    <p className="text-sm font-medium">
                      {Math.round(motorista.tempoMin)} / {Math.round(motorista.tempoMax)} min
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
