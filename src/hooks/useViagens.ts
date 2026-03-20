import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Viagem } from '@/lib/types/viagem';
import { 
  calcularKPIsDashboard, 
  calcularMetricasPorHora, 
  calcularMetricasMotorista 
} from '@/lib/utils/calculadores';
import { getLimitesDiaOperacional } from '@/lib/utils/diaOperacional';
import { createThrottledRefetch, clearThrottleKey } from '@/lib/utils/refetchThrottle';

export interface UseViagensOptions {
  dataOperacional?: string;  // "YYYY-MM-DD"
  horarioVirada?: string;    // "HH:mm" (default: "04:00")
  tipoOperacao?: string;     // "shuttle", "transfer", etc. - filtra no banco
}

export function useViagens(eventoId?: string, options?: UseViagensOptions) {
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

    // Filtro por tipo de operação
    if (options?.tipoOperacao) {
      query = query.eq('tipo_operacao', options.tipoOperacao);
    }

    // Filtro por dia operacional
    if (options?.dataOperacional) {
      const { inicio, fim } = getLimitesDiaOperacional(
        options.dataOperacional,
        options.horarioVirada || '04:00'
      );
      query = query
        .gte('data_criacao', inicio.toISOString())
        .lte('data_criacao', fim.toISOString());
    }

    const { data, error } = await query.limit(500);

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
  }, [eventoId, options?.dataOperacional, options?.horarioVirada, options?.tipoOperacao]);

  useEffect(() => {
    fetchViagens(true); // Carregamento inicial com loading

    // Realtime subscription - atualização em segundo plano
    // Realtime filtrado por evento_id (se disponível) para evitar cross-talk entre eventos
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);

    // Supabase Realtime only supports ONE filter per subscription
    // Use evento_id as the primary filter (most selective), then filter tipo_operacao client-side via throttled refetch
    const channelConfig = isValidUUID
      ? { event: '*' as const, schema: 'public' as const, table: 'viagens' as const, filter: `evento_id=eq.${eventoId}` }
      : { event: '*' as const, schema: 'public' as const, table: 'viagens' as const };

    // Global throttled refetch to prevent cascade
    const throttleKey = `useViagens-${eventoId || 'all'}`;
    const throttledFetch = createThrottledRefetch(throttleKey, () => fetchViagens(false), 5000);

    const channel = supabase
      .channel(`viagens-changes-${eventoId || 'all'}`)
      .on('postgres_changes', channelConfig, throttledFetch)
      .subscribe();

    // Polling fallback every 60 seconds
    const interval = setInterval(() => fetchViagens(false), 60000);

    // Refresh immediately when returning from background
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchViagens(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearThrottleKey(throttleKey);
      supabase.removeChannel(channel);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchViagens]);

  const updateViagem = useCallback(async (updated: Viagem) => {
    const { error } = await supabase
      .from('viagens')
      .update({
        qtd_pax: updated.qtd_pax,
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

/**
 * Hook otimizado para o app do motorista - carrega apenas viagens do motorista logado
 * com realtime filtrado por motorista_id (evita cascade de refetch em todos os motoristas)
 */
export function useViagensPorMotorista(eventoId?: string, motoristaId?: string) {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchViagens = useCallback(async (showLoading = false, isManualRefresh = false) => {
    const isValidUUID = (id?: string) => id && id.length >= 36 && /^[0-9a-f-]{36}$/i.test(id);
    
    if (!isValidUUID(eventoId) || !isValidUUID(motoristaId)) {
      setViagens([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    if (showLoading) setLoading(true);
    if (isManualRefresh) setRefreshing(true);

    const { data, error } = await supabase
      .from('viagens')
      .select(`
        *,
        veiculo:veiculos!veiculo_id (nome, placa, tipo_veiculo)
      `)
      .eq('evento_id', eventoId!)
      .eq('motorista_id', motoristaId!)
      .order('h_pickup', { ascending: true });

    if (error) {
      console.error('Erro ao buscar viagens do motorista:', error);
    } else {
      setViagens((data as Viagem[]) || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [eventoId, motoristaId]);

  useEffect(() => {
    fetchViagens(true);

    const isValidUUID = (id?: string) => id && id.length >= 36 && /^[0-9a-f-]{36}$/i.test(id);
    if (!isValidUUID(eventoId) || !isValidUUID(motoristaId)) return;

    // Realtime filtrado por motorista_id - só dispara quando a viagem é deste motorista
    const channel = supabase
      .channel(`viagens-motorista-${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viagens',
          filter: `motorista_id=eq.${motoristaId}`,
        },
        () => fetchViagens(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchViagens, eventoId, motoristaId]);

  const refetch = useCallback(() => fetchViagens(false, true), [fetchViagens]);

  return { viagens, loading, refreshing, refetch };
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
    return viagens.filter(v => v.status !== 'encerrado' && v.status !== 'cancelado');
  }, [viagens]);

  const viagensFinalizadas = useMemo(() => {
    return viagens.filter(v => v.status === 'encerrado' || v.status === 'cancelado');
  }, [viagens]);

  return {
    kpis,
    metricasPorHora,
    motoristas,
    viagensAtivas,
    viagensFinalizadas
  };
}
