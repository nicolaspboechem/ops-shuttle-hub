export type TipoVeiculo = 'Ônibus' | 'Van';
export type TipoOperacao = 'transfer' | 'shuttle';
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
}

export interface EventoUsuario {
  id: string;
  evento_id: string;
  user_id: string;
  role: 'coordenador' | 'motorista' | 'operador';
  created_at: string;
}

export interface Viagem {
  id: string;
  evento_id: string | null;
  tipo_operacao: string;
  coordenador: string | null;
  ponto_embarque: string | null;
  motorista: string;
  tipo_veiculo: string | null;
  placa: string | null;
  h_pickup: string | null;
  h_chegada: string | null;
  h_retorno: string | null;
  qtd_pax: number | null;
  qtd_pax_retorno: number | null;
  encerrado: boolean | null;
  observacao: string | null;
  ponto_desembarque?: string | null;
  data_criacao: string;
  data_atualizacao: string;
  // Novos campos de controle
  status?: StatusViagemOperacao;
  iniciado_por?: string | null;
  finalizado_por?: string | null;
  h_inicio_real?: string | null;
  h_fim_real?: string | null;
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
  pcd?: number;
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
