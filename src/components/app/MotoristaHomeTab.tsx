import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Route, Clock, Bell, Check, Eye, EyeOff, Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MotoristaHomeTabProps {
  motoristaData: any;
  viagens: any[];
  presenca: any;
  eventoNome?: string;
}

export function MotoristaHomeTab({ motoristaData, viagens, presenca, eventoNome }: MotoristaHomeTabProps) {
  const { notifications, markAsRead, markAsUnread, deleteNotification, clearAll } = useNotifications();

  // Metrics
  const metrics = useMemo(() => {
    if (!motoristaData) return { totalViagens: 0, viagensHoje: 0, totalPax: 0 };

    const encerradas = viagens.filter(
      v => v.motorista_id === motoristaData.id && v.status === 'encerrado'
    );

    const hoje = new Date().toISOString().slice(0, 10);
    const viagensHoje = encerradas.filter(v => v.data_criacao?.slice(0, 10) === hoje).length;
    const totalPax = encerradas.reduce((sum, v) => sum + (v.qtd_pax || 0), 0);

    return {
      totalViagens: encerradas.length,
      viagensHoje,
      totalPax,
    };
  }, [motoristaData, viagens]);

  // Check-in duration
  const checkinDuration = useMemo(() => {
    if (!presenca?.checkin_at || presenca.checkout_at) return null;
    return formatDistanceToNow(new Date(presenca.checkin_at), { locale: ptBR });
  }, [presenca]);

  const statusLabel = motoristaData?.status === 'em_viagem' ? 'Em Viagem'
    : motoristaData?.status === 'disponivel' ? 'Disponível' : 'Offline';

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold">Olá, {motoristaData?.nome?.split(' ')[0] || 'Motorista'}!</h2>
        <p className="text-sm text-muted-foreground">{eventoNome}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Route className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{metrics.totalViagens}</p>
            <p className="text-xs text-muted-foreground">Viagens Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Check className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{metrics.viagensHoje}</p>
            <p className="text-xs text-muted-foreground">Viagens Hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Status: {statusLabel}</p>
              {checkinDuration && (
                <p className="text-xs text-muted-foreground">Check-in há {checkinDuration}</p>
              )}
            </div>
          </div>
          <Badge variant="outline">{metrics.totalPax} pax</Badge>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </CardTitle>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
              Limpar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma notificação</p>
          ) : (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className={`shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-white ${n.color}`}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => n.read ? markAsUnread(n.id) : markAsRead(n.id)}
                    >
                      {n.read ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteNotification(n.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
