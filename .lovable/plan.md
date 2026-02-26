

# AppOperador: Acesso Total com Cards Corretos por Tipo

## Resumo

Refatorar o AppOperador para suportar todos os tipos de viagem do evento, usando o card correto para cada tipo:

- **Shuttle e Transfer**: usam `ViagemCardOperador` (lifecycle: iniciar, chegada, retorno, encerrar)
- **Missao**: usa o sistema de missoes existente (`useMissoes`, `MissaoCardMobile`) - mesmo formato que funciona no Rio Open e no AppSupervisor

## Arquivos Alterados

### 1. `src/components/app/NewActionModal.tsx`

- Substituir prop `hideShuttle?: boolean` por `tiposHabilitados?: string[]`
- Filtrar botoes dinamicamente: so mostra Missao/Deslocamento se `missao` habilitado, Transfer se `transfer` habilitado, Shuttle se `shuttle` habilitado
- Fallback: se `tiposHabilitados` nao informado, mostra todos (compatibilidade)

### 2. `src/pages/app/AppOperador.tsx`

**Query e dados:**
- Buscar `tipos_viagem_habilitados` do evento na query de carregamento
- Remover filtro fixo `tipoOperacao: 'shuttle'` do `useViagens` - carregar todas as viagens
- Adicionar `useMissoes(eventoId)` para carregar missoes (se missao habilitada)
- Adicionar `useMotoristas(eventoId)` e `usePontosEmbarque(eventoId)` para os formularios

**Filtro por abas internas (pills):**
- Adicionar state `filtroTipo: string | null` (null = todos)
- Renderizar pills horizontais: `[Todos] [Shuttle] [Transfer] [Missao]`
- So mostrar pills dos tipos presentes em `tipos_viagem_habilitados`
- Se apenas 1 tipo habilitado, nao mostrar pills
- Filtrar viagens e missoes pelo tipo selecionado

**Botao "+" (nova operacao):**
- Se 1 tipo habilitado: abrir formulario direto (Shuttle->CreateShuttleForm, Transfer->CreateViagemForm, Missao->MissaoInstantaneaModal)
- Se 2+ tipos: abrir `NewActionModal` com `tiposHabilitados`
- Tratar `handleActionSelect`: missao->MissaoInstantaneaModal, deslocamento->MissaoDeslocamentoModal, transfer/shuttle->CreateViagemForm/CreateShuttleForm

**Renderizacao de cards:**
- Viagens (transfer/shuttle) ativas: `ViagemCardOperador` (com lifecycle completo via swipe/botoes)
- Missoes ativas: `MissaoCardMobile` (aceitar, iniciar, concluir - mesmo formato do AppMotorista/AppSupervisor)
- Viagens encerradas (shuttle): `ShuttleRegistroCard` (card compacto existente)
- Viagens encerradas (transfer): card compacto similar
- Missoes concluidas: card compacto de missao

**Imports adicionais:**
- `NewActionModal`, `CreateViagemForm`, `MissaoInstantaneaModal`, `MissaoDeslocamentoModal`
- `useMissoes`, `useMotoristas`, `usePontosEmbarque`
- `MissaoCardMobile`
- `ViagemCardOperador`

**Metricas (summary cards):**
- Refletir o filtro ativo
- Se filtro = todos: totais gerais
- Se filtro = shuttle: PAX ida/volta
- Se filtro = missao: pendentes/em andamento/concluidas

### 3. `src/components/app/CreateShuttleForm.tsx`

Adicionar campos para shuttle com lifecycle completo:
- **Veiculo** (combobox com busca nos veiculos do evento)
- **Ponto A / Origem** (combobox dos pontos de embarque)
- **Ponto B / Destino** (combobox dos pontos de embarque)
- Manter campos existentes: PAX, observacao
- Gravar `veiculo_id`, `ponto_embarque`, `ponto_desembarque` na viagem
- Props adicionais: receber lista de veiculos e pontos do AppOperador

### 4. `src/pages/app/AppSupervisor.tsx`

- Buscar `tipos_viagem_habilitados` do evento (ja busca evento, so adicionar o campo)
- Passar `tiposHabilitados={evento?.tipos_viagem_habilitados}` para `NewActionModal`

## Fluxo por Tipo

### Shuttle (no operador)
1. Operador toca "+"
2. Abre CreateShuttleForm com: veiculo, ponto A, ponto B, PAX, obs
3. Viagem criada com status `em_andamento`
4. Card `ViagemCardOperador` aparece com botoes: Chegou -> Aguardar Retorno/Encerrar -> Retorno -> Encerrar
5. Ao encerrar, vira `ShuttleRegistroCard` compacto

### Transfer (no operador)
1. Operador toca "+"
2. Abre CreateViagemForm (mesmo do supervisor)
3. Card `ViagemCardOperador` com lifecycle: Iniciar -> Chegou -> Encerrar

### Missao (no operador)
1. Operador toca "+"
2. Abre MissaoInstantaneaModal (mesmo do supervisor)
3. Card `MissaoCardMobile` com lifecycle: aceitar -> iniciar -> concluir
4. Funciona exatamente como no Rio Open

## Ordem de Implementacao

1. `NewActionModal` - nova prop `tiposHabilitados`
2. `CreateShuttleForm` - adicionar campos veiculo, ponto A, ponto B
3. `AppOperador` - refatoracao completa
4. `AppSupervisor` - passar `tiposHabilitados`
