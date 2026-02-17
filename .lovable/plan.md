
# Corrigir Filtros e Informacoes das Viagens Ativas e Finalizadas

## Problemas Encontrados

### 1. Filtro de viagens ativas/finalizadas usa campo errado
O `useCalculos` filtra por `encerrado` (boolean legado) em vez do campo `status` (modelo atual). Isso causa inconsistencias -- ha viagens com `encerrado=true` mas `status=em_andamento`.

### 2. FilterBar usa modelo antigo de status
Os filtros de status mostram "Em Transito / Aguardando / Retornou" baseados em `h_chegada`/`h_retorno`. O sistema agora usa `StatusViagemOperacao`: `agendado`, `em_andamento`, `aguardando_retorno`, `encerrado`, `cancelado`.

### 3. Tabela nao mostra informacoes importantes
- Falta coluna de **Ponto de Embarque**
- Falta coluna de **Ponto de Desembarque**
- Falta indicador de **Missao** (quando viagem vem de uma missao)
- A coluna "Situacao" usa `TripStatusBadge` legado (baseado em h_chegada/h_retorno) em vez do campo `status` real

## Dados atuais no banco (evento atual)

| Status | Encerrado | Tipo | Missao | Qtd |
|---|---|---|---|---|
| em_andamento | false | shuttle | nao | 10 |
| em_andamento | false | transfer | sim | 9 |
| em_andamento | true | transfer | sim | 1 |
| em_andamento | false | transfer | nao | 1 |
| encerrado | true | shuttle | nao | 1206 |
| encerrado | true | transfer | sim | 628 |
| encerrado | true | transfer | nao | 6 |

## Solucao

### 1. `src/hooks/useViagens.ts` - useCalculos
Trocar filtro de `encerrado` boolean para `status`:
- `viagensAtivas`: viagens onde `status !== 'encerrado' && status !== 'cancelado'`
- `viagensFinalizadas`: viagens onde `status === 'encerrado' || status === 'cancelado'`

### 2. `src/components/viagens/FilterBar.tsx`
Atualizar opcoes de status para refletir `StatusViagemOperacao`:
- Agendado
- Em Andamento
- Aguardando Retorno
- Encerrado
- Cancelado

Atualizar logica de filtragem para comparar com `v.status` em vez de `h_chegada`/`h_retorno`.

### 3. `src/pages/ViagensAtivas.tsx` e `src/pages/ViagensFinalizadas.tsx`
Atualizar a logica de filtragem de `viagensFiltradas` para usar `v.status` no filtro de status.

### 4. `src/components/viagens/ViagensTable.tsx`
- Adicionar coluna **Embarque** (ponto_embarque)
- Adicionar coluna **Desembarque** (ponto_desembarque)
- Adicionar coluna/badge de **Missao** (usando MissaoBadge compact quando `origem_missao_id` existe)
- Trocar `TripStatusBadge` pela `StatusViagemOperacao` real do campo `status`
- Criar badge inline para os status (agendado, em_andamento, etc.) com cores consistentes com o resto do sistema

### 5. `src/components/viagens/StatusBadge.tsx`
Criar novo componente `OperationStatusBadge` para exibir `StatusViagemOperacao` com cores e icones corretos (reutilizando o pattern do `VeiculoGrid`).

## Resumo visual

A tabela passara a mostrar:
**Status Op. | Motorista | Veiculo | Placa | Embarque | Desembarque | Pickup | Chegada | Retorno | Tempo | PAX | Missao | Editar**

Os filtros passarao a ter:
- Busca (texto)
- Tipo Veiculo (Todos/Onibus/Van)
- Status Operacional (Todos/Agendado/Em Andamento/Aguardando Retorno/Encerrado/Cancelado)
- Motorista (lista dinamica)
