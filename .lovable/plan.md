
# Correcao de 3 Bugs: Vinculacao de Veiculo, Edicao de Nome e Wizard Travado

## Bug 1: Supervisor redirecionado para login ao vincular veiculo

### Causa raiz
Em `SupervisorFrotaTab.tsx` (linha 93), ao clicar "Vincular Veiculo", o sistema navega para:
```
/evento/{eventoId}/vincular-veiculo/{motoristaId}
```
Essa rota esta protegida por `AdminRoute` em `App.tsx` (linha 151), que exige autenticacao Supabase Auth (admin). O supervisor usa Staff JWT (auth customizada), que nao e reconhecida pelo `AdminRoute`, causando redirecionamento para `/auth`.

### Solucao

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Adicionar rota `/app/:eventoId/vincular-veiculo/:motoristaId` protegida por `StaffRoute` com roles `['supervisor']` |
| `src/components/app/SupervisorFrotaTab.tsx` | Alterar navigate de `/evento/...` para `/app/...` |
| `src/pages/VincularVeiculo.tsx` | Ajustar botao "Voltar" para detectar contexto (`/app/` vs `/evento/`) e navegar corretamente |

---

## Bug 2: Wizard de criacao de veiculo - botao "Proximo" nao funciona (Etapa 1)

### Causa raiz
A validacao em `canProceed()` (linha 82) exige `placa.trim().length >= 7`. Com o input tendo `maxLength={7}`, o usuario precisa digitar exatamente 7 caracteres para habilitar o botao. Isso e correto para placas brasileiras, mas pode confundir o usuario se ele digitar com espaco, hifen ou formato diferente. Alem disso, nao ha feedback visual indicando por que o botao esta desabilitado.

### Solucao

| Arquivo | Mudanca |
|---|---|
| `src/components/veiculos/CreateVeiculoWizard.tsx` | (1) Relaxar validacao para `>= 2` caracteres -- aceitar placas de formatos variados. (2) Aumentar `maxLength` de 7 para 8 para acomodar formatos com hifen (ABC-1234). (3) Adicionar texto auxiliar abaixo do campo placa indicando o formato esperado e quantos caracteres faltam. (4) Adicionar auto-uppercase no valor (ja tem `className="uppercase"` mas nao transforma o valor real). |

---

## Bug 3: Permitir edicao do nome/apelido do veiculo (Supervisor e CCO)

### Situacao atual
O card do supervisor (`VeiculoCardSupervisor.tsx`) exibe o nome do veiculo mas NAO permite edita-lo. O modal do CCO (`VeiculoDetalheModal.tsx`) tambem nao oferece edicao do nome.

### Solucao

| Arquivo | Mudanca |
|---|---|
| `src/components/app/VeiculoCardSupervisor.tsx` | Adicionar item "Editar Nome" no dropdown do card. Ao clicar, exibir mini-dialog com input para novo nome. Ao confirmar, atualizar via Supabase e chamar callback de refetch. |
| `src/components/app/SupervisorFrotaTab.tsx` | Adicionar handler `handleEditNome` que faz `UPDATE veiculos SET nome = ... WHERE id = ...` e refetch |
| `src/components/veiculos/VeiculoDetalheModal.tsx` | Tornar o campo "Nome" editavel inline com botao de edicao/salvar |

A sincronizacao entre apps acontece automaticamente: ao atualizar o nome no banco, qualquer tela que faz refetch (ou usa Realtime) vera o nome atualizado.

---

## Resumo de Arquivos Modificados

| # | Arquivo | Mudanca |
|---|---|---|
| 1 | `src/App.tsx` | Nova rota `/app/:eventoId/vincular-veiculo/:motoristaId` com StaffRoute |
| 2 | `src/components/app/SupervisorFrotaTab.tsx` | Corrigir navigate + adicionar handler editNome |
| 3 | `src/pages/VincularVeiculo.tsx` | Ajustar "Voltar" para detectar contexto app vs evento |
| 4 | `src/components/veiculos/CreateVeiculoWizard.tsx` | Relaxar validacao da placa + feedback visual |
| 5 | `src/components/app/VeiculoCardSupervisor.tsx` | Adicionar "Editar Nome" no dropdown com mini-dialog |
| 6 | `src/components/veiculos/VeiculoDetalheModal.tsx` | Tornar nome editavel inline no modal do CCO |
