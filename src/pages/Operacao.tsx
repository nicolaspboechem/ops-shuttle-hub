import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EventLayout } from '@/components/layout/EventLayout';
import { useViagens } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { VeiculoGrid } from '@/components/operacao/VeiculoGrid';
import { LogsPanel } from '@/components/operacao/LogsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { RefreshCw, Play, MapPin, RotateCcw, XCircle, Bus, Car, Clock, Users, Activity } from 'lucide-react';

export default function Operacao() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading, refreshing, refetch } = useViagens(eventoId);
  const { eventos } = useEventos();
  const { iniciarViagem, registrarChegada, cancelarViagem } = useViagemOperacao();
  
  const [selectedViagem, setSelectedViagem] = useState<Viagem | null>(null);
  const [operando, setOperando] = useState(false);

  const evento = eventos.find(e => e.id === eventoId);

  const stats = useMemo(() => {
    const counts = {
      agendado: 0,
      em_andamento: 0,
      aguardando_retorno: 0,
      encerrado: 0,
      cancelado: 0,
      total: viagens.length,
      paxTotal: 0
    };

    viagens.forEach(v => {
      const s = (v.status || 'agendado') as StatusViagemOperacao;
      if (counts[s] !== undefined) counts[s]++;
      counts.paxTotal += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
    });

    return counts;
  }, [viagens]);

  const handleAction = async (action: 'iniciar' | 'chegada' | 'cancelar') => {
    if (!selectedViagem) return;
    
    setOperando(true);
    try {
      let success = false;
      if (action === 'iniciar') success = await iniciarViagem(selectedViagem);
      if (action === 'chegada') success = await registrarChegada(selectedViagem);
      if (action === 'cancelar') success = await cancelarViagem(selectedViagem);
      
      if (success) {
        setSelectedViagem(null);
        refetch();
      }
    } finally {
      setOperando(false);
    }
  };

  if (loading) {
    return (
      <EventLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Centro de Controle</h1>
            <p className="text-muted-foreground">{evento?.nome_planilha}</p>
          </div>
          <Button onClick={refetch} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.em_andamento}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.aguardando_retorno}</p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.agendado}</p>
                <p className="text-xs text-muted-foreground">Agendados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.encerrado}</p>
                <p className="text-xs text-muted-foreground">Encerrados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.paxTotal}</p>
                <p className="text-xs text-muted-foreground">PAX Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Grid de Veículos */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bus className="h-5 w-5" />
                Veículos em Operação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VeiculoGrid 
                viagens={viagens} 
                onSelect={setSelectedViagem}
              />
            </CardContent>
          </Card>

          {/* Logs de Atividade */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {eventoId && <LogsPanel eventoId={eventoId} />}
            </CardContent>
          </Card>
        </div>

        {/* Modal de Ação */}
        <Dialog open={!!selectedViagem} onOpenChange={() => setSelectedViagem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Controle da Viagem</DialogTitle>
            </DialogHeader>
            
            {selectedViagem && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selectedViagem.tipo_veiculo === 'Ônibus' ? 
                    <Bus className="h-8 w-8 text-muted-foreground" /> : 
                    <Car className="h-8 w-8 text-muted-foreground" />
                  }
                  <div>
                    <p className="font-semibold text-lg">{selectedViagem.motorista}</p>
                    <p className="text-muted-foreground">{selectedViagem.placa}</p>
                  </div>
                  <Badge className="ml-auto">
                    {selectedViagem.status || 'agendado'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Pickup</p>
                    <p className="font-medium">{selectedViagem.h_pickup || '--:--'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PAX</p>
                    <p className="font-medium">{selectedViagem.qtd_pax || 0}</p>
                  </div>
                  {selectedViagem.ponto_embarque && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Ponto de Embarque</p>
                      <p className="font-medium">{selectedViagem.ponto_embarque}</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  {selectedViagem.status === 'agendado' && (
                    <Button 
                      onClick={() => handleAction('iniciar')} 
                      disabled={operando}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar
                    </Button>
                  )}
                  
                  {selectedViagem.status === 'em_andamento' && (
                    <Button 
                      onClick={() => handleAction('chegada')} 
                      disabled={operando}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Registrar Chegada
                    </Button>
                  )}
                  
                  {/* Botão de retorno removido - retorno agora cria nova viagem via ViagemCardOperador */}

                  {selectedViagem.status !== 'encerrado' && selectedViagem.status !== 'cancelado' && (
                    <Button 
                      variant="destructive" 
                      onClick={() => handleAction('cancelar')} 
                      disabled={operando}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </EventLayout>
  );
}
