import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

export type MissaoStatus = 'pendente' | 'aceita' | 'em_andamento' | 'concluida' | 'cancelada';
export type MissaoPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

// Type from Supabase
type MissaoRow = Database['public']['Tables']['missoes']['Row'];

// Extended type with motorista relation
interface MissaoWithMotorista extends MissaoRow {
  motorista: { nome: string; veiculos: { nome: string | null; placa: string } | null } | null;
}

export interface Missao {
  id: string;
  evento_id: string;
  motorista_id: string;
  motorista_nome?: string;
  titulo: string;
  descricao: string | null;
  // Campos de texto (legacy)
  ponto_embarque: string | null;
  ponto_desembarque: string | null;
  // Campos FK (normalizados)
  ponto_embarque_id?: string | null;
  ponto_desembarque_id?: string | null;
  horario_previsto: string | null;
  status: MissaoStatus;
  prioridade: MissaoPrioridade;
  qtd_pax: number;
  data_programada: string | null;
  criado_por: string | null;
  atualizado_por: string | null;
  created_at: string;
  data_atualizacao: string;
  // Campo para vincular diretamente à viagem criada
  viagem_id: string | null;
  // Veículo vinculado ao motorista
  veiculo_nome?: string;
  veiculo_placa?: string;
}

export interface MissaoInput {
  motorista_id: string;
  titulo: string;
  descricao?: string | null;
  ponto_embarque?: string | null;
  ponto_desembarque?: string | null;
  ponto_embarque_id?: string | null;
  ponto_desembarque_id?: string | null;
  horario_previsto?: string | null;
  prioridade?: MissaoPrioridade;
  qtd_pax?: number;
  data_programada?: string | null;
}

export function useMissoes(eventoId: string | undefined) {
  const { user } = useAuth();
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissoes = useCallback(async () => {
    // Validar se eventoId é um UUID válido antes de fazer a query
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (!isValidUUID) {
      setMissoes([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('missoes')
        .select(`
          *,
          motorista:motoristas(nome, veiculos(nome, placa))
        `)
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar missões:', error);
        setMissoes([]);
      } else {
        const missoesFormatadas = ((data || []) as unknown as MissaoWithMotorista[]).map((m) => ({
          ...m,
          motorista_nome: m.motorista?.nome,
          veiculo_nome: m.motorista?.veiculos?.nome || undefined,
          veiculo_placa: m.motorista?.veiculos?.placa || undefined,
          status: m.status as MissaoStatus,
          prioridade: (m.prioridade || 'normal') as MissaoPrioridade,
          qtd_pax: (m as any).qtd_pax || 0,
          data_atualizacao: m.data_atualizacao || m.created_at || new Date().toISOString(),
        }));
        setMissoes(missoesFormatadas as Missao[]);
      }
    } catch (err) {
      console.error('Tabela missoes pode não existir:', err);
      setMissoes([]);
    }
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    fetchMissoes();

    // Realtime subscription - validar UUID
    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (!isValidUUID) return;

    const channel = supabase
      .channel('missoes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missoes',
        },
        () => fetchMissoes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMissoes, eventoId]);

  const createMissao = async (input: MissaoInput) => {
    if (!eventoId) return null;

    try {
      const { data, error } = await supabase
        .from('missoes')
        .insert({
          evento_id: eventoId,
          motorista_id: input.motorista_id,
          titulo: input.titulo,
          descricao: input.descricao || null,
          // Campos de texto
          ponto_embarque: input.ponto_embarque || null,
          ponto_desembarque: input.ponto_desembarque || null,
          // Campos FK normalizados
          ponto_embarque_id: input.ponto_embarque_id || null,
          ponto_desembarque_id: input.ponto_desembarque_id || null,
          horario_previsto: input.horario_previsto || null,
          prioridade: input.prioridade || 'normal',
          qtd_pax: input.qtd_pax || 0,
          data_programada: input.data_programada || null,
          status: 'pendente',
          criado_por: user?.id,
          atualizado_por: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar missão:', error);
        toast.error('Erro ao criar missão');
        return null;
      }

      toast.success('Missão criada com sucesso');
      fetchMissoes();
      return data;
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar missão');
      return null;
    }
  };

  const updateMissao = async (id: string, input: Partial<MissaoInput & { status?: MissaoStatus }>) => {
    try {
      const { data, error } = await supabase
        .from('missoes')
        .update({
          ...input,
          atualizado_por: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar missão:', error);
        toast.error('Erro ao atualizar missão');
        return null;
      }

      toast.success('Missão atualizada');
      fetchMissoes();
      return data;
    } catch (err) {
      console.error('Erro:', err);
      return null;
    }
  };

  const deleteMissao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('missoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir missão:', error);
        toast.error('Erro ao excluir missão');
        return false;
      }

      toast.success('Missão excluída');
      fetchMissoes();
      return true;
    } catch (err) {
      return false;
    }
  };

  const aceitarMissao = async (id: string) => {
    return updateMissao(id, { status: 'aceita' });
  };

  const iniciarMissao = async (id: string) => {
    return updateMissao(id, { status: 'em_andamento' });
  };

  const concluirMissao = async (id: string) => {
    return updateMissao(id, { status: 'concluida' });
  };

  const cancelarMissao = async (id: string) => {
    return updateMissao(id, { status: 'cancelada' });
  };

  // Filtrar missões por status
  const missoesPendentes = missoes.filter(m => m.status === 'pendente');
  const missoesAceitas = missoes.filter(m => m.status === 'aceita');
  const missoesEmAndamento = missoes.filter(m => m.status === 'em_andamento');
  const missoesAtivas = missoes.filter(m => ['pendente', 'aceita', 'em_andamento'].includes(m.status));

  return {
    missoes,
    missoesPendentes,
    missoesAceitas,
    missoesEmAndamento,
    missoesAtivas,
    loading,
    refetch: fetchMissoes,
    createMissao,
    updateMissao,
    deleteMissao,
    aceitarMissao,
    iniciarMissao,
    concluirMissao,
    cancelarMissao,
  };
}

// Hook para motorista ver suas missões
export function useMissoesPorMotorista(eventoId: string | undefined, motoristaId: string | undefined) {
  const { user } = useAuth();
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissoes = useCallback(async () => {
    // Validar se eventoId e motoristaId são válidos
    const isValidEventoId = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    const isValidMotoristaId = motoristaId && 
      motoristaId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(motoristaId);
    
    if (!isValidEventoId || !isValidMotoristaId) {
      setMissoes([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('missoes')
        .select('*')
        .eq('evento_id', eventoId)
        .eq('motorista_id', motoristaId)
        .in('status', ['pendente', 'aceita', 'em_andamento'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar missões:', error);
        setMissoes([]);
      } else if (data) {
        const missoesFormatadas = (data as MissaoRow[]).map((m) => ({
          ...m,
          status: m.status as MissaoStatus,
          prioridade: (m.prioridade || 'normal') as MissaoPrioridade,
          qtd_pax: (m as any).qtd_pax || 0,
          data_atualizacao: m.data_atualizacao || m.created_at || new Date().toISOString(),
        }));
        setMissoes(missoesFormatadas as Missao[]);
      }
    } catch (err) {
      setMissoes([]);
    }
    setLoading(false);
  }, [eventoId, motoristaId]);

  useEffect(() => {
    fetchMissoes();

    // Validar se eventoId e motoristaId são UUIDs válidos
    const isValidEventoId = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    const isValidMotoristaId = motoristaId && 
      motoristaId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(motoristaId);
    
    if (!isValidEventoId || !isValidMotoristaId) return;

    const channel = supabase
      .channel(`missoes-motorista-${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missoes',
        },
        () => fetchMissoes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMissoes, eventoId, motoristaId]);

  const aceitarMissao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('missoes')
        .update({ status: 'aceita', atualizado_por: user?.id })
        .eq('id', id);

      if (error) {
        toast.error('Erro ao aceitar missão');
        return false;
      }

      toast.success('Missão aceita!');
      fetchMissoes();
      return true;
    } catch (err) {
      return false;
    }
  };

  const recusarMissao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('missoes')
        .update({ status: 'cancelada', atualizado_por: user?.id })
        .eq('id', id);

      if (error) {
        toast.error('Erro ao recusar missão');
        return false;
      }

      toast.success('Missão recusada');
      fetchMissoes();
      return true;
    } catch (err) {
      return false;
    }
  };

  return {
    missoes,
    loading,
    refetch: fetchMissoes,
    aceitarMissao,
    recusarMissao,
  };
}
