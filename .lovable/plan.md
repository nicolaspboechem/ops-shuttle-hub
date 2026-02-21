
# Corrigir Renato Quintanilha + Garantir sincronização CCO

## Problema atual

A viagem `dc9013ad` do Renato ficou em estado inconsistente:
- `encerrado = true` (definido pela migration anterior)
- `status = 'em_andamento'` (nunca foi atualizado)
- `h_fim_real = null`

O motorista tambem esta com `status = 'em_viagem'` (ID: `ead4aae2-3ebf-4fe0-ac5b-cf6b85265c8b`).

A tabela de viagens no CCO filtra por `status`, entao a viagem continua aparecendo como "Em Andamento" mesmo apos todas as tentativas.

## Correção 1: Dados (Migration SQL)

Atualizar a viagem orfa e o motorista com os IDs corretos:

```text
UPDATE viagens 
SET status = 'encerrado', h_fim_real = now(), encerrado = true
WHERE id = 'dc9013ad-c0cc-4ffa-a3aa-f6626bab30bb';

UPDATE motoristas 
SET status = 'disponivel' 
WHERE id = 'ead4aae2-3ebf-4fe0-ac5b-cf6b85265c8b';
```

## Correção 2: Código - `encerrarViagem` no CCO

**Arquivo:** `src/hooks/useViagemOperacao.ts`

Na funcao `encerrarViagem` (linha ~226), apos encerrar a viagem principal, adicionar logica para fechar viagens orfas vinculadas via `origem_missao_id`. Quando o CCO encerra manualmente uma viagem que veio de uma missao, pode haver outra viagem duplicada (criada pelo motorista ou CCO em paralelo) que ficara pendente.

Adicionar apos o update principal (linha ~243):

```text
// Se a viagem veio de uma missão, fechar todas as viagens órfãs da mesma missão
if (viagem.origem_missao_id) {
  await supabase
    .from('viagens')
    .update({
      status: 'encerrado',
      h_fim_real: now.toISOString(),
      encerrado: true,
      finalizado_por: user.id,
    })
    .eq('origem_missao_id', viagem.origem_missao_id)
    .neq('id', viagem.id)
    .eq('encerrado', false);
}
```

## Correção 3: Código - `motoristaTemViagensAtivas`

**Arquivo:** `src/hooks/useViagemOperacao.ts`

A funcao `motoristaTemViagensAtivas` (linha 80) usa `.eq('encerrado', false)` para filtrar. Conforme a memoria do projeto, o campo `status` e a fonte de verdade, nao o booleano `encerrado`. Alterar para usar `status`:

```text
// Antes:
.eq('encerrado', false);

// Depois:
.in('status', ['agendado', 'em_andamento', 'aguardando_retorno']);
```

Aplicar a mesma correção em `src/hooks/useViagemOperacaoMotorista.ts` na funcao equivalente.

## Resumo

| Acao | Arquivo |
|---|---|
| Migration SQL | Corrigir dados da viagem `dc9013ad` e motorista |
| `useViagemOperacao.ts` | `encerrarViagem` fecha orfas por `origem_missao_id` |
| `useViagemOperacao.ts` | `motoristaTemViagensAtivas` usa `status` ao inves de `encerrado` |
| `useViagemOperacaoMotorista.ts` | Mesma correcao no helper do motorista |
