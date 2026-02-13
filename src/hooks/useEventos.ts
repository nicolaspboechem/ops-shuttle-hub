import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Evento } from '@/lib/types/viagem';

export function useEventos() {
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
    
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('data_criacao', { ascending: false });

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

    // Debounce realtime updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchEventos(false), 2000);
    };

    // Realtime subscription - atualização em segundo plano
    const channel = supabase
      .channel('eventos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eventos' },
        debouncedFetch
      )
      .subscribe();

    // Polling fallback every 5 minutes - silencioso
    const interval = setInterval(() => fetchEventos(false), 300000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
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
