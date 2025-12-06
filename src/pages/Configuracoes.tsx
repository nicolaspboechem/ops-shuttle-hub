import { useParams } from 'react-router-dom';
import { Database, Bell, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEventos } from '@/hooks/useEventos';

export default function Configuracoes() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById } = useEventos();
  
  const evento = eventoId ? getEventoById(eventoId) : null;

  return (
    <MainLayout>
      <Header 
        title="Configurações"
        subtitle={evento ? evento.nome_planilha : 'Configurações do sistema'}
      />
      
      <div className="p-8 max-w-3xl space-y-6">
        {/* Connection Status */}
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
              <Badge variant="outline" className="bg-status-alert-bg text-status-alert border-status-alert/20">
                Demo Mode
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              O sistema está rodando com dados de demonstração. Para conectar ao banco de dados 
              real, configure as credenciais do Supabase.
            </p>
            <Button variant="outline">
              Configurar Supabase
            </Button>
          </CardContent>
        </Card>

        {/* Refresh Interval */}
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
              <Badge variant="secondary" className="text-sm">30 segundos</Badge>
              <span className="text-sm text-muted-foreground">
                Os dados são atualizados automaticamente a cada 30 segundos
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Alert Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configurações de Alertas</CardTitle>
                <CardDescription>Defina os limiares para alertas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-status-alert-bg/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Alerta</p>
                <p className="text-xs text-muted-foreground">
                  Viagem ultrapassa a média em mais de 15 minutos
                </p>
              </div>
              <Badge className="bg-status-alert text-status-alert-foreground">
                +15 min
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-critical-bg/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Crítico</p>
                <p className="text-xs text-muted-foreground">
                  Viagem ultrapassa a média em mais de 25 minutos
                </p>
              </div>
              <Badge className="bg-status-critical text-status-critical-foreground">
                +25 min
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
