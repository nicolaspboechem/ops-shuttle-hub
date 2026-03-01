
# Filtrar apenas eventos ativos nas queries do app

## Problema

O hook `useEventos()` busca TODOS os eventos sem filtro de status. Ele e usado em 14 lugares (CCO, sidebar, dashboard, motoristas, etc.), mas apenas a pagina `Eventos.tsx` precisa ver eventos inativos (aba "Inativos"). Todos os outros consumidores so precisam de eventos ativos ou de um evento especifico por ID.

Isso gera requests desnecessarios trazendo eventos antigos/finalizados para contextos onde nao sao relevantes.

## Solucao

### 1. Adicionar filtro `status = 'ativo'` no `useEventos` (padrao)

**Arquivo:** `src/hooks/useEventos.ts`

Adicionar `.eq('status', 'ativo')` na query principal. Isso resolve todos os 13 consumidores que so precisam de eventos ativos (Dashboard, Sidebar, Motoristas, Veiculos, Configuracoes, etc.).

```typescript
const { data, error } = await supabase
  .from('eventos')
  .select('*')
  .eq('status', 'ativo')  // <-- adicionar
  .order('data_criacao', { ascending: false });
```

### 2. Criar parametro para incluir inativos na pagina Eventos

Para a pagina `Eventos.tsx` que tem a aba "Inativos", o hook recebera um parametro opcional `includeInactive`:

```typescript
export function useEventos(options?: { includeInactive?: boolean }) {
```

Quando `includeInactive` for `true`, a query nao adiciona o filtro de status. Caso contrario (padrao), filtra apenas ativos.

### 3. Atualizar chamada em `Eventos.tsx`

```typescript
const { eventos, loading, refreshing, lastUpdate, refetch } = useEventos({ includeInactive: true });
```

Todos os outros 13 consumidores continuam chamando `useEventos()` sem parametro e recebem apenas eventos ativos.

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useEventos.ts` | Adicionar filtro `status = 'ativo'` por padrao, parametro `includeInactive` opcional |
| `src/pages/Eventos.tsx` | Passar `{ includeInactive: true }` ao useEventos |

## Resultado

- 13 paginas/componentes passam a buscar apenas eventos ativos (menos dados, menos requests desnecessarios)
- Pagina de gerenciamento de eventos continua mostrando ativos e inativos nas abas correspondentes
- Nenhuma mudanca de comportamento visivel para o usuario, apenas otimizacao de dados
