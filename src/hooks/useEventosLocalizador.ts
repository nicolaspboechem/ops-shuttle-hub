import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventoComLocalizador {
  id: string;
  nome_planilha: string;
  tipo_operacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  descricao: string | null;
  imagem_banner: string | null;
  imagem_logo: string | null;
  habilitar_localizador: boolean;
}

/**
 * Hook para buscar eventos que têm o módulo de localizador habilitado.
 */
export function useEventosLocalizador() {
  const [eventos, setEventos] = useState<EventoComLocalizador[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEventos = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('eventos')
      .select('id, nome_planilha, tipo_operacao, data_inicio, data_fim, descricao, imagem_banner, imagem_logo, habilitar_localizador')
      .eq('status', 'ativo')
      .eq('habilitar_localizador', true)
      .order('data_criacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos com localizador:', error);
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
