

# Otimizacao de Fluxos, Limpeza de Codigo e Atualizacao de Versao

## Resumo

Tres frentes de trabalho: (1) remover o dropdown redundante de tipo no formulario de viagem, (2) garantir que o status do motorista se atualize automaticamente em todos os fluxos, e (3) limpar codigo morto e atualizar a versao.

---

## 1. Remover Dropdown Redundante no CreateViagemForm

**Problema**: Quando o operador/supervisor clica em "Transfer" ou "Shuttle" no `NewActionModal`, o formulario `CreateViagemForm` abre com o tipo pre-selecionado via `defaultTipoOperacao`. Porem, dentro do formulario ainda existe um dropdown `<Select>` para trocar o tipo (linhas 463-474), o que e redundante -- o usuario ja escolheu antes.

**Solucao**:
- Remover o dropdown de tipo de operacao do `CreateViagemForm.tsx`
- O tipo sera definido exclusivamente pelo `defaultTipoOperacao` recebido como prop
- O campo fica invisivel, mas o valor continua sendo enviado ao Supabase
- Ajustar o layout: o campo "Qtd PAX" ocupa a largura inteira ao inves de `grid-cols-2`

| Arquivo | Mudanca |
|---|---|
| `src/components/app/CreateViagemForm.tsx` | Remover Select de tipo_operacao, campo PAX ocupa largura cheia |

---

## 2. Status Automatico do Motorista (Comunicacao entre apps)

**O que ja funciona**: O `useViagemOperacao.ts` ja atualiza automaticamente o status do motorista para `em_viagem` ao iniciar e `disponivel` ao encerrar. Porem, o fluxo de criacao de viagem no `CreateViagemForm.tsx` (usado pelo Operador e Supervisor) NAO atualiza o status do motorista.

**Solucao**: Adicionar atualizacao automatica de status nos pontos que faltam:

| Arquivo | Mudanca |
|---|---|
| `src/components/app/CreateViagemForm.tsx` | Apos criar viagem com sucesso, atualizar `motoristas.status = 'em_viagem'` usando o `motorista_id` resolvido |
| `src/components/app/CreateViagemMotoristaForm.tsx` | Ja atualiza (linha 178-183) -- sem mudanca necessaria |
| `src/hooks/useViagemOperacao.ts` | Ja atualiza -- sem mudanca necessaria |

Isso garante que quando o CCO/Operador/Supervisor cria uma viagem, o motorista aparece automaticamente como "em viagem" em todos os paineis (Localizador, Mapa de Servico, App do Supervisor, etc.) via Realtime.

---

## 3. Missoes no Operador -- sempre instantanea

**Problema atual**: Quando o Operador clica em Missao, aparece o `MissaoTipoModal` perguntando "Instantanea ou Agendada?". Conforme solicitado, no Operador e Supervisor a missao sera sempre instantanea.

**Solucao**:

| Arquivo | Mudanca |
|---|---|
| `src/pages/app/AppOperador.tsx` | Remover `MissaoTipoModal` -- ao selecionar "Missao" no `NewActionModal`, abrir diretamente o `MissaoInstantaneaModal` |
| `src/pages/app/AppSupervisor.tsx` | Remover `MissaoTipoModal` -- ao selecionar "Missao", abrir diretamente o `MissaoInstantaneaModal` |

Isso remove um clique intermediario desnecessario.

---

## 4. Limpeza de Codigo Morto

| Arquivo | Limpeza |
|---|---|
| `src/pages/app/AppOperador.tsx` | Remover import e estado do `MissaoTipoModal` e `MissaoModal` (agendada) que nao serao mais usados |
| `src/pages/app/AppSupervisor.tsx` | Remover import e estado do `MissaoTipoModal` e `MissaoModal` (agendada) que nao serao mais usados |
| `src/components/app/CreateViagemForm.tsx` | Remover import e JSX do Select de tipo_operacao |

---

## 5. Atualizar Versao do App

| Arquivo | Mudanca |
|---|---|
| `src/lib/version.ts` | `APP_VERSION` de `'1.3.0'` para `'1.4.0'` (nova funcionalidade: kanban de missoes + otimizacao de fluxos) |

---

## Detalhes Tecnicos

### CreateViagemForm.tsx -- remocao do dropdown

```text
ANTES (grid-cols-2):
  [ Qtd PAX ] [ Tipo (dropdown) ]

DEPOIS (largura cheia):
  [ Qtd PAX .......................... ]
  (tipo definido pela prop, sem UI)
```

### Status automatico -- fluxo completo

```text
CCO/Operador/Supervisor cria viagem
  -> Supabase INSERT viagens (status: em_andamento)
  -> Supabase UPDATE motoristas (status: em_viagem)   <-- ADICIONADO
  -> Realtime propaga para todos os apps

Motorista/Operador encerra viagem
  -> useViagemOperacao.encerrarViagem()
  -> Supabase UPDATE motoristas (status: disponivel)  <-- JA EXISTE
  -> Realtime propaga para todos os apps
```

### Missao no Operador/Supervisor -- fluxo simplificado

```text
ANTES:
  + Nova > Missao > [Instantanea/Agendada?] > Formulario

DEPOIS:
  + Nova > Missao > Formulario Instantaneo (direto)
```

---

## Resumo de Arquivos Modificados

| # | Arquivo | Tipo |
|---|---|---|
| 1 | `src/components/app/CreateViagemForm.tsx` | Remover dropdown tipo + adicionar sync status motorista |
| 2 | `src/pages/app/AppOperador.tsx` | Remover MissaoTipoModal e MissaoModal, ir direto para instantanea |
| 3 | `src/pages/app/AppSupervisor.tsx` | Remover MissaoTipoModal e MissaoModal, ir direto para instantanea |
| 4 | `src/lib/version.ts` | Atualizar para 1.4.0 |

