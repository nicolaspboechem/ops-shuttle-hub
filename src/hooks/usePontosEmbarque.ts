import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PontoEmbarque {
  id: string;
  evento_id: string;
  nome: string;
  endereco: string | null;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
}

export interface PontoMotorista {
  id: string;
  ponto_id: string;
  motorista_id: string;
  prioridade: number;
  created_at: string;
}

export function usePontosEmbarque(eventoId?: string) {
  const [pontos, setPontos] = useState<PontoEmbarque[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPontos = useCallback(async () => {
    if (!eventoId) {
      setPontos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('pontos_embarque')
      .select('*')
      .eq('evento_id', eventoId)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar pontos de embarque:', error);
      toast.error('Erro ao carregar pontos de embarque');
    } else {
      setPontos(data || []);
    }
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchPontos();
  }, [fetchPontos]);

  const createPonto = async (ponto: Omit<PontoEmbarque, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('pontos_embarque')
      .insert([ponto])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar ponto:', error);
      toast.error('Erro ao criar ponto de embarque');
      return null;
    }

    toast.success('Ponto de embarque criado!');
    fetchPontos();
    return data;
  };

  const updatePonto = async (id: string, updates: Partial<PontoEmbarque>) => {
    const { error } = await supabase
      .from('pontos_embarque')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar ponto:', error);
      toast.error('Erro ao atualizar ponto de embarque');
      return false;
    }

    toast.success('Ponto de embarque atualizado!');
    fetchPontos();
    return true;
  };

  const deletePonto = async (id: string) => {
    const { error } = await supabase
      .from('pontos_embarque')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir ponto:', error);
      toast.error('Erro ao excluir ponto de embarque');
      return false;
    }

    toast.success('Ponto de embarque excluído!');
    fetchPontos();
    return true;
  };

  return {
    pontos,
    loading,
    refetch: fetchPontos,
    createPonto,
    updatePonto,
    deletePonto
  };
}

export function usePontoMotoristas(pontoId?: string) {
  const [motoristas, setMotoristas] = useState<PontoMotorista[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMotoristas = useCallback(async () => {
    if (!pontoId) {
      setMotoristas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('ponto_motoristas')
      .select('*')
      .eq('ponto_id', pontoId)
      .order('prioridade');

    if (error) {
      console.error('Erro ao buscar motoristas do ponto:', error);
    } else {
      setMotoristas(data || []);
    }
    setLoading(false);
  }, [pontoId]);

  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  const addMotorista = async (motoristaId: string, prioridade: number = 1) => {
    if (!pontoId) return null;

    const { data, error } = await supabase
      .from('ponto_motoristas')
      .insert([{ ponto_id: pontoId, motorista_id: motoristaId, prioridade }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Motorista já vinculado a este ponto');
      } else {
        console.error('Erro ao vincular motorista:', error);
        toast.error('Erro ao vincular motorista');
      }
      return null;
    }

    toast.success('Motorista vinculado!');
    fetchMotoristas();
    return data;
  };

  const removeMotorista = async (id: string) => {
    const { error } = await supabase
      .from('ponto_motoristas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao desvincular motorista:', error);
      toast.error('Erro ao desvincular motorista');
      return false;
    }

    toast.success('Motorista desvinculado!');
    fetchMotoristas();
    return true;
  };

  return {
    motoristas,
    loading,
    refetch: fetchMotoristas,
    addMotorista,
    removeMotorista
  };
}
