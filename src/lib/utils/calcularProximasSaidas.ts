/**
 * Calcula as próximas saídas de shuttle baseado na frequência e horários
 */
import { format } from 'date-fns';

export function calcularProximasSaidas(
  horarioInicio: string | null,  // "07:00:00"
  horarioFim: string | null,      // "22:00:00"
  frequenciaMinutos: number | null,
  quantidadeMostrar: number = 5,
  horaAtual?: Date
): string[] {
  if (!horarioInicio || !horarioFim || !frequenciaMinutos || frequenciaMinutos <= 0) {
    return [];
  }

  const agora = horaAtual || new Date();
  const hoje = format(agora, 'yyyy-MM-dd');
  
  // Parse horários
  const [inicioH, inicioM] = horarioInicio.split(':').map(Number);
  const [fimH, fimM] = horarioFim.split(':').map(Number);
  
  const inicioDate = new Date(`${hoje}T${horarioInicio}`);
  const fimDate = new Date(`${hoje}T${horarioFim}`);
  
  // Se já passou do horário de fim, retorna vazio
  if (agora > fimDate) {
    return [];
  }
  
  const proximasSaidas: string[] = [];
  
  // Encontrar a próxima saída a partir de agora
  let saidaAtual = new Date(inicioDate);
  
  // Avançar até a próxima saída
  while (saidaAtual <= agora && saidaAtual < fimDate) {
    saidaAtual = new Date(saidaAtual.getTime() + frequenciaMinutos * 60000);
  }
  
  // Coletar próximas saídas
  while (proximasSaidas.length < quantidadeMostrar && saidaAtual <= fimDate) {
    const hora = saidaAtual.getHours().toString().padStart(2, '0');
    const minuto = saidaAtual.getMinutes().toString().padStart(2, '0');
    proximasSaidas.push(`${hora}:${minuto}`);
    saidaAtual = new Date(saidaAtual.getTime() + frequenciaMinutos * 60000);
  }
  
  return proximasSaidas;
}

/**
 * Formata a frequência em texto legível
 */
export function formatarFrequencia(minutos: number | null): string {
  if (!minutos) return '';
  if (minutos < 60) return `A cada ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (mins === 0) return `A cada ${horas}h`;
  return `A cada ${horas}h${mins}min`;
}

/**
 * Formata horário de operação
 */
export function formatarHorarioOperacao(inicio: string | null, fim: string | null): string {
  if (!inicio || !fim) return 'Horário não definido';
  const formatTime = (t: string) => t.slice(0, 5);
  return `${formatTime(inicio)} às ${formatTime(fim)}`;
}

/**
 * Verifica se uma rota ainda está ativa baseado no horário de fim
 * Retorna true se a rota ainda está operando ou se não tem horário definido
 */
export function rotaEstaAtiva(horarioFim: string | null, horaAtual?: Date): boolean {
  if (!horarioFim) return true; // Sem horário definido = sempre ativa
  
  const agora = horaAtual || new Date();
  const hoje = format(agora, 'yyyy-MM-dd');
  const fimDate = new Date(`${hoje}T${horarioFim}`);
  
  return agora <= fimDate;
}
