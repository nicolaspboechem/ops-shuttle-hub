import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { toast } from 'sonner';

// Helper para atualizar status do motorista
async function atualizarStatusMotorista(motoristaId: string, novoStatus: string) {
  const { error } = await supabase
    .from('motoristas')
    .update({ status: novoStatus } as any)
    .eq('id', motoristaId);

  if (error) {
    console.error('Erro ao atualizar status do motorista:', error);
  }
}

// Helper para atualizar localização do motorista
async function atualizarLocalizacaoMotorista(
  motoristaId: string, 
  localizacao: string | null,
  timestampSync: string
) {
  const { error } = await supabase
    .from('motoristas')
    .update({ 
      ultima_localizacao: localizacao,
      ultima_localizacao_at: timestampSync
    } as any)
    .eq('id', motoristaId);

  if (error) {
    console.error('Erro ao atualizar localização do motorista:', error);
  }
}

// Helper para verificar se motorista tem outras viagens ativas
async function motoristaTemViagensAtivas(motoristaId: string, eventoId: string, viagemIdExcluir?: string): Promise<boolean> {
  let query = supabase
    .from('viagens')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('motorista_id', motoristaId)
    .in('status', ['agendado', 'em_andamento', 'aguardando_retorno']);

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

/**
 * Hook específico para operações de viagem do MOTORISTA.
 * Agora usa useAuth() (Supabase Auth unificado) com motoristaId do context.
 */
export function useViagemOperacaoMotorista() {
  const { user, motoristaId, profile } = useAuth();
  const { getAgoraSync } = useServerTime();

  const motoristaNome = profile?.full_name || '';

  const registrarLog = useCallback(async (
    viagemId: string, 
    acao: string, 
    detalhes?: Record<string, unknown>
  ) => {
    if (!user || !motoristaId) return;
    
    await supabase.from('viagem_logs').insert([{
      viagem_id: viagemId,
      user_id: motoristaId,
      acao,
      detalhes: {
        ...detalhes,
        via: 'app_motorista',
        motorista_nome: motoristaNome,
        nome_usuario: motoristaNome
      } as any
    }]);
  }, [user, motoristaId, motoristaNome]);

  const iniciarViagem = useCallback(async (viagem: Viagem) => {
    if (!user || !motoristaId) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }

    const now = getAgoraSync();

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'em_andamento' as StatusViagemOperacao,
        iniciado_por: motoristaId,
        atualizado_por: motoristaId,
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

    await atualizarStatusMotorista(motoristaId, 'em_viagem');
    
    toast.success('Viagem iniciada!');
    return true;
  }, [user, motoristaId, registrarLog, getAgoraSync]);

  const registrarChegada = useCallback(async (viagem: Viagem, qtdPax?: number) => {
    if (!user || !motoristaId) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }

    const now = getAgoraSync();
    const horaChegada = now.toTimeString().slice(0, 8);
    
    const isShuttle = viagem.tipo_operacao === 'shuttle';
    const novoStatus = isShuttle ? 'aguardando_retorno' : 'encerrado';

    const { error } = await supabase
      .from('viagens')
      .update({
        status: novoStatus as StatusViagemOperacao,
        h_chegada: horaChegada,
        h_fim_real: novoStatus === 'encerrado' ? now.toISOString() : null,
        finalizado_por: novoStatus === 'encerrado' ? motoristaId : null,
        atualizado_por: motoristaId,
        encerrado: novoStatus === 'encerrado',
        qtd_pax: qtdPax ?? viagem.qtd_pax
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
      aguardando_retorno: isShuttle
    });

    if (viagem.evento_id && novoStatus === 'encerrado') {
      const temOutrasViagens = await motoristaTemViagensAtivas(
        motoristaId, 
        viagem.evento_id, 
        viagem.id
      );
      if (!temOutrasViagens) {
        await atualizarStatusMotorista(motoristaId, 'disponivel');
      }
    }
    
    if (viagem.ponto_desembarque) {
      await atualizarLocalizacaoMotorista(
        motoristaId, 
        viagem.ponto_desembarque,
        now.toISOString()
      );
    }
    
    if (isShuttle) {
      toast.success('Chegou ao destino!', {
        description: '🔄 Aguardando instruções da coordenação para retorno.',
        duration: 5000,
      });
    } else {
      toast.success('Rota concluída! ✅', {
        description: viagem.tipo_operacao === 'missao' 
          ? 'Missão finalizada com sucesso.' 
          : 'Transfer encerrado com sucesso.',
        duration: 4000,
      });
    }
    
    return true;
  }, [user, motoristaId, registrarLog, getAgoraSync]);

  return {
    iniciarViagem,
    registrarChegada,
  };
}
