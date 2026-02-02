import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, Play, MapPin, RotateCcw, CheckCircle, XCircle, 
  Clock, Car, UserCheck, Activity, Calendar, Users, 
  TrendingUp, AlertTriangle, RefreshCw, Truck
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: 'viagem' | 'veiculo' | 'motorista' | 'presenca' | 'vistoria';
  action: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  icon: React.ReactNode;
  color: string;
}

interface Stats {
  eventosAtivos: number;
  viagensHoje: number;
  motoristasOnline: number;
  veiculosLiberados: number;
}

const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  inicio: { label: 'Viagem Iniciada', icon: <Play className="h-4 w-4" />, color: 'bg-blue-500' },
  chegada: { label: 'Chegou ao Destino', icon: <MapPin className="h-4 w-4" />, color: 'bg-amber-500' },
  retorno: { label: 'Retornou', icon: <RotateCcw className="h-4 w-4" />, color: 'bg-green-500' },
  encerramento: { label: 'Viagem Encerrada', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-600' },
  cancelamento: { label: 'Viagem Cancelada', icon: <XCircle className="h-4 w-4" />, color: 'bg-red-500' },
  checkin: { label: 'Check-in Realizado', icon: <UserCheck className="h-4 w-4" />, color: 'bg-emerald-500' },
  checkout: { label: 'Check-out Realizado', icon: <Clock className="h-4 w-4" />, color: 'bg-orange-500' },
  inspecao: { label: 'Veículo Inspecionado', icon: <Car className="h-4 w-4" />, color: 'bg-purple-500' },
  liberacao: { label: 'Veículo Liberado', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-teal-500' },
};

export default function Home() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats>({ eventosAtivos: 0, viagensHoje: 0, motoristasOnline: 0, veiculosLiberados: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [eventosRes, viagensRes, motoristasRes, veiculosRes] = await Promise.all([
      supabase.from('eventos').select('id', { count: 'exact' }).eq('status', 'ativo'),
      supabase.from('viagens').select('id', { count: 'exact' }).gte('data_criacao', today.toISOString()),
      supabase.from('motorista_presenca').select('id', { count: 'exact' }).eq('data', format(today, 'yyyy-MM-dd')).not('checkin_at', 'is', null).is('checkout_at', null),
      supabase.from('veiculos').select('id', { count: 'exact' }).eq('status', 'liberado'),
    ]);

    setStats({
      eventosAtivos: eventosRes.count || 0,
      viagensHoje: viagensRes.count || 0,
      motoristasOnline: motoristasRes.count || 0,
      veiculosLiberados: veiculosRes.count || 0,
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data: viagemLogs } = await supabase
      .from('viagem_logs')
      .select(`
        id,
        acao,
        created_at,
        viagem:viagens!viagem_id(motorista, placa, evento_id),
        profile:profiles!user_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    const { data: presencaLogs } = await supabase
      .from('motorista_presenca')
      .select(`
        id,
        checkin_at,
        checkout_at,
        updated_at,
        motorista:motoristas!motorista_id(nome)
      `)
      .order('updated_at', { ascending: false })
      .limit(15);

    const { data: vistoriaLogs } = await supabase
      .from('veiculo_vistoria_historico')
      .select(`
        id,
        tipo_vistoria,
        status_novo,
        created_at,
        veiculo:veiculos!veiculo_id(placa),
        realizado_por_nome
      `)
      .order('created_at', { ascending: false })
      .limit(15);

    const newNotifications: Notification[] = [];

    (viagemLogs || []).forEach((log: any) => {
      const config = actionConfig[log.acao] || { label: log.acao, icon: <Bell className="h-4 w-4" />, color: 'bg-gray-500' };
      newNotifications.push({
        id: `viagem-${log.id}`,
        type: 'viagem',
        action: log.acao,
        title: config.label,
        description: `${log.viagem?.motorista || 'Motorista'} (${log.viagem?.placa || 'Placa'}) - por ${log.profile?.full_name || 'Sistema'}`,
        timestamp: log.created_at,
        read: false,
        icon: config.icon,
        color: config.color,
      });
    });

    (presencaLogs || []).forEach((log: any) => {
      const isCheckout = log.checkout_at && new Date(log.checkout_at) > new Date(log.checkin_at || 0);
      const config = isCheckout ? actionConfig.checkout : actionConfig.checkin;
      newNotifications.push({
        id: `presenca-${log.id}`,
        type: 'presenca',
        action: isCheckout ? 'checkout' : 'checkin',
        title: config.label,
        description: `${log.motorista?.nome || 'Motorista'}`,
        timestamp: log.updated_at,
        read: false,
        icon: config.icon,
        color: config.color,
      });
    });

    (vistoriaLogs || []).forEach((log: any) => {
      const config = log.status_novo === 'liberado' ? actionConfig.liberacao : actionConfig.inspecao;
      newNotifications.push({
        id: `vistoria-${log.id}`,
        type: 'vistoria',
        action: log.tipo_vistoria,
        title: config.label,
        description: `${log.veiculo?.placa || 'Veículo'} - por ${log.realizado_por_nome || 'Sistema'}`,
        timestamp: log.created_at,
        read: false,
        icon: config.icon,
        color: config.color,
      });
    });

    newNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(newNotifications.slice(0, 50));
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchNotifications()]);
    setLoading(false);
  }, [fetchStats, fetchNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAll();

    // Realtime subscriptions
    const viagemLogsChannel = supabase
      .channel('home-viagem-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'viagem_logs' }, () => fetchNotifications())
      .subscribe();

    const presencaChannel = supabase
      .channel('home-presenca')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_presenca' }, () => {
        fetchNotifications();
        fetchStats();
      })
      .subscribe();

    const vistoriaChannel = supabase
      .channel('home-vistoria')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'veiculo_vistoria_historico' }, () => fetchNotifications())
      .subscribe();

    const viagensChannel = supabase
      .channel('home-viagens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagens' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(viagemLogsChannel);
      supabase.removeChannel(presencaChannel);
      supabase.removeChannel(vistoriaChannel);
      supabase.removeChannel(viagensChannel);
    };
  }, [fetchAll, fetchNotifications, fetchStats]);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Central de Controle</h1>
            <p className="text-muted-foreground">Monitoramento em tempo real das operações</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="interactive-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Eventos Ativos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.eventosAtivos}</div>
              <p className="text-xs text-muted-foreground">operações em andamento</p>
            </CardContent>
          </Card>

          <Card className="interactive-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Viagens Hoje</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.viagensHoje}</div>
              <p className="text-xs text-muted-foreground">viagens registradas</p>
            </CardContent>
          </Card>

          <Card className="interactive-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Motoristas Online</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.motoristasOnline}</div>
              <p className="text-xs text-muted-foreground">com check-in ativo</p>
            </CardContent>
          </Card>

          <Card className="interactive-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Veículos Liberados</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.veiculosLiberados}</div>
              <p className="text-xs text-muted-foreground">prontos para operação</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Atividade em Tempo Real</CardTitle>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Ao vivo
              </Badge>
            </div>
            <CardDescription>
              Todas as ações realizadas no sistema aparecem aqui instantaneamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma atividade recente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As ações do sistema aparecerão aqui em tempo real
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className={`${notification.color} text-white p-2.5 rounded-full shrink-0`}>
                          {notification.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{notification.title}</p>
                            <Badge variant="secondary" className="text-xs">
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.description}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
