
# Corrigir Warnings de Acessibilidade do Radix Dialog

## Problema

O Radix UI exige que todo `DialogContent` tenha um `DialogTitle` para leitores de tela. Quando ausente, gera warnings repetitivos no console que poluem os logs e podem mascarar erros reais.

Os dois warnings sao:
- `DialogContent requires a DialogTitle for the component to be accessible`
- `Missing Description or aria-describedby={undefined} for DialogContent`

## Arquivos afetados

### 1. `src/components/app/MotoristaVeiculoTab.tsx` (linha 407-417)
Modal de foto ampliada usa `DialogContent` sem nenhum `DialogTitle`. Solucao: adicionar um `DialogTitle` oculto com `VisuallyHidden` e `aria-describedby={undefined}`.

### 2. `src/components/ui/command.tsx` (linha 26-36)
O `CommandDialog` usa `DialogContent` sem `DialogTitle`. Este e um componente padrao do shadcn/ui. Solucao: adicionar `DialogTitle` oculto com `VisuallyHidden` dentro do `CommandDialog`.

### 3. `src/components/ui/dialog.tsx` (componente base)
O `DialogContent` base ja tem `aria-describedby` condicional, mas nao resolve o warning de `DialogTitle` ausente. A correcao sera nos componentes que usam `DialogContent` sem `DialogTitle`.

## Alteracoes

### `src/components/app/MotoristaVeiculoTab.tsx`
- Importar `DialogTitle` do dialog
- Importar `VisuallyHidden` do Radix (ou usar `className="sr-only"`)
- Adicionar `<DialogTitle className="sr-only">Foto ampliada</DialogTitle>` dentro do `DialogContent`
- Adicionar `aria-describedby={undefined}` no `DialogContent`

### `src/components/ui/command.tsx`
- Importar `DialogTitle` e `DialogDescription`
- Adicionar `<DialogTitle className="sr-only">Comando</DialogTitle>` e `aria-describedby={undefined}` dentro do `CommandDialog`

Essas sao correcoes simples de acessibilidade que eliminam centenas de linhas de warnings repetitivos no console sem impacto visual.
