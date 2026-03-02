

# Fix: Scroll vazando e modal fechando sozinho no mobile

## Problema

Dois bugs nos modais mobile (confirmados como issues conhecidas do Radix/shadcn):

1. **Scroll do body vaza** -- o `DialogContent` e o `SheetContent` estao como irmaos do Overlay, nao como filhos. O `react-remove-scroll` do Radix nao consegue conter o scroll corretamente.
2. **Modal fecha ao scrollar** -- touch que comeca dentro do modal e termina no backdrop dispara `onPointerDownOutside`, fechando o modal involuntariamente.

## Arquivos a alterar

### 1. `src/components/ui/dialog.tsx`

**DialogOverlay**: adicionar `overflow-y-auto` e layout de grid para centralizar o Content quando ele e filho do Overlay.

**DialogContent**: 
- Mover `<DialogPrimitive.Content>` para **dentro** de `<DialogOverlay>` (filho, nao irmao)
- Remover posicionamento `fixed left-[50%] top-[50%] translate-x/y` (nao precisa mais, o Overlay faz o layout)
- Usar `relative w-full max-w-lg mx-auto my-auto` no lugar
- Adicionar `onPointerDownOutside={(e) => e.preventDefault()}` e `onInteractOutside={(e) => e.preventDefault()}`

O botao de fechar (X) continua funcionando normalmente.

### 2. `src/components/ui/sheet.tsx`

**SheetContent**:
- Adicionar `overscroll-behavior: contain` via classe Tailwind (`overscroll-contain`) para evitar scroll vazando
- Adicionar `onPointerDownOutside={(e) => e.preventDefault()}` e `onInteractOutside={(e) => e.preventDefault()}`

O Sheet usa slide-in (nao centralizado), entao a estrutura Overlay/Content como irmaos e aceitavel -- basta adicionar o `overscroll-contain` e proteger contra dismiss acidental.

### Nenhuma alteracao nos consumidores

Os componentes `EditViagemMobileModal`, `EditViagemModal`, `ReportarCombustivelModal`, `EditarLocalizacaoModal` e todos os demais continuam funcionando sem mudanca -- o fix e na camada base do shadcn.

## Detalhe tecnico

```text
ANTES (dialog.tsx):
  Portal
  +-- Overlay (fixed, z-50)
  +-- Content (fixed, z-50, translate centered)  <-- irmao

DEPOIS (dialog.tsx):
  Portal
  +-- Overlay (fixed, z-50, overflow-y-auto, grid)
      +-- Content (relative, mx-auto, my-auto)   <-- filho
```

Para o Sheet, a estrutura nao muda -- apenas adiciona overscroll-contain e preventDefault nos eventos de dismiss.

