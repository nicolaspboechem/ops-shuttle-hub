import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Veiculo } from '@/hooks/useCadastros';

// Interface própria para o motorista no contexto do localizador
interface MotoristaLocalizador {
  id: string;
  nome: string;
  status: string;
  telefone?: string | null;
  ultima_localizacao?: string | null;
  ultima_localizacao_at?: string | null;
}

export interface VeiculoComRota extends Omit<Veiculo, 'motorista'> {
  motorista_localizador?: MotoristaLocalizador | null;
  em_rota: boolean;
  viagem?: {
    id: string;
    origem: string;
    destino: string;
    h_inicio_real: string;
    tempo_em_rota: number; // minutos
  };
  ultima_localizacao: string | null;
  ultima_localizacao_at: string | null;
}

export interface VeiculosPorLocalizacao {
  [localizacao: string]: VeiculoComRota[];
}

export function useLocalizadorVeiculos(eventoId: string | undefined) {
  const [veiculos, setVeiculos] = useState<VeiculoComRota[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVeiculos = useCallback(async () => {
    if (!eventoId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch veiculos with status liberado or pendente (ativos na operação)
      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select('*')
        .eq('evento_id', eventoId)
        .eq('ativo', true)
        .in('status', ['liberado', 'pendente'])
        .order('nome');

      if (veiculosError) throw veiculosError;

      // Fetch all motoristas to map (includes ultima_localizacao fields from DB)
      const { data: motoristasData } = await supabase
        .from('motoristas')
        .select('id, nome, status, telefone, veiculo_id, ultima_localizacao, ultima_localizacao_at')
        .eq('evento_id', eventoId)
        .eq('ativo', true);

      // Create map by veiculo_id (motorista -> veiculo)
      const motoristasPorVeiculo = new Map<string, MotoristaLocalizador>();
      motoristasData?.forEach(m => {
        if (m.veiculo_id) {
          motoristasPorVeiculo.set(m.veiculo_id, {
            id: m.id,
            nome: m.nome,
            status: m.status || 'disponivel',
            telefone: m.telefone,
            ultima_localizacao: m.ultima_localizacao,
            ultima_localizacao_at: m.ultima_localizacao_at,
          });
        }
      });

      // Fetch active trips to get route info
      const { data: viagensAtivas } = await supabase
        .from('viagens')
        .select('id, motorista_id, veiculo_id, ponto_embarque, ponto_desembarque, h_inicio_real')
        .eq('evento_id', eventoId)
        .eq('status', 'em_andamento')
        .eq('encerrado', false);

      // Create map by veiculo_id
      const viagensPorVeiculo = new Map<string, {
        id: string;
        origem: string;
        destino: string;
        h_inicio_real: string;
      }>();
      
      viagensAtivas?.forEach(v => {
        if (v.veiculo_id) {
          viagensPorVeiculo.set(v.veiculo_id, {
            id: v.id,
            origem: v.ponto_embarque || '',
            destino: v.ponto_desembarque || '',
            h_inicio_real: v.h_inicio_real || '',
          });
        }
      });

      // Combine data
      const veiculosComRota: VeiculoComRota[] = (veiculosData || []).map(v => {
        const motorista = motoristasPorVeiculo.get(v.id);
        const viagem = viagensPorVeiculo.get(v.id);
        
        // Calculate tempo em rota
        let tempo_em_rota = 0;
        if (viagem?.h_inicio_real) {
          const inicio = new Date(viagem.h_inicio_real);
          tempo_em_rota = Math.floor((Date.now() - inicio.getTime()) / 60000);
        }

        return {
          ...v,
          motorista_localizador: motorista || null,
          em_rota: !!viagem,
          viagem: viagem ? {
            ...viagem,
            tempo_em_rota,
          } : undefined,
          ultima_localizacao: motorista?.ultima_localizacao || null,
          ultima_localizacao_at: motorista?.ultima_localizacao_at || null,
        };
      });

      setVeiculos(veiculosComRota);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  // Initial fetch
  useEffect(() => {
    fetchVeiculos();
  }, [fetchVeiculos]);

  // Refetch when tab becomes visible again (Chrome suspends timers/WebSocket)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && eventoId) {
        fetchVeiculos();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [eventoId, fetchVeiculos]);

  // Realtime subscription with debounce
  useEffect(() => {
    if (!eventoId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchVeiculos(), 3000);
    };

    const channel = supabase
      .channel(`localizador-veiculos-${eventoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'veiculos',
          filter: `evento_id=eq.${eventoId}`,
        },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motoristas',
          filter: `evento_id=eq.${eventoId}`,
        },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viagens',
          filter: `evento_id=eq.${eventoId}`,
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [eventoId, fetchVeiculos]);

  // Group veiculos by location
  const veiculosPorLocalizacao = useMemo(() => {
    const grupos: VeiculosPorLocalizacao = {
      'em_rota': [],
      'sem_motorista': [],
      'sem_local': [],
    };

    veiculos.forEach(v => {
      // Vehicles in route go to special column
      if (v.em_rota) {
        grupos['em_rota'].push(v);
      }
      // Vehicles without driver
      else if (!v.motorista_localizador) {
        grupos['sem_motorista'].push(v);
      }
      // Vehicles without location
      else if (!v.ultima_localizacao) {
        grupos['sem_local'].push(v);
      }
      // Group by location
      else {
        if (!grupos[v.ultima_localizacao]) {
          grupos[v.ultima_localizacao] = [];
        }
        grupos[v.ultima_localizacao].push(v);
      }
    });

    return grupos;
  }, [veiculos]);

  // Get unique locations (excluding special columns)
  const localizacoes = useMemo(() => {
    return Object.keys(veiculosPorLocalizacao)
      .filter(loc => 
        loc !== 'em_rota' && 
        loc !== 'sem_motorista' && 
        loc !== 'sem_local' && 
        veiculosPorLocalizacao[loc].length > 0
      )
      .sort();
  }, [veiculosPorLocalizacao]);

  return {
    veiculos,
    veiculosPorLocalizacao,
    localizacoes,
    loading,
    refetch: fetchVeiculos,
  };
}
