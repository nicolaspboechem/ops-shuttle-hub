

## Plano: Converter formulários de viagem de Drawer para Sheet (sem arrastar para fechar) + scroll ao focar input

### Problema
Os formulários de nova viagem usam `Drawer` (vaul), que permite fechar arrastando para baixo. Em mobile, ao interagir com inputs/teclado, o usuário acidentalmente fecha o formulário. Além disso, quando o teclado abre, o campo focado fica escondido.

### Mudanças

**1. Converter todos os formulários de viagem de `Drawer` para `Sheet` (side="bottom")**

Arquivos afetados:
- `src/components/app/CreateViagemForm.tsx` — Drawer → Sheet
- `src/components/app/CreateShuttleForm.tsx` — Drawer → Sheet
- `src/components/app/CreateViagemMotoristaForm.tsx` — Drawer → Sheet
- `src/components/app/ShuttleEncerrarModal.tsx` — Drawer → Sheet
- `src/components/app/RetornoViagemForm.tsx` — já usa Sheet, manter

Para cada um:
- Trocar imports de `Drawer/DrawerContent/DrawerHeader/DrawerTitle` por `Sheet/SheetContent/SheetHeader/SheetTitle`
- Usar `<SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>` — bloqueia fechar tocando fora
- Conteúdo do formulário dentro de `<div className="flex-1 overflow-y-auto overscroll-contain p-4">` — scroll interno, sem arrastar para fechar
- Manter botão "Cancelar" explícito em todos (já existem) e adicionar botão X no header quando não houver
- Remover `DrawerClose` (que fecha por arrastar) e usar `onOpenChange(false)` nos botões

**2. Scroll-into-view ao focar inputs**

Adicionar `onFocus` nos `<Input>` de texto/number dentro dos formulários para fazer `scrollIntoView`:
```tsx
onFocus={(e) => {
  setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
}}
```
O `setTimeout` de 300ms aguarda o teclado mobile abrir antes de fazer scroll.

Aplicar isso como classe utilitária nos inputs dentro dos formulários convertidos, via wrapper ou diretamente nos inputs de digitação (não nos selects/combobox).

### Resultado esperado
- Formulários só fecham pelo botão Cancelar/X — impossível fechar arrastando
- Ao focar um input, o campo rola para ficar visível acima do teclado
- Scroll interno funciona normalmente para navegar pelo formulário

