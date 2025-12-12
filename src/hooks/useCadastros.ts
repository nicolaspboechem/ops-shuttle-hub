import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Motorista interface moved below Veiculo to avoid circular reference

export interface Veiculo {
  id: string;
  motorista_id: string | null;
  placa: string;
  tipo_veiculo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  capacidade: number | null;
  fornecedor: string | null;
  ativo: boolean;
  evento_id: string | null;
  data_criacao: string;
  data_atualizacao: string;
  motorista?: Motorista;
}

export interface Motorista {
  id: string;
  nome: string;
  telefone: string | null;
  cnh: string | null;
  observacao: string | null;
  ativo: boolean;
  evento_id: string | null;
  veiculo_id: string | null;
  data_criacao: string;
  data_atualizacao: string;
  veiculo?: Veiculo;
}

export function useMotoristas(eventoId?: string) {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMotoristas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('motoristas')
      .select('*')
      .order('nome', { ascending: true });

    // Filtrar por evento se fornecido
    if (eventoId) {
      query = query.eq('evento_id', eventoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar motoristas:', error);
      setLoading(false);
      return;
    }

    setMotoristas(data || []);
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  const createMotorista = async (motorista: Omit<Motorista, 'id' | 'data_criacao' | 'data_atualizacao' | 'evento_id'> & { evento_id?: string }) => {
    const { data, error } = await supabase
      .from('motoristas')
      .insert({
        ...motorista,
        evento_id: motorista.evento_id || eventoId || null
      })
      .select()
      .single();

    if (error) throw error;
    setMotoristas(prev => [...prev, data]);
    return data;
  };

  const updateMotorista = async (id: string, updates: Partial<Motorista>, oldNome?: string) => {
    const { error } = await supabase
      .from('motoristas')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // Sincronização bidirecional: atualizar viagens com o nome antigo
    if (oldNome && updates.nome && oldNome !== updates.nome) {
      const { error: viagensError } = await supabase
        .from('viagens')
        .update({ motorista: updates.nome })
        .eq('motorista', oldNome);

      if (viagensError) {
        console.error('Erro ao sincronizar viagens com novo nome do motorista:', viagensError);
      }
    }

    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMotorista = async (id: string) => {
    const { error } = await supabase
      .from('motoristas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setMotoristas(prev => prev.filter(m => m.id !== id));
  };

  return {
    motoristas,
    loading,
    refetch: fetchMotoristas,
    createMotorista,
    updateMotorista,
    deleteMotorista
  };
}

export function useVeiculos(eventoId?: string) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVeiculos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('veiculos')
      .select(`
        *,
        motorista:motoristas(*)
      `)
      .order('placa', { ascending: true });

    // Filtrar por evento se fornecido
    if (eventoId) {
      query = query.eq('evento_id', eventoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar veículos:', error);
      setLoading(false);
      return;
    }

    setVeiculos(data || []);
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchVeiculos();
  }, [fetchVeiculos]);

  const createVeiculo = async (veiculo: Omit<Veiculo, 'id' | 'data_criacao' | 'data_atualizacao' | 'motorista' | 'evento_id'> & { evento_id?: string }) => {
    const { data, error } = await supabase
      .from('veiculos')
      .insert({
        ...veiculo,
        evento_id: veiculo.evento_id || eventoId || null
      })
      .select(`
        *,
        motorista:motoristas(*)
      `)
      .single();

    if (error) throw error;
    setVeiculos(prev => [...prev, data]);
    return data;
  };

  const updateVeiculo = async (id: string, updates: Partial<Veiculo>, oldPlaca?: string) => {
    const { motorista, ...updateData } = updates;
    const { error } = await supabase
      .from('veiculos')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    // Sincronização bidirecional: atualizar viagens com a placa/tipo antigo
    if (oldPlaca) {
      const syncUpdates: { placa?: string; tipo_veiculo?: string } = {};
      
      if (updates.placa && oldPlaca !== updates.placa) {
        syncUpdates.placa = updates.placa;
      }
      if (updates.tipo_veiculo) {
        syncUpdates.tipo_veiculo = updates.tipo_veiculo;
      }

      if (Object.keys(syncUpdates).length > 0) {
        const { error: viagensError } = await supabase
          .from('viagens')
          .update(syncUpdates)
          .eq('placa', oldPlaca);

        if (viagensError) {
          console.error('Erro ao sincronizar viagens com novos dados do veículo:', viagensError);
        }
      }
    }

    await fetchVeiculos();
  };

  const deleteVeiculo = async (id: string) => {
    const { error } = await supabase
      .from('veiculos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setVeiculos(prev => prev.filter(v => v.id !== id));
  };

  return {
    veiculos,
    loading,
    refetch: fetchVeiculos,
    createVeiculo,
    updateVeiculo,
    deleteVeiculo
  };
}
