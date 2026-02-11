

# Logica de Presenca no Kanban de Motoristas

## Resumo da mudanca

O status visivel do motorista no Kanban passara a ser derivado da presenca (check-in/check-out), nao apenas do campo `status` no banco. A logica sera:

- **Sem check-in no dia** = sempre aparece como "Inativo" (independente do status no banco)
- **Com check-in ativo** (checkin_at preenchido, checkout_at nulo) = aparece conforme seu status real (disponivel, em_viagem, etc.)
- **Com check-out realizado** = vai para a nova coluna "Expediente Encerrado"
- **Virou o dia operacional** = volta a ser "Inativo" automaticamente (pois nao tem check-in no novo dia)

## Nova coluna: Expediente Encerrado

Adicionar ao Kanban uma 5a coluna com visual roxo/slate:
- Titulo: "Expediente Encerrado"
- Icone: `LogOut`
- Motoristas que fizeram checkout no dia operacional atual

## Mudancas tecnicas

### 1. `src/pages/Motoristas.tsx`

**Constante MOTORISTA_STATUSES**: adicionar `'expediente_encerrado'` ao array.

**motoristasByStatus (useMemo)**: Reformular a logica de agrupamento. Em vez de usar apenas `m.status`, cruzar com dados de presenca:

```text
Para cada motorista ativo:
  presenca = getPresenca(motorista.id)
  
  SE presenca tem checkout_at (nao nulo):
    -> grupo "expediente_encerrado"
  SENAO SE presenca tem checkin_at (nao nulo):
    -> grupo conforme m.status (disponivel, em_viagem, indisponivel)
  SENAO (sem presenca ou sem checkin):
    -> grupo "inativo"

Para motoristas com ativo === false:
  -> grupo "inativo" (sempre)
```

**handleDragEnd**: Permitir drag para a nova coluna `expediente_encerrado`. Ao arrastar para la, disparar checkout. Ao arrastar de la para outra coluna, disparar checkin se necessario.

### 2. `src/components/motoristas/MotoristaKanbanColumn.tsx`

**statusConfig**: Adicionar entrada para `expediente_encerrado`:

| Propriedade | Valor |
|---|---|
| title | Expediente Encerrado |
| icon | LogOut |
| bgColor | bg-purple-50 / dark:bg-purple-950/20 |
| headerBg | bg-purple-100 / dark:bg-purple-900/40 |
| iconColor | text-purple-600 / dark:text-purple-400 |
| borderColor | border-purple-200 / dark:border-purple-800 |

### 3. `src/hooks/useEquipe.ts`

Nenhuma mudanca necessaria - ja retorna `checkin_at` e `checkout_at` por motorista no dia operacional, que e exatamente o que precisamos para a logica de agrupamento.

## Fluxo visual resultante

```text
Dia começa (virada operacional):
  Todos os motoristas -> coluna "Inativos"

Motorista faz check-in:
  -> Move para "Disponiveis"

Motorista recebe viagem:
  -> Move para "Em Viagem" (automatico pelo status)

Motorista faz check-out (ou admin faz):
  -> Move para "Expediente Encerrado"

Proximo dia operacional:
  -> Todos voltam para "Inativos" (sem check-in no novo dia)
```

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/Motoristas.tsx` | Nova logica de agrupamento baseada em presenca; nova coluna no array de status |
| `src/components/motoristas/MotoristaKanbanColumn.tsx` | Adicionar config visual para "expediente_encerrado" |
