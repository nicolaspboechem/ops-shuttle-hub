import { useParams } from 'react-router-dom';
import { Database, Bell, Clock, CheckCircle } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEventos } from '@/hooks/useEventos';

export default function Configuracoes() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById } = useEventos();
  const evento = eventoId ? getEventoById(eventoId) : null;

  return (
    <EventLayout>
      <div className="p-8 max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Conexão com Banco de Dados</CardTitle>
                  <CardDescription>Status da conexão com Supabase</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-status-ok/10 text-status-ok border-status-ok/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O sistema está conectado ao banco de dados Supabase e recebendo dados em tempo real.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Intervalo de Atualização</CardTitle>
                <CardDescription>Frequência de atualização dos dados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">30 segundos</Badge>
              <span className="text-sm text-muted-foreground">Atualização automática + Realtime</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configurações de Alertas</CardTitle>
                <CardDescription>Limiares para alertas baseados na média do motorista</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-status-alert/10 rounded-lg">
              <div>
                <p className="text-sm font-medium">Alerta</p>
                <p className="text-xs text-muted-foreground">Ultrapassa a média em mais de 15 minutos</p>
              </div>
              <Badge className="bg-status-alert text-status-alert-foreground">+15 min</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-critical/10 rounded-lg">
              <div>
                <p className="text-sm font-medium">Crítico</p>
                <p className="text-xs text-muted-foreground">Ultrapassa a média em mais de 25 minutos</p>
              </div>
              <Badge className="bg-status-critical text-status-critical-foreground">+25 min</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </EventLayout>
  );
}
