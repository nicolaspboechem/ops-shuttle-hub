import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AlertaFrota {
  id: string;
  evento_id: string;
  veiculo_id: string;
  motorista_id: string;
  tipo: string;
  nivel_combustivel: string | null;
  observacao: string | null;
  status: string;
  resolvido_por: string | null;
  resolvido_em: string | null;
  created_at: string;
  // Joined
  veiculo?: { placa: string; nome: string | null };
  motorista?: { nome: string };
  evento?: { nome_planilha: string };
}

export function useAlertasFrota(eventoId?: string) {
  const [alertas, setAlertas] = useState<AlertaFrota[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlertas = useCallback(async () => {
    let query = supabase
      .from('alertas_frota')
      .select(`
        *,
        veiculo:veiculos!veiculo_id(placa, nome),
        motorista:motoristas!motorista_id(nome),
        evento:eventos!evento_id(nome_planilha)
      `)
      .in('status', ['aberto', 'pendente'])
      .order('created_at', { ascending: false });

    if (eventoId) {
      query = query.eq('evento_id', eventoId);
    }

    const { data } = await query;
    setAlertas((data as unknown as AlertaFrota[]) || []);
    setLoading(false);
  }, [eventoId]);

  const criarAlerta = useCallback(async (params: {
    evento_id: string;
    veiculo_id: string;
    motorista_id: string;
    nivel_combustivel: string;
    observacao?: string;
  }) => {
    // Insert alert
    const { error } = await supabase.from('alertas_frota').insert({
      evento_id: params.evento_id,
      veiculo_id: params.veiculo_id,
      motorista_id: params.motorista_id,
      tipo: 'combustivel_baixo',
      nivel_combustivel: params.nivel_combustivel,
      observacao: params.observacao || null,
      status: 'aberto',
    });

    if (error) throw error;

    // Update vehicle fuel level
    await supabase
      .from('veiculos')
      .update({ nivel_combustivel: params.nivel_combustivel })
      .eq('id', params.veiculo_id);
  }, []);

  const atualizarStatus = useCallback(async (alertaId: string, novoStatus: string, resolvidoPor?: string) => {
    const updates: Record<string, unknown> = { status: novoStatus };
    if (novoStatus === 'resolvido') {
      updates.resolvido_por = resolvidoPor || null;
      updates.resolvido_em = new Date().toISOString();
    }
    const { error } = await supabase
      .from('alertas_frota')
      .update(updates)
      .eq('id', alertaId);
    if (error) throw error;
  }, []);

  useEffect(() => {
    fetchAlertas();

    const realtimeConfig: any = {
      event: '*', schema: 'public', table: 'alertas_frota',
      ...(eventoId ? { filter: `evento_id=eq.${eventoId}` } : {}),
    };

    const channel = supabase
      .channel(`alertas-frota-${eventoId || 'all'}`)
      .on('postgres_changes', realtimeConfig, () => fetchAlertas())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAlertas]);

  return {
    alertas,
    alertasAbertos: alertas.filter(a => a.status === 'aberto'),
    alertasPendentes: alertas.filter(a => a.status === 'pendente'),
    loading,
    criarAlerta,
    atualizarStatus,
    refetch: fetchAlertas,
  };
}
