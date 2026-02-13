import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MotoristasDashboardData {
  online: number;
  disponiveis: number;
  emTransito: number;
  loading: boolean;
}

export function useMotoristasDashboard(
  eventoId: string | undefined,
  dataOperacional: string,
  motoristasEmViagem: Set<string> // motorista_ids com viagem ativa
): MotoristasDashboardData {
  const [presencaIds, setPresencaIds] = useState<string[]>([]);
  const [missoesAtivas, setMissoesAtivas] = useState<{ motorista_id: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!eventoId) {
      setLoading(false);
      return;
    }

    try {
      const [presencaRes, missoesRes] = await Promise.all([
        supabase
          .from('motorista_presenca')
          .select('motorista_id')
          .eq('evento_id', eventoId)
          .eq('data', dataOperacional)
          .not('checkin_at', 'is', null)
          .is('checkout_at', null),
        supabase
          .from('missoes')
          .select('motorista_id, status')
          .eq('evento_id', eventoId)
          .in('status', ['pendente', 'aceita', 'em_andamento']),
      ]);

      setPresencaIds((presencaRes.data || []).map(p => p.motorista_id));
      setMissoesAtivas(missoesRes.data || []);
    } catch (err) {
      console.error('[useMotoristasDashboard] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [eventoId, dataOperacional]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions with debounce
  useEffect(() => {
    if (!eventoId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchData(), 2000);
    };

    const channel = supabase
      .channel(`dashboard-motoristas-${eventoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'motorista_presenca',
        filter: `evento_id=eq.${eventoId}`,
      }, debouncedFetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'missoes',
        filter: `evento_id=eq.${eventoId}`,
      }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [eventoId, fetchData]);

  const result = useMemo(() => {
    const onlineSet = new Set(presencaIds);
    const online = onlineSet.size;

    // Em trânsito: online + (missão em_andamento OU viagem ativa)
    const emTransitoIds = new Set<string>();
    missoesAtivas
      .filter(m => m.status === 'em_andamento')
      .forEach(m => {
        if (onlineSet.has(m.motorista_id)) emTransitoIds.add(m.motorista_id);
      });
    motoristasEmViagem.forEach(id => {
      if (onlineSet.has(id)) emTransitoIds.add(id);
    });

    // Ocupados (missão pendente/aceita, não em trânsito)
    const ocupadosIds = new Set<string>();
    missoesAtivas
      .filter(m => m.status === 'pendente' || m.status === 'aceita')
      .forEach(m => {
        if (onlineSet.has(m.motorista_id) && !emTransitoIds.has(m.motorista_id)) {
          ocupadosIds.add(m.motorista_id);
        }
      });

    const disponiveis = online - emTransitoIds.size - ocupadosIds.size;

    return { online, disponiveis: Math.max(0, disponiveis), emTransito: emTransitoIds.size, loading };
  }, [presencaIds, missoesAtivas, motoristasEmViagem, loading]);

  return result;
}
