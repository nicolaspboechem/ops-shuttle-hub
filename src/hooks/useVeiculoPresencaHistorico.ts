import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export type TipoRegistroUso = 'presenca' | 'vinculacao' | 'desvinculacao';

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
  tipo_registro: TipoRegistroUso;
  realizado_por_nome: string | null;
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
  const [vinculacoes, setVinculacoes] = useState<any[]>([]);
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
      const [presencasRes, vinculacoesRes, motoristasRes, veiculosRes] = await Promise.all([
        supabase
          .from('motorista_presenca')
          .select('*')
          .eq('evento_id', eventoId)
          .gte('data', dataInicio)
          .not('veiculo_id', 'is', null)
          .order('data', { ascending: false }),
        supabase
          .from('veiculo_vistoria_historico')
          .select('*')
          .eq('evento_id', eventoId)
          .in('tipo_vistoria', ['vinculacao', 'desvinculacao'])
          .gte('created_at', `${dataInicio}T00:00:00`)
          .order('created_at', { ascending: false }),
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
      if (vinculacoesRes.error) throw vinculacoesRes.error;
      if (motoristasRes.error) throw motoristasRes.error;
      if (veiculosRes.error) throw veiculosRes.error;

      setPresencas(presencasRes.data || []);
      setVinculacoes(vinculacoesRes.data || []);
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
    const veiculoUsosMap = new Map<string, VeiculoUsoRegistro[]>();

    // Add presença records
    presencas.forEach(p => {
      if (p.veiculo_id) {
        const motorista = motoristasMap.get(p.motorista_id);
        let duracao = 0;
        if (p.checkin_at && p.checkout_at) {
          const checkin = new Date(p.checkin_at);
          const checkout = new Date(p.checkout_at);
          duracao = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60));
        }
        const existing = veiculoUsosMap.get(p.veiculo_id) || [];
        existing.push({
          id: p.id,
          data: p.data,
          motorista_id: p.motorista_id,
          motorista_nome: motorista?.nome || 'Desconhecido',
          motorista_telefone: motorista?.telefone || null,
          checkin_at: p.checkin_at,
          checkout_at: p.checkout_at,
          duracao_minutos: duracao,
          observacao_checkout: p.observacao_checkout,
          tipo_registro: 'presenca',
          realizado_por_nome: null,
        });
        veiculoUsosMap.set(p.veiculo_id, existing);
      }
    });

    // Add vinculacao/desvinculacao records
    vinculacoes.forEach(v => {
      const motorista = v.motorista_id ? motoristasMap.get(v.motorista_id) : null;
      const dataStr = v.created_at ? format(new Date(v.created_at), 'yyyy-MM-dd') : '';
      const existing = veiculoUsosMap.get(v.veiculo_id) || [];
      existing.push({
        id: v.id,
        data: dataStr,
        motorista_id: v.motorista_id || '',
        motorista_nome: v.motorista_nome || motorista?.nome || 'Desconhecido',
        motorista_telefone: motorista?.telefone || null,
        checkin_at: v.tipo_vistoria === 'vinculacao' ? v.created_at : null,
        checkout_at: v.tipo_vistoria === 'desvinculacao' ? v.created_at : null,
        duracao_minutos: 0,
        observacao_checkout: v.observacoes || null,
        tipo_registro: v.tipo_vistoria as TipoRegistroUso,
        realizado_por_nome: v.realizado_por_nome || null,
      });
      veiculoUsosMap.set(v.veiculo_id, existing);
    });

    return veiculos
      .filter(v => veiculoUsosMap.has(v.id))
      .map(veiculo => {
        const usos = veiculoUsosMap.get(veiculo.id) || [];

        // Ordenar usos por data (mais recente primeiro)
        usos.sort((a, b) => b.data.localeCompare(a.data));

        const tempoTotalUso = usos.reduce((sum, u) => sum + u.duracao_minutos, 0);
        const usosComObservacao = usos.filter(u => u.observacao_checkout?.trim()).length;
        const motoristasUnicos = new Set(usos.filter(u => u.motorista_id).map(u => u.motorista_id)).size;

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
  }, [veiculos, presencas, vinculacoes, motoristas]);

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
    vinculacoes,
    veiculos,
    motoristas,
    estatisticas,
    loading,
    refetch: fetchData
  };
}
