import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

// Motorista interface moved below Veiculo to avoid circular reference

export interface Veiculo {
  id: string;
  motorista_id: string | null;
  placa: string;
  tipo_veiculo: string;
  nome?: string | null; // Nome/apelido do veículo
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
  // KM tracking
  km_inicial?: number | null;
  km_final?: number | null;
  km_inicial_registrado_por?: string | null;
  km_final_registrado_por?: string | null;
  km_inicial_data?: string | null;
  km_final_data?: string | null;
  // Auditoria
  criado_por?: string | null;
  atualizado_por?: string | null;
  // Status e inspeção
  status?: string | null;
  nivel_combustivel?: string | null;
  possui_avarias?: boolean | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspecao_dados?: any;
  inspecao_data?: string | null;
  inspecao_por?: string | null;
  liberado_em?: string | null;
  liberado_por?: string | null;
  observacoes_gerais?: string | null;
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
  criado_por?: string | null;
  atualizado_por?: string | null;
  status?: string | null; // 'disponivel' | 'em_viagem' | 'indisponivel' | 'inativo'
}

export function useMotoristas(eventoId?: string) {
  const { user } = useAuth();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMotoristas = useCallback(async (showLoading = false) => {
    // Validar se eventoId é um UUID válido antes de fazer a query
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (eventoId && !isValidUUID) {
      setMotoristas([]);
      setLoading(false);
      return;
    }
    
    // Só mostra loading no carregamento inicial
    if (showLoading) {
      setLoading(true);
    }
    
    let query = supabase
      .from('motoristas')
      .select('*')
      .order('nome', { ascending: true });

    // Filtrar por evento se fornecido
    if (eventoId && isValidUUID) {
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
    fetchMotoristas(true); // Carregamento inicial com loading
  }, [fetchMotoristas]);

  const createMotorista = async (motorista: Omit<Motorista, 'id' | 'data_criacao' | 'data_atualizacao' | 'evento_id' | 'criado_por' | 'atualizado_por'> & { evento_id?: string }) => {
    const { data, error } = await supabase
      .from('motoristas')
      .insert({
        ...motorista,
        evento_id: motorista.evento_id || eventoId || null,
        criado_por: user?.id || null,
        atualizado_por: user?.id || null
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
      .update({
        ...updates,
        atualizado_por: user?.id || null
      })
      .eq('id', id);

    if (error) throw error;

    // Sincronização bidirecional: atualizar viagens com o nome antigo
    if (oldNome && updates.nome && oldNome !== updates.nome) {
      // Atualizar campo texto (compatibilidade)
      const { error: viagensError } = await supabase
        .from('viagens')
        .update({ motorista: updates.nome, atualizado_por: user?.id || null })
        .eq('motorista', oldNome);

      if (viagensError) {
        console.error('Erro ao sincronizar viagens com novo nome do motorista:', viagensError);
        toast.error('Erro ao sincronizar viagens com o novo nome do motorista');
      } else {
        toast.success('Viagens atualizadas com o novo nome do motorista');
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

  // Wrapper para ser usado como onClick handler
  const refetch = useCallback(() => fetchMotoristas(false), [fetchMotoristas]);

  return {
    motoristas,
    loading,
    refetch,
    createMotorista,
    updateMotorista,
    deleteMotorista
  };
}

export function useVeiculos(eventoId?: string) {
  const { user } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVeiculos = useCallback(async (showLoading = false) => {
    // Validar se eventoId é um UUID válido antes de fazer a query
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (eventoId && !isValidUUID) {
      setVeiculos([]);
      setLoading(false);
      return;
    }
    
    // Só mostra loading no carregamento inicial
    if (showLoading) {
      setLoading(true);
    }
    
    let query = supabase
      .from('veiculos')
      .select('*')
      .order('placa', { ascending: true });

    // Filtrar por evento se fornecido
    if (eventoId && isValidUUID) {
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
    fetchVeiculos(true); // Carregamento inicial com loading
  }, [fetchVeiculos]);

  const createVeiculo = async (veiculo: Omit<Veiculo, 'id' | 'data_criacao' | 'data_atualizacao' | 'motorista' | 'evento_id' | 'criado_por' | 'atualizado_por'> & { evento_id?: string }) => {
    const { data, error } = await supabase
      .from('veiculos')
      .insert({
        ...veiculo,
        evento_id: veiculo.evento_id || eventoId || null,
        criado_por: user?.id || null,
        atualizado_por: user?.id || null
      })
      .select('*')
      .single();

    if (error) throw error;
    setVeiculos(prev => [...prev, data]);
    return data;
  };

  const updateVeiculo = async (id: string, updates: Partial<Veiculo>, oldPlaca?: string) => {
    const { motorista, ...updateData } = updates;
    const { error } = await supabase
      .from('veiculos')
      .update({
        ...updateData,
        atualizado_por: user?.id || null
      })
      .eq('id', id);

    if (error) throw error;

    // Sincronização bidirecional: atualizar viagens com a placa/tipo antigo
    if (oldPlaca) {
      const syncUpdates: { placa?: string; tipo_veiculo?: string; atualizado_por?: string | null } = {};
      
      if (updates.placa && oldPlaca !== updates.placa) {
        syncUpdates.placa = updates.placa;
      }
      if (updates.tipo_veiculo) {
        syncUpdates.tipo_veiculo = updates.tipo_veiculo;
      }

      if (Object.keys(syncUpdates).length > 0) {
        syncUpdates.atualizado_por = user?.id || null;
        const { error: viagensError } = await supabase
          .from('viagens')
          .update(syncUpdates)
          .eq('placa', oldPlaca);

        if (viagensError) {
          console.error('Erro ao sincronizar viagens com novos dados do veículo:', viagensError);
          toast.error('Erro ao sincronizar viagens com os novos dados do veículo');
        } else {
          toast.success('Viagens atualizadas com os novos dados do veículo');
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

  // Wrapper para ser usado como onClick handler
  const refetch = useCallback(() => fetchVeiculos(false), [fetchVeiculos]);

  return {
    veiculos,
    loading,
    refetch,
    createVeiculo,
    updateVeiculo,
    deleteVeiculo
  };
}
