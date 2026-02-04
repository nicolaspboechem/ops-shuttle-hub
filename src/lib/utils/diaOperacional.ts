import { format, subDays, addDays, parseISO } from 'date-fns';

/**
 * Calcula a data operacional considerando o horário de virada.
 * Se o horário atual for entre 00:00 e horarioVirada, retorna o dia anterior.
 * 
 * Exemplo: Se horarioVirada = "04:00" e timestamp = "2025-01-14 02:30",
 * a função retorna "2025-01-13" (dia operacional anterior).
 * 
 * @param timestamp - Timestamp a ser avaliado (default: now)
 * @param horarioVirada - Horário de corte no formato "HH:mm" ou "HH:mm:ss" (default: "04:00")
 * @returns Data operacional no formato "YYYY-MM-DD"
 */
export function getDataOperacional(
  timestamp: Date = new Date(),
  horarioVirada: string = '04:00'
): string {
  // Parse horário de virada (aceita HH:mm ou HH:mm:ss)
  const [horaVirada, minVirada] = horarioVirada.split(':').map(Number);
  const viradaMinutos = horaVirada * 60 + (minVirada || 0);
  
  // Horário atual em minutos desde meia-noite
  const horaAtual = timestamp.getHours();
  const minAtual = timestamp.getMinutes();
  const atualMinutos = horaAtual * 60 + minAtual;
  
  // Se estamos entre 00:00 e horarioVirada, pertence ao dia anterior
  if (atualMinutos < viradaMinutos) {
    const ontem = subDays(timestamp, 1);
    return format(ontem, 'yyyy-MM-dd');
  }
  
  return format(timestamp, 'yyyy-MM-dd');
}

/**
 * Verifica se um timestamp pertence ao "dia operacional" de uma data específica.
 * Útil para filtrar viagens/presenças do dia operacional correto.
 * 
 * @param timestamp - Timestamp a verificar
 * @param dataOperacional - Data operacional no formato "YYYY-MM-DD"
 * @param horarioVirada - Horário de corte (default: "04:00")
 * @returns true se o timestamp pertence à data operacional especificada
 */
export function pertenceAoDiaOperacional(
  timestamp: Date,
  dataOperacional: string,
  horarioVirada: string = '04:00'
): boolean {
  return getDataOperacional(timestamp, horarioVirada) === dataOperacional;
}

/**
 * Retorna os limites de timestamp (início e fim) para um dia operacional.
 * 
 * Exemplo: 
 * - Data operacional: 2025-01-14
 * - Horário virada: 04:00
 * - Início: 2025-01-14 04:00:00
 * - Fim: 2025-01-15 03:59:59.999
 * 
 * @param dataOperacional - Data no formato "YYYY-MM-DD"
 * @param horarioVirada - Horário de corte no formato "HH:mm" (default: "04:00")
 * @returns Objeto com { inicio: Date, fim: Date }
 */
export function getLimitesDiaOperacional(
  dataOperacional: string,
  horarioVirada: string = '04:00'
): { inicio: Date; fim: Date } {
  const [horaVirada, minVirada] = horarioVirada.split(':').map(Number);
  
  // Início: data + horário virada
  const inicio = parseISO(dataOperacional);
  inicio.setHours(horaVirada, minVirada || 0, 0, 0);
  
  // Fim: próximo dia + horário virada - 1 milissegundo
  const fim = addDays(inicio, 1);
  fim.setMilliseconds(fim.getMilliseconds() - 1);
  
  return { inicio, fim };
}
