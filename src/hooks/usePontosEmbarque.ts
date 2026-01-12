import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

export interface PontoEmbarque {
  id: string;
  evento_id: string;
  nome: string;
  endereco: string | null;
  observacao: string | null;
  ativo: boolean;
  criado_por: string | null;
  atualizado_por: string | null;
  created_at: string;
  data_atualizacao: string;
}

export interface PontoEmbarqueInput {
  nome: string;
  endereco?: string | null;
  observacao?: string | null;
  ativo?: boolean;
}

export function usePontosEmbarque(eventoId: string | undefined) {
  const { user } = useAuth();
  const [pontos, setPontos] = useState<PontoEmbarque[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPontos = useCallback(async () => {
    // Validar se eventoId é um UUID válido antes de fazer a query
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (!isValidUUID) {
      setPontos([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('pontos_embarque')
      .select('*')
      .eq('evento_id', eventoId)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar pontos:', error);
    } else {
      setPontos(data || []);
    }
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchPontos();
  }, [fetchPontos]);

  const createPonto = async (input: PontoEmbarqueInput) => {
    if (!eventoId) return null;

    const { data, error } = await supabase
      .from('pontos_embarque')
      .insert({
        evento_id: eventoId,
        nome: input.nome,
        endereco: input.endereco || null,
        observacao: input.observacao || null,
        ativo: input.ativo ?? true,
        criado_por: user?.id,
        atualizado_por: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar ponto:', error);
      toast.error('Erro ao criar ponto');
      return null;
    }

    toast.success('Ponto criado com sucesso');
    fetchPontos();
    return data;
  };

  const updatePonto = async (id: string, input: Partial<PontoEmbarqueInput>) => {
    const { data, error } = await supabase
      .from('pontos_embarque')
      .update({
        ...input,
        atualizado_por: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar ponto:', error);
      toast.error('Erro ao atualizar ponto');
      return null;
    }

    toast.success('Ponto atualizado');
    fetchPontos();
    return data;
  };

  const deletePonto = async (id: string) => {
    const { error } = await supabase
      .from('pontos_embarque')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir ponto:', error);
      toast.error('Erro ao excluir ponto');
      return false;
    }

    toast.success('Ponto excluído');
    fetchPontos();
    return true;
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    return updatePonto(id, { ativo });
  };

  const pontosAtivos = pontos.filter(p => p.ativo);

  return {
    pontos,
    pontosAtivos,
    loading,
    refetch: fetchPontos,
    createPonto,
    updatePonto,
    deletePonto,
    toggleAtivo,
  };
}
