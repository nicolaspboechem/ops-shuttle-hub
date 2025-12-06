import { useState, useEffect, useMemo, useCallback } from 'react';
import { Viagem } from '@/lib/types/viagem';
import { gerarViagensDemo } from '@/lib/data/mock-viagens';
import { 
  calcularKPIsDashboard, 
  calcularMetricasPorHora, 
  calcularMetricasMotorista 
} from '@/lib/utils/calculadores';

export function useViagens() {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchViagens = useCallback(() => {
    // Simulating API call with mock data
    // In production, this would fetch from Supabase
    setViagens(gerarViagensDemo());
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchViagens();

    // Polling every 30 seconds
    const interval = setInterval(fetchViagens, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchViagens]);

  const updateViagem = useCallback((updated: Viagem) => {
    setViagens(prev => 
      prev.map(v => v.id === updated.id ? updated : v)
    );
  }, []);

  return {
    viagens,
    loading,
    lastUpdate,
    refetch: fetchViagens,
    updateViagem
  };
}

export function useCalculos(viagens: Viagem[]) {
  const kpis = useMemo(() => {
    if (viagens.length === 0) return null;
    return calcularKPIsDashboard(viagens);
  }, [viagens]);

  const metricasPorHora = useMemo(() => {
    return calcularMetricasPorHora(viagens);
  }, [viagens]);

  const motoristas = useMemo(() => {
    const uniqueMotoristas = [...new Set(viagens.map(v => v.motorista))];
    return uniqueMotoristas.map(m => calcularMetricasMotorista(m, viagens));
  }, [viagens]);

  const viagensAtivas = useMemo(() => {
    return viagens.filter(v => !v.encerrado);
  }, [viagens]);

  const viagensFinalizadas = useMemo(() => {
    return viagens.filter(v => v.encerrado);
  }, [viagens]);

  return {
    kpis,
    metricasPorHora,
    motoristas,
    viagensAtivas,
    viagensFinalizadas
  };
}
