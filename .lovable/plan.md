

# Missao como Aba Principal + Formulario Shuttle Simplificado

## 1. Reordenar Abas - Missao Primeiro

Alterar `OperationTabs.tsx` para exibir as abas na ordem: **Missao > Transfer > Shuttle**. Missao passa a ser a primeira aba visualmente.

Alterar o estado inicial de `'transfer'` para `'missao'` nos seguintes arquivos:
- `src/pages/Dashboard.tsx` (linha 85)
- `src/components/dashboard/DashboardMobile.tsx` (linha 115)
- `src/pages/ViagensAtivas.tsx` (linha 46)
- `src/pages/ViagensFinalizadas.tsx` (linha 46)
- `src/pages/Auditoria.tsx` (linha 25)

## 2. Formulario Shuttle Simplificado para Operador

Criar um novo componente `src/components/app/CreateShuttleForm.tsx` -- um Drawer com formulario minimalista contendo apenas:

- **Ponto de Embarque** (combobox dos pontos cadastrados)
- **Ponto de Desembarque** (combobox dos pontos cadastrados)
- **Qtd PAX** (input numerico)
- **Horario de Embarque** (input time, pre-preenchido com hora atual)
- **Observacao** (textarea opcional)

Sem campo de motorista, veiculo ou tipo de veiculo. O registro grava na tabela `viagens` com:
- `tipo_operacao: 'shuttle'`
- `motorista: 'Shuttle'` (texto fixo para compatibilidade com campo NOT NULL)
- `status: 'em_andamento'`
- `h_pickup`: horario informado
- `h_inicio_real`: timestamp atual

## 3. Integrar no AppOperador

No `AppOperador.tsx`, alterar o `handleActionSelect`:
- Quando `tipo === 'shuttle'`, abrir o novo `CreateShuttleForm` em vez do `CreateViagemForm`
- Adicionar estado `showShuttleForm` e o componente no render

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/OperationTabs.tsx` | Reordenar abas: Missao primeiro |
| `src/pages/Dashboard.tsx` | Estado inicial `'missao'` |
| `src/components/dashboard/DashboardMobile.tsx` | Estado inicial `'missao'` |
| `src/pages/ViagensAtivas.tsx` | Estado inicial `'missao'` |
| `src/pages/ViagensFinalizadas.tsx` | Estado inicial `'missao'` |
| `src/pages/Auditoria.tsx` | Estado inicial `'missao'` |
| `src/components/app/CreateShuttleForm.tsx` | **Novo** - formulario simplificado |
| `src/pages/app/AppOperador.tsx` | Integrar CreateShuttleForm para shuttle |

