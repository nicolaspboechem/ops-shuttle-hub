
# Adicionar acoes "Aceitar" e "Iniciar" nas missoes do CCO

## Problema

Atualmente, o painel de missoes do CCO (aba Motoristas) so permite "Concluir" e "Cancelar" missoes. Faltam as acoes intermediarias "Aceitar" e "Iniciar" que o admin/operador precisa executar como fallback quando o motorista, supervisor ou operador de campo nao conseguem a tempo.

## Solucao

Adicionar opcoes de menu contextual "Aceitar" e "Iniciar" nos dois formatos de visualizacao de missoes: **cards** e **tabela**.

As acoes seguem o fluxo natural do ciclo de vida da missao:
- Pendente: pode **Aceitar**, Concluir ou Cancelar
- Aceita: pode **Iniciar**, Concluir ou Cancelar
- Em Andamento: pode Concluir ou Cancelar

## Arquivos modificados

### 1. `src/components/motoristas/MissaoCard.tsx`

Adicionar duas novas opcoes no `DropdownMenuContent`:

- **Aceitar**: visivel quando `missao.status === 'pendente'`, chama `onStatusChange('aceita')`
- **Iniciar**: visivel quando `missao.status === 'aceita'`, chama `onStatusChange('em_andamento')`

Ambas ficam posicionadas antes de "Concluir" no menu, com icones `CheckCircle` (aceitar) e `Play` (iniciar).

### 2. `src/pages/Motoristas.tsx`

Na tabela de missoes (view lista), adicionar as mesmas duas opcoes no dropdown de cada linha:

- **Aceitar** (quando `status === 'pendente'`): chama `updateMissao(missao.id, { status: 'aceita' })`
- **Iniciar** (quando `status === 'aceita'`): chama `updateMissao(missao.id, { status: 'em_andamento' })`

Posicionadas antes do "Concluir" existente no dropdown.

## Nenhuma mudanca de banco ou hook necessaria

O hook `useMissoes` ja possui `aceitarMissao` e `iniciarMissao`, e o `updateMissao` generico ja suporta mudanca de status. Apenas a UI precisa expor essas opcoes.
