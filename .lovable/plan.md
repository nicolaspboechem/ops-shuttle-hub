
# Corrigir cards Kanban cortados e problemas de clipping na interface

## Diagnostico

### Problema principal: Colunas Kanban de Motoristas muito estreitas
O componente `MotoristaKanbanColumn` (linha 108) define `min-w-[280px] max-w-[320px]`, mas o `MotoristaKanbanCard` contém bastante informacao (avatar, nome, status badge, localizacao, veiculo, metricas, botao WhatsApp). O `max-w-[320px]` impede que o card se expanda o suficiente, cortando conteudo.

### Problema secundario: Altura do container Kanban
O `ScrollArea` dentro da coluna usa `max-h-[calc(100vh-280px)]`, mas a cadeia de layout nao propaga altura corretamente:
- `EventLayout` usa `min-h-screen` (bom)
- Motoristas.tsx usa `flex h-full` (linha 1188), mas `h-full` nao funciona sem um pai com altura definida

### Problema similar em Veiculos
`VeiculoKanbanColumnFull` usa `min-w-[300px]` (sem max-width, melhor) mas o `max-h-[calc(100vh-320px)]` pode causar clipping similar.

## Correcoes

### 1. Ampliar largura das colunas Kanban de Motoristas

**Arquivo**: `src/components/motoristas/MotoristaKanbanColumn.tsx` (linha 108)

Alterar de:
```text
min-w-[280px] max-w-[320px]
```
Para:
```text
min-w-[310px] max-w-[380px]
```

Isso da mais espaco para os cards exibirem todo o conteudo sem cortar badges de status, nomes longos e informacoes de veiculo.

### 2. Corrigir propagacao de altura no layout

**Arquivo**: `src/pages/Motoristas.tsx` (linha 1188)

Alterar o container de:
```text
<div className="flex h-full">
```
Para:
```text
<div className="flex min-h-[calc(100vh-4rem)]">
```

Isso garante que o container flex tenha uma altura minima real, permitindo que o `max-h` do ScrollArea funcione corretamente.

### 3. Ajustar content area para ocupar altura total

**Arquivo**: `src/pages/Motoristas.tsx` (linha 1195)

Alterar de:
```text
<div className="flex-1 p-6 overflow-auto">
```
Para:
```text
<div className="flex-1 p-6 overflow-auto min-h-0">
```

O `min-h-0` e essencial em containers flex para permitir que `overflow-auto` funcione corretamente (por padrao, flex items tem `min-height: auto` que impede o overflow).

### 4. Mesma correcao de min-h-0 em Veiculos.tsx

**Arquivo**: `src/pages/Veiculos.tsx`

Verificar e aplicar o mesmo padrao `min-h-0` no container de conteudo para evitar clipping no Kanban de veiculos.

### 5. Ajustar DragOverlay card width

**Arquivo**: `src/components/motoristas/MotoristaKanbanCard.tsx` (linha 78)

Alterar o drag overlay de `w-[280px]` para `w-[320px]` para corresponder a nova largura das colunas.

## Resultado esperado

- Cards de motoristas no Kanban exibem todas as informacoes sem corte
- Colunas Kanban ocupam a altura disponivel corretamente
- ScrollArea funciona sem clipping em ambos Kanban (motoristas e veiculos)
- DragOverlay com tamanho consistente ao arrastar cards
