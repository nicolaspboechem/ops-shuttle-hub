
# Corrigir botao de confirmacao invisivel quando status e "Pendente"

## Problema
No wizard de cadastro de veiculos (`CreateVeiculoWizard.tsx`), o botao de confirmacao no Step 4 usa a classe `bg-warning`, que nao esta definida no tema CSS/Tailwind do projeto. O resultado e que o botao fica invisivel quando o usuario seleciona "Pendente".

A versao mobile (`VistoriaVeiculoWizard.tsx`) usa `bg-destructive` e funciona corretamente.

## Correcao

### `src/components/veiculos/CreateVeiculoWizard.tsx`

1. **Botao de selecao "Pendente"** (Step 4, ~linha 518): trocar `border-warning bg-warning/10` por `border-destructive bg-destructive/10` e a cor do icone de `text-warning` para `text-destructive`
2. **Botao de confirmacao no footer** (~linha 559-563): trocar `bg-warning hover:bg-warning/90` por `bg-destructive hover:bg-destructive/90`

Isso alinha o comportamento com a versao mobile que ja funciona corretamente.
