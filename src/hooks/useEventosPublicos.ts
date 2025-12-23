import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventoPublico {
  id: string;
  nome_planilha: string;
  tipo_operacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  descricao: string | null;
  imagem_banner: string | null;
  imagem_logo: string | null;
  rotas_count?: number;
}

export function useEventosPublicos() {
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEventos = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('eventos')
      .select('id, nome_planilha, tipo_operacao, data_inicio, data_fim, descricao, imagem_banner, imagem_logo')
      .eq('status', 'ativo')
      .eq('visivel_publico', true)
      .order('data_criacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos públicos:', error);
      setLoading(false);
      return;
    }

    // Fetch rotas count for each evento
    const eventosWithRotas = await Promise.all(
      (data || []).map(async (evento) => {
        const { count } = await supabase
          .from('rotas_shuttle')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id)
          .eq('ativo', true);
        
        return { ...evento, rotas_count: count || 0 };
      })
    );

    setEventos(eventosWithRotas);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  return { eventos, loading, refetch: fetchEventos };
}
