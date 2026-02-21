import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
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
  ponto_embarque: string | null;
  ponto_desembarque: string | null;
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
  viagem_id: string | null;
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
  const { getAgoraSync } = useServerTime();
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissoes = useCallback(async () => {
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
          motorista:motoristas(nome, veiculos!motoristas_veiculo_id_fkey(nome, placa))
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

        // ── Auto-limpeza de missões fantasma ──
        // Buscar horario_virada_dia do evento para calcular dia operacional
        const { data: eventoData } = await supabase
          .from('eventos')
          .select('horario_virada_dia')
          .eq('id', eventoId)
          .maybeSingle();

        const horarioVirada = eventoData?.horario_virada_dia || '04:00';
        const dataOpAtual = getDataOperacional(getAgoraSync(), horarioVirada);

        const fantasmas = missoesFormatadas.filter(m =>
          m.data_programada &&
          m.data_programada < dataOpAtual &&
          ['aceita', 'em_andamento'].includes(m.status)
        );

        if (fantasmas.length > 0) {
          console.log(`[useMissoes] Cancelando ${fantasmas.length} missões fantasma de dias anteriores`);

          // Batch update para cancelar todas
          const fantasmaIds = fantasmas.map(f => f.id);
          await supabase
            .from('missoes')
            .update({ status: 'cancelada', atualizado_por: user?.id || null })
            .in('id', fantasmaIds);

          // Para missões em_andamento, liberar motorista e encerrar viagem
          const emAndamentoFantasmas = fantasmas.filter(f => f.status === 'em_andamento');
          for (const f of emAndamentoFantasmas) {
            await syncMotoristaAoEncerrarMissao(f as any, getAgoraSync().toISOString());
          }

          // Atualizar lista local removendo fantasmas
          const fantasmaIdSet = new Set(fantasmaIds);
          const missoesLimpas = missoesFormatadas.map(m =>
            fantasmaIdSet.has(m.id) ? { ...m, status: 'cancelada' as MissaoStatus } : m
          );
          setMissoes(missoesLimpas as Missao[]);
        } else {
          setMissoes(missoesFormatadas as Missao[]);
        }
      }
    } catch (err) {
      console.error('Tabela missoes pode não existir:', err);
      setMissoes([]);
    }
    setLoading(false);
  }, [eventoId, getAgoraSync, user?.id]);

  useEffect(() => {
    fetchMissoes();

    const isValidUUID = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    if (!isValidUUID) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchMissoes(), 2000);
    };

    const channel = supabase
      .channel(`missoes-changes-${eventoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missoes',
          filter: `evento_id=eq.${eventoId}`,
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
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
          ponto_embarque: input.ponto_embarque || null,
          ponto_desembarque: input.ponto_desembarque || null,
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
    const { data: missao } = await supabase
      .from('missoes')
      .select('id, motorista_id')
      .eq('id', id)
      .maybeSingle();

    if (!missao) return null;

    const { data: ativas } = await supabase
      .from('missoes')
      .select('id')
      .eq('motorista_id', missao.motorista_id)
      .eq('evento_id', eventoId!)
      .in('status', ['aceita', 'em_andamento'])
      .neq('id', id)
      .limit(1);

    if (ativas && ativas.length > 0) {
      toast.error('Este motorista já possui uma missão ativa. Finalize antes de aceitar outra.');
      fetchMissoes();
      return null;
    }

    return updateMissao(id, { status: 'aceita' });
  };

  const iniciarMissao = async (id: string) => {
    // 1. Buscar missão com campos expandidos
    const { data: missao } = await supabase
      .from('missoes')
      .select('id, motorista_id, evento_id, ponto_embarque, ponto_desembarque, ponto_embarque_id, ponto_desembarque_id, status, qtd_pax, titulo')
      .eq('id', id)
      .maybeSingle();

    if (!missao) return null;

    // 2. Validar que não há outra missão em_andamento
    const { data: emAndamento } = await supabase
      .from('missoes')
      .select('id')
      .eq('motorista_id', missao.motorista_id)
      .eq('evento_id', eventoId!)
      .eq('status', 'em_andamento')
      .neq('id', id)
      .limit(1);

    if (emAndamento && emAndamento.length > 0) {
      toast.error('Este motorista já possui uma missão em andamento.');
      fetchMissoes();
      return null;
    }

    // 3. Verificar se já existe viagem para esta missão (anti-duplicata)
    const { data: viagemExistente } = await supabase
      .from('viagens')
      .select('id')
      .eq('origem_missao_id', id)
      .limit(1);

    if (viagemExistente && viagemExistente.length > 0) {
      // Viagem já existe, apenas atualizar status da missão
      const result = await updateMissao(id, { status: 'em_andamento' });
      if (result) {
        await supabase.from('missoes').update({ viagem_id: viagemExistente[0].id }).eq('id', id);
        await supabase.from('motoristas').update({ status: 'em_viagem' }).eq('id', missao.motorista_id);
      }
      return result;
    }

    // 4. Buscar dados do motorista e veículo
    const { data: motorista } = await supabase
      .from('motoristas')
      .select('nome, veiculo_id')
      .eq('id', missao.motorista_id)
      .maybeSingle();

    let placa: string | null = null;
    let tipoVeiculo: string | null = null;
    let veiculoId: string | null = motorista?.veiculo_id || null;

    if (veiculoId) {
      const { data: veiculo } = await supabase
        .from('veiculos')
        .select('placa, tipo_veiculo')
        .eq('id', veiculoId)
        .maybeSingle();
      placa = veiculo?.placa || null;
      tipoVeiculo = veiculo?.tipo_veiculo || null;
    }

    // 5. Atualizar missão para em_andamento
    const result = await updateMissao(id, { status: 'em_andamento' });
    if (!result) return null;

    const now = getAgoraSync().toISOString();

    // 6. Criar viagem vinculada
    const { data: novaViagem, error: viagemError } = await supabase
      .from('viagens')
      .insert({
        evento_id: missao.evento_id,
        motorista_id: missao.motorista_id,
        motorista: motorista?.nome || 'Motorista',
        veiculo_id: veiculoId,
        placa: placa,
        tipo_veiculo: tipoVeiculo,
        ponto_embarque: missao.ponto_embarque,
        ponto_desembarque: missao.ponto_desembarque,
        ponto_embarque_id: missao.ponto_embarque_id,
        ponto_desembarque_id: missao.ponto_desembarque_id,
        tipo_operacao: 'transfer',
        status: 'em_andamento',
        h_inicio_real: now,
        encerrado: false,
        origem_missao_id: missao.id,
        qtd_pax: missao.qtd_pax || 0,
        criado_por: user?.id || missao.motorista_id,
        iniciado_por: user?.id || missao.motorista_id,
        observacao: `Missão: ${missao.titulo}`,
      })
      .select('id')
      .single();

    if (viagemError) {
      console.error('Erro ao criar viagem para missão:', viagemError);
    } else if (novaViagem) {
      // 7. Criar log
      await supabase.from('viagem_logs').insert({
        viagem_id: novaViagem.id,
        user_id: user?.id || missao.motorista_id,
        acao: 'inicio',
        detalhes: { via: 'cco_missao', missao_id: missao.id },
      });

      // 8. Vincular viagem à missão
      await supabase.from('missoes').update({ viagem_id: novaViagem.id }).eq('id', id);
    }

    // 9. Atualizar status do motorista
    await supabase
      .from('motoristas')
      .update({ status: 'em_viagem' })
      .eq('id', missao.motorista_id);

    return result;
  };

  const syncMotoristaAoEncerrarMissao = async (missao: Missao, nowISO?: string, atualizarLocalizacao = true) => {
    const now = nowISO || getAgoraSync().toISOString();

    if (missao.viagem_id) {
      await supabase
        .from('viagens')
        .update({
          status: 'encerrado',
          h_fim_real: now,
          encerrado: true,
        })
        .eq('id', missao.viagem_id);
    }

    const { data: outrasViagens } = await supabase
      .from('viagens')
      .select('id')
      .eq('motorista_id', missao.motorista_id)
      .eq('evento_id', missao.evento_id)
      .eq('encerrado', false)
      .neq('id', missao.viagem_id || '');

    if (!outrasViagens || outrasViagens.length === 0) {
      const updateData: Record<string, any> = {
        status: 'disponivel',
      };
      if (atualizarLocalizacao && missao.ponto_desembarque) {
        updateData.ultima_localizacao = missao.ponto_desembarque;
        updateData.ultima_localizacao_at = now;
      }
      await supabase
        .from('motoristas')
        .update(updateData)
        .eq('id', missao.motorista_id);
    }
  };

  const concluirMissao = async (id: string) => {
    const { data: missao } = await supabase
      .from('missoes')
      .select('id, motorista_id, evento_id, ponto_embarque, ponto_desembarque, status, viagem_id')
      .eq('id', id)
      .maybeSingle();

    if (missao) {
      await syncMotoristaAoEncerrarMissao(missao as any);
    }
    return updateMissao(id, { status: 'concluida' });
  };

  const cancelarMissao = async (id: string) => {
    const { data: missao } = await supabase
      .from('missoes')
      .select('id, motorista_id, evento_id, ponto_embarque, ponto_desembarque, status, viagem_id')
      .eq('id', id)
      .maybeSingle();

    if (missao && (missao.status === 'aceita' || missao.status === 'em_andamento')) {
      // Ao cancelar, NÃO atualizar localização para o destino (motorista não chegou lá)
      await syncMotoristaAoEncerrarMissao(missao as any, undefined, false);
    }
    return updateMissao(id, { status: 'cancelada' });
  };

  const missoesPendentes = missoes.filter(m => m.status === 'pendente');
  const missoesAceitas = missoes.filter(m => m.status === 'aceita');
  const missoesEmAndamento = missoes.filter(m => m.status === 'em_andamento');
  const missoesConcluidas = missoes.filter(m => m.status === 'concluida');
  const missoesCanceladas = missoes.filter(m => m.status === 'cancelada');
  const missoesAtivas = missoes.filter(m => ['pendente', 'aceita', 'em_andamento'].includes(m.status));

  return {
    missoes,
    missoesPendentes,
    missoesAceitas,
    missoesEmAndamento,
    missoesConcluidas,
    missoesCanceladas,
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
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissoes = useCallback(async () => {
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

    const isValidEventoId = eventoId && 
      eventoId !== ':eventoId' && 
      eventoId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(eventoId);
    
    const isValidMotoristaId = motoristaId && 
      motoristaId.length >= 36 && 
      /^[0-9a-f-]{36}$/i.test(motoristaId);
    
    if (!isValidEventoId || !isValidMotoristaId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchMissoes(), 1500);
    };

    const channel = supabase
      .channel(`missoes-motorista-${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missoes',
          filter: `motorista_id=eq.${motoristaId}`,
        },
        debouncedFetch
      )
      .subscribe();

    // Polling fallback every 30s in case Realtime fails silently
    const pollingInterval = setInterval(() => fetchMissoes(), 30000);

    return () => {
      clearInterval(pollingInterval);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchMissoes, eventoId, motoristaId]);

  const aceitarMissao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('missoes')
        .update({ status: 'aceita', atualizado_por: motoristaId })
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
        .update({ status: 'cancelada', atualizado_por: motoristaId })
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
