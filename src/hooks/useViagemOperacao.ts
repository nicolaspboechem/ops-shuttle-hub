import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { toast } from 'sonner';

// Helper para atualizar status do motorista
async function atualizarStatusMotorista(motoristaNome: string, eventoId: string, novoStatus: string) {
  const { error } = await supabase
    .from('motoristas')
    .update({ status: novoStatus } as any)
    .eq('nome', motoristaNome)
    .eq('evento_id', eventoId);

  if (error) {
    console.error('Erro ao atualizar status do motorista:', error);
  }
}

// Helper para verificar se motorista tem outras viagens ativas
async function motoristaTemViagensAtivas(motoristaNome: string, eventoId: string, viagemIdExcluir?: string): Promise<boolean> {
  let query = supabase
    .from('viagens')
    .select('id')
    .eq('motorista', motoristaNome)
    .eq('evento_id', eventoId)
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

export function useViagemOperacao() {
  const { user } = useAuth();

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
      detalhes: detalhes as any
    }]);
  }, [user]);

  const iniciarViagem = useCallback(async (viagem: Viagem) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'em_andamento' as StatusViagemOperacao,
        iniciado_por: user.id,
        atualizado_por: user.id,
        h_inicio_real: new Date().toISOString()
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

    // Sincronizar status do motorista para 'em_viagem'
    if (viagem.motorista && viagem.evento_id) {
      await atualizarStatusMotorista(viagem.motorista, viagem.evento_id, 'em_viagem');
    }
    
    toast.success('Viagem iniciada!');
    return true;
  }, [user, registrarLog]);

  // Registrar chegada agora ENCERRA a viagem (cada viagem = 1 rota)
  const registrarChegada = useCallback(async (viagem: Viagem, qtdPax?: number) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const now = new Date();
    const horaChegada = now.toTimeString().slice(0, 8);

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'encerrado' as StatusViagemOperacao,
        h_chegada: horaChegada,
        h_fim_real: now.toISOString(),
        finalizado_por: user.id,
        atualizado_por: user.id,
        encerrado: true,
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
      qtd_pax: qtdPax ?? viagem.qtd_pax
    });

    // Verificar se motorista tem outras viagens ativas, senão voltar para 'disponivel'
    if (viagem.motorista && viagem.evento_id) {
      const temOutrasViagens = await motoristaTemViagensAtivas(viagem.motorista, viagem.evento_id, viagem.id);
      if (!temOutrasViagens) {
        await atualizarStatusMotorista(viagem.motorista, viagem.evento_id, 'disponivel');
      }
    }
    
    toast.success('Rota concluída!');
    return true;
  }, [user, registrarLog]);

  const encerrarViagem = useCallback(async (viagem: Viagem) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'encerrado' as StatusViagemOperacao,
        h_fim_real: new Date().toISOString(),
        finalizado_por: user.id,
        atualizado_por: user.id,
        encerrado: true
      })
      .eq('id', viagem.id);

    if (error) {
      console.error('Erro ao encerrar viagem:', error);
      toast.error('Erro ao encerrar viagem');
      return false;
    }

    await registrarLog(viagem.id, 'encerramento');

    // Verificar se motorista tem outras viagens ativas, senão voltar para 'disponivel'
    if (viagem.motorista && viagem.evento_id) {
      const temOutrasViagens = await motoristaTemViagensAtivas(viagem.motorista, viagem.evento_id, viagem.id);
      if (!temOutrasViagens) {
        await atualizarStatusMotorista(viagem.motorista, viagem.evento_id, 'disponivel');
      }
    }

    toast.success('Viagem encerrada!');
    return true;
  }, [user, registrarLog]);

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

  return {
    iniciarViagem,
    registrarChegada,
    encerrarViagem,
    cancelarViagem
  };
}
