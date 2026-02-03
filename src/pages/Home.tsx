import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Bell, Clock, Car, Activity, Calendar, Users, 
  TrendingUp, RefreshCw, Truck, Filter, X, Check, Trash2,
  Volume2, VolumeX
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { useTutorial, adminSteps } from '@/hooks/useTutorial';
import { TutorialPopover } from '@/components/app/TutorialPopover';

interface Stats {
  eventosAtivos: number;
  viagensHoje: number;
  motoristasOnline: number;
  veiculosLiberados: number;
}

export default function Home() {
  const {
    notifications,
    loading: notificationsLoading,
    soundEnabled,
    setSoundEnabled,
    markAsRead,
    deleteNotification,
    refresh: refreshNotifications,
  } = useNotifications();

  const [stats, setStats] = useState<Stats>({ eventosAtivos: 0, viagensHoje: 0, motoristasOnline: 0, veiculosLiberados: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroMotorista, setFiltroMotorista] = useState<string>('todos');
  const [filtroVeiculo, setFiltroVeiculo] = useState<string>('todos');

  // Tutorial for admin on first access
  const tutorial = useTutorial('admin', adminSteps);

  // Extract unique motoristas and placas from notifications
  const { motoristas, placas } = useMemo(() => {
    const motoristasSet = new Set<string>();
    const placasSet = new Set<string>();
    
    notifications.forEach(n => {
      if (n.motorista) motoristasSet.add(n.motorista);
      if (n.placa) placasSet.add(n.placa);
    });
    
    return {
      motoristas: Array.from(motoristasSet).sort(),
      placas: Array.from(placasSet).sort()
    };
  }, [notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchMotorista = filtroMotorista === 'todos' || n.motorista === filtroMotorista;
      const matchVeiculo = filtroVeiculo === 'todos' || n.placa === filtroVeiculo;
      return matchMotorista && matchVeiculo;
    });
  }, [notifications, filtroMotorista, filtroVeiculo]);

  const hasActiveFilters = filtroMotorista !== 'todos' || filtroVeiculo !== 'todos';

  const clearFilters = () => {
    setFiltroMotorista('todos');
    setFiltroVeiculo('todos');
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    toast.success(newValue ? 'Som de notificações ativado' : 'Som de notificações desativado');
  };

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
    setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), refreshNotifications()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();

    // Realtime for stats updates
    const presencaChannel = supabase
      .channel('home-stats-presenca')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_presenca' }, () => fetchStats())
      .subscribe();

    const viagensChannel = supabase
      .channel('home-stats-viagens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagens' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(presencaChannel);
      supabase.removeChannel(viagensChannel);
    };
  }, [fetchStats]);

  if (loading || notificationsLoading) {
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
      {/* Tutorial Popover for Admin */}
      {tutorial.isActive && tutorial.currentStep && (
        <TutorialPopover
          step={tutorial.currentStep}
          currentIndex={tutorial.currentIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.next}
          onSkip={tutorial.skip}
          onComplete={tutorial.complete}
        />
      )}
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Central de Controle</h1>
            <p className="text-muted-foreground">Monitoramento em tempo real das operações</p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={toggleSound}
                    className={soundEnabled ? '' : 'text-muted-foreground'}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundEnabled ? 'Desativar som' : 'Ativar som'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
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
        <Card data-tutorial="activity">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
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
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtros:</span>
              </div>
              
              <Select value={filtroMotorista} onValueChange={setFiltroMotorista}>
                <SelectTrigger className="w-[180px]">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Motorista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Motoristas</SelectItem>
                  {motoristas.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                <SelectTrigger className="w-[150px]">
                  <Car className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Veículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Veículos</SelectItem>
                  {placas.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}

              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-auto">
                  {filteredNotifications.length} resultado(s)
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    {hasActiveFilters ? 'Nenhuma atividade encontrada com os filtros aplicados' : 'Nenhuma atividade recente'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasActiveFilters ? 'Tente ajustar os filtros' : 'As ações do sistema aparecerão aqui em tempo real'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {filteredNotifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                          notification.read ? 'bg-muted/30 opacity-60' : 'bg-card hover:bg-muted/50'
                        }`}
                      >
                        <div className={`${notification.color} text-white p-2.5 rounded-full shrink-0`}>
                          {notification.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium ${notification.read ? 'text-muted-foreground' : ''}`}>
                              {notification.title}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {notification.type}
                            </Badge>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(notification.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <TooltipProvider>
                            {!notification.read && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-green-500"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Marcar como lido</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
