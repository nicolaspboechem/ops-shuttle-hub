import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

// Motorista interface moved below Veiculo to avoid circular reference

export interface VeiculoPerfil {
  full_name: string | null;
}

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
  // Perfis de quem fez inspeção/liberação
  inspecao_perfil?: VeiculoPerfil | null;
  liberado_perfil?: VeiculoPerfil | null;
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

// Cache timestamp to avoid redundant fetches on page navigation
const motoristasCache = new Map<string, { data: Motorista[]; fetchedAt: number }>();
const veiculosCache = new Map<string, { data: Veiculo[]; fetchedAt: number }>();
const STALE_TIME_MS = 60000; // 60 seconds

export function useMotoristas(eventoId?: string) {
  const { user } = useAuth();
  const [motoristas, setMotoristas] = useState<Motorista[]>(() => {
    const cached = motoristasCache.get(eventoId || '__all__');
    return cached && (Date.now() - cached.fetchedAt < STALE_TIME_MS) ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = motoristasCache.get(eventoId || '__all__');
    return !(cached && (Date.now() - cached.fetchedAt < STALE_TIME_MS));
  });

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
      .select('*, veiculo:veiculos!motoristas_veiculo_id_fkey(*)')
      .neq('ativo', false)
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

    const result = data || [];
    setMotoristas(result);
    motoristasCache.set(eventoId || '__all__', { data: result, fetchedAt: Date.now() });
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    const cached = motoristasCache.get(eventoId || '__all__');
    if (cached && (Date.now() - cached.fetchedAt < STALE_TIME_MS)) {
      // Stale-while-revalidate: serve cached data but refetch silently
      fetchMotoristas(false);
      return;
    }
    fetchMotoristas(true); // Carregamento inicial com loading
  }, [fetchMotoristas, eventoId]);

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

    // Trigger sync_viagem_legado no banco atualiza campos varchar automaticamente
    // Não é mais necessário sincronizar manualmente viagens ao renomear motorista

    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMotorista = async (id: string) => {
    // FK constraints are now CASCADE for credenciais/presenca and SET NULL for viagens/veiculos
    // So a direct delete should work without manual cleanup
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
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => {
    const cached = veiculosCache.get(eventoId || '__all__');
    return cached && (Date.now() - cached.fetchedAt < STALE_TIME_MS) ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = veiculosCache.get(eventoId || '__all__');
    return !(cached && (Date.now() - cached.fetchedAt < STALE_TIME_MS));
  });

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
      .select(`
        *,
        inspecao_perfil:profiles!veiculos_inspecao_por_fkey(full_name),
        liberado_perfil:profiles!veiculos_liberado_por_fkey(full_name)
      `)
      .order('placa', { ascending: true });

    // Filtrar por evento se fornecido
    if (eventoId && isValidUUID) {
      query = query.eq('evento_id', eventoId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Query com JOINs falhou, tentando sem JOINs:', error.message);
      
      // Fallback: query simples sem JOINs
      let fallbackQuery = supabase
        .from('veiculos')
        .select('*')
        .order('placa', { ascending: true });

      if (eventoId && isValidUUID) {
        fallbackQuery = fallbackQuery.eq('evento_id', eventoId);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        console.error('Erro ao buscar veículos (fallback):', fallbackError);
        setLoading(false);
        return;
      }

      setVeiculos((fallbackData || []) as Veiculo[]);
      setLoading(false);
      return;
    }

    // Normalizar os perfis (Supabase retorna arrays para relações)
    const veiculosNormalizados = (data || []).map((v: any) => ({
      ...v,
      inspecao_perfil: Array.isArray(v.inspecao_perfil) ? v.inspecao_perfil[0] : v.inspecao_perfil,
      liberado_perfil: Array.isArray(v.liberado_perfil) ? v.liberado_perfil[0] : v.liberado_perfil,
    })) as Veiculo[];

    setVeiculos(veiculosNormalizados);
    veiculosCache.set(eventoId || '__all__', { data: veiculosNormalizados, fetchedAt: Date.now() });
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    const cached = veiculosCache.get(eventoId || '__all__');
    if (cached && (Date.now() - cached.fetchedAt < STALE_TIME_MS)) {
      return;
    }
    fetchVeiculos(true);
  }, [fetchVeiculos, eventoId]);

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

    // Trigger sync_viagem_legado no banco atualiza campos varchar automaticamente
    // Não é mais necessário sincronizar manualmente viagens ao alterar placa/tipo

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
