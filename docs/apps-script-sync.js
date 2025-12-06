/**
 * ============================================================
 * SHUTTLE CONTROL - APPS SCRIPT PARA SINCRONIZAÇÃO
 * ============================================================
 * 
 * Este script sincroniza dados do Google Sheets com o Supabase,
 * suportando Transfer e Shuttle na mesma planilha.
 * 
 * CONFIGURAÇÃO:
 * 1. Abra sua planilha no Google Sheets
 * 2. Vá em Extensões > Apps Script
 * 3. Cole todo este código
 * 4. Configure as variáveis SUPABASE_URL e SUPABASE_KEY abaixo
 * 5. Execute a função "sincronizarDados" ou configure um trigger
 * 
 * ESTRUTURA DA PLANILHA:
 * - Aba "Dados Transfer" para viagens de Transfer
 * - Aba "Dados Shuttle" para viagens de Shuttle
 * 
 * Ambas as abas devem ter as seguintes colunas (na ordem):
 * A: Coordenador
 * B: Ponto de Embarque (opcional para Shuttle)
 * C: Motorista
 * D: Tipo Veículo (Ônibus/Van)
 * E: Placa
 * F: H. Pickup (formato HH:MM)
 * G: H. Chegada (formato HH:MM, opcional)
 * H: H. Retorno (formato HH:MM, opcional)
 * I: Qtd PAX
 * J: PAX Retorno (opcional)
 * K: Observação (opcional)
 */

// ============================================================
// CONFIGURAÇÃO - ALTERE ESTES VALORES
// ============================================================

const SUPABASE_URL = 'https://gkrczwtldvondiehsesh.supabase.co';
const SUPABASE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Use a Service Role Key, não a anon key

// Nomes das abas na planilha
const ABA_TRANSFER = 'Dados Transfer';
const ABA_SHUTTLE = 'Dados Shuttle';

// Linha onde começam os dados (pule o cabeçalho)
const LINHA_INICIO = 2;

// ============================================================
// FUNÇÕES PRINCIPAIS
// ============================================================

/**
 * Função principal - sincroniza todos os dados
 * Execute esta função manualmente ou configure um trigger
 */
function sincronizarDados() {
  try {
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const nomePlanilha = planilha.getName();
    
    Logger.log(`Iniciando sincronização: ${nomePlanilha}`);
    
    // 1. Criar ou obter o evento
    const eventoId = criarOuObterEvento(nomePlanilha);
    Logger.log(`Evento ID: ${eventoId}`);
    
    // 2. Sincronizar viagens de Transfer
    const abaTransfer = planilha.getSheetByName(ABA_TRANSFER);
    if (abaTransfer) {
      const viagensTransfer = lerViagens(abaTransfer, 'transfer', eventoId);
      Logger.log(`Transfer: ${viagensTransfer.length} viagens encontradas`);
      sincronizarViagens(viagensTransfer, eventoId, 'transfer');
    } else {
      Logger.log(`Aba "${ABA_TRANSFER}" não encontrada`);
    }
    
    // 3. Sincronizar viagens de Shuttle
    const abaShuttle = planilha.getSheetByName(ABA_SHUTTLE);
    if (abaShuttle) {
      const viagensShuttle = lerViagens(abaShuttle, 'shuttle', eventoId);
      Logger.log(`Shuttle: ${viagensShuttle.length} viagens encontradas`);
      sincronizarViagens(viagensShuttle, eventoId, 'shuttle');
    } else {
      Logger.log(`Aba "${ABA_SHUTTLE}" não encontrada`);
    }
    
    // 4. Atualizar data de última sincronização do evento
    atualizarDataSync(eventoId);
    
    Logger.log('Sincronização concluída com sucesso!');
    SpreadsheetApp.getUi().alert('Sincronização concluída com sucesso!');
    
  } catch (error) {
    Logger.log(`Erro na sincronização: ${error.message}`);
    SpreadsheetApp.getUi().alert(`Erro: ${error.message}`);
    throw error;
  }
}

/**
 * Cria um novo evento ou retorna o ID de um existente
 */
function criarOuObterEvento(nomePlanilha) {
  // Verificar se o evento já existe
  const eventoExistente = buscarEventoPorNome(nomePlanilha);
  
  if (eventoExistente) {
    Logger.log(`Evento existente encontrado: ${eventoExistente.id}`);
    return eventoExistente.id;
  }
  
  // Criar novo evento
  const novoEvento = {
    nome_planilha: nomePlanilha,
    status: 'ativo',
    total_viagens: 0
  };
  
  const response = supabaseRequest('POST', '/rest/v1/eventos', novoEvento);
  
  if (response.length > 0) {
    Logger.log(`Novo evento criado: ${response[0].id}`);
    return response[0].id;
  }
  
  throw new Error('Falha ao criar evento');
}

/**
 * Busca um evento pelo nome da planilha
 */
function buscarEventoPorNome(nomePlanilha) {
  const response = supabaseRequest(
    'GET', 
    `/rest/v1/eventos?nome_planilha=eq.${encodeURIComponent(nomePlanilha)}&select=id`
  );
  
  return response.length > 0 ? response[0] : null;
}

/**
 * Lê as viagens de uma aba da planilha
 */
function lerViagens(aba, tipoOperacao, eventoId) {
  const dados = aba.getDataRange().getValues();
  const viagens = [];
  
  // Começar da linha de dados (pulando cabeçalho)
  for (let i = LINHA_INICIO - 1; i < dados.length; i++) {
    const linha = dados[i];
    
    // Pular linhas vazias (verificar se tem motorista)
    if (!linha[2] || linha[2].toString().trim() === '') {
      continue;
    }
    
    const viagem = {
      evento_id: eventoId,
      tipo_operacao: tipoOperacao,
      coordenador: limparTexto(linha[0]),
      ponto_embarque: tipoOperacao === 'transfer' ? limparTexto(linha[1]) : null,
      motorista: limparTexto(linha[2]),
      tipo_veiculo: limparTexto(linha[3]),
      placa: limparTexto(linha[4]),
      h_pickup: formatarHora(linha[5]),
      h_chegada: formatarHora(linha[6]),
      h_retorno: formatarHora(linha[7]),
      qtd_pax: parseInt(linha[8]) || 0,
      qtd_pax_retorno: parseInt(linha[9]) || 0,
      observacao: tipoOperacao === 'transfer' ? limparTexto(linha[10]) : null,
      encerrado: false
    };
    
    // Verificar se a viagem está encerrada (tem h_retorno)
    if (viagem.h_retorno) {
      viagem.encerrado = true;
    }
    
    viagens.push(viagem);
  }
  
  return viagens;
}

/**
 * Sincroniza as viagens com o Supabase
 * Usa upsert baseado em motorista + h_pickup + tipo_operacao + evento_id
 */
function sincronizarViagens(viagens, eventoId, tipoOperacao) {
  if (viagens.length === 0) {
    return;
  }
  
  // Deletar viagens existentes deste tipo de operação para este evento
  // e inserir as novas (estratégia de replace completo)
  supabaseRequest(
    'DELETE', 
    `/rest/v1/viagens?evento_id=eq.${eventoId}&tipo_operacao=eq.${tipoOperacao}`
  );
  
  // Inserir em lotes de 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < viagens.length; i += BATCH_SIZE) {
    const batch = viagens.slice(i, i + BATCH_SIZE);
    supabaseRequest('POST', '/rest/v1/viagens', batch);
    Logger.log(`Inserido lote ${Math.floor(i / BATCH_SIZE) + 1}`);
  }
  
  // Atualizar contador de viagens no evento
  atualizarContadorViagens(eventoId);
}

/**
 * Atualiza o contador total de viagens do evento
 */
function atualizarContadorViagens(eventoId) {
  const viagens = supabaseRequest(
    'GET', 
    `/rest/v1/viagens?evento_id=eq.${eventoId}&select=id`
  );
  
  supabaseRequest(
    'PATCH', 
    `/rest/v1/eventos?id=eq.${eventoId}`,
    { total_viagens: viagens.length }
  );
}

/**
 * Atualiza a data de última sincronização do evento
 */
function atualizarDataSync(eventoId) {
  supabaseRequest(
    'PATCH', 
    `/rest/v1/eventos?id=eq.${eventoId}`,
    { data_ultima_sync: new Date().toISOString() }
  );
}

// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================

/**
 * Faz requisições ao Supabase
 */
function supabaseRequest(method, endpoint, body = null) {
  const options = {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    },
    muteHttpExceptions: true
  };
  
  if (body) {
    options.payload = JSON.stringify(body);
  }
  
  const url = SUPABASE_URL + endpoint;
  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  if (statusCode >= 400) {
    Logger.log(`Erro ${statusCode}: ${responseText}`);
    throw new Error(`Erro na API: ${statusCode} - ${responseText}`);
  }
  
  if (responseText) {
    try {
      return JSON.parse(responseText);
    } catch (e) {
      return responseText;
    }
  }
  
  return [];
}

/**
 * Limpa e formata texto
 */
function limparTexto(valor) {
  if (!valor) return null;
  const texto = valor.toString().trim();
  return texto === '' ? null : texto;
}

/**
 * Formata hora para o formato do banco (HH:MM:SS)
 */
function formatarHora(valor) {
  if (!valor) return null;
  
  // Se for objeto Date
  if (valor instanceof Date) {
    const horas = valor.getHours().toString().padStart(2, '0');
    const minutos = valor.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}:00`;
  }
  
  // Se for string
  const texto = valor.toString().trim();
  if (texto === '' || texto === '-' || texto === '--:--') return null;
  
  // Tentar parsear diferentes formatos
  const match = texto.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const horas = match[1].padStart(2, '0');
    const minutos = match[2];
    return `${horas}:${minutos}:00`;
  }
  
  return null;
}

// ============================================================
// MENU E TRIGGERS
// ============================================================

/**
 * Cria um menu personalizado quando a planilha abre
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚌 Shuttle Control')
    .addItem('Sincronizar Dados', 'sincronizarDados')
    .addSeparator()
    .addItem('Configurar Trigger Automático', 'configurarTrigger')
    .addItem('Remover Trigger', 'removerTrigger')
    .addToUi();
}

/**
 * Configura trigger para sincronização automática a cada 5 minutos
 */
function configurarTrigger() {
  // Remover triggers existentes primeiro
  removerTrigger();
  
  // Criar novo trigger
  ScriptApp.newTrigger('sincronizarDados')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  SpreadsheetApp.getUi().alert('Trigger configurado! Os dados serão sincronizados automaticamente a cada 5 minutos.');
}

/**
 * Remove todos os triggers de sincronização
 */
function removerTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sincronizarDados') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

// ============================================================
// TESTE
// ============================================================

/**
 * Função de teste - verifica conexão com o Supabase
 */
function testarConexao() {
  try {
    const response = supabaseRequest('GET', '/rest/v1/eventos?select=id&limit=1');
    Logger.log('Conexão bem sucedida!');
    Logger.log(response);
    SpreadsheetApp.getUi().alert('Conexão com Supabase OK!');
  } catch (error) {
    Logger.log(`Erro: ${error.message}`);
    SpreadsheetApp.getUi().alert(`Erro de conexão: ${error.message}`);
  }
}
