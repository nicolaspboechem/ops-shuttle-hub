import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useServerTime() {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const syncTime = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_server_time');
      
      if (error) {
        console.error('Erro ao sincronizar hora do servidor:', error);
        return;
      }

      if (data) {
        const serverDate = new Date(data);
        const localDate = new Date();
        const calculatedOffset = serverDate.getTime() - localDate.getTime();
        
        setOffset(calculatedOffset);
        setServerTime(serverDate);
      }
    } catch (err) {
      console.error('Erro na sincronização de tempo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncTime();

    // Ressincronizar a cada 5 minutos
    const interval = setInterval(syncTime, 5 * 60 * 1000);

    // Re-sync ao voltar do background (celular em segundo plano)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncTime]);

  // Retorna hora atual sincronizada com o servidor
  const getAgoraSync = useCallback(() => {
    return new Date(Date.now() + offset);
  }, [offset]);

  // Calcula tempo decorrido desde uma hora específica (em minutos)
  const calcularTempoDecorrido = useCallback((horaInicio: string | null): number => {
    if (!horaInicio) return 0;
    
    const agora = getAgoraSync();
    const [hours, minutes] = horaInicio.split(':').map(Number);
    
    const inicio = new Date(agora);
    inicio.setHours(hours, minutes, 0, 0);
    
    // Se a hora de início for maior que agora, assumir dia anterior
    if (inicio > agora) {
      inicio.setDate(inicio.getDate() - 1);
    }
    
    return Math.floor((agora.getTime() - inicio.getTime()) / (1000 * 60));
  }, [getAgoraSync]);

  return { 
    serverTime, 
    offset, 
    loading,
    syncTime, 
    getAgoraSync,
    calcularTempoDecorrido
  };
}
