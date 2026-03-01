import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Evento } from '@/lib/types/viagem';

export function useEventos(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchEventos = useCallback(async (showLoading = false, isManualRefresh = false) => {
    // Só mostra loading no carregamento inicial
    if (showLoading) {
      setLoading(true);
    }
    // Mostra refreshing quando é atualização manual
    if (isManualRefresh) {
      setRefreshing(true);
    }
    
    let query = supabase
      .from('eventos')
      .select('*');
    
    if (!includeInactive) {
      query = query.eq('status', 'ativo');
    }
    
    const { data, error } = await query.order('data_criacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setEventos(data || []);
    setLastUpdate(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchEventos(true); // Carregamento inicial com loading

    // Polling only every 5 minutes - silencioso
    // Realtime removido: trigger update_evento_stats dispara UPDATE em eventos
    // a cada insert/update de viagem, causando refetch desnecessário em cascata
    const interval = setInterval(() => fetchEventos(false), 300000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchEventos]);

  const getEventoById = useCallback((id: string) => {
    return eventos.find(e => e.id === id);
  }, [eventos]);

  // Wrapper para ser usado como onClick handler - com animação
  const refetch = useCallback(() => fetchEventos(false, true), [fetchEventos]);

  return {
    eventos,
    loading,
    refreshing,
    lastUpdate,
    refetch,
    getEventoById
  };
}
