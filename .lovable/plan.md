

## Problema

Na `fetchStats` (linha 109-127 de `Home.tsx`), as queries de **Viagens Hoje**, **Motoristas Online** e **Veículos Liberados** não filtram por eventos ativos. Elas contam dados de TODOS os eventos (inclusive inativos), inflando os números.

Por exemplo:
- `veiculos` com `status = 'liberado'` retorna 131 — inclui veículos de eventos inativos
- `motorista_presenca` não filtra por `evento_id` de eventos ativos
- `viagens` não filtra por `evento_id` de eventos ativos

## Plano

### Arquivo: `src/pages/Home.tsx` — função `fetchStats`

Reestruturar para:

1. Primeiro buscar os IDs dos eventos ativos: `select('id').eq('status', 'ativo')`
2. Usar esses IDs para filtrar as 3 queries restantes com `.in('evento_id', activeEventIds)`
3. Se não houver eventos ativos, retornar tudo zerado

Queries corrigidas:
- **Viagens Hoje**: adicionar `.in('evento_id', ids)`
- **Motoristas Online**: adicionar `.in('evento_id', ids)`
- **Veículos Liberados**: adicionar `.in('evento_id', ids)`

A query de "Eventos Ativos" permanece igual (já filtra por status).

### Impacto
- Números passam a refletir apenas a operação ativa
- Nenhuma query adicional — são as mesmas 4, apenas com filtro extra
- Custo Supabase inalterado

