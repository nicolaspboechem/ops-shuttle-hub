import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { Veiculo } from '@/hooks/useCadastros';

const CARGA_HORARIA_MINUTOS = 720; // 12h

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
  tempoTotalTrabalhado: number; // em minutos - SOMENTE turnos completos
  diasComObservacao: number;
  // Novos campos para auditoria de ponto
  horasTrabalhadasMinutos: number; // soma apenas turnos completos
  saldoMinutos: number; // soma (trabalhado - 720) por turno completo
  turnosCompletos: number;
  turnosIncompletos: number;
}

export function useMotoristaPresencaHistorico(
  eventoId: string | undefined,
  diasHistorico: number = 7,
  dataInicioEvento?: string
) {
  const [presencas, setPresencas] = useState<PresencaHistorico[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);

  const dataInicio = diasHistorico === 0 && dataInicioEvento
    ? dataInicioEvento
    : format(subDays(new Date(), diasHistorico), 'yyyy-MM-dd');

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

      let horasTrabalhadasMinutos = 0;
      let saldoMinutos = 0;
      let turnosCompletos = 0;
      let turnosIncompletos = 0;

      presencasMotorista.forEach(p => {
        if (p.checkin_at && p.checkout_at) {
          // Turno completo - calcular
          const checkin = new Date(p.checkin_at);
          const checkout = new Date(p.checkout_at);
          const duracaoMin = (checkout.getTime() - checkin.getTime()) / (1000 * 60);
          horasTrabalhadasMinutos += duracaoMin;
          saldoMinutos += (duracaoMin - CARGA_HORARIA_MINUTOS);
          turnosCompletos++;
        } else if (p.checkin_at && !p.checkout_at) {
          // Turno incompleto - NÃO calcular horas, NÃO somar
          turnosIncompletos++;
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
        totalDias: new Set(presencasMotorista.map(p => p.data)).size,
        tempoTotalTrabalhado: Math.round(horasTrabalhadasMinutos),
        diasComObservacao,
        horasTrabalhadasMinutos: Math.round(horasTrabalhadasMinutos),
        saldoMinutos: Math.round(saldoMinutos),
        turnosCompletos,
        turnosIncompletos
      };
    }).filter(m => m.presencas.length > 0 || motoristas.some(mot => mot.id === m.motorista_id));
  }, [motoristas, presencas, veiculos]);

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalCheckins = presencas.filter(p => p.checkin_at).length;
    const totalCheckouts = presencas.filter(p => p.checkout_at).length;
    const comObservacoes = presencas.filter(p => p.observacao_checkout?.trim()).length;
    const totalTurnosIncompletos = presencas.filter(p => p.checkin_at && !p.checkout_at).length;
    
    // Horas totais e saldo global - SOMENTE turnos completos
    let totalMinutos = 0;
    let diasCompletos = 0;
    let saldoGlobalMinutos = 0;
    presencas.forEach(p => {
      if (p.checkin_at && p.checkout_at) {
        const checkin = new Date(p.checkin_at);
        const checkout = new Date(p.checkout_at);
        const dur = (checkout.getTime() - checkin.getTime()) / (1000 * 60);
        totalMinutos += dur;
        saldoGlobalMinutos += (dur - CARGA_HORARIA_MINUTOS);
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
      motoristasAtivos: motoristasAgregados.filter(m => m.presencas.length > 0).length,
      totalHorasMinutos: Math.round(totalMinutos),
      saldoGlobalMinutos: Math.round(saldoGlobalMinutos),
      totalTurnosIncompletos
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
