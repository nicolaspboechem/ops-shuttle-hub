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
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchViagens = useCallback(async (showLoading = false, isManualRefresh = false) => {
    // Validar se eventoId é um UUID válido antes de fazer a query
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (eventoId && !isValidUUID) {
      setViagens([]);
      setLoading(false);
      setRefreshing(false);
      setIsInitialLoad(false);
      return;
    }
    
    // Só mostra loading no carregamento inicial
    if (showLoading) {
      setLoading(true);
    }
    // Mostra refreshing quando é atualização manual
    if (isManualRefresh) {
      setRefreshing(true);
    }

    let query = supabase
      .from('viagens')
      .select(`
        *,
        veiculo:veiculos!veiculo_id (nome, placa, tipo_veiculo)
      `)
      .order('h_pickup', { ascending: true });

    if (eventoId && isValidUUID) {
      query = query.eq('evento_id', eventoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar viagens:', error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setViagens((data as Viagem[]) || []);
    setLastUpdate(new Date());
    setLoading(false);
    setRefreshing(false);
    setIsInitialLoad(false);
  }, [eventoId]);

  useEffect(() => {
    fetchViagens(true); // Carregamento inicial com loading

    // Realtime subscription - atualização em segundo plano
    const channel = supabase
      .channel('viagens-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viagens' },
        () => fetchViagens(false) // Refetch silencioso
      )
      .subscribe();

    // Polling fallback every 5 minutes - silencioso
    const interval = setInterval(() => fetchViagens(false), 300000);

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

  // Wrapper para ser usado como onClick handler - com animação
  const refetch = useCallback(() => fetchViagens(false, true), [fetchViagens]);

  return {
    viagens,
    loading,
    refreshing,
    lastUpdate,
    refetch,
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
