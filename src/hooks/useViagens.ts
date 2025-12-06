import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Viagem } from '@/lib/types/viagem';
import { 
  calcularKPIsDashboard, 
  calcularMetricasPorHora, 
  calcularMetricasMotorista 
} from '@/lib/utils/calculadores';

export function useViagens(eventoId?: string) {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchViagens = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('viagens')
      .select('*')
      .order('h_pickup', { ascending: true });

    if (eventoId) {
      query = query.eq('evento_id', eventoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar viagens:', error);
      setLoading(false);
      return;
    }

    setViagens(data || []);
    setLastUpdate(new Date());
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchViagens();

    // Realtime subscription
    const channel = supabase
      .channel('viagens-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viagens' },
        () => fetchViagens()
      )
      .subscribe();

    // Polling fallback every 30 seconds
    const interval = setInterval(fetchViagens, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchViagens]);

  const updateViagem = useCallback(async (updated: Viagem) => {
    const { error } = await supabase
      .from('viagens')
      .update({
        h_chegada: updated.h_chegada,
        h_retorno: updated.h_retorno,
        qtd_pax_retorno: updated.qtd_pax_retorno,
        encerrado: updated.encerrado,
        observacao: updated.observacao
      })
      .eq('id', updated.id);

    if (error) {
      console.error('Erro ao atualizar viagem:', error);
      throw error;
    }

    // Atualizar estado local otimisticamente
    setViagens(prev => 
      prev.map(v => v.id === updated.id ? updated : v)
    );
  }, []);

  return {
    viagens,
    loading,
    lastUpdate,
    refetch: fetchViagens,
    updateViagem
  };
}

export function useCalculos(viagens: Viagem[]) {
  const kpis = useMemo(() => {
    if (viagens.length === 0) return null;
    return calcularKPIsDashboard(viagens);
  }, [viagens]);

  const metricasPorHora = useMemo(() => {
    return calcularMetricasPorHora(viagens);
  }, [viagens]);

  const motoristas = useMemo(() => {
    const uniqueMotoristas = [...new Set(viagens.map(v => v.motorista))];
    return uniqueMotoristas.map(m => calcularMetricasMotorista(m, viagens));
  }, [viagens]);

  const viagensAtivas = useMemo(() => {
    return viagens.filter(v => !v.encerrado);
  }, [viagens]);

  const viagensFinalizadas = useMemo(() => {
    return viagens.filter(v => v.encerrado);
  }, [viagens]);

  return {
    kpis,
    metricasPorHora,
    motoristas,
    viagensAtivas,
    viagensFinalizadas
  };
}
