import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useServerTime } from '@/hooks/useServerTime';
import { Veiculo } from '@/hooks/useCadastros';
import { getDataOperacional } from '@/lib/utils/diaOperacional';

// Helper function to fetch the base point name for an event
async function fetchBaseName(eventoId: string): Promise<string> {
  const { data } = await supabase
    .from('pontos_embarque')
    .select('nome')
    .eq('evento_id', eventoId)
    .eq('eh_base', true)
    .maybeSingle();
  
  return data?.nome || 'Base';
}

export interface MotoristaPresenca {
  id: string;
  motorista_id: string;
  evento_id: string;
  data: string;
  checkin_at: string | null;
  checkout_at: string | null;
  veiculo_id: string | null;
  observacao_checkout: string | null;
  created_at: string;
  updated_at: string;
}

export interface MotoristaPresencaComVeiculo extends MotoristaPresenca {
  veiculo?: Veiculo | null;
}

export function useMotoristaPresenca(eventoId: string | undefined, motoristaId: string | undefined) {
  const [presenca, setPresenca] = useState<MotoristaPresencaComVeiculo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinEnabled, setCheckinEnabled] = useState(false);
  const [veiculoAtribuido, setVeiculoAtribuido] = useState<Veiculo | null>(null);
  const [horarioVirada, setHorarioVirada] = useState('04:00');
  const { toast } = useToast();
  const { getAgoraSync } = useServerTime();

  // Data operacional considerando o horário de virada
  const getDataHoje = useCallback(() => {
    return getDataOperacional(getAgoraSync(), horarioVirada);
  }, [horarioVirada, getAgoraSync]);

  const fetchPresenca = useCallback(async () => {
    if (!eventoId || !motoristaId) {
      setLoading(false);
      return;
    }

    try {
      // Calculate data operacional with current virada (will be refined after RPC)
      const dataOperacional = getDataOperacional(getAgoraSync(), horarioVirada);

      // Single RPC call replaces 5-6 sequential queries
      const { data: rpcResult, error: rpcError } = await supabase.rpc('get_motorista_presenca', {
        p_evento_id: eventoId,
        p_motorista_id: motoristaId,
        p_data: dataOperacional,
      });

      if (rpcError) throw rpcError;

      if (!rpcResult) {
        setCheckinEnabled(false);
        setLoading(false);
        return;
      }

      const result = rpcResult as any;

      setCheckinEnabled(result.habilitar_missoes || false);

      // Update horario virada from event settings
      const virada = result.horario_virada_dia || '04:00:00';
      const viradaShort = typeof virada === 'string' ? virada.substring(0, 5) : '04:00';
      setHorarioVirada(viradaShort);

      // If virada changed, we may need to recalculate data operacional
      const newDataOperacional = getDataOperacional(getAgoraSync(), viradaShort);
      if (newDataOperacional !== dataOperacional) {
        // Re-fetch with correct date - this is rare (only on first load)
        const { data: rpcResult2 } = await supabase.rpc('get_motorista_presenca', {
          p_evento_id: eventoId,
          p_motorista_id: motoristaId,
          p_data: newDataOperacional,
        });
        if (rpcResult2) {
          const r2 = rpcResult2 as any;
          processRpcResult(r2);
          return;
        }
      }

      if (!result.habilitar_missoes) {
        setLoading(false);
        return;
      }

      processRpcResult(result);
    } catch (error) {
      console.error('Erro ao buscar presença:', error);
    } finally {
      setLoading(false);
    }
  }, [eventoId, motoristaId, getAgoraSync, horarioVirada]);

  // Process result from RPC
  const processRpcResult = useCallback((result: any) => {
    // Set vehicle assigned to driver
    if (result.veiculo) {
      setVeiculoAtribuido(result.veiculo as Veiculo);
    } else {
      setVeiculoAtribuido(null);
    }

    // Determine presence record
    const presencaAtiva = result.presenca_ativa;
    const presencaRecente = result.presenca_recente;
    const data = presencaAtiva || presencaRecente;

    if (data) {
      // If active presence has vehicle, fetch it from the result
      if (data.veiculo_id && data.checkin_at && !data.checkout_at && result.veiculo) {
        setPresenca({ ...data, veiculo: result.veiculo });
      } else {
        setPresenca({ ...data, veiculo: null });
      }
    } else {
      setPresenca(null);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPresenca();
  }, [fetchPresenca]);

  // Realtime subscription + polling fallback for sync
  useEffect(() => {
    if (!eventoId || !motoristaId) return;

    // Realtime subscription para mudanças de presença
    const channel = supabase
      .channel(`presenca-${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motorista_presenca',
          filter: `motorista_id=eq.${motoristaId}`
        },
        () => fetchPresenca()
      )
      .subscribe();

    // Realtime subscription para mudanças no registro do motorista (veiculo_id)
    const motoristaChannel = supabase
      .channel(`motorista-${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'motoristas',
          filter: `id=eq.${motoristaId}`
        },
        () => fetchPresenca()
      )
      .subscribe();

    // Polling fallback (a cada 60s) caso Realtime falhe silenciosamente
    const pollInterval = setInterval(() => {
      fetchPresenca();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(motoristaChannel);
      clearInterval(pollInterval);
    };
  }, [eventoId, motoristaId, fetchPresenca]);

  const realizarCheckin = async () => {
    if (!eventoId || !motoristaId) return false;

    try {
      // Get driver's current assigned vehicle
      const { data: motorista } = await supabase
        .from('motoristas')
        .select('veiculo_id')
        .eq('id', motoristaId)
        .single();

      const veiculoId = motorista?.veiculo_id || null;
      const now = getAgoraSync().toISOString();
      const dataOperacional = getDataHoje();

      // Check if there's already an active record (checkin without checkout)
      const { data: existingActive } = await supabase
        .from('motorista_presenca')
        .select('id')
        .eq('motorista_id', motoristaId)
        .eq('evento_id', eventoId)
        .eq('data', dataOperacional)
        .not('checkin_at', 'is', null)
        .is('checkout_at', null)
        .limit(1)
        .maybeSingle();

      if (existingActive) {
        toast({
          title: 'Check-in já ativo',
          description: 'Você já possui um check-in ativo hoje.',
        });
        return true;
      }

      // INSERT new record (never upsert) — each shift = new record
      const { data, error } = await supabase
        .from('motorista_presenca')
        .insert({
          motorista_id: motoristaId,
          evento_id: eventoId,
          data: dataOperacional,
          checkin_at: now,
          veiculo_id: veiculoId,
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch the dynamic base name for this event
      const baseName = await fetchBaseName(eventoId);

      // Update driver status to 'disponivel' and set initial location to Base
      await supabase
        .from('motoristas')
        .update({ 
          status: 'disponivel',
          ultima_localizacao: baseName,
          ultima_localizacao_at: now
        } as any)
        .eq('id', motoristaId);

      // Fetch vehicle info if exists
      if (veiculoId) {
        const { data: veiculo } = await supabase
          .from('veiculos')
          .select('*')
          .eq('id', veiculoId)
          .single();
        
        setPresenca({ ...data, veiculo });
        setVeiculoAtribuido(veiculo || null);
      } else {
        setPresenca(data);
      }

      toast({
        title: 'Check-in realizado!',
        description: `Você está disponível para o serviço.`,
      });

      return true;
    } catch (error) {
      console.error('Erro ao realizar check-in:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível realizar o check-in.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const realizarCheckout = async (observacao?: string) => {
    if (!eventoId || !motoristaId || !presenca) return false;

    try {
      const now = getAgoraSync().toISOString();

      // Update presence with checkout time and observation
      const { data, error } = await supabase
        .from('motorista_presenca')
        .update({ 
          checkout_at: now,
          observacao_checkout: observacao || null,
        })
        .eq('id', presenca.id)
        .select()
        .single();

      if (error) throw error;

      // Unlink vehicle from driver
      await supabase
        .from('motoristas')
        .update({ 
          status: 'indisponivel',
          veiculo_id: null 
        })
        .eq('id', motoristaId);

      setPresenca({ ...data, veiculo: presenca.veiculo });
      setVeiculoAtribuido(null);
      
      toast({
        title: 'Check-out realizado!',
        description: 'Você finalizou o expediente e o veículo foi desvinculado.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao realizar check-out:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível realizar o check-out.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    presenca,
    loading,
    checkinEnabled,
    veiculoAtribuido,
    realizarCheckin,
    realizarCheckout,
    refetch: fetchPresenca,
  };
}
