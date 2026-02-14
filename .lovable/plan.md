

# Correcoes de Sincronia e Otimizacao de Missoes

## Resumo das mudancas vs plano anterior

O Kanban mantem TODAS as 5 colunas (Pendente, Aceita, Em Andamento, Concluida, Cancelada). A coluna Concluida e util para o CCO movimentar missoes via drag-and-drop. A unica mudanca no Kanban e corrigir a query que hoje exclui concluidas e canceladas.

---

## 1. Migracao SQL: Encerrar viagens orfas de dias anteriores

27 viagens abertas de dias anteriores serao corrigidas automaticamente:

```text
UPDATE viagens
SET status = 'encerrado', encerrado = true, h_fim_real = now(),
    observacao = COALESCE(observacao || ' | ', '') || 'Encerrada automaticamente - dia anterior'
WHERE encerrado = false
  AND status IN ('agendado', 'em_andamento')
  AND data_criacao::date < CURRENT_DATE
```

---

## 2. Corrigir edge function `close-open-trips`

**Arquivo:** `supabase/functions/close-open-trips/index.ts`

- Corrigir update para incluir `status: 'encerrado'` e `h_fim_real` (hoje faz apenas `encerrado: true`)
- Adicionar bloco que fecha viagens de dias anteriores automaticamente (baseado em `data_criacao` no timezone SP < data atual SP)
- Adicionar `observacao: 'Encerrada automaticamente - dia anterior'`

---

## 3. Corrigir query do `useMissoes` para incluir todos os status

**Arquivo:** `src/hooks/useMissoes.ts`

Problema atual: linha 87 filtra `.in('status', ['pendente', 'aceita', 'em_andamento'])`, fazendo com que as colunas Concluida e Cancelada do Kanban fiquem sempre vazias.

Correcao: remover o filtro `.in('status', ...)` para buscar todas as missoes do evento. A separacao por status ja e feita no cliente pelo Kanban.

Adicionar exports derivados:
- `missoesConcluidas` -- `missoes.filter(m => m.status === 'concluida')`
- `missoesCanceladas` -- `missoes.filter(m => m.status === 'cancelada')`

---

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Encerrar viagens orfas de dias anteriores |
| `supabase/functions/close-open-trips/index.ts` | Corrigir update + cleanup dias anteriores |
| `src/hooks/useMissoes.ts` | Remover filtro de status, buscar todas as missoes do evento |

## O que NAO muda

- Kanban mantem 5 colunas: Pendente, Aceita, Em Andamento, Concluida, Cancelada
- `MissoesPanel.tsx` nao precisa de alteracao
- Nenhum componente novo necessario

