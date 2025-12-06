import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Motorista {
  id: string;
  nome: string;
  telefone: string | null;
  cnh: string | null;
  observacao: string | null;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Veiculo {
  id: string;
  motorista_id: string | null;
  placa: string;
  tipo_veiculo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  capacidade: number | null;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  motorista?: Motorista;
}

export function useMotoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMotoristas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('motoristas')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar motoristas:', error);
      setLoading(false);
      return;
    }

    setMotoristas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  const createMotorista = async (motorista: Omit<Motorista, 'id' | 'data_criacao' | 'data_atualizacao'>) => {
    const { data, error } = await supabase
      .from('motoristas')
      .insert(motorista)
      .select()
      .single();

    if (error) throw error;
    setMotoristas(prev => [...prev, data]);
    return data;
  };

  const updateMotorista = async (id: string, updates: Partial<Motorista>) => {
    const { error } = await supabase
      .from('motoristas')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
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

export function useVeiculos() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVeiculos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('veiculos')
      .select(`
        *,
        motorista:motoristas(*)
      `)
      .order('placa', { ascending: true });

    if (error) {
      console.error('Erro ao buscar veículos:', error);
      setLoading(false);
      return;
    }

    setVeiculos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVeiculos();
  }, [fetchVeiculos]);

  const createVeiculo = async (veiculo: Omit<Veiculo, 'id' | 'data_criacao' | 'data_atualizacao' | 'motorista'>) => {
    const { data, error } = await supabase
      .from('veiculos')
      .insert(veiculo)
      .select(`
        *,
        motorista:motoristas(*)
      `)
      .single();

    if (error) throw error;
    setVeiculos(prev => [...prev, data]);
    return data;
  };

  const updateVeiculo = async (id: string, updates: Partial<Veiculo>) => {
    const { motorista, ...updateData } = updates;
    const { error } = await supabase
      .from('veiculos')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
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
