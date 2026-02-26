import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AlertaFrotaDetalhado {
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
  veiculo?: { nome: string | null; placa: string; tipo_veiculo: string };
  motorista?: { nome: string };
}

export function useAlertasFrotaDetalhado(eventoId?: string) {
  const [alertas, setAlertas] = useState<AlertaFrotaDetalhado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventoId) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('alertas_frota')
        .select(`
          *,
          veiculo:veiculos!veiculo_id(nome, placa, tipo_veiculo),
          motorista:motoristas!motorista_id(nome)
        `)
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      setAlertas((data as unknown as AlertaFrotaDetalhado[]) || []);
      setLoading(false);
    };
    fetch();
  }, [eventoId]);

  return { alertas, loading };
}
