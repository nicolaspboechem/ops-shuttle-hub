import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Play, MapPin, RotateCcw, CheckCircle, XCircle, User, Clock, Car, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
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

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showMarkReadConfirm, setShowMarkReadConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Fetch recent notifications
  const fetchNotifications = useCallback(async () => {
    // Fetch viagem logs
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
      .limit(20);

    // Fetch recent presence changes
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
      .limit(10);

    // Fetch recent vehicle inspections
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
      .limit(10);

    const newNotifications: Notification[] = [];

    // Process viagem logs
    (viagemLogs || []).forEach((log: any) => {
      const config = actionConfig[log.acao] || { label: log.acao, icon: <Bell className="h-4 w-4" />, color: 'bg-gray-500' };
      newNotifications.push({
        id: log.id,
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

    // Process presence logs
    (presencaLogs || []).forEach((log: any) => {
      const isCheckout = log.checkout_at && new Date(log.checkout_at) > new Date(log.checkin_at || 0);
      const config = isCheckout ? actionConfig.checkout : actionConfig.checkin;
      newNotifications.push({
        id: log.id,
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

    // Process vistoria logs
    (vistoriaLogs || []).forEach((log: any) => {
      const config = log.status_novo === 'liberado' ? actionConfig.liberacao : actionConfig.inspecao;
      newNotifications.push({
        id: log.id,
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

    // Sort by timestamp
    newNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Keep only the 30 most recent
    const limited = newNotifications.slice(0, 30);
    
    setNotifications(limited);
    setUnreadCount(limited.filter(n => !n.read).length);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscriptions
    const viagemLogsChannel = supabase
      .channel('admin-viagem-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'viagem_logs' },
        (payload) => {
          const log = payload.new as any;
          const config = actionConfig[log.acao] || { label: log.acao, icon: <Bell className="h-4 w-4" />, color: 'bg-gray-500' };
          
          const newNotification: Notification = {
            id: log.id,
            type: 'viagem',
            action: log.acao,
            title: config.label,
            description: 'Nova ação registrada',
            timestamp: log.created_at,
            read: false,
            icon: config.icon,
            color: config.color,
          };

          setNotifications(prev => [newNotification, ...prev].slice(0, 30));
          setUnreadCount(prev => prev + 1);
          setHasNewNotification(true);
          
          // Fetch full details
          fetchNotifications();
        }
      )
      .subscribe();

    const presencaChannel = supabase
      .channel('admin-presenca')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motorista_presenca' },
        () => {
          setHasNewNotification(true);
          fetchNotifications();
        }
      )
      .subscribe();

    const vistoriaChannel = supabase
      .channel('admin-vistoria')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'veiculo_vistoria_historico' },
        () => {
          setHasNewNotification(true);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(viagemLogsChannel);
      supabase.removeChannel(presencaChannel);
      supabase.removeChannel(vistoriaChannel);
    };
  }, [fetchNotifications]);

  // Reset animation after showing
  useEffect(() => {
    if (hasNewNotification) {
      const timer = setTimeout(() => setHasNewNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasNewNotification]);

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setShowMarkReadConfirm(false);
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setShowClearConfirm(false);
  };

  return (
    <>
      {/* Confirmation dialogs */}
      <AlertDialog open={showMarkReadConfirm} onOpenChange={setShowMarkReadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar todas como lidas?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as {unreadCount} notificações não lidas serão marcadas como lidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAllAsRead}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todas as notificações?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as {notifications.length} notificações serão removidas da lista. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
          variant="outline" 
          size="icon" 
          className="relative"
          onClick={() => setIsOpen(true)}
        >
          <motion.div
            animate={hasNewNotification ? { 
              scale: [1, 1.2, 1],
              rotate: [0, -10, 10, -10, 0]
            } : {}}
            transition={{ duration: 0.5 }}
          >
            <Bell className="w-5 h-5" />
          </motion.div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5"
              >
                <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações em Tempo Real
            </SheetTitle>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowMarkReadConfirm(true)} disabled={unreadCount === 0}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Marcar lidas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {unreadCount} {unreadCount === 1 ? 'nova notificação' : 'novas notificações'}
            </p>
          )}
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação recente</p>
              <p className="text-xs text-muted-foreground mt-1">
                As ações do sistema aparecerão aqui em tempo real
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border ${notification.read ? 'bg-background' : 'bg-muted/50'} transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${notification.color} text-white p-2 rounded-full shrink-0`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
    </>
  );
}
