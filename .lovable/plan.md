

# Substituir Kanban por Lista com Swipe na Tela de Vincular Veiculo

## Problema

A tela de vinculacao de veiculo ao motorista usa um layout Kanban com 4 colunas por status, que e dificil de navegar no mobile. A busca filtra por placa, mas o supervisor identifica veiculos pelo nome/apelido.

## Solucao

Substituir o Kanban inteiro por uma lista vertical simples, agrupada por status com headers colapsaveis. Cada item da lista tera:
- Nome/apelido do veiculo em destaque (com placa secundaria)
- Botao "Vincular" bem visivel a direita
- Swipe para a direita usando o `SwipeableCard` existente para vincular rapidamente
- Busca por nome/apelido (com fallback para placa)

## Alteracoes

### `src/pages/VincularVeiculo.tsx`

**Busca**: Alterar o filtro para priorizar `v.nome` (apelido) e manter `v.placa` como fallback. Mudar o placeholder para "Buscar por nome do veiculo...".

**Layout**: Remover todo o bloco Kanban (desktop e mobile com Tabs) e substituir por uma lista vertical unica que funciona bem em ambos. Estrutura:

```text
[Header colapsavel: "Liberados (12)"]
  [Item] Nome do Veiculo | Placa | Tipo | Combustivel | [Vincular]
  [Item] ...
[Header colapsavel: "Pendentes (3)"]
  [Item] ...
```

Cada item da lista sera envolvido pelo `SwipeableCard` com `rightAction` (swipe para direita) configurado para abrir o dialog de confirmacao de vinculacao.

**Remover imports**: `VeiculoKanbanColumn`, `Tabs/TabsList/TabsTrigger/TabsContent`.

**Adicionar imports**: `SwipeableCard`, `Collapsible`, icones de status, `Link2`, `ChevronDown`.

### Detalhes do item da lista

Cada linha mostrara:
- Icone do tipo (Van/Onibus)
- **Nome** em negrito (ou placa se nao tiver nome)
- Placa em texto secundario
- Badge de status colorido (ponto + cor)
- Indicador de combustivel compacto
- Se ja tem motorista vinculado: nome em texto verde
- Botao "Vincular" (ou "Atual" se for o veiculo ja vinculado) alinhado a direita
- O card inteiro tem swipe right para vincular

### Agrupamento

Manter os 4 grupos (liberado, pendente, em_inspecao, manutencao) usando `Collapsible` do Radix. Os "liberados" vem abertos por padrao, os demais colapsados. Cada header mostra icone de status + titulo + contagem.

Nenhuma alteracao em componentes compartilhados (`VeiculoKanbanColumn`, `VeiculoKanbanCard`) - eles continuam disponiveis para outros usos no CCO desktop.

