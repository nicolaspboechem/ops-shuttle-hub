import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAlertasFrotaConsolidado(eventoId?: string) {
  const [totais, setTotais] = useState({ total: 0, resolvidos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventoId) { setLoading(false); return; }

    const fetch = async () => {
      const { count: total } = await supabase
        .from('alertas_frota')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventoId);

      const { count: resolvidos } = await supabase
        .from('alertas_frota')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventoId)
        .eq('status', 'resolvido');

      setTotais({ total: total || 0, resolvidos: resolvidos || 0 });
      setLoading(false);
    };
    fetch();
  }, [eventoId]);

  return { ...totais, loading };
}
