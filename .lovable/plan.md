
# Correção: Veículo não desvinculado na virada do dia

## Problema

Motoristas reclamam que o veículo do dia anterior permanece no app mesmo após a troca. A causa é que a Edge Function `auto-checkout` (executada na virada do dia operacional) **não desvincula o veículo do motorista** -- ela apenas muda o status para "indisponível" e fecha a presença, mas o campo `veiculo_id` na tabela `motoristas` continua apontando para o veículo antigo.

Comparação:
- **Checkout manual** (feito pelo motorista): desvincula o veículo corretamente (`veiculo_id = null`)
- **Auto-checkout** (virada do dia): apenas muda status, veículo fica "preso"

## Correção

### 1. Edge Function `auto-checkout/index.ts`

Adicionar `veiculo_id: null` na atualização dos motoristas, igualando o comportamento ao checkout manual:

```text
// ANTES (linha 122):
.update({ status: "indisponivel" })

// DEPOIS:
.update({ status: "indisponivel", veiculo_id: null })
```

### 2. Hook `useMotoristaPresenca.ts` -- Proteção extra no app

Atualmente o veículo exibido no app segue esta lógica:

```text
veiculoExibir = presenca?.veiculo || veiculoAtribuido
```

O `presenca?.veiculo` vem do `veiculo_id` gravado no registro de presença do check-in (que pode ser de ontem). Se o motorista já fez checkout (manual ou auto), a presença com checkout feito não deveria mais fornecer o veículo antigo.

Ajuste no `fetchPresenca`: quando a presença retornada JA TEM checkout (checkout_at != null), não carregar o veículo dessa presença -- pois o turno encerrou.

### 3. Proteção na exibição (`AppMotorista.tsx`)

Ajustar a lógica de `veiculoExibir` para considerar apenas presença ativa (sem checkout):

```text
// ANTES:
const veiculoExibir = presenca?.veiculo || veiculoAtribuido;

// DEPOIS:
const presencaAtiva = presenca && presenca.checkin_at && !presenca.checkout_at;
const veiculoExibir = (presencaAtiva ? presenca?.veiculo : null) || veiculoAtribuido;
```

Isso garante que, após o checkout (manual ou automático), o veículo antigo não "grude" na tela.

---

## Resumo de arquivos

| Arquivo | Tipo | Mudança |
|---|---|---|
| `supabase/functions/auto-checkout/index.ts` | Editar | Adicionar `veiculo_id: null` no update de motoristas |
| `src/hooks/useMotoristaPresenca.ts` | Editar | Não popular `presenca.veiculo` quando checkout já foi feito |
| `src/pages/app/AppMotorista.tsx` | Editar | Só usar veículo da presença se presença estiver ativa |
| `src/lib/version.ts` | Editar | Atualizar versão para 1.7.2 |

## Impacto

- Corrige o problema imediatamente para novos auto-checkouts (próxima virada)
- Protege o app contra dados residuais de presenças encerradas
- Não afeta checkout manual (que já funciona corretamente)
- Não requer alterações no banco de dados
