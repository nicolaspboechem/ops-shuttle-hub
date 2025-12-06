import { Evento } from '../types/viagem';

export function gerarEventosDemo(): Evento[] {
  const agora = new Date();
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  const semanaPassada = new Date(agora);
  semanaPassada.setDate(semanaPassada.getDate() - 7);

  return [
    {
      id: 'evento-1',
      nome_planilha: 'Operação_COP30_2024',
      tipo_operacao: 'transfer',
      data_criacao: semanaPassada.toISOString(),
      data_ultima_sync: agora.toISOString(),
      total_viagens: 32,
      status: 'ativo'
    },
    {
      id: 'evento-2',
      nome_planilha: 'Transfer_Executivo_Dezembro',
      tipo_operacao: 'transfer',
      data_criacao: ontem.toISOString(),
      data_ultima_sync: ontem.toISOString(),
      total_viagens: 18,
      status: 'ativo'
    },
    {
      id: 'evento-3',
      nome_planilha: 'Congresso_Nacional_2024',
      tipo_operacao: 'shuttle',
      data_criacao: semanaPassada.toISOString(),
      data_ultima_sync: semanaPassada.toISOString(),
      total_viagens: 45,
      status: 'finalizado'
    }
  ];
}
