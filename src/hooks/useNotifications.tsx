import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Play, MapPin, RotateCcw, CheckCircle, XCircle, Clock, Car, UserCheck, Fuel } from 'lucide-react';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export interface Notification {
  id: string;
  type: 'viagem' | 'veiculo' | 'motorista' | 'presenca' | 'vistoria' | 'alerta_combustivel';
  action: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  icon: ReactNode;
  color: string;
  motorista?: string;
  placa?: string;
  eventoId?: string;
  eventoNome?: string;
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

// Type definitions for Supabase query results
interface ViagemLogResult {
  id: string;
  acao: string;
  created_at: string | null;
  viagem: {
    motorista: string;
    placa: string | null;
    evento_id: string | null;
    evento: {
      nome_planilha: string;
    } | null;
  } | null;
}

interface PresencaLogResult {
  id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  updated_at: string;
  evento_id: string | null;
  motorista: {
    nome: string;
  } | null;
  evento: {
    nome_planilha: string;
  } | null;
}

interface VistoriaLogResult {
  id: string;
  tipo_vistoria: string;
  status_novo: string;
  created_at: string;
  evento_id: string | null;
  veiculo: {
    placa: string;
  } | null;
  realizado_por_nome: string | null;
  evento: {
    nome_planilha: string;
  } | null;
}

interface AlertaFrotaResult {
  id: string;
  tipo: string;
  nivel_combustivel: string | null;
  status: string;
  created_at: string;
  evento_id: string | null;
  veiculo: { placa: string } | null;
  motorista: { nome: string } | null;
  evento: { nome_planilha: string } | null;
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
  alerta_combustivel: { label: 'Combustível Baixo', icon: <Fuel className="h-4 w-4" />, color: 'bg-red-600' },
};

// Helper to load Set from localStorage
function loadSetFromStorage(key: string): Set<string> {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignore */ }
  return new Set();
}

// Helper to save Set to localStorage
function saveSetToStorage(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem('notification-sound-enabled');
    return saved !== 'false';
  });
  
  const { playNotificationSound } = useNotificationSound();
  const isInitialLoad = useRef(true);
  
  // Persist read and deleted IDs in localStorage
  const readIdsRef = useRef<Set<string>>(loadSetFromStorage('notification-read-ids'));
  const deletedIdsRef = useRef<Set<string>>(loadSetFromStorage('notification-deleted-ids'));
  
  // Use ref for soundEnabled to avoid recreating fetchNotifications
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  
  const playNotificationSoundRef = useRef(playNotificationSound);
  playNotificationSoundRef.current = playNotificationSound;

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('notification-sound-enabled', String(enabled));
  }, []);

  const fetchNotifications = useCallback(async () => {
    const [viagemLogsRes, presencaLogsRes, vistoriaLogsRes, alertasFrotaRes] = await Promise.all([
      supabase
        .from('viagem_logs')
        .select(`
          id, acao, created_at,
          viagem:viagens!viagem_id(motorista, placa, evento_id, evento:eventos!evento_id(nome_planilha))
        `)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('motorista_presenca')
        .select(`
          id, checkin_at, checkout_at, updated_at, evento_id,
          motorista:motoristas!motorista_id(nome),
          evento:eventos!evento_id(nome_planilha)
        `)
        .order('updated_at', { ascending: false })
        .limit(15),
      supabase
        .from('veiculo_vistoria_historico')
        .select(`
          id, tipo_vistoria, status_novo, created_at, evento_id,
          veiculo:veiculos!veiculo_id(placa),
          realizado_por_nome,
          evento:eventos!evento_id(nome_planilha)
        `)
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('alertas_frota')
        .select(`
          id, tipo, nivel_combustivel, status, created_at, evento_id,
          veiculo:veiculos!veiculo_id(placa),
          motorista:motoristas!motorista_id(nome),
          evento:eventos!evento_id(nome_planilha)
        `)
        .in('status', ['aberto', 'pendente'])
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const viagemLogs = (viagemLogsRes.data || []) as unknown as ViagemLogResult[];
    const presencaLogs = (presencaLogsRes.data || []) as unknown as PresencaLogResult[];
    const vistoriaLogs = (vistoriaLogsRes.data || []) as unknown as VistoriaLogResult[];
    const alertasFrota = (alertasFrotaRes.data || []) as unknown as AlertaFrotaResult[];

    const newNotifications: Notification[] = [];

    // Filter out shuttle trips from notifications
    viagemLogs.filter(log => log.viagem?.motorista !== 'Shuttle').forEach((log) => {
      const config = actionConfig[log.acao] || { label: log.acao, icon: <Bell className="h-4 w-4" />, color: 'bg-gray-500' };
      const motoristaNome = log.viagem?.motorista || 'Motorista';
      const placaVeiculo = log.viagem?.placa || '';
      newNotifications.push({
        id: `viagem-${log.id}`,
        type: 'viagem',
        action: log.acao,
        title: config.label,
        description: `${motoristaNome}${placaVeiculo ? ` (${placaVeiculo})` : ''}`,
        timestamp: log.created_at || new Date().toISOString(),
        read: false,
        icon: config.icon,
        color: config.color,
        motorista: motoristaNome,
        placa: placaVeiculo,
        eventoId: log.viagem?.evento_id || undefined,
        eventoNome: log.viagem?.evento?.nome_planilha || undefined,
      });
    });

    presencaLogs.forEach((log) => {
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
        eventoId: log.evento_id || undefined,
        eventoNome: log.evento?.nome_planilha || undefined,
      });
    });

    vistoriaLogs.forEach((log) => {
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
        eventoId: log.evento_id || undefined,
        eventoNome: log.evento?.nome_planilha || undefined,
      });
    });

    // Alertas de combustível
    alertasFrota.forEach((alerta) => {
      const config = actionConfig.alerta_combustivel;
      const placaVeiculo = alerta.veiculo?.placa || 'Veículo';
      const motoristaNome = alerta.motorista?.nome || 'Motorista';
      newNotifications.push({
        id: `alerta-${alerta.id}`,
        type: 'alerta_combustivel',
        action: 'alerta_combustivel',
        title: `${config.label} - ${alerta.nivel_combustivel || '?'}`,
        description: `${motoristaNome} (${placaVeiculo})`,
        timestamp: alerta.created_at,
        read: false,
        icon: config.icon,
        color: config.color,
        motorista: motoristaNome,
        placa: placaVeiculo,
        eventoId: alerta.evento_id || undefined,
        eventoNome: alerta.evento?.nome_planilha || undefined,
      });
    });

    newNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Filter out deleted notifications (persisted)
    const filteredNotifications = newNotifications.filter(n => !deletedIdsRef.current.has(n.id));
    const finalNotifications = filteredNotifications.slice(0, 50);
    
    // Apply persisted read state
    setNotifications(prev => {
      const mergedNotifications = finalNotifications.map(n => ({
        ...n,
        read: readIdsRef.current.has(n.id),
      }));
      
      // Play sound for new notifications (only after initial load)
      if (!isInitialLoad.current && soundEnabledRef.current) {
        const prevIds = new Set(prev.map(n => n.id));
        const hasNew = mergedNotifications.some(n => !prevIds.has(n.id) && !n.read);
        if (hasNew) {
          playNotificationSoundRef.current();
        }
      }
      
      return mergedNotifications;
    });

    setLoading(false);
    isInitialLoad.current = false;
  }, []); // No dependencies - uses refs for everything mutable

  const markAsRead = useCallback((id: string) => {
    readIdsRef.current.add(id);
    saveSetToStorage('notification-read-ids', readIdsRef.current);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => readIdsRef.current.add(n.id));
      saveSetToStorage('notification-read-ids', readIdsRef.current);
      return prev.map(n => ({ ...n, read: true }));
    });
  }, []);

  const deleteNotification = useCallback((id: string) => {
    deletedIdsRef.current.add(id);
    saveSetToStorage('notification-deleted-ids', deletedIdsRef.current);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => deletedIdsRef.current.add(n.id));
      saveSetToStorage('notification-deleted-ids', deletedIdsRef.current);
      return [];
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Get active eventoId from notifications or URL - filter realtime by event
  const activeEventoId = useRef<string | null>(null);
  
  // Extract eventoId from URL path (e.g., /evento/{id}/...)
  useEffect(() => {
    const match = window.location.pathname.match(/\/evento\/([0-9a-f-]{36})\//i);
    activeEventoId.current = match ? match[1] : null;
  });

  useEffect(() => {
    fetchNotifications();

    // THROTTLE: Prevent fetchNotifications from firing more than once per 5 seconds
    let lastFetch = Date.now();
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttledFetch = () => {
      const now = Date.now();
      const elapsed = now - lastFetch;
      if (elapsed >= 5000) {
        lastFetch = now;
        fetchNotifications();
      } else if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          lastFetch = Date.now();
          fetchNotifications();
        }, 5000 - elapsed);
      }
    };

    // Build channel with event-filtered subscriptions when possible
    const evtId = activeEventoId.current;
    const channel = supabase.channel(`notifications-${evtId || 'all'}`);

    if (evtId) {
      // FILTERED: Only listen to changes for the active event (~90% reduction)
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'viagem_logs' }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_presenca', filter: `evento_id=eq.${evtId}` }, throttledFetch)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'veiculo_vistoria_historico', filter: `evento_id=eq.${evtId}` }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_frota', filter: `evento_id=eq.${evtId}` }, throttledFetch);
    } else {
      // Fallback: no event context, listen to all (admin Home page)
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'viagem_logs' }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_presenca' }, throttledFetch)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'veiculo_vistoria_historico' }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_frota' }, throttledFetch);
    }

    channel.subscribe();

    // Polling fallback every 2 minutes
    const pollInterval = setInterval(() => fetchNotifications(), 120000);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
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