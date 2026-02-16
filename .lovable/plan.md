
# Paginacao com "Ver Mais" em Listas de Viagens

## Resumo

Adicionar paginacao com limite inicial de 20 itens e botao "Ver mais" em todas as listas de viagens/historico do sistema. O usuario podera escolher quantas linhas carregar por vez (20, 50, 100). Isso reduz o volume de dados renderizados e melhora o desempenho em dispositivos moveis e com muitos registros.

**Importante:** A paginacao sera no frontend (sobre os dados ja carregados), pois os hooks `useViagens` ja trazem dados filtrados por dia operacional. O ganho e na renderizacao, nao na query.

---

## Locais Afetados

| Arquivo | Contexto |
|---------|----------|
| `src/components/viagens/ViagensTable.tsx` | Tabela do CCO (Viagens Finalizadas e Ativas) |
| `src/components/shuttle/ShuttleTable.tsx` | Tabela de Shuttles no CCO |
| `src/components/transfer/TransferTable.tsx` | Tabela de Transfers no CCO |
| `src/components/app/MotoristaHistoricoTab.tsx` | Historico do app do motorista |
| `src/components/app/OperadorHistoricoTab.tsx` | Historico do app do operador (apenas resumo, sem lista -- nao precisa) |
| `src/pages/app/AppOperador.tsx` | Lista de shuttles encerrados no app do operador |
| `src/components/app/SupervisorViagensTab.tsx` | Lista de viagens ativas no app do supervisor |

---

## Implementacao

### 1. Hook reutilizavel `usePaginatedList`

Criar um hook simples em `src/hooks/usePaginatedList.ts` que encapsula a logica de paginacao:

```text
Parametros:
- items: T[] (lista completa)
- defaultPageSize: number (padrao 20)

Retorna:
- visibleItems: T[] (itens visiveis ate o momento)
- hasMore: boolean
- loadMore: () => void
- total: number
- pageSize: number
- setPageSize: (n: number) => void
- reset: () => void
```

O hook usa um state interno `visibleCount` que comeca em `defaultPageSize` e incrementa por `pageSize` a cada `loadMore()`. Quando os items mudam (novo filtro/dia), faz reset automatico.

### 2. Componente `LoadMoreFooter`

Criar um componente pequeno reutilizavel que renderiza:
- Texto "Exibindo X de Y"
- Botao "Ver mais" (quando `hasMore`)
- Seletor de linhas por vez: 20 | 50 | 100

### 3. Aplicar nos componentes

#### `ViagensTable.tsx`
- Receber `viagens` normalmente
- Internamente usar `usePaginatedList(viagens)`
- Renderizar apenas `visibleItems` no `<TableBody>`
- Adicionar `<LoadMoreFooter>` abaixo da tabela

#### `ShuttleTable.tsx`
- Mesmo padrao: paginar internamente

#### `TransferTable.tsx`
- Mesmo padrao: paginar internamente

#### `MotoristaHistoricoTab.tsx`
- Paginar a lista `viagensDoDia` antes de renderizar os cards
- Adicionar `<LoadMoreFooter>` abaixo da lista

#### `AppOperador.tsx`
- Paginar `sortedEncerradas` na secao "Encerradas"
- Adicionar `<LoadMoreFooter>` abaixo dos `ShuttleRegistroCard`

#### `SupervisorViagensTab.tsx`
- Paginar `filteredViagens` na lista de viagens ativas
- Adicionar `<LoadMoreFooter>` abaixo dos cards

---

## Arquivos Novos

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/usePaginatedList.ts` | Hook de paginacao reutilizavel |
| `src/components/ui/load-more-footer.tsx` | Componente de rodape com "Ver mais" e seletor de tamanho |

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/viagens/ViagensTable.tsx` | Adicionar paginacao interna |
| `src/components/shuttle/ShuttleTable.tsx` | Adicionar paginacao interna |
| `src/components/transfer/TransferTable.tsx` | Adicionar paginacao interna |
| `src/components/app/MotoristaHistoricoTab.tsx` | Paginar lista de viagens do dia |
| `src/pages/app/AppOperador.tsx` | Paginar lista de encerradas |
| `src/components/app/SupervisorViagensTab.tsx` | Paginar lista de viagens ativas |
