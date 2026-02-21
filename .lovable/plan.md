

# Corrigir viagem orfa do Renato Quintanilha + Prevenir recorrencia

## Correcao imediata (dados)

Encerrar a viagem orfa e liberar o motorista via migration SQL:

- Viagem `dc9013ad` -> status `encerrado`, `encerrado = true`, `h_fim_real = now()`
- Motorista `ead4aae2` -> status `disponivel`

## Causa raiz identificada

Quando o CCO inicia uma missao, cria uma viagem (A) e salva em `missao.viagem_id`. Depois, o motorista inicia a mesma missao no app e cria uma **segunda viagem** (B), sobrescrevendo `missao.viagem_id` com o ID da viagem B.

Ao concluir a missao, o `syncMotoristaAoEncerrarMissao` encerra apenas a viagem referenciada por `missao.viagem_id` (B), deixando a viagem (A) -- que tem `origem_missao_id` apontando para a missao -- permanentemente aberta e invisivel.

## Correcao definitiva (codigo)

### Arquivo: `src/hooks/useMissoes.ts` - funcao `syncMotoristaAoEncerrarMissao`

Apos encerrar a viagem via `missao.viagem_id`, adicionar uma segunda query para encerrar **todas** as viagens abertas vinculadas a mesma missao via `origem_missao_id`:

```text
// Apos fechar a viagem principal (missao.viagem_id):
// Fechar TODAS as viagens orfas vinculadas via origem_missao_id
await supabase
  .from('viagens')
  .update({ status: 'encerrado', h_fim_real: now, encerrado: true })
  .eq('origem_missao_id', missao.id)
  .eq('encerrado', false);
```

### Arquivo: `src/pages/app/AppMotorista.tsx` - acao `iniciar`

Antes de criar uma nova viagem, alem de verificar se ja existe viagem ativa, **encerrar** qualquer viagem previa da mesma missao que esteja aberta, evitando duplicatas:

```text
// Se existe viagem antiga da mesma missao, encerrar antes de criar nova
if (viagemExistente && viagemExistente.length > 0) {
  // Ja existe viagem ativa - nao criar duplicata
  // Apenas vincular a existente a missao
  await supabase.from('missoes').update({ viagem_id: viagemExistente[0].id, status: 'em_andamento' }).eq('id', missaoId);
  // Usar viagem existente ao inves de criar nova
  return;
}
```

### Resumo das alteracoes

| Arquivo | Alteracao |
|---|---|
| Migration SQL | Encerrar viagem `dc9013ad`, liberar motorista `ead4aae2` |
| `src/hooks/useMissoes.ts` | `syncMotoristaAoEncerrarMissao` tambem encerra viagens por `origem_missao_id` |
| `src/pages/app/AppMotorista.tsx` | Acao `iniciar` reaproveita viagem existente ao inves de criar duplicata |

