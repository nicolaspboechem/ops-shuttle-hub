import { useState, useEffect, useCallback } from 'react';
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

  const fetchViagens = useCallback(async () => {
    if (!eventoId) {
      setViagens([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get today's date using synchronized server time
    const agora = getAgoraSync();
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

    // Realtime subscription
    if (eventoId) {
      const channel = supabase
        .channel('viagens-publicas-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'viagens', filter: `evento_id=eq.${eventoId}` },
          () => fetchViagens()
        )
        .subscribe();

      // Refresh every 30 seconds
      const interval = setInterval(fetchViagens, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [eventoId, fetchViagens]);

  return { viagens, loading, refetch: fetchViagens };
}
