import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface VeiculoUsoRegistro {
  id: string;
  data: string;
  motorista_id: string;
  motorista_nome: string;
  motorista_telefone: string | null;
  checkin_at: string | null;
  checkout_at: string | null;
  duracao_minutos: number;
  observacao_checkout: string | null;
}

export interface VeiculoUsoHistorico {
  veiculo_id: string;
  veiculo_placa: string;
  veiculo_nome: string | null;
  veiculo_tipo: string;
  fornecedor: string | null;
  usos: VeiculoUsoRegistro[];
  totalUsos: number;
  tempoTotalUso: number; // em minutos
  usosComObservacao: number;
  motoristasUnicos: number;
}

export function useVeiculoPresencaHistorico(
  eventoId: string | undefined,
  diasHistorico: number = 7
) {
  const [presencas, setPresencas] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dataInicio = format(subDays(new Date(), diasHistorico), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!eventoId) {
      setLoading(false);
      return;
    }

    try {
      const [presencasRes, motoristasRes, veiculosRes] = await Promise.all([
        supabase
          .from('motorista_presenca')
          .select('*')
          .eq('evento_id', eventoId)
          .gte('data', dataInicio)
          .not('veiculo_id', 'is', null)
          .order('data', { ascending: false }),
        supabase
          .from('motoristas')
          .select('id, nome, telefone')
          .eq('evento_id', eventoId),
        supabase
          .from('veiculos')
          .select('id, placa, nome, tipo_veiculo, fornecedor')
          .eq('evento_id', eventoId)
      ]);

      if (presencasRes.error) throw presencasRes.error;
      if (motoristasRes.error) throw motoristasRes.error;
      if (veiculosRes.error) throw veiculosRes.error;

      setPresencas(presencasRes.data || []);
      setMotoristas(motoristasRes.data || []);
      setVeiculos(veiculosRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico de uso de veículos:', error);
    } finally {
      setLoading(false);
    }
  }, [eventoId, dataInicio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Agregar dados por veículo
  const veiculosAgregados = useMemo((): VeiculoUsoHistorico[] => {
    const motoristasMap = new Map(motoristas.map(m => [m.id, m]));

    // Agrupar presenças por veículo
    const veiculoPresencasMap = new Map<string, any[]>();
    presencas.forEach(p => {
      if (p.veiculo_id) {
        const existing = veiculoPresencasMap.get(p.veiculo_id) || [];
        existing.push(p);
        veiculoPresencasMap.set(p.veiculo_id, existing);
      }
    });

    return veiculos
      .filter(v => veiculoPresencasMap.has(v.id))
      .map(veiculo => {
        const presencasVeiculo = veiculoPresencasMap.get(veiculo.id) || [];
        
        const usos: VeiculoUsoRegistro[] = presencasVeiculo.map(p => {
          const motorista = motoristasMap.get(p.motorista_id);
          let duracao = 0;
          if (p.checkin_at && p.checkout_at) {
            const checkin = new Date(p.checkin_at);
            const checkout = new Date(p.checkout_at);
            duracao = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60));
          }

          return {
            id: p.id,
            data: p.data,
            motorista_id: p.motorista_id,
            motorista_nome: motorista?.nome || 'Desconhecido',
            motorista_telefone: motorista?.telefone || null,
            checkin_at: p.checkin_at,
            checkout_at: p.checkout_at,
            duracao_minutos: duracao,
            observacao_checkout: p.observacao_checkout
          };
        });

        // Ordenar usos por data (mais recente primeiro)
        usos.sort((a, b) => b.data.localeCompare(a.data));

        const tempoTotalUso = usos.reduce((sum, u) => sum + u.duracao_minutos, 0);
        const usosComObservacao = usos.filter(u => u.observacao_checkout?.trim()).length;
        const motoristasUnicos = new Set(usos.map(u => u.motorista_id)).size;

        return {
          veiculo_id: veiculo.id,
          veiculo_placa: veiculo.placa,
          veiculo_nome: veiculo.nome,
          veiculo_tipo: veiculo.tipo_veiculo,
          fornecedor: veiculo.fornecedor,
          usos,
          totalUsos: usos.length,
          tempoTotalUso,
          usosComObservacao,
          motoristasUnicos
        };
      })
      .sort((a, b) => b.totalUsos - a.totalUsos);
  }, [veiculos, presencas, motoristas]);

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalUsos = presencas.length;
    const usosComObservacao = presencas.filter(p => p.observacao_checkout?.trim()).length;
    const veiculosUtilizados = new Set(presencas.map(p => p.veiculo_id)).size;
    const motoristasAtivos = new Set(presencas.map(p => p.motorista_id)).size;
    
    let totalMinutos = 0;
    let usosCompletos = 0;
    presencas.forEach(p => {
      if (p.checkin_at && p.checkout_at) {
        const checkin = new Date(p.checkin_at);
        const checkout = new Date(p.checkout_at);
        totalMinutos += (checkout.getTime() - checkin.getTime()) / (1000 * 60);
        usosCompletos++;
      }
    });

    const mediaDuracaoHoras = usosCompletos > 0 
      ? Math.round(totalMinutos / usosCompletos / 60 * 10) / 10 
      : 0;

    return {
      totalUsos,
      usosComObservacao,
      veiculosUtilizados,
      motoristasAtivos,
      totalHorasUso: Math.round(totalMinutos / 60),
      mediaDuracaoHoras
    };
  }, [presencas]);

  return {
    veiculosAgregados,
    presencas,
    veiculos,
    motoristas,
    estatisticas,
    loading,
    refetch: fetchData
  };
}
