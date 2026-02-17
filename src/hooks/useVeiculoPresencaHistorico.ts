import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface VeiculoUsoRegistro {
  id: string;
  data: string;
  motorista_id: string;
  motorista_nome: string;
  motorista_telefone: string | null;
  vinculado_em: string;
  desvinculado_em: string | null;
  duracao_minutos: number;
  observacoes: string | null;
  vinculado_por: string | null;
  desvinculado_por: string | null;
  em_uso: boolean;
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
  ciclosEmUso: number;
}

export function useVeiculoPresencaHistorico(
  eventoId: string | undefined,
  diasHistorico: number = 7
) {
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
      const [vinculacoesRes, motoristasRes, veiculosRes] = await Promise.all([
        supabase
          .from('veiculo_vistoria_historico')
          .select('*')
          .eq('evento_id', eventoId)
          .in('tipo_vistoria', ['vinculacao', 'desvinculacao'])
          .gte('created_at', `${dataInicio}T00:00:00`)
          .order('created_at', { ascending: true }),
        supabase
          .from('motoristas')
          .select('id, nome, telefone')
          .eq('evento_id', eventoId),
        supabase
          .from('veiculos')
          .select('id, placa, nome, tipo_veiculo, fornecedor')
          .eq('evento_id', eventoId)
      ]);

      if (vinculacoesRes.error) throw vinculacoesRes.error;
      if (motoristasRes.error) throw motoristasRes.error;
      if (veiculosRes.error) throw veiculosRes.error;

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

  // Parear vinculação/desvinculação por veículo
  const veiculosAgregados = useMemo((): VeiculoUsoHistorico[] => {
    const motoristasMap = new Map(motoristas.map(m => [m.id, m]));

    // Agrupar registros por veiculo_id
    const porVeiculo = new Map<string, any[]>();
    vinculacoes.forEach(v => {
      const arr = porVeiculo.get(v.veiculo_id) || [];
      arr.push(v);
      porVeiculo.set(v.veiculo_id, arr);
    });

    return veiculos
      .filter(v => porVeiculo.has(v.id))
      .map(veiculo => {
        const registros = porVeiculo.get(veiculo.id) || [];
        // Já vem ordenado por created_at ascending da query

        const usos: VeiculoUsoRegistro[] = [];
        let cicloAberto: any = null;

        for (const reg of registros) {
          if (reg.tipo_vistoria === 'vinculacao') {
            // Se há ciclo aberto sem desvinculação, fecha implicitamente usando a nova vinculação como timestamp
            if (cicloAberto) {
              const motorista = cicloAberto.motorista_id ? motoristasMap.get(cicloAberto.motorista_id) : null;
              const vinc = new Date(cicloAberto.created_at);
              const desv = new Date(reg.created_at);
              const duracao = Math.round((desv.getTime() - vinc.getTime()) / (1000 * 60));
              usos.push({
                id: cicloAberto.id,
                data: format(vinc, 'yyyy-MM-dd'),
                motorista_id: cicloAberto.motorista_id || '',
                motorista_nome: cicloAberto.motorista_nome || motorista?.nome || 'Desconhecido',
                motorista_telefone: motorista?.telefone || null,
                vinculado_em: cicloAberto.created_at,
                desvinculado_em: reg.created_at,
                duracao_minutos: Math.max(duracao, 0),
                observacoes: null,
                vinculado_por: cicloAberto.realizado_por_nome || null,
                desvinculado_por: '(troca de motorista)',
                em_uso: false,
              });
            }
            cicloAberto = reg;
          } else if (reg.tipo_vistoria === 'desvinculacao') {
            if (cicloAberto) {
              const motorista = cicloAberto.motorista_id ? motoristasMap.get(cicloAberto.motorista_id) : null;
              const vinc = new Date(cicloAberto.created_at);
              const desv = new Date(reg.created_at);
              const duracao = Math.round((desv.getTime() - vinc.getTime()) / (1000 * 60));

              usos.push({
                id: cicloAberto.id,
                data: format(vinc, 'yyyy-MM-dd'),
                motorista_id: cicloAberto.motorista_id || '',
                motorista_nome: cicloAberto.motorista_nome || motorista?.nome || 'Desconhecido',
                motorista_telefone: motorista?.telefone || null,
                vinculado_em: cicloAberto.created_at,
                desvinculado_em: reg.created_at,
                duracao_minutos: Math.max(duracao, 0),
                observacoes: reg.observacoes || null,
                vinculado_por: cicloAberto.realizado_por_nome || null,
                desvinculado_por: reg.realizado_por_nome || null,
                em_uso: false,
              });
              cicloAberto = null;
            }
            // desvinculação sem vinculação aberta: ignorar (registro órfão)
          }
        }

        // Ciclo aberto no final = em uso atualmente
        if (cicloAberto) {
          const motorista = cicloAberto.motorista_id ? motoristasMap.get(cicloAberto.motorista_id) : null;
          usos.push({
            id: cicloAberto.id,
            data: format(new Date(cicloAberto.created_at), 'yyyy-MM-dd'),
            motorista_id: cicloAberto.motorista_id || '',
            motorista_nome: cicloAberto.motorista_nome || motorista?.nome || 'Desconhecido',
            motorista_telefone: motorista?.telefone || null,
            vinculado_em: cicloAberto.created_at,
            desvinculado_em: null,
            duracao_minutos: 0,
            observacoes: null,
            vinculado_por: cicloAberto.realizado_por_nome || null,
            desvinculado_por: null,
            em_uso: true,
          });
        }

        // Ordenar por data desc (mais recente primeiro)
        usos.sort((a, b) => b.vinculado_em.localeCompare(a.vinculado_em));

        const tempoTotalUso = usos.reduce((sum, u) => sum + u.duracao_minutos, 0);
        const usosComObservacao = usos.filter(u => u.observacoes?.trim()).length;
        const motoristasUnicos = new Set(usos.filter(u => u.motorista_id).map(u => u.motorista_id)).size;
        const ciclosEmUso = usos.filter(u => u.em_uso).length;

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
          motoristasUnicos,
          ciclosEmUso
        };
      })
      .filter(v => v.usos.length > 0)
      .sort((a, b) => b.totalUsos - a.totalUsos);
  }, [veiculos, vinculacoes, motoristas]);

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const allUsos = veiculosAgregados.flatMap(v => v.usos);
    const totalCiclos = allUsos.length;
    const ciclosCompletos = allUsos.filter(u => !u.em_uso);
    const ciclosEmUso = allUsos.filter(u => u.em_uso).length;
    const usosComObservacao = allUsos.filter(u => u.observacoes?.trim()).length;
    const veiculosUtilizados = veiculosAgregados.length;
    const motoristasAtivos = new Set(allUsos.filter(u => u.motorista_id).map(u => u.motorista_id)).size;

    const totalMinutos = ciclosCompletos.reduce((sum, u) => sum + u.duracao_minutos, 0);
    const mediaDuracaoHoras = ciclosCompletos.length > 0
      ? Math.round(totalMinutos / ciclosCompletos.length / 60 * 10) / 10
      : 0;

    return {
      totalCiclos,
      ciclosEmUso,
      usosComObservacao,
      veiculosUtilizados,
      motoristasAtivos,
      totalHorasUso: Math.round(totalMinutos / 60),
      mediaDuracaoHoras
    };
  }, [veiculosAgregados]);

  return {
    veiculosAgregados,
    vinculacoes,
    veiculos,
    motoristas,
    estatisticas,
    loading,
    refetch: fetchData
  };
}
