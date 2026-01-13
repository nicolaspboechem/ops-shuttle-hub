import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface MotoristaPresenca {
  id: string;
  motorista_id: string;
  evento_id: string;
  data: string;
  checkin_at: string | null;
  checkout_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMotoristaPresenca(eventoId: string | undefined, motoristaId: string | undefined) {
  const [presenca, setPresenca] = useState<MotoristaPresenca | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinEnabled, setCheckinEnabled] = useState(false);
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

      // Fetch today's presence record
      const { data, error } = await supabase
        .from('motorista_presenca')
        .select('*')
        .eq('motorista_id', motoristaId)
        .eq('evento_id', eventoId)
        .eq('data', hoje)
        .maybeSingle();

      if (error) throw error;
      setPresenca(data);
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
      const now = new Date().toISOString();

      // Upsert presence record
      const { data, error } = await supabase
        .from('motorista_presenca')
        .upsert({
          motorista_id: motoristaId,
          evento_id: eventoId,
          data: hoje,
          checkin_at: now,
        }, {
          onConflict: 'motorista_id,evento_id,data'
        })
        .select()
        .single();

      if (error) throw error;

      // Update driver status to 'disponivel'
      await supabase
        .from('motoristas')
        .update({ status: 'disponivel' })
        .eq('id', motoristaId);

      setPresenca(data);
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

  const realizarCheckout = async () => {
    if (!eventoId || !motoristaId || !presenca) return false;

    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('motorista_presenca')
        .update({ checkout_at: now })
        .eq('id', presenca.id)
        .select()
        .single();

      if (error) throw error;

      // Update driver status to 'indisponivel'
      await supabase
        .from('motoristas')
        .update({ status: 'indisponivel' })
        .eq('id', motoristaId);

      setPresenca(data);
      toast({
        title: 'Check-out realizado!',
        description: 'Você finalizou o expediente.',
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
    realizarCheckin,
    realizarCheckout,
    refetch: fetchPresenca,
  };
}
