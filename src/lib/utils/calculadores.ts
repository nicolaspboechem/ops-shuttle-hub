import { Viagem, StatusViagem, AlertaViagem, MetricasMotorista, MetricasPorHora, KPIsDashboard } from '../types/viagem';

/**
 * Formata horário para string HH:MM
 */
export function formatarHora(hora: string | null): string {
  if (!hora) return '--:--';
  // Handle both "HH:MM:SS" and "HH:MM" formats
  return hora.substring(0, 5);
}

/**
 * Calcula tempo entre dois horários em minutos
 */
export function calcularTempoViagem(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0;
  
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);
  
  const minutos1 = h1 * 60 + m1;
  const minutos2 = h2 * 60 + m2;
  
  return Math.max(0, minutos2 - minutos1);
}

/**
 * Formata minutos para exibição
 */
export function formatarMinutos(minutos: number): string {
  if (!minutos || minutos <= 0) return '0 min';
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
 * Verifica se uma viagem tem dados válidos para cálculos
 */
function isViagemValida(viagem: Viagem): boolean {
  return !!viagem.h_pickup && !!viagem.motorista && !!viagem.placa;
}

/**
 * Calcula métricas agregadas por motorista
 */
export function calcularMetricasMotorista(
  motorista: string,
  todasViagens: Viagem[]
): MetricasMotorista {
  const viagensMotorista = todasViagens.filter(v => v.motorista === motorista && isViagemValida(v));
  
  const tempos = viagensMotorista
    .filter(v => v.h_pickup && v.h_chegada)
    .map(v => calcularTempoViagem(v.h_pickup, v.h_chegada));

  const totalPax = viagensMotorista.reduce((sum, v) => sum + (v.qtd_pax || 0), 0);

  return {
    motorista,
    totalViagens: viagensMotorista.length,
    totalPax,
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
/**
 * Calcula status de alerta de uma viagem
 * @param agoraSincronizado - Data sincronizada com servidor (opcional, usa new Date() como fallback)
 */
export function calcularStatusViagem(
  viagem: Viagem,
  tempoMedioMotorista: number,
  agoraSincronizado?: Date
): AlertaViagem {
  // Se não tem h_pickup válido, retorna status ok
  if (!viagem.h_pickup) {
    return {
      viagemId: viagem.id,
      status: 'ok',
      tempoReal: 0,
      tempoEsperado: tempoMedioMotorista || 30,
      diferenca: 0,
      mensagem: 'Aguardando pickup',
      viagem
    };
  }

  if (!viagem.h_chegada) {
    // Viagem em andamento - calcular tempo decorrido
    const now = agoraSincronizado || new Date();
    const [h, m] = viagem.h_pickup.split(':').map(Number);
    const pickupTime = new Date();
    pickupTime.setHours(h, m, 0, 0);
    
    const tempoDecorrido = (now.getTime() - pickupTime.getTime()) / 60000;
    const diferenca = tempoDecorrido - (tempoMedioMotorista || 30);
    
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
      tempoEsperado: tempoMedioMotorista || 30,
      diferenca,
      mensagem,
      viagem
    };
  }

  const tempoReal = calcularTempoViagem(viagem.h_pickup, viagem.h_chegada);
  const diferenca = tempoReal - (tempoMedioMotorista || 30);

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
    tempoEsperado: tempoMedioMotorista || 30,
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
  const viagensValidas = viagens.filter(v => v.h_pickup);

  for (let hora = 6; hora <= 23; hora++) {
    const horaStr = `${hora.toString().padStart(2, '0')}:00`;

    const viagensHora = viagensValidas.filter(v => {
      const hPickup = parseInt(v.h_pickup!.split(':')[0]);
      return hPickup === hora;
    });

    const placasUnicas = new Set(viagensHora.filter(v => v.placa).map(v => v.placa));

    metricas.push({
      hora: horaStr,
      veiculosAtivos: placasUnicas.size,
      totalPax: viagensHora.reduce((sum, v) => sum + (v.qtd_pax || 0), 0),
      totalViagens: viagensHora.length,
      onibus: viagensHora.filter(v => v.tipo_veiculo === 'Ônibus').length,
      vans: viagensHora.filter(v => v.tipo_veiculo === 'Van').length,
      sedan: viagensHora.filter(v => v.tipo_veiculo === 'Sedan').length,
      suv: viagensHora.filter(v => v.tipo_veiculo === 'SUV').length,
      blindado: viagensHora.filter(v => v.tipo_veiculo === 'Blindado').length,
    });
  }

  return metricas;
}

/**
 * Calcula todos os KPIs do dashboard
 * @param agoraSincronizado - Data sincronizada com servidor (opcional)
 */
export function calcularKPIsDashboard(viagens: Viagem[], agoraSincronizado?: Date): KPIsDashboard {
  const viagensValidas = viagens.filter(isViagemValida);
  
  const viagensComChegada = viagensValidas.filter(v => v.h_pickup && v.h_chegada);
  const tempos = viagensComChegada.map(v =>
    calcularTempoViagem(v.h_pickup, v.h_chegada)
  );

  const viagensAtivas = viagensValidas.filter(v => !v.encerrado);

  // Calcular métricas por motorista
  const motoristas = [...new Set(viagensValidas.map(v => v.motorista))];
  const metricasMotoristas = motoristas.map(m =>
    calcularMetricasMotorista(m, viagensValidas)
  );

  // Calcular alertas apenas para viagens ativas com h_pickup
  const alertas: AlertaViagem[] = [];
  viagensAtivas.filter(v => v.h_pickup).forEach(viagem => {
    const metricaMotorista = metricasMotoristas.find(
      m => m.motorista === viagem.motorista
    );
    const tempoMedio = metricaMotorista?.tempoMedio || 30;
    alertas.push(calcularStatusViagem(viagem, tempoMedio, agoraSincronizado));
  });

  // Calcular total de passageiros (ida + retorno)
  const totalPax = viagensValidas.reduce((sum, v) => 
    sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0
  );

  // Calcular veículos ativos (apenas os que têm placa)
  const placasAtivas = viagensAtivas.filter(v => v.placa).map(v => v.placa);
  const veiculosAtivos = new Set(placasAtivas).size;

  const placasOnibus = viagensAtivas
    .filter(v => v.tipo_veiculo === 'Ônibus' && v.placa)
    .map(v => v.placa);
  const onibusAtivos = new Set(placasOnibus).size;

  const placasVans = viagensAtivas
    .filter(v => v.tipo_veiculo === 'Van' && v.placa)
    .map(v => v.placa);
  const vansAtivas = new Set(placasVans).size;

  return {
    totalViagens: viagensValidas.length,
    totalPax,
    tempoMedioGeral: tempos.length > 0
      ? tempos.reduce((a, b) => a + b, 0) / tempos.length
      : 0,
    veiculosAtivos,
    onibusAtivos,
    vansAtivas,
    alertasCriticos: alertas.filter(a => a.status === 'critico'),
    alertas: alertas.filter(a => a.status === 'alerta'),
    viagensOk: alertas.filter(a => a.status === 'ok').length,
    taxaAlerta: alertas.length > 0
      ? (alertas.filter(a => a.status !== 'ok').length / alertas.length) * 100
      : 0
  };
}
