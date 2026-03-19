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
  markAsUnread: (id: string) => void;
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
    tipo_operacao: string;
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
  veiculo: { placa: string; nome: string | null } | null;
  motorista: { nome: string } | null;
  evento: { nome_planilha: string } | null;
}

interface NotificacaoUsuarioRow {
  notification_key: string;
  lida: boolean;
  ocultada: boolean;
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

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem('notification-sound-enabled');
    return saved !== 'false';
  });
  
  const { playNotificationSound } = useNotificationSound();
  const isInitialLoad = useRef(true);
  const userIdRef = useRef<string | null>(null);
  
  // In-memory cache of DB state to avoid re-fetching on every notification build
  const dbStateRef = useRef<Map<string, { lida: boolean; ocultada: boolean }>>(new Map());
  
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  
  const playNotificationSoundRef = useRef(playNotificationSound);
  playNotificationSoundRef.current = playNotificationSound;

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('notification-sound-enabled', String(enabled));
  }, []);

  // Fetch user's notification states from DB
  const fetchDbState = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    userIdRef.current = user.id;

    const { data } = await supabase
      .from('notificacao_usuario')
      .select('notification_key, lida, ocultada')
      .eq('user_id', user.id);

    const map = new Map<string, { lida: boolean; ocultada: boolean }>();
    ((data || []) as unknown as NotificacaoUsuarioRow[]).forEach(row => {
      map.set(row.notification_key, { lida: row.lida, ocultada: row.ocultada });
    });
    dbStateRef.current = map;
  }, []);

  const fetchNotifications = useCallback(async () => {
    // Ensure we have DB state loaded
    if (dbStateRef.current.size === 0 && userIdRef.current === null) {
      await fetchDbState();
    }

    const [viagemLogsRes, presencaLogsRes, vistoriaLogsRes, alertasFrotaRes] = await Promise.all([
      supabase
        .from('viagem_logs')
        .select(`
          id, acao, created_at,
          viagem:viagens!viagem_id(motorista, placa, tipo_operacao, evento_id, evento:eventos!evento_id(nome_planilha))
        `)
        .order('created_at', { ascending: false })
        .limit(20),
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
          veiculo:veiculos!veiculo_id(placa, nome),
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

    viagemLogs.filter(log => log.viagem?.tipo_operacao !== 'shuttle').forEach((log) => {
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

    alertasFrota.forEach((alerta) => {
      const config = actionConfig.alerta_combustivel;
      const nomeVeiculo = alerta.veiculo?.nome || alerta.veiculo?.placa || 'Veículo';
      const motoristaNome = alerta.motorista?.nome || 'Motorista';
      newNotifications.push({
        id: `alerta-${alerta.id}`,
        type: 'alerta_combustivel',
        action: 'alerta_combustivel',
        title: `${config.label} - ${alerta.nivel_combustivel || '?'}`,
        description: `${motoristaNome} - ${nomeVeiculo}${alerta.veiculo?.nome && alerta.veiculo?.placa ? ` (${alerta.veiculo.placa})` : ''}`,
        timestamp: alerta.created_at,
        read: false,
        icon: config.icon,
        color: config.color,
        motorista: motoristaNome,
        placa: alerta.veiculo?.placa || '',
        eventoId: alerta.evento_id || undefined,
        eventoNome: alerta.evento?.nome_planilha || undefined,
      });
    });

    newNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Filter out hidden notifications and apply read state from DB
    const dbState = dbStateRef.current;
    const filteredNotifications = newNotifications
      .filter(n => {
        const state = dbState.get(n.id);
        return !state?.ocultada;
      })
      .slice(0, 50);
    
    setNotifications(prev => {
      const mergedNotifications = filteredNotifications.map(n => ({
        ...n,
        read: dbState.get(n.id)?.lida || false,
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
  }, [fetchDbState]);

  // Upsert a notification state in DB
  const upsertState = useCallback(async (notificationKey: string, updates: { lida?: boolean; ocultada?: boolean }) => {
    const userId = userIdRef.current;
    if (!userId) return;

    // Update local cache immediately
    const current = dbStateRef.current.get(notificationKey) || { lida: false, ocultada: false };
    dbStateRef.current.set(notificationKey, { ...current, ...updates });

    await supabase
      .from('notificacao_usuario')
      .upsert({
        user_id: userId,
        notification_key: notificationKey,
        lida: updates.lida ?? current.lida,
        ocultada: updates.ocultada ?? current.ocultada,
      }, { onConflict: 'user_id,notification_key' });
  }, []);

  const markAsRead = useCallback((id: string) => {
    upsertState(id, { lida: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [upsertState]);

  const markAsUnread = useCallback((id: string) => {
    upsertState(id, { lida: false });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
  }, [upsertState]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => upsertState(n.id, { lida: true }));
      return prev.map(n => ({ ...n, read: true }));
    });
  }, [upsertState]);

  const deleteNotification = useCallback((id: string) => {
    upsertState(id, { ocultada: true });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [upsertState]);

  const clearAll = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => upsertState(n.id, { ocultada: true }));
      return [];
    });
  }, [upsertState]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const activeEventoId = useRef<string | null>(null);
  
  useEffect(() => {
    const match = window.location.pathname.match(/\/evento\/([0-9a-f-]{36})\//i);
    activeEventoId.current = match ? match[1] : null;
  });

  useEffect(() => {
    fetchDbState().then(() => fetchNotifications());

    let lastFetch = Date.now();
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttledFetch = () => {
      const now = Date.now();
      const elapsed = now - lastFetch;
      if (elapsed >= 10000) {
        lastFetch = now;
        fetchNotifications();
      } else if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          lastFetch = Date.now();
          fetchNotifications();
        }, 10000 - elapsed);
      }
    };

    const evtId = activeEventoId.current;
    const channel = supabase.channel(`notifications-${evtId || 'all'}`);

    if (evtId) {
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'viagem_logs' }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_presenca', filter: `evento_id=eq.${evtId}` }, throttledFetch)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'veiculo_vistoria_historico', filter: `evento_id=eq.${evtId}` }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_frota', filter: `evento_id=eq.${evtId}` }, throttledFetch);
    } else {
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'viagem_logs' }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_presenca' }, throttledFetch)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'veiculo_vistoria_historico' }, throttledFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_frota' }, throttledFetch);
    }

    channel.subscribe();

    const pollInterval = setInterval(() => fetchNotifications(), 120000);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchNotifications, fetchDbState]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      soundEnabled,
      setSoundEnabled,
      markAsRead,
      markAsUnread,
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
