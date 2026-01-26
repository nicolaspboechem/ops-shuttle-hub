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
      // Check if event has missoes (and thus check-in) enabled and get virada time
      const { data: evento } = await supabase
        .from('eventos')
        .select('habilitar_missoes, horario_virada_dia')
        .eq('id', eventoId)
        .single();

      setCheckinEnabled(evento?.habilitar_missoes || false);
      
      // Set horario virada from event settings
      const virada = evento?.horario_virada_dia || '04:00:00';
      setHorarioVirada(virada.substring(0, 5));
      
      // Calculate data operacional with the fetched virada time
      const dataOperacional = getDataOperacional(getAgoraSync(), virada.substring(0, 5));

      if (!evento?.habilitar_missoes) {
        setLoading(false);
        return;
      }

      // Fetch driver's assigned vehicle
      const { data: motorista } = await supabase
        .from('motoristas')
        .select('veiculo_id')
        .eq('id', motoristaId)
        .single();

      if (motorista?.veiculo_id) {
        const { data: veiculo } = await supabase
          .from('veiculos')
          .select('*')
          .eq('id', motorista.veiculo_id)
          .single();
        
        setVeiculoAtribuido(veiculo || null);
      } else {
        setVeiculoAtribuido(null);
      }

      // Fetch today's presence record using operational date
      const { data, error } = await supabase
        .from('motorista_presenca')
        .select('*')
        .eq('motorista_id', motoristaId)
        .eq('evento_id', eventoId)
        .eq('data', dataOperacional)
        .maybeSingle();

      if (error) throw error;
      
      // If presence has a vehicle, fetch it
      if (data?.veiculo_id) {
        const { data: veiculoPresenca } = await supabase
          .from('veiculos')
          .select('*')
          .eq('id', data.veiculo_id)
          .single();
        
        setPresenca({ ...data, veiculo: veiculoPresenca });
      } else {
        setPresenca(data);
      }
    } catch (error) {
      console.error('Erro ao buscar presença:', error);
    } finally {
      setLoading(false);
    }
  }, [eventoId, motoristaId, getAgoraSync]);

  useEffect(() => {
    fetchPresenca();
  }, [fetchPresenca]);

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

      // Upsert presence record with vehicle_id
      const { data, error } = await supabase
        .from('motorista_presenca')
        .upsert({
          motorista_id: motoristaId,
          evento_id: eventoId,
          data: dataOperacional,
          checkin_at: now,
          veiculo_id: veiculoId,
        }, {
          onConflict: 'motorista_id,evento_id,data'
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
