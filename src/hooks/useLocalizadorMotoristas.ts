import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Motorista, Veiculo } from '@/hooks/useCadastros';

export interface MotoristaComVeiculo extends Motorista {
  veiculo?: Veiculo | null;
  ultima_localizacao?: string | null;
  ultima_localizacao_at?: string | null;
  viagem_destino?: string | null;
}

export interface MotoristasPorLocalizacao {
  [localizacao: string]: MotoristaComVeiculo[];
}

export function useLocalizadorMotoristas(eventoId: string | undefined) {
  const [motoristas, setMotoristas] = useState<MotoristaComVeiculo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMotoristas = useCallback(async () => {
    if (!eventoId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch motoristas with their vehicles
      const { data: motoristasData, error: motoristasError } = await supabase
        .from('motoristas')
        .select('*')
        .eq('evento_id', eventoId)
        .order('nome');

      if (motoristasError) throw motoristasError;

      // Fetch all vehicles for this event to map
      const { data: veiculosData } = await supabase
        .from('veiculos')
        .select('*')
        .eq('evento_id', eventoId);

      const veiculosMap = new Map(veiculosData?.map(v => [v.id, v]) || []);

      // Fetch active trips to get destinations for drivers in transit
      const { data: viagensAtivas } = await supabase
        .from('viagens')
        .select('motorista, ponto_desembarque')
        .eq('evento_id', eventoId)
        .eq('status', 'em_andamento')
        .eq('encerrado', false);

      const destinosPorMotorista = new Map(
        viagensAtivas?.map(v => [v.motorista, v.ponto_desembarque]) || []
      );

      // Combine data
      const motoristasComVeiculos: MotoristaComVeiculo[] = (motoristasData || []).map(m => ({
        ...m,
        veiculo: m.veiculo_id ? veiculosMap.get(m.veiculo_id) || null : null,
        viagem_destino: destinosPorMotorista.get(m.nome) || null,
      }));

      setMotoristas(motoristasComVeiculos);
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  // Initial fetch
  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  // Realtime subscription
  useEffect(() => {
    if (!eventoId) return;

    const channel = supabase
      .channel('localizador-motoristas')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motoristas',
          filter: `evento_id=eq.${eventoId}`,
        },
        () => {
          fetchMotoristas();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viagens',
          filter: `evento_id=eq.${eventoId}`,
        },
        () => {
          fetchMotoristas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventoId, fetchMotoristas]);

  // Group motoristas by location
  const motoristasPorLocalizacao = useMemo(() => {
    const grupos: MotoristasPorLocalizacao = {
      'em_transito': [],
      'sem_local': [],
    };

    motoristas.forEach(m => {
      // Drivers in transit go to special column
      if (m.status === 'em_viagem') {
        grupos['em_transito'].push(m);
      } 
      // Drivers without location or inactive
      else if (!m.ultima_localizacao) {
        grupos['sem_local'].push(m);
      } 
      // Group by location
      else {
        if (!grupos[m.ultima_localizacao]) {
          grupos[m.ultima_localizacao] = [];
        }
        grupos[m.ultima_localizacao].push(m);
      }
    });

    return grupos;
  }, [motoristas]);

  // Get unique locations (excluding special columns)
  const localizacoes = useMemo(() => {
    return Object.keys(motoristasPorLocalizacao)
      .filter(loc => loc !== 'em_transito' && loc !== 'sem_local' && motoristasPorLocalizacao[loc].length > 0)
      .sort();
  }, [motoristasPorLocalizacao]);

  return {
    motoristas,
    motoristasPorLocalizacao,
    localizacoes,
    loading,
    refetch: fetchMotoristas,
  };
}
