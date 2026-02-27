import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { toast } from 'sonner';

// Helper para atualizar status do motorista - agora usa motorista_id quando disponível
async function atualizarStatusMotorista(motoristaId: string | null | undefined, motoristaNome: string, eventoId: string, novoStatus: string) {
  // Preferir usar motorista_id (FK normalizada)
  if (motoristaId) {
    const { error } = await supabase
      .from('motoristas')
      .update({ status: novoStatus } as any)
      .eq('id', motoristaId);

    if (error) {
      console.error('Erro ao atualizar status do motorista por ID:', error);
    }
    return;
  }

  // Fallback: usar nome (para viagens antigas)
  const { error } = await supabase
    .from('motoristas')
    .update({ status: novoStatus } as any)
    .eq('nome', motoristaNome)
    .eq('evento_id', eventoId);

  if (error) {
    console.error('Erro ao atualizar status do motorista:', error);
  }
}

// Helper para atualizar localização do motorista - recebe timestamp sincronizado
async function atualizarLocalizacaoMotorista(
  motoristaId: string | null | undefined, 
  motoristaNome: string, 
  eventoId: string, 
  localizacao: string | null,
  timestampSync: string
) {
  // Preferir usar motorista_id (FK normalizada)
  if (motoristaId) {
    const { error } = await supabase
      .from('motoristas')
      .update({ 
        ultima_localizacao: localizacao,
        ultima_localizacao_at: timestampSync
      } as any)
      .eq('id', motoristaId);

    if (error) {
      console.error('Erro ao atualizar localização do motorista por ID:', error);
    }
    return;
  }

  // Fallback: usar nome (para viagens antigas)
  const { error } = await supabase
    .from('motoristas')
    .update({ 
      ultima_localizacao: localizacao,
      ultima_localizacao_at: timestampSync
    } as any)
    .eq('nome', motoristaNome)
    .eq('evento_id', eventoId);

  if (error) {
    console.error('Erro ao atualizar localização do motorista:', error);
  }
}

// Helper para verificar se motorista tem outras viagens ativas - usa motorista_id quando disponível
async function motoristaTemViagensAtivas(motoristaId: string | null | undefined, motoristaNome: string, eventoId: string, viagemIdExcluir?: string): Promise<boolean> {
  let query = supabase
    .from('viagens')
    .select('id')
    .eq('evento_id', eventoId)
    .in('status', ['agendado', 'em_andamento', 'aguardando_retorno']);

  // Usar motorista_id (FK normalizada) - fallback por nome apenas para viagens históricas sem FK
  if (motoristaId) {
    query = query.eq('motorista_id', motoristaId);
  } else {
    query = query.eq('motorista', motoristaNome);
  }

  if (viagemIdExcluir) {
    query = query.neq('id', viagemIdExcluir);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao verificar viagens ativas:', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export function useViagemOperacao() {
  const { user, profile } = useAuth();
  const { getAgoraSync } = useServerTime();

  const registrarLog = useCallback(async (
    viagemId: string, 
    acao: string, 
    detalhes?: Record<string, unknown>
  ) => {
    if (!user) return;
    
    await supabase.from('viagem_logs').insert([{
      viagem_id: viagemId,
      user_id: user.id,
      acao,
      detalhes: {
        ...detalhes,
        nome_usuario: profile?.full_name || user.email || null
      } as any
    }]);
  }, [user, profile]);

  const iniciarViagem = useCallback(async (viagem: Viagem) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = getAgoraSync();

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'em_andamento' as StatusViagemOperacao,
        iniciado_por: user.id,
        atualizado_por: user.id,
        h_inicio_real: now.toISOString()
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao iniciar viagem:', error);
      toast.error('Erro ao iniciar viagem');
      return false;
    }

    await registrarLog(viagem.id, 'inicio', { 
      motorista: viagem.motorista,
      placa: viagem.placa 
    });

    // Sincronizar status do motorista para 'em_viagem' usando motorista_id quando disponível
    if (viagem.evento_id) {
      await atualizarStatusMotorista(viagem.motorista_id, viagem.motorista, viagem.evento_id, 'em_viagem');
    }
    
    toast.success('Viagem iniciada!');
    return true;
  }, [user, registrarLog, getAgoraSync]);

  // Registrar chegada - pode encerrar ou aguardar retorno (apenas Shuttle)
  const registrarChegada = useCallback(async (viagem: Viagem, qtdPax?: number, aguardarRetorno?: boolean, observacao?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = getAgoraSync();
    const horaChegada = now.toTimeString().slice(0, 8);
    
    // Shuttle pode aguardar retorno, outros tipos encerram diretamente
    const novoStatus = (aguardarRetorno && viagem.tipo_operacao === 'shuttle') 
      ? 'aguardando_retorno' 
      : 'encerrado';

    const { error } = await supabase
      .from('viagens')
      .update({
        status: novoStatus as StatusViagemOperacao,
        h_chegada: horaChegada,
        h_fim_real: novoStatus === 'encerrado' ? now.toISOString() : null,
        finalizado_por: novoStatus === 'encerrado' ? user.id : null,
        atualizado_por: user.id,
        encerrado: novoStatus === 'encerrado',
        qtd_pax: qtdPax ?? viagem.qtd_pax,
        observacao: observacao || viagem.observacao
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao registrar chegada:', error);
      toast.error('Erro ao registrar chegada');
      return false;
    }

    await registrarLog(viagem.id, 'chegada', { 
      h_chegada: horaChegada,
      qtd_pax: qtdPax ?? viagem.qtd_pax,
      aguardando_retorno: aguardarRetorno
    });

    // Apenas atualizar status do motorista se encerrou (não está em standby)
    if (viagem.evento_id && novoStatus === 'encerrado') {
      const temOutrasViagens = await motoristaTemViagensAtivas(viagem.motorista_id, viagem.motorista, viagem.evento_id, viagem.id);
      if (!temOutrasViagens) {
        await atualizarStatusMotorista(viagem.motorista_id, viagem.motorista, viagem.evento_id, 'disponivel');
      }
    }
    
    // Atualizar localização do motorista para o ponto de desembarque
    if (viagem.evento_id && viagem.ponto_desembarque) {
      await atualizarLocalizacaoMotorista(
        viagem.motorista_id, 
        viagem.motorista, 
        viagem.evento_id, 
        viagem.ponto_desembarque,
        now.toISOString()
      );
    }
    
    toast.success(aguardarRetorno ? 'Aguardando retorno...' : 'Rota concluída!');
    return true;
  }, [user, registrarLog, getAgoraSync]);

  const encerrarViagem = useCallback(async (viagem: Viagem, observacao?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = getAgoraSync();

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'encerrado' as StatusViagemOperacao,
        h_fim_real: now.toISOString(),
        finalizado_por: user.id,
        atualizado_por: user.id,
        encerrado: true,
        observacao: observacao || viagem.observacao
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao encerrar viagem:', error);
      toast.error('Erro ao encerrar viagem');
      return false;
    }

    await registrarLog(viagem.id, 'encerramento');

    // Se a viagem veio de uma missão, fechar todas as viagens órfãs da mesma missão
    if (viagem.origem_missao_id) {
      await supabase
        .from('viagens')
        .update({
          status: 'encerrado' as StatusViagemOperacao,
          h_fim_real: now.toISOString(),
          encerrado: true,
          finalizado_por: user.id,
        })
        .eq('origem_missao_id', viagem.origem_missao_id)
        .neq('id', viagem.id)
        .in('status', ['agendado', 'em_andamento', 'aguardando_retorno']);
    }

    // Verificar se motorista tem outras viagens ativas, senão voltar para 'disponivel'
    if (viagem.evento_id) {
      const temOutrasViagens = await motoristaTemViagensAtivas(viagem.motorista_id, viagem.motorista, viagem.evento_id, viagem.id);
      if (!temOutrasViagens) {
        await atualizarStatusMotorista(viagem.motorista_id, viagem.motorista, viagem.evento_id, 'disponivel');
      }
      
      // Atualizar localização do motorista para o ponto de desembarque
      if (viagem.ponto_desembarque) {
        await atualizarLocalizacaoMotorista(
          viagem.motorista_id, 
          viagem.motorista, 
          viagem.evento_id, 
          viagem.ponto_desembarque,
          now.toISOString()
        );
      }
    }

    toast.success('Viagem encerrada!');
    return true;
  }, [user, registrarLog, getAgoraSync]);

  const cancelarViagem = useCallback(async (viagem: Viagem, motivo?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'cancelado' as StatusViagemOperacao,
        encerrado: true,
        atualizado_por: user.id,
        observacao: motivo ? `CANCELADO: ${motivo}` : viagem.observacao
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao cancelar viagem:', error);
      toast.error('Erro ao cancelar viagem');
      return false;
    }

    await registrarLog(viagem.id, 'cancelamento', { motivo });
    toast.success('Viagem cancelada');
    return true;
  }, [user, registrarLog]);

  // Iniciar viagem de retorno (cria nova viagem com origem/destino invertidos)
  const iniciarRetorno = useCallback(async (viagemOriginal: Viagem) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    const now = getAgoraSync();

    // 1. Criar nova viagem com origem/destino invertidos
    // Trigger no banco preenche automaticamente: motorista, placa, tipo_veiculo via FKs
    const { data: novaViagem, error: insertError } = await supabase
      .from('viagens')
      .insert([{
        evento_id: viagemOriginal.evento_id,
        tipo_operacao: viagemOriginal.tipo_operacao,
        motorista: viagemOriginal.motorista, // NOT NULL - trigger sobrescreve via FK
        motorista_id: viagemOriginal.motorista_id,
        veiculo_id: viagemOriginal.veiculo_id,
        ponto_embarque: viagemOriginal.ponto_desembarque, // Invertido
        ponto_embarque_id: viagemOriginal.ponto_desembarque_id,
        ponto_desembarque: viagemOriginal.ponto_embarque, // Invertido  
        ponto_desembarque_id: viagemOriginal.ponto_embarque_id,
        status: 'em_andamento',
        iniciado_por: user.id,
        criado_por: user.id,
        atualizado_por: user.id,
        viagem_pai_id: viagemOriginal.id,
        h_inicio_real: now.toISOString(),
        h_pickup: now.toTimeString().slice(0, 8),
        qtd_pax: 0
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar viagem de retorno:', insertError);
      toast.error('Erro ao iniciar retorno');
      return null;
    }

    // 2. Encerrar viagem original
    await supabase
      .from('viagens')
      .update({ 
        status: 'encerrado' as StatusViagemOperacao, 
        encerrado: true,
        finalizado_por: user.id,
        atualizado_por: user.id,
        h_fim_real: now.toISOString()
      })
      .eq('id', viagemOriginal.id);

    // 3. Registrar logs
    await registrarLog(viagemOriginal.id, 'encerramento', { motivo: 'Iniciou retorno' });
    await registrarLog(novaViagem.id, 'inicio', { 
      motorista: viagemOriginal.motorista,
      placa: viagemOriginal.placa,
      viagem_origem: viagemOriginal.id
    });

    // 4. Manter motorista em 'em_viagem'
    if (viagemOriginal.evento_id) {
      await atualizarStatusMotorista(viagemOriginal.motorista_id, viagemOriginal.motorista, viagemOriginal.evento_id, 'em_viagem');
    }

    toast.success('Retorno iniciado!');
    return novaViagem;
  }, [user, registrarLog, getAgoraSync]);

  // Marcar retorno na mesma viagem (inverte origem/destino, mantém em_andamento)
  const marcarRetorno = useCallback(async (viagem: Viagem, qtdPax: number, observacao?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = getAgoraSync();

    const { error } = await supabase
      .from('viagens')
      .update({
        ponto_embarque: viagem.ponto_desembarque,
        ponto_embarque_id: viagem.ponto_desembarque_id,
        ponto_desembarque: viagem.ponto_embarque,
        ponto_desembarque_id: viagem.ponto_embarque_id,
        qtd_pax: qtdPax,
        observacao: observacao || viagem.observacao,
        viagem_pai_id: viagem.id, // sinaliza que está retornando
        h_chegada: now.toTimeString().slice(0, 8),
        atualizado_por: user.id
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao marcar retorno:', error);
      toast.error('Erro ao marcar retorno');
      return false;
    }

    await registrarLog(viagem.id, 'retorno', {
      qtd_pax: qtdPax,
      de: viagem.ponto_desembarque,
      para: viagem.ponto_embarque
    });

    toast.success('Retornando à base!');
    return true;
  }, [user, registrarLog, getAgoraSync]);

  return {
    iniciarViagem,
    registrarChegada,
    encerrarViagem,
    cancelarViagem,
    iniciarRetorno,
    marcarRetorno
  };
}
