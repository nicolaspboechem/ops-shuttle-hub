import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useServerTime } from '@/hooks/useServerTime';

export interface ViagemPublica {
  id: string;
  motorista: string;
  ponto_embarque: string | null;
  tipo_operacao: string;
  tipo_veiculo: string | null;
  h_pickup: string | null;
  status: string | null;
  qtd_pax: number | null;
}

export function useViagensPublicas(eventoId: string | null) {
  const [viagens, setViagens] = useState<ViagemPublica[]>([]);
  const [loading, setLoading] = useState(true);
  const { getAgoraSync } = useServerTime();
  
  // Use ref to avoid dependency issues with getAgoraSync
  const getAgoraSyncRef = useRef(getAgoraSync);
  getAgoraSyncRef.current = getAgoraSync;

  const fetchViagens = useCallback(async () => {
    if (!eventoId) {
      setViagens([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get today's date using synchronized server time
    const agora = getAgoraSyncRef.current();
    const hoje = format(agora, 'yyyy-MM-dd');
    const todayStart = `${hoje}T00:00:00`;
    const todayEnd = `${hoje}T23:59:59`;

    const { data, error } = await supabase
      .from('viagens')
      .select('id, motorista, ponto_embarque, tipo_operacao, tipo_veiculo, h_pickup, status, qtd_pax')
      .eq('evento_id', eventoId)
      .gte('data_criacao', todayStart)
      .lt('data_criacao', todayEnd)
      .in('status', ['agendado', 'em_andamento'])
      .order('h_pickup', { ascending: true });

    if (error) {
      console.error('Erro ao buscar viagens públicas:', error);
      setLoading(false);
      return;
    }

    setViagens(data || []);
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchViagens();

    // Realtime subscription with debounce
    if (eventoId) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const debouncedFetch = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchViagens(), 2000); // 2s debounce
      };

      const channel = supabase
        .channel(`viagens-publicas-${eventoId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'viagens', filter: `evento_id=eq.${eventoId}` },
          debouncedFetch
        )
        .subscribe();

      // Refresh every 90 seconds (was 30s - too aggressive)
      const interval = setInterval(fetchViagens, 90000);

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [eventoId, fetchViagens]);

  return { viagens, loading, refetch: fetchViagens };
}
