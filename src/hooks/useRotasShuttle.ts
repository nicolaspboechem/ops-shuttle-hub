import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RotaShuttle {
  id: string;
  evento_id: string;
  nome: string;
  origem: string;
  destino: string;
  frequencia_minutos: number | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export interface RotaShuttleInput {
  nome: string;
  origem: string;
  destino: string;
  frequencia_minutos?: number | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
}

export function useRotasShuttle(eventoId: string | undefined) {
  const [rotas, setRotas] = useState<RotaShuttle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRotas = useCallback(async () => {
    if (!eventoId) {
      setRotas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('rotas_shuttle')
      .select('*')
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar rotas:', error);
      toast.error('Erro ao carregar rotas');
    } else {
      setRotas(data || []);
    }
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchRotas();
  }, [fetchRotas]);

  const createRota = async (input: RotaShuttleInput) => {
    if (!eventoId) return null;

    const { data, error } = await supabase
      .from('rotas_shuttle')
      .insert({
        evento_id: eventoId,
        ...input,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar rota:', error);
      toast.error('Erro ao criar rota');
      return null;
    }

    toast.success('Rota criada com sucesso');
    fetchRotas();
    return data;
  };

  const updateRota = async (id: string, input: Partial<RotaShuttleInput>) => {
    const { data, error } = await supabase
      .from('rotas_shuttle')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar rota:', error);
      toast.error('Erro ao atualizar rota');
      return null;
    }

    toast.success('Rota atualizada');
    fetchRotas();
    return data;
  };

  const deleteRota = async (id: string) => {
    const { error } = await supabase
      .from('rotas_shuttle')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir rota:', error);
      toast.error('Erro ao excluir rota');
      return false;
    }

    toast.success('Rota excluída');
    fetchRotas();
    return true;
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    return updateRota(id, { ativo });
  };

  return {
    rotas,
    loading,
    refetch: fetchRotas,
    createRota,
    updateRota,
    deleteRota,
    toggleAtivo,
  };
}
