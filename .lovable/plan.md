

# Preservar Historico de Presenca ao Liberar Check-in

## Problema Atual

Quando "Liberar Check-in" e acionado, o sistema limpa o `checkout_at` do registro existente e, ao fazer novo check-in, o `upsert` com `onConflict` sobrescreve o mesmo registro. O primeiro turno (check-in + check-out) e **perdido**.

## Solucao

Mudar a logica para **preservar o registro antigo** e **criar um novo** para o segundo turno do dia.

### Mudancas necessarias

**1. Remover a constraint UNIQUE (motorista_id, evento_id, data)**

Atualmente so permite 1 registro por motorista/dia. Precisamos permitir multiplos turnos no mesmo dia.

Migracao SQL:
- Dropar a constraint unica existente
- Adicionar um indice nao-unico para performance de consulta

**2. Alterar `handleLiberarCheckin` em `Motoristas.tsx`**

Em vez de limpar o `checkout_at` do registro existente, a funcao passa a apenas atualizar o status do motorista para `disponivel`. O registro com checkout permanece intacto.

**3. Alterar `realizarCheckin` em `useMotoristaPresenca.ts`**

Em vez de `upsert` (que sobrescreve), usar logica:
- Verificar se ja existe um registro ativo (com checkin e sem checkout) para hoje
- Se nao existe, criar um **novo** registro (INSERT), independente de ja ter registros anteriores no dia
- Se ja existe um ativo, nao faz nada (ja esta com check-in)

**4. Alterar `fetchPresenca` em `useMotoristaPresenca.ts`**

Buscar o registro **ativo** do dia (checkin != null e checkout == null), em vez de qualquer registro do dia. Se nao encontrar ativo, buscar o mais recente (para saber se ja fez checkout).

### Resultado esperado

Para o Edenilson hoje:
- Registro 1: checkin 14:06, checkout (o que tiver sido feito) - **preservado**
- Registro 2: checkin 20:27 (liberacao), checkout null - **novo registro independente**

### Sobre recuperar os dados do Edenilson

Infelizmente, o check-in/check-out original do Edenilson ja foi sobrescrito no banco. O registro atual mostra apenas `checkin_at: 14:06` sem checkout. Nao e possivel recuperar os horarios exatos do primeiro turno porque o upsert os substituiu.

Podemos ajustar manualmente via SQL se voce lembrar os horarios aproximados.

## Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| Nova migracao SQL | Remover constraint UNIQUE, adicionar indice |
| `src/hooks/useMotoristaPresenca.ts` | Trocar upsert por INSERT, ajustar fetch para buscar registro ativo |
| `src/pages/Motoristas.tsx` | Simplificar handleLiberarCheckin (nao altera mais o registro antigo) |

## Detalhe tecnico: logica do novo check-in

```text
fetchPresenca():
  1. Buscar registro ATIVO do dia (checkin != null, checkout == null)
  2. Se encontrar -> motorista ja tem check-in ativo
  3. Se nao encontrar -> buscar ultimo registro do dia (para saber se ja fez checkout)

realizarCheckin():
  1. INSERT novo registro (nunca upsert)
  2. Cada turno = novo registro

handleLiberarCheckin():
  1. NAO altera registro antigo
  2. Apenas muda status do motorista para 'disponivel'
  3. Motorista faz check-in normal -> cria novo registro
```

## Impacto no auto-checkout

A Edge Function `auto-checkout` busca registros com `checkout_at IS NULL` — continuara funcionando normalmente, pois fechara apenas registros abertos.

