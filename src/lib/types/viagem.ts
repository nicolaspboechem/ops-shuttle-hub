export type TipoVeiculo = 'Van' | 'Ônibus' | 'Sedan' | 'SUV' | 'Blindado';
export type TipoOperacao = 'shuttle' | 'missao';
export type StatusViagem = 'ok' | 'alerta' | 'critico';
export type StatusEvento = 'ativo' | 'finalizado' | 'processando';
export type StatusViagemOperacao = 'agendado' | 'em_andamento' | 'aguardando_retorno' | 'encerrado' | 'cancelado';

export interface Evento {
  id: string;
  nome_planilha: string;
  tipo_operacao: TipoOperacao | string | null;
  data_criacao: string;
  data_ultima_sync: string;
  total_viagens: number | null;
  status: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  visivel_publico?: boolean | null;
  imagem_banner?: string | null;
  imagem_logo?: string | null;
  descricao?: string | null;
  local?: string | null;
  horario_virada_dia?: string | null;
  alerta_limiar_amarelo?: number | null;
  alerta_limiar_vermelho?: number | null;
  habilitar_localizador?: boolean | null;
  habilitar_missoes?: boolean | null;
  horario_inicio_evento?: string | null;
  horario_fim_evento?: string | null;
  tipos_viagem_habilitados?: string[] | null;
}

export interface EventoUsuario {
  id: string;
  evento_id: string;
  user_id: string;
  role: 'motorista' | 'operador' | 'supervisor' | 'cliente';
  created_at: string;
}

export interface Viagem {
  id: string;
  evento_id: string | null;
  tipo_operacao: string;
  coordenador: string | null;
  // Campos de texto (legacy - mantidos para compatibilidade)
  ponto_embarque: string | null;
  ponto_desembarque?: string | null;
  motorista: string;
  tipo_veiculo: string | null;
  placa: string | null;
  // Campos FK (novos - normalizados)
  motorista_id?: string | null;
  veiculo_id?: string | null;
  ponto_embarque_id?: string | null;
  ponto_desembarque_id?: string | null;
  // Campos de horário
  h_pickup: string | null;
  h_chegada: string | null;
  h_retorno: string | null;
  qtd_pax: number | null;
  qtd_pax_retorno: number | null;
  encerrado: boolean | null;
  observacao: string | null;
  data_criacao: string;
  data_atualizacao: string;
  // Campos de controle
  status?: StatusViagemOperacao;
  iniciado_por?: string | null;
  finalizado_por?: string | null;
  h_inicio_real?: string | null;
  h_fim_real?: string | null;
  // Campos de auditoria
  criado_por?: string | null;
  atualizado_por?: string | null;
  // Campo para rastrear sequência de rotas
  viagem_pai_id?: string | null;
  // Campo para identificar se viagem veio de uma missão
  origem_missao_id?: string | null;
  // Dados do JOIN (preenchido pelo useViagens)
  veiculo?: {
    nome: string | null;
    placa: string | null;
    tipo_veiculo: string | null;
  } | null;
}

export interface ViagemLog {
  id: string;
  viagem_id: string;
  user_id: string;
  acao: 'inicio' | 'embarque' | 'chegada' | 'retorno' | 'encerramento' | 'cancelamento';
  detalhes?: Record<string, unknown>;
  created_at: string;
}

export interface AlertaViagem {
  viagemId: string;
  status: StatusViagem;
  tempoReal: number;
  tempoEsperado: number;
  diferenca: number;
  mensagem: string;
  viagem: Viagem;
}

export interface MetricasMotorista {
  motorista: string;
  totalViagens: number;
  totalPax: number;
  tempoMedio: number;
  tempoMin: number;
  tempoMax: number;
  viagensHoje: number;
}

export interface MetricasPorHora {
  hora: string;
  veiculosAtivos: number;
  totalPax: number;
  totalViagens: number;
  onibus: number;
  vans: number;
  sedan: number;
  suv: number;
  blindado: number;

}

export interface KPIsDashboard {
  totalViagens: number;
  totalPax: number;
  tempoMedioGeral: number;
  veiculosAtivos: number;
  onibusAtivos: number;
  vansAtivas: number;
  alertasCriticos: AlertaViagem[];
  alertas: AlertaViagem[];
  viagensOk: number;
  taxaAlerta: number;
}
