

# Correcao: Checkout do CCO Falhando + Bug de Multiplos Registros de Presenca

## Diagnostico

### Bug encontrado: `.single()` com multiplos registros

O Evandro Mello tem **2 registros de presenca para hoje** (14/02):
- Registro 1: checkin 10:32 / checkout 10:33 (encerrado)
- Registro 2: checkin 10:36 / checkout NULL (ativo)

Quando o CCO tenta fazer checkout, o `handleCheckout` em `useEquipe.ts` (linha 224-230) faz:

```text
supabase.from('motorista_presenca')
  .select('id')
  .eq('motorista_id', motoristaId)
  .eq('evento_id', eventoId)
  .eq('data', today)
  .single()   // <-- ERRO: retorna PGRST116 (multiple rows)
```

O `.single()` **lanca erro silencioso** quando ha mais de 1 registro para o mesmo dia (turnos multiplos). O checkout nunca e executado.

### Mesmo bug no `handleCheckin`

O `handleCheckin` (linha 176-182) tambem usa `.single()` com a mesma query, falhando igualmente quando ha multiplos turnos.

### Bug no `fetchEquipe` - `presencas.find()` pega registro errado

Na linha 134 de `useEquipe.ts`, `presencas.find(p => p.motorista_id === m.id)` retorna o **primeiro** registro encontrado. Se o primeiro e o que tem checkout, o motorista aparece como "Expediente Encerrado" mesmo tendo um turno ativo depois.

## Correcoes

### 1. Dados: Encerrar expediente do Evandro Mello

Fechar a presenca aberta e atualizar status do motorista + desvincular veiculo.

```text
UPDATE motorista_presenca SET checkout_at = NOW(), observacao_checkout = 'Checkout manual CCO'
WHERE id = '9e9da108-9323-4d97-81e0-88b888f660ba';

UPDATE motorista_presenca SET checkout_at = '2026-02-12T06:00:00Z', observacao_checkout = 'Checkout retroativo - registro orfao'
WHERE id = '52b159de-eba2-4c73-a5ac-9a96f1ac4d93';

UPDATE motoristas SET status = 'indisponivel', veiculo_id = NULL
WHERE id = 'f87526b3-7dcd-4aba-9658-ae437d586b33';

UPDATE veiculos SET motorista_id = NULL
WHERE motorista_id = 'f87526b3-7dcd-4aba-9658-ae437d586b33';
```

### 2. Corrigir `handleCheckout` em `useEquipe.ts`

Substituir `.single()` por query que busca o **registro ativo** (com checkin e sem checkout), ordenado pelo mais recente:

```text
const { data: existing } = await supabase
  .from('motorista_presenca')
  .select('id')
  .eq('motorista_id', motoristaId)
  .eq('evento_id', eventoId)
  .eq('data', today)
  .not('checkin_at', 'is', null)
  .is('checkout_at', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

Isso garante que:
- Pega apenas o turno ativo (sem checkout)
- Funciona com multiplos turnos no mesmo dia
- Nao lanca erro se nao encontrar nada

### 3. Corrigir `handleCheckin` em `useEquipe.ts`

Mesma correcao: substituir `.single()` por `.maybeSingle()` e buscar o registro mais recente. Alem disso, quando ha multiplos turnos, o checkin deve criar um novo INSERT em vez de reutilizar registro antigo:

```text
const { data: existing } = await supabase
  .from('motorista_presenca')
  .select('id, checkout_at')
  .eq('motorista_id', motoristaId)
  .eq('evento_id', eventoId)
  .eq('data', today)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (existing && !existing.checkout_at) {
  // Ja tem checkin ativo, nao faz nada
  return;
}
// Sempre INSERT para novo turno
await supabase.from('motorista_presenca').insert({ ... });
```

### 4. Corrigir `fetchEquipe` - selecionar presenca correta

Na busca de presencas (linha 134), trocar `presencas.find()` por logica que prioriza o **turno ativo** (sem checkout). Se nao houver turno ativo, pega o mais recente:

```text
const presencasDoMotorista = presencas
  .filter(p => p.motorista_id === m.id)
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

const presenca = presencasDoMotorista.find(p => p.checkin_at && !p.checkout_at)
  || presencasDoMotorista[0];
```

### 5. Desvincular veiculo no checkout do CCO

Atualmente o `handleCheckout` so atualiza o status do motorista para `indisponivel`, mas **nao desvincula o veiculo**. Adicionar a mesma logica bidirecional que existe no app do motorista:

```text
await Promise.all([
  supabase.from('motoristas').update({ status: 'indisponivel', veiculo_id: null }).eq('id', motoristaId),
  supabase.from('veiculos').update({ motorista_id: null }).eq('motorista_id', motoristaId),
  // ... update presenca
]);
```

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useEquipe.ts` | Corrigir handleCheckout e handleCheckin (`.single()` -> `.maybeSingle()` com filtro de turno ativo) + corrigir selecao de presenca no fetchEquipe + desvincular veiculo no checkout |
| SQL (dados) | Encerrar presencas abertas do Evandro Mello + desvincular veiculo |

