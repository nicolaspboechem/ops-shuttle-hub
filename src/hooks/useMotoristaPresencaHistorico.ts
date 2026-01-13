import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { Veiculo } from '@/hooks/useCadastros';

export interface PresencaHistorico {
  id: string;
  motorista_id: string;
  evento_id: string;
  data: string;
  checkin_at: string | null;
  checkout_at: string | null;
  veiculo_id: string | null;
  observacao_checkout: string | null;
  created_at: string;
  updated_at: string;
  veiculo?: Veiculo | null;
}

export interface MotoristaPresencaAgregado {
  motorista_id: string;
  motorista_nome: string;
  motorista_status: string | null;
  telefone: string | null;
  veiculo_atual_id: string | null;
  presencas: PresencaHistorico[];
  totalDias: number;
  tempoTotalTrabalhado: number; // em minutos
  diasComObservacao: number;
}

export function useMotoristaPresencaHistorico(
  eventoId: string | undefined,
  diasHistorico: number = 7
) {
  const [presencas, setPresencas] = useState<PresencaHistorico[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);

  const dataInicio = format(subDays(new Date(), diasHistorico), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!eventoId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel
      const [presencasRes, motoristasRes, veiculosRes] = await Promise.all([
        supabase
          .from('motorista_presenca')
          .select('*')
          .eq('evento_id', eventoId)
          .gte('data', dataInicio)
          .order('data', { ascending: false }),
        supabase
          .from('motoristas')
          .select('*')
          .eq('evento_id', eventoId)
          .order('nome', { ascending: true }),
        supabase
          .from('veiculos')
          .select('*')
          .eq('evento_id', eventoId)
      ]);

      if (presencasRes.error) throw presencasRes.error;
      if (motoristasRes.error) throw motoristasRes.error;
      if (veiculosRes.error) throw veiculosRes.error;

      setPresencas(presencasRes.data || []);
      setMotoristas(motoristasRes.data || []);
      setVeiculos(veiculosRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico de presença:', error);
    } finally {
      setLoading(false);
    }
  }, [eventoId, dataInicio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Agregar dados por motorista
  const motoristasAgregados = useMemo((): MotoristaPresencaAgregado[] => {
    return motoristas.map(motorista => {
      const presencasMotorista = presencas
        .filter(p => p.motorista_id === motorista.id)
        .map(p => ({
          ...p,
          veiculo: veiculos.find(v => v.id === p.veiculo_id) || null
        }));

      // Calcular tempo total trabalhado
      let tempoTotalTrabalhado = 0;
      presencasMotorista.forEach(p => {
        if (p.checkin_at && p.checkout_at) {
          const checkin = new Date(p.checkin_at);
          const checkout = new Date(p.checkout_at);
          tempoTotalTrabalhado += (checkout.getTime() - checkin.getTime()) / (1000 * 60);
        }
      });

      const diasComObservacao = presencasMotorista.filter(
        p => p.observacao_checkout && p.observacao_checkout.trim()
      ).length;

      return {
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        motorista_status: motorista.status,
        telefone: motorista.telefone,
        veiculo_atual_id: motorista.veiculo_id,
        presencas: presencasMotorista,
        totalDias: presencasMotorista.length,
        tempoTotalTrabalhado: Math.round(tempoTotalTrabalhado),
        diasComObservacao
      };
    }).filter(m => m.presencas.length > 0 || motoristas.some(mot => mot.id === m.motorista_id));
  }, [motoristas, presencas, veiculos]);

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalCheckins = presencas.filter(p => p.checkin_at).length;
    const totalCheckouts = presencas.filter(p => p.checkout_at).length;
    const comObservacoes = presencas.filter(p => p.observacao_checkout?.trim()).length;
    
    // Média de horas por dia
    let totalMinutos = 0;
    let diasCompletos = 0;
    presencas.forEach(p => {
      if (p.checkin_at && p.checkout_at) {
        const checkin = new Date(p.checkin_at);
        const checkout = new Date(p.checkout_at);
        totalMinutos += (checkout.getTime() - checkin.getTime()) / (1000 * 60);
        diasCompletos++;
      }
    });

    const mediaHorasPorDia = diasCompletos > 0 
      ? Math.round(totalMinutos / diasCompletos / 60 * 10) / 10 
      : 0;

    return {
      totalCheckins,
      totalCheckouts,
      comObservacoes,
      mediaHorasPorDia,
      diasCompletos,
      motoristasAtivos: motoristasAgregados.filter(m => m.presencas.length > 0).length
    };
  }, [presencas, motoristasAgregados]);

  return {
    motoristasAgregados,
    presencas,
    veiculos,
    estatisticas,
    loading,
    refetch: fetchData
  };
}
