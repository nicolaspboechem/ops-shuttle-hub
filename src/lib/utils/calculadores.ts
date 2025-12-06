import { Viagem, StatusViagem, AlertaViagem, MetricasMotorista, MetricasPorHora, KPIsDashboard } from '../types/viagem';

/**
 * Calcula tempo entre dois horários em minutos
 */
export function calcularTempoViagem(inicio: string, fim: string): number {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);
  
  const minutos1 = h1 * 60 + m1;
  const minutos2 = h2 * 60 + m2;
  
  return minutos2 - minutos1;
}

/**
 * Formata minutos para exibição
 */
export function formatarMinutos(minutos: number): string {
  if (minutos < 60) {
    return `${Math.round(minutos)} min`;
  }
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return `${horas}h ${mins}m`;
}

/**
 * Verifica se uma data é hoje
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Calcula métricas agregadas por motorista
 */
export function calcularMetricasMotorista(
  motorista: string,
  todasViagens: Viagem[]
): MetricasMotorista {
  const viagensMotorista = todasViagens.filter(v => v.motorista === motorista);
  const tempos = viagensMotorista
    .filter(v => v.h_chegada)
    .map(v => calcularTempoViagem(v.h_pickup, v.h_chegada!));

  return {
    motorista,
    totalViagens: viagensMotorista.length,
    totalPax: viagensMotorista.reduce((sum, v) => sum + v.qtd_pax, 0),
    tempoMedio: tempos.length > 0
      ? tempos.reduce((a, b) => a + b, 0) / tempos.length
      : 0,
    tempoMin: tempos.length > 0 ? Math.min(...tempos) : 0,
    tempoMax: tempos.length > 0 ? Math.max(...tempos) : 0,
    viagensHoje: viagensMotorista.filter(v => isToday(v.data_criacao)).length
  };
}

/**
 * Calcula status de alerta de uma viagem
 */
export function calcularStatusViagem(
  viagem: Viagem,
  tempoMedioMotorista: number
): AlertaViagem {
  if (!viagem.h_chegada) {
    // Viagem em andamento - calcular tempo decorrido
    const now = new Date();
    const [h, m] = viagem.h_pickup.split(':').map(Number);
    const pickupTime = new Date();
    pickupTime.setHours(h, m, 0, 0);
    
    const tempoDecorrido = (now.getTime() - pickupTime.getTime()) / 60000;
    const diferenca = tempoDecorrido - tempoMedioMotorista;
    
    let status: StatusViagem = 'ok';
    let mensagem = 'Em andamento';
    
    if (diferenca > 25) {
      status = 'critico';
      mensagem = `⚠️ CRÍTICO: +${Math.round(diferenca)} min acima da média`;
    } else if (diferenca > 15) {
      status = 'alerta';
      mensagem = `⚡ Alerta: +${Math.round(diferenca)} min acima da média`;
    }
    
    return {
      viagemId: viagem.id,
      status,
      tempoReal: tempoDecorrido,
      tempoEsperado: tempoMedioMotorista,
      diferenca,
      mensagem,
      viagem
    };
  }

  const tempoReal = calcularTempoViagem(viagem.h_pickup, viagem.h_chegada);
  const diferenca = tempoReal - tempoMedioMotorista;

  let status: StatusViagem;
  let mensagem: string;

  if (diferenca > 25) {
    status = 'critico';
    mensagem = `⚠️ CRÍTICO: +${diferenca.toFixed(0)} min acima da média`;
  } else if (diferenca > 15) {
    status = 'alerta';
    mensagem = `⚡ Alerta: +${diferenca.toFixed(0)} min acima da média`;
  } else {
    status = 'ok';
    mensagem = '✅ Dentro do esperado';
  }

  return {
    viagemId: viagem.id,
    status,
    tempoReal,
    tempoEsperado: tempoMedioMotorista,
    diferenca,
    mensagem,
    viagem
  };
}

/**
 * Calcula métricas agregadas por hora
 */
export function calcularMetricasPorHora(viagens: Viagem[]): MetricasPorHora[] {
  const metricas: MetricasPorHora[] = [];

  for (let hora = 6; hora <= 23; hora++) {
    const horaStr = `${hora.toString().padStart(2, '0')}:00`;

    const viagensHora = viagens.filter(v => {
      const hPickup = parseInt(v.h_pickup.split(':')[0]);
      return hPickup === hora;
    });

    metricas.push({
      hora: horaStr,
      veiculosAtivos: new Set(viagensHora.map(v => v.placa)).size,
      totalPax: viagensHora.reduce((sum, v) => sum + v.qtd_pax, 0),
      totalViagens: viagensHora.length,
      onibus: viagensHora.filter(v => v.tipo_veiculo === 'Ônibus').length,
      vans: viagensHora.filter(v => v.tipo_veiculo === 'Van').length
    });
  }

  return metricas;
}

/**
 * Calcula todos os KPIs do dashboard
 */
export function calcularKPIsDashboard(viagens: Viagem[]): KPIsDashboard {
  const viagensComChegada = viagens.filter(v => v.h_chegada);
  const tempos = viagensComChegada.map(v =>
    calcularTempoViagem(v.h_pickup, v.h_chegada!)
  );

  const viagensAtivas = viagens.filter(v => !v.encerrado);

  // Calcular métricas por motorista
  const motoristas = [...new Set(viagens.map(v => v.motorista))];
  const metricasMotoristas = motoristas.map(m =>
    calcularMetricasMotorista(m, viagens)
  );

  // Calcular alertas
  const alertas: AlertaViagem[] = [];
  viagensAtivas.forEach(viagem => {
    const metricaMotorista = metricasMotoristas.find(
      m => m.motorista === viagem.motorista
    );
    const tempoMedio = metricaMotorista?.tempoMedio || 30; // default 30 min
    alertas.push(calcularStatusViagem(viagem, tempoMedio));
  });

  return {
    totalViagens: viagens.length,
    totalPax: viagens.reduce((sum, v) => sum + v.qtd_pax + v.qtd_pax_retorno, 0),
    tempoMedioGeral: tempos.length > 0
      ? tempos.reduce((a, b) => a + b, 0) / tempos.length
      : 0,
    veiculosAtivos: new Set(viagensAtivas.map(v => v.placa)).size,
    onibusAtivos: new Set(
      viagensAtivas.filter(v => v.tipo_veiculo === 'Ônibus').map(v => v.placa)
    ).size,
    vansAtivas: new Set(
      viagensAtivas.filter(v => v.tipo_veiculo === 'Van').map(v => v.placa)
    ).size,
    alertasCriticos: alertas.filter(a => a.status === 'critico'),
    alertas: alertas.filter(a => a.status === 'alerta'),
    viagensOk: alertas.filter(a => a.status === 'ok').length,
    taxaAlerta: alertas.length > 0
      ? (alertas.filter(a => a.status !== 'ok').length / alertas.length) * 100
      : 0
  };
}
