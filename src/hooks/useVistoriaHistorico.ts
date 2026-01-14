import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VistoriaHistorico {
  id: string;
  veiculo_id: string;
  evento_id: string;
  tipo_vistoria: string;
  status_anterior: string | null;
  status_novo: string;
  possui_avarias: boolean;
  inspecao_dados: any;
  fotos_urls: string[] | null;
  nivel_combustivel: string | null;
  km_registrado: number | null;
  observacoes: string | null;
  realizado_por: string | null;
  realizado_por_nome: string | null;
  motorista_id: string | null;
  motorista_nome: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

export function useVistoriaHistorico(veiculoId: string | null) {
  return useQuery({
    queryKey: ['vistoria-historico', veiculoId],
    queryFn: async () => {
      if (!veiculoId) return [];
      
      const { data, error } = await supabase
        .from('veiculo_vistoria_historico')
        .select(`
          *,
          profile:profiles!realizado_por(full_name)
        `)
        .eq('veiculo_id', veiculoId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar histórico de vistorias:', error);
        throw error;
      }
      
      return data as VistoriaHistorico[];
    },
    enabled: !!veiculoId
  });
}

export function useVistoriaHistoricoByPlaca(placa: string | null, eventoId: string) {
  return useQuery({
    queryKey: ['vistoria-historico-placa', placa, eventoId],
    queryFn: async () => {
      if (!placa) return [];
      
      // Primeiro buscar o veículo pela placa
      const { data: veiculo, error: veiculoError } = await supabase
        .from('veiculos')
        .select('id')
        .eq('placa', placa)
        .eq('evento_id', eventoId)
        .single();
      
      if (veiculoError || !veiculo) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('veiculo_vistoria_historico')
        .select(`
          *,
          profile:profiles!realizado_por(full_name)
        `)
        .eq('veiculo_id', veiculo.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar histórico de vistorias:', error);
        throw error;
      }
      
      return data as VistoriaHistorico[];
    },
    enabled: !!placa && !!eventoId
  });
}
