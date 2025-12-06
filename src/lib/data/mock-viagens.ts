import { Viagem } from '../types/viagem';

const motoristas = [
  'Carlos Silva',
  'João Santos',
  'Maria Oliveira',
  'Pedro Costa',
  'Ana Souza',
  'Roberto Lima'
];

const veiculos = [
  { nome: 'Ônibus Executivo 01', tipo: 'Ônibus' as const, placa: 'ABC-1234' },
  { nome: 'Ônibus Executivo 02', tipo: 'Ônibus' as const, placa: 'DEF-5678' },
  { nome: 'Van Sprinter 01', tipo: 'Van' as const, placa: 'GHI-9012' },
  { nome: 'Van Sprinter 02', tipo: 'Van' as const, placa: 'JKL-3456' },
  { nome: 'Ônibus Convencional 01', tipo: 'Ônibus' as const, placa: 'MNO-7890' },
  { nome: 'Van Master 01', tipo: 'Van' as const, placa: 'PQR-1234' },
];

const pontosEmbarque = [
  'Terminal Central',
  'Estação Norte',
  'Estação Sul',
  'Aeroporto',
  'Shopping Center',
  'Centro Empresarial',
  'Universidade',
  'Hospital Regional'
];

function gerarHorario(hora: number, minVariacao: number = 30): string {
  const minutos = Math.floor(Math.random() * minVariacao);
  return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

function addMinutos(horario: string, minutos: number): string {
  const [h, m] = horario.split(':').map(Number);
  const totalMin = h * 60 + m + minutos;
  const novaHora = Math.floor(totalMin / 60) % 24;
  const novosMin = totalMin % 60;
  return `${novaHora.toString().padStart(2, '0')}:${novosMin.toString().padStart(2, '0')}`;
}

export function gerarViagensDemo(): Viagem[] {
  const viagens: Viagem[] = [];
  const hoje = new Date().toISOString();
  
  // Viagens finalizadas (manhã)
  for (let i = 0; i < 15; i++) {
    const veiculo = veiculos[Math.floor(Math.random() * veiculos.length)];
    const horaPickup = 6 + Math.floor(Math.random() * 4);
    const hPickup = gerarHorario(horaPickup);
    const tempoViagem = 20 + Math.floor(Math.random() * 30);
    const hChegada = addMinutos(hPickup, tempoViagem);
    const hRetorno = addMinutos(hChegada, 30 + Math.floor(Math.random() * 60));
    
    viagens.push({
      id: `viagem-${i + 1}`,
      tipo_operacao: 'Transfer Corporativo',
      coordenador: 'Coordenação Central',
      ponto_embarque: pontosEmbarque[Math.floor(Math.random() * pontosEmbarque.length)],
      motorista: motoristas[Math.floor(Math.random() * motoristas.length)],
      veiculo: veiculo.nome,
      tipo_veiculo: veiculo.tipo,
      placa: veiculo.placa,
      h_pickup: hPickup,
      h_chegada: hChegada,
      h_retorno: hRetorno,
      qtd_pax: 5 + Math.floor(Math.random() * 40),
      qtd_pax_retorno: 3 + Math.floor(Math.random() * 35),
      encerrado: true,
      data_criacao: hoje,
      data_atualizacao: hoje
    });
  }
  
  // Viagens em andamento (com chegada, sem retorno)
  for (let i = 15; i < 25; i++) {
    const veiculo = veiculos[Math.floor(Math.random() * veiculos.length)];
    const horaPickup = 10 + Math.floor(Math.random() * 3);
    const hPickup = gerarHorario(horaPickup);
    const tempoViagem = 15 + Math.floor(Math.random() * 25);
    const hChegada = addMinutos(hPickup, tempoViagem);
    
    viagens.push({
      id: `viagem-${i + 1}`,
      tipo_operacao: 'Transfer Aeroporto',
      coordenador: 'Coordenação Central',
      ponto_embarque: pontosEmbarque[Math.floor(Math.random() * pontosEmbarque.length)],
      motorista: motoristas[Math.floor(Math.random() * motoristas.length)],
      veiculo: veiculo.nome,
      tipo_veiculo: veiculo.tipo,
      placa: veiculo.placa,
      h_pickup: hPickup,
      h_chegada: hChegada,
      h_retorno: null,
      qtd_pax: 8 + Math.floor(Math.random() * 30),
      qtd_pax_retorno: 0,
      encerrado: false,
      data_criacao: hoje,
      data_atualizacao: hoje
    });
  }
  
  // Viagens ativas (sem chegada - em trânsito)
  for (let i = 25; i < 32; i++) {
    const veiculo = veiculos[Math.floor(Math.random() * veiculos.length)];
    const now = new Date();
    const horaAtual = now.getHours();
    const hPickup = gerarHorario(Math.max(6, horaAtual - 1));
    
    viagens.push({
      id: `viagem-${i + 1}`,
      tipo_operacao: 'Shuttle Executivo',
      coordenador: 'Coordenação Central',
      ponto_embarque: pontosEmbarque[Math.floor(Math.random() * pontosEmbarque.length)],
      motorista: motoristas[Math.floor(Math.random() * motoristas.length)],
      veiculo: veiculo.nome,
      tipo_veiculo: veiculo.tipo,
      placa: veiculo.placa,
      h_pickup: hPickup,
      h_chegada: null,
      h_retorno: null,
      qtd_pax: 10 + Math.floor(Math.random() * 25),
      qtd_pax_retorno: 0,
      encerrado: false,
      data_criacao: hoje,
      data_atualizacao: hoje
    });
  }
  
  return viagens;
}
