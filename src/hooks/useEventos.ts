import { useState, useEffect, useCallback } from 'react';
import { Evento } from '@/lib/types/viagem';
import { gerarEventosDemo } from '@/lib/data/mock-eventos';

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchEventos = useCallback(() => {
    // Simulating API call with mock data
    // In production, this would fetch from Supabase
    setEventos(gerarEventosDemo());
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEventos();

    // Polling every 30 seconds
    const interval = setInterval(fetchEventos, 30000);

    return () => {
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
