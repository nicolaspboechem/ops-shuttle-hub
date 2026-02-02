import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Play, MapPin, RotateCcw, CheckCircle, XCircle, Clock, Car, UserCheck } from 'lucide-react';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export interface Notification {
  id: string;
  type: 'viagem' | 'veiculo' | 'motorista' | 'presenca' | 'vistoria';
  action: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  icon: ReactNode;
  color: string;
  motorista?: string;
  placa?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const actionConfig: Record<string, { label: string; icon: ReactNode; color: string }> = {
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

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem('notification-sound-enabled');
    return saved !== 'false';
  });
  
  const { playNotificationSound } = useNotificationSound();
  const isInitialLoad = useRef(true);
  
  // Track deleted notification IDs to prevent them from reappearing
  const deletedIdsRef = useRef<Set<string>>(new Set());

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('notification-sound-enabled', String(enabled));
  }, []);

  const fetchNotifications = useCallback(async () => {
    const [viagemLogsRes, presencaLogsRes, vistoriaLogsRes] = await Promise.all([
      supabase
        .from('viagem_logs')
        .select(`
          id,
          acao,
          created_at,
          viagem:viagens!viagem_id(motorista, placa, evento_id),
          profile:profiles!user_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('motorista_presenca')
        .select(`
          id,
          checkin_at,
          checkout_at,
          updated_at,
          motorista:motoristas!motorista_id(nome)
        `)
        .order('updated_at', { ascending: false })
        .limit(15),
      supabase
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
        .limit(15),
    ]);

    const viagemLogs = viagemLogsRes.data || [];
    const presencaLogs = presencaLogsRes.data || [];
    const vistoriaLogs = vistoriaLogsRes.data || [];

    const newNotifications: Notification[] = [];

    viagemLogs.forEach((log: any) => {
      const config = actionConfig[log.acao] || { label: log.acao, icon: <Bell className="h-4 w-4" />, color: 'bg-gray-500' };
      const motoristaNome = log.viagem?.motorista || 'Motorista';
      const placaVeiculo = log.viagem?.placa || '';
      newNotifications.push({
        id: `viagem-${log.id}`,
        type: 'viagem',
        action: log.acao,
        title: config.label,
        description: `${motoristaNome} (${placaVeiculo || 'Sem placa'}) - por ${log.profile?.full_name || 'Sistema'}`,
        timestamp: log.created_at,
        read: false,
        icon: config.icon,
        color: config.color,
        motorista: motoristaNome,
        placa: placaVeiculo,
      });
    });

    presencaLogs.forEach((log: any) => {
      const isCheckout = log.checkout_at && new Date(log.checkout_at) > new Date(log.checkin_at || 0);
      const config = isCheckout ? actionConfig.checkout : actionConfig.checkin;
      const motoristaNome = log.motorista?.nome || 'Motorista';
      newNotifications.push({
        id: `presenca-${log.id}`,
        type: 'presenca',
        action: isCheckout ? 'checkout' : 'checkin',
        title: config.label,
        description: motoristaNome,
        timestamp: log.updated_at,
        read: false,
        icon: config.icon,
        color: config.color,
        motorista: motoristaNome,
      });
    });

    vistoriaLogs.forEach((log: any) => {
      const config = log.status_novo === 'liberado' ? actionConfig.liberacao : actionConfig.inspecao;
      const placaVeiculo = log.veiculo?.placa || 'Veículo';
      newNotifications.push({
        id: `vistoria-${log.id}`,
        type: 'vistoria',
        action: log.tipo_vistoria,
        title: config.label,
        description: `${placaVeiculo} - por ${log.realizado_por_nome || 'Sistema'}`,
        timestamp: log.created_at,
        read: false,
        icon: config.icon,
        color: config.color,
        placa: placaVeiculo,
      });
    });

    newNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Filter out deleted notifications
    const filteredNotifications = newNotifications.filter(n => !deletedIdsRef.current.has(n.id));
    const finalNotifications = filteredNotifications.slice(0, 50);
    
    // Preserve read state from existing notifications
    setNotifications(prev => {
      const readMap = new Map(prev.map(n => [n.id, n.read]));
      const mergedNotifications = finalNotifications.map(n => ({
        ...n,
        read: readMap.get(n.id) ?? n.read,
      }));
      
      // Play sound for new notifications (only after initial load)
      if (!isInitialLoad.current && soundEnabled) {
        const prevIds = new Set(prev.map(n => n.id));
        const hasNew = mergedNotifications.some(n => !prevIds.has(n.id) && !n.read);
        if (hasNew) {
          playNotificationSound();
        }
      }
      
      return mergedNotifications;
    });

    setLoading(false);
    isInitialLoad.current = false;
  }, [soundEnabled, playNotificationSound]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    deletedIdsRef.current.add(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();

    const viagemLogsChannel = supabase
      .channel('shared-viagem-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'viagem_logs' }, () => fetchNotifications())
      .subscribe();

    const presencaChannel = supabase
      .channel('shared-presenca')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_presenca' }, () => fetchNotifications())
      .subscribe();

    const vistoriaChannel = supabase
      .channel('shared-vistoria')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'veiculo_vistoria_historico' }, () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(viagemLogsChannel);
      supabase.removeChannel(presencaChannel);
      supabase.removeChannel(vistoriaChannel);
    };
  }, [fetchNotifications]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      soundEnabled,
      setSoundEnabled,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
