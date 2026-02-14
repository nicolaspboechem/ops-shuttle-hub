import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useServerTime } from '@/hooks/useServerTime';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { toast } from 'sonner';

/**
 * Hook de operação de viagem para Staff (Custom JWT).
 * Usa useCurrentUser() em vez de useAuth().
 * NÃO registra logs em viagem_logs (shuttle não gera notificações).
 * NÃO atualiza status/localização de motorista (shuttle usa motorista='Shuttle').
 */
export function useViagemOperacaoStaff() {
  const { userId } = useCurrentUser();
  const { getAgoraSync } = useServerTime();

  const iniciarViagem = useCallback(async (viagem: Viagem) => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = getAgoraSync();

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'em_andamento' as StatusViagemOperacao,
        iniciado_por: userId,
        atualizado_por: userId,
        h_inicio_real: now.toISOString()
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao iniciar viagem:', error);
      toast.error('Erro ao iniciar viagem');
      return false;
    }

    toast.success('Viagem iniciada!');
    return true;
  }, [userId, getAgoraSync]);

  const registrarChegada = useCallback(async (viagem: Viagem, qtdPax?: number, aguardarRetorno?: boolean) => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = getAgoraSync();
    const horaChegada = now.toTimeString().slice(0, 8);

    const novoStatus = (aguardarRetorno && viagem.tipo_operacao === 'shuttle')
      ? 'aguardando_retorno'
      : 'encerrado';

    const { error } = await supabase
      .from('viagens')
      .update({
        status: novoStatus as StatusViagemOperacao,
        h_chegada: horaChegada,
        h_fim_real: novoStatus === 'encerrado' ? now.toISOString() : null,
        finalizado_por: novoStatus === 'encerrado' ? userId : null,
        atualizado_por: userId,
        encerrado: novoStatus === 'encerrado',
        qtd_pax: qtdPax ?? viagem.qtd_pax
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao registrar chegada:', error);
      toast.error('Erro ao registrar chegada');
      return false;
    }

    toast.success(aguardarRetorno ? 'Aguardando retorno...' : 'Rota concluída!');
    return true;
  }, [userId, getAgoraSync]);

  const encerrarViagem = useCallback(async (viagem: Viagem) => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = getAgoraSync();

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'encerrado' as StatusViagemOperacao,
        h_fim_real: now.toISOString(),
        finalizado_por: userId,
        atualizado_por: userId,
        encerrado: true
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao encerrar viagem:', error);
      toast.error('Erro ao encerrar viagem');
      return false;
    }

    toast.success('Viagem encerrada!');
    return true;
  }, [userId, getAgoraSync]);

  const cancelarViagem = useCallback(async (viagem: Viagem, motivo?: string) => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'cancelado' as StatusViagemOperacao,
        encerrado: true,
        atualizado_por: userId,
        observacao: motivo ? `CANCELADO: ${motivo}` : viagem.observacao
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao cancelar viagem:', error);
      toast.error('Erro ao cancelar viagem');
      return false;
    }

    toast.success('Viagem cancelada');
    return true;
  }, [userId]);

  const iniciarRetorno = useCallback(async (viagemOriginal: Viagem) => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return null;
    }

    const now = getAgoraSync();

    // 1. Criar nova viagem com origem/destino invertidos
    const { data: novaViagem, error: insertError } = await supabase
      .from('viagens')
      .insert([{
        evento_id: viagemOriginal.evento_id,
        tipo_operacao: viagemOriginal.tipo_operacao,
        motorista: viagemOriginal.motorista,
        motorista_id: viagemOriginal.motorista_id,
        veiculo_id: viagemOriginal.veiculo_id,
        placa: viagemOriginal.placa,
        tipo_veiculo: viagemOriginal.tipo_veiculo,
        ponto_embarque: viagemOriginal.ponto_desembarque,
        ponto_embarque_id: viagemOriginal.ponto_desembarque_id,
        ponto_desembarque: viagemOriginal.ponto_embarque,
        ponto_desembarque_id: viagemOriginal.ponto_embarque_id,
        status: 'em_andamento',
        iniciado_por: userId,
        criado_por: userId,
        atualizado_por: userId,
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
        finalizado_por: userId,
        atualizado_por: userId,
        h_fim_real: now.toISOString()
      })
      .eq('id', viagemOriginal.id);

    toast.success('Retorno iniciado!');
    return novaViagem;
  }, [userId, getAgoraSync]);

  return {
    iniciarViagem,
    registrarChegada,
    encerrarViagem,
    cancelarViagem,
    iniciarRetorno
  };
}
