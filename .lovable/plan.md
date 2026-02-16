

# Filtros Avancados, Ordenacao e Correcao de Titulo nas Missoes

## Resumo

Tres melhorias no painel de missoes do CCO:
1. Adicionar filtros de **Veiculo** (com busca no dropdown), **Prioridade**
2. Ordenar missoes por horario: instantaneas primeiro, agendadas em ordem crescente
3. Corrigir titulo do card kanban para quebrar texto ao inves de truncar

---

## 1. Novos Filtros no MissoesPanel

**Arquivo:** `src/components/motoristas/MissoesPanel.tsx`

### Filtro de Veiculo (com busca)
- Novo state `missaoVeiculoFilter`
- Usar componente `Popover` + `Command` (cmdk) para criar um dropdown com barra de pesquisa
- Listar veiculos unicos extraidos dos motoristas cadastrados (relacao `motorista.veiculos`)
- Filtrar missoes pelo `veiculo_placa` ou `veiculo_nome`

### Filtro de Prioridade
- Novo state `missaoPrioridadeFilter`
- Select simples com opcoes: Todas, Baixa, Normal, Alta, Urgente
- Filtrar no `filteredMissoes` por `m.prioridade`

### Atualizacoes
- Adicionar ambos filtros ao `hasActiveMissaoFilters` e `clearMissaoFilters`
- Incluir no `filteredMissoes` useMemo

## 2. Ordenacao por Horario

**Arquivo:** `src/components/motoristas/MissoesPanel.tsx`

Apos a filtragem no `filteredMissoes`, adicionar `.sort()`:

```text
Criterio:
1. Missoes sem horario_previsto (instantaneas) vem primeiro
2. Missoes com horario_previsto ordenadas em ordem crescente (08:00 antes de 14:00)
```

A ordenacao sera aplicada dentro do `useMemo` do `filteredMissoes`, garantindo que afeta kanban, cards e lista.

Dentro do `missoesByStatus`, cada grupo tambem sera ordenado pelo mesmo criterio.

## 3. Corrigir Titulo Truncado no Card Kanban

**Arquivo:** `src/components/motoristas/MissaoKanbanCard.tsx`

Linha atual:
```
<h4 className="font-semibold text-sm leading-tight truncate">
```

Alterar para:
```
<h4 className="font-semibold text-sm leading-tight break-words">
```

Remover `truncate` e adicionar `break-words` para que o titulo quebre em multiplas linhas dentro da largura do card.

---

## Arquivos Alterados

| Arquivo | Acao |
|---------|------|
| `src/components/motoristas/MissoesPanel.tsx` | Filtros de veiculo (com busca) e prioridade + ordenacao |
| `src/components/motoristas/MissaoKanbanCard.tsx` | Remover truncate do titulo |

