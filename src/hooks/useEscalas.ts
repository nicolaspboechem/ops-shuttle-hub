import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isValidUUID } from '@/lib/utils/uuid';

export interface Escala {
  id: string;
  evento_id: string;
  nome: string;
  horario_inicio: string;
  horario_fim: string;
  cor: string | null;
  ativo: boolean;
  created_at: string;
  criado_por: string | null;
}

export interface EscalaMotorista {
  id: string;
  escala_id: string;
  motorista_id: string;
  created_at: string;
}

interface CreateEscalaData {
  nome: string;
  horario_inicio: string;
  horario_fim: string;
  cor?: string;
  motorista_ids: string[];
}

export function useEscalas(eventoId: string | undefined) {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [escalaMotoristas, setEscalaMotoristas] = useState<EscalaMotorista[]>([]);
  const [loading, setLoading] = useState(true);

  const validId = isValidUUID(eventoId);

  const fetchEscalas = useCallback(async () => {
    if (!validId) return;
    
    const { data, error } = await supabase
      .from('escalas')
      .select('*')
      .eq('evento_id', eventoId!)
      .eq('ativo', true)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setEscalas(data as unknown as Escala[]);
    }
  }, [eventoId, validId]);

  const fetchEscalaMotoristas = useCallback(async () => {
    if (!validId || escalas.length === 0) {
      setEscalaMotoristas([]);
      return;
    }

    const escalaIds = escalas.map(e => e.id);
    const { data, error } = await supabase
      .from('escala_motoristas')
      .select('*')
      .in('escala_id', escalaIds);

    if (!error && data) {
      setEscalaMotoristas(data as unknown as EscalaMotorista[]);
    }
  }, [escalas, validId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEscalas();
      setLoading(false);
    };
    load();
  }, [fetchEscalas]);

  useEffect(() => {
    fetchEscalaMotoristas();
  }, [fetchEscalaMotoristas]);

  // Realtime
  useEffect(() => {
    if (!validId) return;

    const channel = supabase
      .channel(`escalas-${eventoId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'escalas',
        filter: `evento_id=eq.${eventoId}`
      }, () => fetchEscalas())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'escala_motoristas'
      }, () => fetchEscalaMotoristas())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventoId, validId, fetchEscalas, fetchEscalaMotoristas]);

  const createEscala = async (data: CreateEscalaData) => {
    if (!validId) return;

    const { data: escala, error } = await supabase
      .from('escalas')
      .insert({
        evento_id: eventoId!,
        nome: data.nome,
        horario_inicio: data.horario_inicio,
        horario_fim: data.horario_fim,
        cor: data.cor || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar escala');
      throw error;
    }

    if (data.motorista_ids.length > 0) {
      const { error: linkError } = await supabase
        .from('escala_motoristas')
        .insert(
          data.motorista_ids.map(mid => ({
            escala_id: (escala as any).id,
            motorista_id: mid,
          })) as any
        );

      if (linkError) {
        toast.error('Erro ao vincular motoristas');
      }
    }

    toast.success('Escala criada com sucesso!');
    await fetchEscalas();
  };

  const deleteEscala = async (escalaId: string) => {
    const { error } = await supabase
      .from('escalas')
      .update({ ativo: false } as any)
      .eq('id', escalaId);

    if (error) {
      toast.error('Erro ao excluir escala');
      throw error;
    }

    toast.success('Escala excluída');
    await fetchEscalas();
  };

  const moveMotorista = async (motoristaId: string, fromEscalaId: string, toEscalaId: string) => {
    // Remove from old
    await supabase
      .from('escala_motoristas')
      .delete()
      .eq('escala_id', fromEscalaId)
      .eq('motorista_id', motoristaId);

    // Add to new
    const { error } = await supabase
      .from('escala_motoristas')
      .insert({ escala_id: toEscalaId, motorista_id: motoristaId } as any);

    if (error) {
      toast.error('Erro ao mover motorista');
      throw error;
    }

    toast.success('Motorista movido');
    await fetchEscalaMotoristas();
  };

  const addMotoristaToEscala = async (escalaId: string, motoristaId: string) => {
    const { error } = await supabase
      .from('escala_motoristas')
      .insert({ escala_id: escalaId, motorista_id: motoristaId } as any);

    if (error) {
      toast.error('Erro ao adicionar motorista');
      throw error;
    }
    await fetchEscalaMotoristas();
  };

  const removeMotoristaFromEscala = async (escalaId: string, motoristaId: string) => {
    const { error } = await supabase
      .from('escala_motoristas')
      .delete()
      .eq('escala_id', escalaId)
      .eq('motorista_id', motoristaId);

    if (error) {
      toast.error('Erro ao remover motorista');
      throw error;
    }
    await fetchEscalaMotoristas();
  };

  const updateEscala = async (escalaId: string, data: CreateEscalaData) => {
    const { error } = await supabase
      .from('escalas')
      .update({
        nome: data.nome,
        horario_inicio: data.horario_inicio,
        horario_fim: data.horario_fim,
        cor: data.cor || null,
      } as any)
      .eq('id', escalaId);

    if (error) {
      toast.error('Erro ao atualizar escala');
      throw error;
    }

    // Sync motoristas
    const currentLinks = escalaMotoristas.filter(em => em.escala_id === escalaId);
    const currentIds = currentLinks.map(em => em.motorista_id);
    const toRemove = currentIds.filter(id => !data.motorista_ids.includes(id));
    const toAdd = data.motorista_ids.filter(id => !currentIds.includes(id));

    if (toRemove.length > 0) {
      await supabase
        .from('escala_motoristas')
        .delete()
        .eq('escala_id', escalaId)
        .in('motorista_id', toRemove);
    }

    if (toAdd.length > 0) {
      await supabase
        .from('escala_motoristas')
        .insert(toAdd.map(mid => ({ escala_id: escalaId, motorista_id: mid })) as any);
    }

    toast.success('Escala atualizada!');
    await fetchEscalas();
  };

  const getMotoristasByEscala = (escalaId: string) => {
    return escalaMotoristas.filter(em => em.escala_id === escalaId);
  };

  const getEscalaByMotorista = (motoristaId: string) => {
    const link = escalaMotoristas.find(em => em.motorista_id === motoristaId);
    return link ? escalas.find(e => e.id === link.escala_id) : undefined;
  };

  return {
    escalas,
    escalaMotoristas,
    loading,
    createEscala,
    updateEscala,
    deleteEscala,
    moveMotorista,
    addMotoristaToEscala,
    removeMotoristaFromEscala,
    getMotoristasByEscala,
    getEscalaByMotorista,
    refetch: fetchEscalas,
  };
}
