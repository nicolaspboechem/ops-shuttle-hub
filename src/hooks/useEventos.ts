import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Evento } from '@/lib/types/viagem';

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('data_criacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      setLoading(false);
      return;
    }

    setEventos(data || []);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEventos();

    // Realtime subscription
    const channel = supabase
      .channel('eventos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eventos' },
        () => fetchEventos()
      )
      .subscribe();

    // Polling fallback every 30 seconds
    const interval = setInterval(fetchEventos, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchEventos]);

  const getEventoById = useCallback((id: string) => {
    return eventos.find(e => e.id === id);
  }, [eventos]);

  return {
    eventos,
    loading,
    lastUpdate,
    refetch: fetchEventos,
    getEventoById
  };
}
