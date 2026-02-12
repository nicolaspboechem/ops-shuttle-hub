

# Atualizar design do Kanban de Veiculos para seguir o padrao do Kanban de Missoes

## Resumo

O Kanban de missoes e limpo e rapido: card inteiro arrastavel (sem icone de 6 pontos), sem animacoes pesadas do framer-motion, colunas simples com bolinha colorida + badge de contagem. O Kanban de veiculos usa `GripVertical` como handle de arraste, `framer-motion` com layout animations (causando delay), e colunas com header colorido pesado. Vamos alinhar o estilo.

## Mudancas

### 1. VeiculoKanbanCardFull.tsx - Remover drag handle e framer-motion

**Antes:** Card usa `GripVertical` como zona de arraste separada + `motion.div` com layout animations, `AnimatePresence`, e overlay com rotacao/escala animada.

**Depois:**
- Remover import de `GripVertical`
- Remover imports de `motion`, `AnimatePresence`, `CSS` do framer-motion
- Tornar o card inteiro arrastavel (como no MissaoKanbanCard): aplicar `listeners` e `attributes` no container principal
- Trocar `motion.div` por `div` simples
- Manter o estilo de `cursor-grab active:cursor-grabbing` no card inteiro
- Overlay simplificado: `div` com `shadow-xl ring-2 ring-primary/50` (sem animacao de rotacao)
- Classes de transicao: `transition-shadow hover:shadow-md`, `isDragging && "opacity-40"`

Estrutura resultante (similar ao MissaoKanbanCard):
```tsx
<div
  ref={setNodeRef}
  style={style}
  {...(!isDragOverlay ? { ...listeners, ...attributes } : {})}
  className={cn(
    "bg-card border border-border rounded-lg p-4 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md flex flex-col gap-3 select-none",
    isDragging && "opacity-40",
    isDragOverlay && "shadow-xl ring-2 ring-primary/50",
  )}
>
  {/* conteudo do card sem GripVertical */}
</div>
```

### 2. VeiculoKanbanColumnFull.tsx - Simplificar para padrao MissaoKanbanColumn

**Antes:** Coluna usa `motion.div` com animacao de scale ao hover, header com background colorido forte, `AnimatePresence mode="popLayout"`.

**Depois:**
- Remover imports de `motion`, `AnimatePresence` do framer-motion
- Trocar `motion.div` por `div` simples
- Header simplificado: bolinha colorida + titulo + Badge de contagem (como MissaoKanbanColumn)
- Manter a transicao suave ao receber drop: `isOver && "bg-primary/5 border-primary/30"`
- Remover `AnimatePresence` do wrapper dos cards
- Manter `ScrollArea` para scroll

Estrutura resultante:
```tsx
<div
  ref={setNodeRef}
  className={cn(
    "flex flex-col bg-muted/30 rounded-xl border border-border/50 min-w-[300px] flex-1 transition-colors",
    isOver && "bg-primary/5 border-primary/30"
  )}
>
  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", config.accentColor)} />
    <span className="text-sm font-semibold text-foreground">{config.title}</span>
    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5">
      {veiculos.length}
    </Badge>
  </div>
  <ScrollArea ...>
    <div className="p-2 space-y-2 min-h-[60px]">
      {cards...}
    </div>
  </ScrollArea>
</div>
```

O `statusConfig` sera simplificado para ter apenas `accentColor` (cor da bolinha) em vez de multiplas propriedades de cor:
- liberado: `bg-emerald-500`
- pendente: `bg-amber-500`
- em_inspecao: `bg-blue-500`
- manutencao: `bg-gray-500`

## Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/components/veiculos/VeiculoKanbanCardFull.tsx` | Remover GripVertical, remover framer-motion, card inteiro arrastavel |
| `src/components/veiculos/VeiculoKanbanColumnFull.tsx` | Remover framer-motion, header com bolinha + badge simples |

## Resultado

- Design consistente entre os dois kanbans
- Sem delay de animacao ao arrastar
- Sem icone de 6 pontos (GripVertical) - card inteiro e arrastavel
- Visual limpo e minimalista

