import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventoPublico {
  id: string;
  nome_planilha: string;
  tipo_operacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
}

export function useEventosPublicos() {
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEventos = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('eventos')
      .select('id, nome_planilha, tipo_operacao, data_inicio, data_fim')
      .eq('status', 'ativo')
      .eq('visivel_publico', true)
      .order('data_criacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos públicos:', error);
      setLoading(false);
      return;
    }

    setEventos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  return { eventos, loading, refetch: fetchEventos };
}
