export type TipoVeiculo = 'Ônibus' | 'Van';
export type StatusViagem = 'ok' | 'alerta' | 'critico';

export interface Viagem {
  id: string;
  tipo_operacao: string | null;
  coordenador: string | null;
  ponto_embarque: string | null;
  motorista: string;
  veiculo: string;
  tipo_veiculo: TipoVeiculo;
  placa: string;
  h_pickup: string;
  h_chegada: string | null;
  h_retorno: string | null;
  qtd_pax: number;
  qtd_pax_retorno: number;
  encerrado: boolean;
  data_criacao: string;
  data_atualizacao: string;
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
