

# Adicionar aba "Geral" ao filtro de operacoes e corrigir visibilidade

## Problema

1. **Viagens de shuttle nao aparecem em "Viagens Ativas"**: A pagina inicia na primeira aba habilitada (ex: `missao`), e shuttle so aparece ao clicar manualmente na aba Shuttle. Nao existe uma visao consolidada de todas as operacoes.
2. **Dashboard do cliente nao tem filtro por tipo**: O `ClienteDashboardTab` mostra todas as viagens misturadas sem possibilidade de filtrar por tipo de operacao.
3. **Localizador**: A logica de visibilidade ja esta implementada corretamente (`habilitar_localizador` controla a aba). Se o botao ainda aparece quando desabilitado, pode ser um problema de cache do estado do evento. Sera verificado e reforcado.

## Mudancas

### 1. Adicionar tipo "todos" ao `OperationTabs`

**Arquivo:** `src/components/layout/OperationTabs.tsx`

- Expandir `TipoOperacaoFiltro` para incluir `'todos'`
- Adicionar uma aba "Geral" como primeira opcao, sempre visivel, com cor neutra (azul/slate)
- O contador de "Geral" sera a soma de todos os tipos
- Remover a logica que esconde as tabs quando so ha 1 tipo (para que "Geral" + tipo unico ainda aparecam)

### 2. Atualizar `ViagensAtivas` para iniciar em "todos"

**Arquivo:** `src/pages/ViagensAtivas.tsx`

- Alterar o estado inicial de `tipoOperacao` para `'todos'`
- Atualizar os filtros de `viagensFiltradas` e `contadores` para suportar `'todos'` (nao filtrar por tipo quando "todos" esta selecionado)
- Adicionar contador total para a aba "Geral"

### 3. Adicionar filtro de operacao ao `ClienteDashboardTab`

**Arquivo:** `src/components/app/ClienteDashboardTab.tsx`

- Importar e renderizar `OperationTabs` no topo do dashboard, logo abaixo do header
- Adicionar estado `tipoOperacao` (inicializado em `'todos'`)
- Filtrar `viagens`, `viagensAtivas` e `viagensFinalizadas` pelo tipo selecionado antes de calcular as metricas
- Quando `'todos'` esta selecionado, mostrar todas as viagens (comportamento atual)
- Calcular `contadores` para as tabs a partir das viagens do evento
- Passar `tiposHabilitados` do evento para o `OperationTabs`

### 4. Reforcar visibilidade do localizador no app cliente

**Arquivo:** `src/pages/app/AppCliente.tsx`

A logica ja existe na linha 56 (`if (evento?.habilitar_localizador) tabs.push('localizador')`). Sera reforcada adicionando um log de debug temporario e garantindo que o estado `evento` nao mantem dados stale entre navegacoes (reset ao mudar de evento).

## Detalhes tecnicos

### Novo tipo exportado

```typescript
export type TipoOperacaoFiltro = 'todos' | 'transfer' | 'shuttle' | 'missao';
```

### Logica de filtragem para "todos"

Quando `tipoOperacao === 'todos'`:
- Viagens Ativas: mostrar todas (sem filtro por `tipo_operacao` ou `origem_missao_id`)
- Contadores: somar transfer + shuttle + missao
- Motoristas no FilterBar: listar de todas as viagens

### Visual da aba "Geral"

A aba "Geral" usara:
- Icone: `LayoutGrid` (lucide)
- Cor ativa: `bg-blue-500 text-blue-950`
- Posicao: primeira aba (antes de Missao/Transfer/Shuttle)

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/layout/OperationTabs.tsx` | Adicionar tipo `'todos'` e aba "Geral" |
| `src/pages/ViagensAtivas.tsx` | Iniciar em `'todos'`, suportar filtro geral |
| `src/components/app/ClienteDashboardTab.tsx` | Adicionar `OperationTabs` com filtro de metricas |
| `src/pages/app/AppCliente.tsx` | Reforcar reset de estado ao trocar evento |

