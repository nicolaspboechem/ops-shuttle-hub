import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Veiculo } from '@/hooks/useCadastros';

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
  const { toast } = useToast();

  const hoje = format(new Date(), 'yyyy-MM-dd');

  const fetchPresenca = useCallback(async () => {
    if (!eventoId || !motoristaId) {
      setLoading(false);
      return;
    }

    try {
      // Check if event has checkin enabled
      const { data: evento } = await supabase
        .from('eventos')
        .select('habilitar_checkin')
        .eq('id', eventoId)
        .single();

      setCheckinEnabled(evento?.habilitar_checkin || false);

      if (!evento?.habilitar_checkin) {
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

      // Fetch today's presence record
      const { data, error } = await supabase
        .from('motorista_presenca')
        .select('*')
        .eq('motorista_id', motoristaId)
        .eq('evento_id', eventoId)
        .eq('data', hoje)
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
  }, [eventoId, motoristaId, hoje]);

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
      const now = new Date().toISOString();

      // Upsert presence record with vehicle_id
      const { data, error } = await supabase
        .from('motorista_presenca')
        .upsert({
          motorista_id: motoristaId,
          evento_id: eventoId,
          data: hoje,
          checkin_at: now,
          veiculo_id: veiculoId,
        }, {
          onConflict: 'motorista_id,evento_id,data'
        })
        .select()
        .single();

      if (error) throw error;

      // Update driver status to 'disponivel' and set initial location to 'Base'
      await supabase
        .from('motoristas')
        .update({ 
          status: 'disponivel',
          ultima_localizacao: 'Base',
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
      const now = new Date().toISOString();

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
