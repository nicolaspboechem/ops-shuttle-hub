import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Motorista, Veiculo } from '@/hooks/useCadastros';
import { getDataOperacional } from '@/lib/utils/diaOperacional';

export interface MotoristaComVeiculo extends Motorista {
  veiculo?: Veiculo | null;
  ultima_localizacao?: string | null;
  ultima_localizacao_at?: string | null;
  viagem_origem?: string | null;
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
      // 1. Buscar configuração do evento (horário de virada)
      const { data: evento } = await supabase
        .from('eventos')
        .select('horario_virada_dia')
        .eq('id', eventoId)
        .single();
      
      const horarioVirada = evento?.horario_virada_dia?.substring(0, 5) || '04:00';
      const dataOperacional = getDataOperacional(new Date(), horarioVirada);

      // 2. Buscar presenças do dia com check-in ativo (sem checkout)
      const { data: presencasAtivas } = await supabase
        .from('motorista_presenca')
        .select('motorista_id')
        .eq('evento_id', eventoId)
        .eq('data', dataOperacional)
        .not('checkin_at', 'is', null)
        .is('checkout_at', null);

      // Criar Set de IDs de motoristas com check-in ativo
      const motoristasComCheckinAtivo = new Set(
        presencasAtivas?.map(p => p.motorista_id) || []
      );

      // 3. Buscar motoristas
      const { data: motoristasData, error: motoristasError } = await supabase
        .from('motoristas')
        .select('*')
        .eq('evento_id', eventoId)
        .order('nome');

      if (motoristasError) throw motoristasError;

      // 4. Filtrar apenas motoristas com check-in ativo
      const motoristasFiltrados = (motoristasData || [])
        .filter(m => motoristasComCheckinAtivo.has(m.id));

      // Fetch all vehicles for this event to map
      const { data: veiculosData } = await supabase
        .from('veiculos')
        .select('*')
        .eq('evento_id', eventoId);

      const veiculosMap = new Map(veiculosData?.map(v => [v.id, v]) || []);

      // Fetch active trips to get destinations for drivers in transit
      const { data: viagensAtivas } = await supabase
        .from('viagens')
        .select('motorista_id, motorista, ponto_embarque, ponto_desembarque')
        .eq('evento_id', eventoId)
        .eq('status', 'em_andamento')
        .eq('encerrado', false);

      // Criar mapa por motorista_id (prioridade) ou nome (fallback)
      const viagensPorMotoristaId = new Map<string, { origem: string; destino: string }>();
      const viagensPorMotorista = new Map<string, { origem: string; destino: string }>();
      
      viagensAtivas?.forEach(v => {
        const rotaInfo = { 
          origem: v.ponto_embarque || '', 
          destino: v.ponto_desembarque || '' 
        };
        if (v.motorista_id) {
          viagensPorMotoristaId.set(v.motorista_id, rotaInfo);
        }
        if (v.motorista) {
          viagensPorMotorista.set(v.motorista, rotaInfo);
        }
      });

      // Combine data - using filtered motoristas
      const motoristasComVeiculos: MotoristaComVeiculo[] = motoristasFiltrados.map(m => {
        const viagemInfo = viagensPorMotoristaId.get(m.id) || viagensPorMotorista.get(m.nome);
        return {
          ...m,
          veiculo: m.veiculo_id ? veiculosMap.get(m.veiculo_id) || null : null,
          viagem_origem: viagemInfo?.origem || null,
          viagem_destino: viagemInfo?.destino || null,
        };
      });

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motorista_presenca',
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
