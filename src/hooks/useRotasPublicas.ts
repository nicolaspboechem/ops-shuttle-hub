import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RotaPublica {
  id: string;
  nome: string;
  origem: string;
  destino: string;
  frequencia_minutos: number | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  observacoes: string | null;
}

export function useRotasPublicas(eventoId: string | null) {
  const [rotas, setRotas] = useState<RotaPublica[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRotas = useCallback(async () => {
    if (!eventoId) {
      setRotas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('rotas_shuttle')
      .select('id, nome, origem, destino, frequencia_minutos, horario_inicio, horario_fim, observacoes')
      .eq('evento_id', eventoId)
      .eq('ativo', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar rotas públicas:', error);
    }

    setRotas(data || []);
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchRotas();
  }, [fetchRotas]);

  return { rotas, loading, refetch: fetchRotas };
}
