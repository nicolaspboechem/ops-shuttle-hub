

# Separar Dashboard por Tipo de Operacao com Abas

## Resumo

Transformar o filtro `OperationTabs` existente em abas que separam completamente os dados do Dashboard. Cada aba (Transfer, Shuttle, Missao) tera seus proprios KPIs independentes -- sem dados consolidados. Remover shuttle do App Supervisor.

## Como funciona hoje

- `useViagens(eventoId)` busca **todas** as viagens do evento numa unica query
- `OperationTabs` filtra no frontend via `useMemo`
- KPIs, graficos e rankings sao calculados sobre `viagensFiltradas`
- Ao selecionar "Todos", os dados aparecem misturados

## O que muda

### 1. Remover aba "Todos" do `OperationTabs`

A aba "Todos" deixa de existir. O usuario entra direto numa operacao especifica. O valor padrao passa a ser `transfer`.

**Arquivo:** `src/components/layout/OperationTabs.tsx`
- Remover o `TabsTrigger` de "todos"
- Alterar grid de `grid-cols-4` para `grid-cols-3`
- Atualizar o tipo `TipoOperacaoFiltro` removendo `'todos'`

### 2. Dashboard Desktop (`src/pages/Dashboard.tsx`)

- Estado inicial: `useState<TipoOperacaoFiltro>('transfer')` em vez de `'todos'`
- Remover logica de `if (tipoOperacao === 'todos')` no filtro -- agora sempre filtra
- Contadores continuam mostrando a quantidade de cada tipo para as abas
- KPIs, graficos e rankings sao 100% da operacao selecionada

### 3. Dashboard Mobile (`src/components/dashboard/DashboardMobile.tsx`)

- Mesma mudanca: estado inicial `'transfer'`, sem "todos"

### 4. Viagens Ativas (`src/pages/ViagensAtivas.tsx`)

- Estado inicial `'transfer'` em vez de `'todos'`
- Ajustar filtro `viagensFiltradas` para remover condicao de `'todos'`

### 5. Remover Shuttle do App Supervisor

**Arquivo:** `src/pages/app/AppSupervisor.tsx`
- No `handleActionSelect`, remover a opcao shuttle (manter apenas `missao` e `transfer`)

**Arquivo:** `src/components/app/NewActionModal.tsx`
- Criar uma prop opcional `hideShuttle?: boolean`
- Quando `hideShuttle=true`, ocultar o botao Shuttle
- No `AppSupervisor`, passar `hideShuttle={true}`
- No `AppOperador`, manter como esta (com shuttle visivel)

### 6. Queries -- sem alteracao

A query do `useViagens` continua buscando tudo por `evento_id`. A separacao e 100% frontend via `filter(v => v.tipo_operacao === tipoOperacao)`. Nao ha custo extra de query nem necessidade de filtro por usuario -- admin, CCO e operador veem todos os dados do evento, separados por aba.

## Comportamento final

| Aba selecionada | KPIs mostram | Viagens listam |
|-----------------|-------------|----------------|
| Transfer | Apenas transfer (sem missao) | Apenas transfer |
| Shuttle | Apenas shuttle | Apenas shuttle |
| Missao | Apenas missao | Apenas missao |

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/OperationTabs.tsx` | Remover "Todos", grid-cols-3, atualizar tipo |
| `src/pages/Dashboard.tsx` | Estado inicial 'transfer', ajustar filtro |
| `src/components/dashboard/DashboardMobile.tsx` | Estado inicial 'transfer', ajustar filtro |
| `src/pages/ViagensAtivas.tsx` | Estado inicial 'transfer', ajustar filtro |
| `src/components/app/NewActionModal.tsx` | Prop `hideShuttle` |
| `src/pages/app/AppSupervisor.tsx` | Passar `hideShuttle={true}` |

