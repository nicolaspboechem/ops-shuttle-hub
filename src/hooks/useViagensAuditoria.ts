import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Viagem } from '@/lib/types/viagem';

/**
 * Hook otimizado para abas de auditoria (Motoristas, Veículos, Auditoria).
 * 
 * - Busca TODAS as viagens do evento usando paginação automática (blocos de 1000)
 * - Sem realtime, sem polling (dados históricos)
 * - Cache via useRef por eventoId — carrega 1 vez por sessão
 * - Retorna { viagens, loading, refetch }
 */
export function useViagensAuditoria(eventoId?: string) {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<{ eventoId: string; data: Viagem[] } | null>(null);

  const fetchAll = useCallback(async (force = false) => {
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);

    if (!isValidUUID) {
      setViagens([]);
      setLoading(false);
      return;
    }

    // Return cached data if same eventoId and not forced
    if (!force && cacheRef.current?.eventoId === eventoId) {
      setViagens(cacheRef.current.data);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const PAGE_SIZE = 1000;
      let allData: Viagem[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('viagens')
          .select(`
            *,
            veiculo:veiculos!veiculo_id (nome, placa, tipo_veiculo)
          `)
          .eq('evento_id', eventoId)
          .order('h_pickup', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error('Erro ao buscar viagens (auditoria):', error);
          break;
        }

        allData = allData.concat((data as Viagem[]) || []);
        
        if (!data || data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          offset += PAGE_SIZE;
        }
      }

      // Cache the result
      cacheRef.current = { eventoId, data: allData };
      setViagens(allData);
    } catch (err) {
      console.error('Erro na paginação de viagens (auditoria):', err);
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refetch = useCallback(() => fetchAll(true), [fetchAll]);

  return { viagens, loading, refetch };
}
