import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';
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
    .eq('encerrado', false);

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
 * Usa useDriverAuth() (JWT customizado) ao invés de useAuth() (Supabase Auth).
 * 
 * Permissões:
 * - Transfer/Missão: Pode iniciar e encerrar
 * - Shuttle: Pode iniciar, mas só registra chegada (standby) - não encerra
 */
export function useViagemOperacaoMotorista() {
  const { driverSession } = useDriverAuth();
  const { getAgoraSync } = useServerTime();

  const registrarLog = useCallback(async (
    viagemId: string, 
    acao: string, 
    detalhes?: Record<string, unknown>
  ) => {
    if (!driverSession) return;
    
    await supabase.from('viagem_logs').insert([{
      viagem_id: viagemId,
      user_id: driverSession.motorista_id, // UUID do motorista
      acao,
      detalhes: {
        ...detalhes,
        via: 'app_motorista',
        motorista_nome: driverSession.motorista_nome
      } as any
    }]);
  }, [driverSession]);

  const iniciarViagem = useCallback(async (viagem: Viagem) => {
    if (!driverSession || driverSession.expires_at < Date.now()) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }

    const now = getAgoraSync();

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'em_andamento' as StatusViagemOperacao,
        iniciado_por: driverSession.motorista_id,
        atualizado_por: driverSession.motorista_id,
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

    // Atualizar status do motorista para 'em_viagem'
    await atualizarStatusMotorista(driverSession.motorista_id, 'em_viagem');
    
    toast.success('Viagem iniciada!');
    return true;
  }, [driverSession, registrarLog, getAgoraSync]);

  /**
   * Registrar chegada ao destino.
   * - Transfer/Missão: Encerra diretamente
   * - Shuttle: Coloca em standby (aguardando_retorno) - motorista não encerra shuttle
   */
  const registrarChegada = useCallback(async (viagem: Viagem, qtdPax?: number) => {
    if (!driverSession || driverSession.expires_at < Date.now()) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }

    const now = getAgoraSync();
    const horaChegada = now.toTimeString().slice(0, 8);
    
    // Shuttle: motorista sempre coloca em standby (não encerra)
    // Transfer/Missão: motorista pode encerrar diretamente
    const isShuttle = viagem.tipo_operacao === 'shuttle';
    const novoStatus = isShuttle ? 'aguardando_retorno' : 'encerrado';

    const { error } = await supabase
      .from('viagens')
      .update({
        status: novoStatus as StatusViagemOperacao,
        h_chegada: horaChegada,
        h_fim_real: novoStatus === 'encerrado' ? now.toISOString() : null,
        finalizado_por: novoStatus === 'encerrado' ? driverSession.motorista_id : null,
        atualizado_por: driverSession.motorista_id,
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

    // Apenas atualizar status do motorista se encerrou (não está em standby)
    if (viagem.evento_id && novoStatus === 'encerrado') {
      const temOutrasViagens = await motoristaTemViagensAtivas(
        driverSession.motorista_id, 
        viagem.evento_id, 
        viagem.id
      );
      if (!temOutrasViagens) {
        await atualizarStatusMotorista(driverSession.motorista_id, 'disponivel');
      }
    }
    
    // Atualizar localização do motorista para o ponto de desembarque
    if (viagem.ponto_desembarque) {
      await atualizarLocalizacaoMotorista(
        driverSession.motorista_id, 
        viagem.ponto_desembarque,
        now.toISOString()
      );
    }
    
    if (isShuttle) {
      toast.success('Chegou ao destino! Aguardando retorno...');
    } else {
      toast.success('Rota concluída!');
    }
    
    return true;
  }, [driverSession, registrarLog, getAgoraSync]);

  return {
    iniciarViagem,
    registrarChegada,
    // Motorista NÃO tem acesso a:
    // - encerrarViagem (para shuttle)
    // - cancelarViagem
    // - iniciarRetorno
  };
}
