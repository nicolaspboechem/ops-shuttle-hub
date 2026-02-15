

# Correcao: iniciarMissao depende de estado local stale

## Problema raiz

A funcao `iniciarMissao` em `useMissoes.ts` usa `missoes.find(m => m.id === id)` para obter o `motorista_id` do motorista. Porem, quando o operador cria, aceita e inicia uma missao rapidamente, o array local `missoes` pode nao ter sido atualizado ainda (o debounce do Realtime e de 2 segundos). Isso causa:

1. `missoes.find()` retorna `null` -- funcao retorna silenciosamente sem atualizar o motorista
2. Ou `missoes.find()` retorna dados antigos -- a missao existe mas o `result` do `updateMissao` pode falhar

O mesmo problema existe em `aceitarMissao`, `concluirMissao` e `cancelarMissao` -- todas dependem de `missoes.find()`.

Dados atuais confirmam:
- Alexandre Lima: `motoristas.status = disponivel`, `missao.status = em_andamento`
- O update do motorista para `em_viagem` nao foi executado

## Solucao

### 1. Buscar missao do banco em vez de usar estado local (useMissoes.ts)

Em `iniciarMissao`, substituir `missoes.find()` por uma query direta ao banco:

```text
const iniciarMissao = async (id: string) => {
  // Buscar do banco (fonte da verdade) em vez do estado local
  const { data: missao } = await supabase
    .from('missoes')
    .select('id, motorista_id, evento_id, ponto_embarque, ponto_desembarque, status')
    .eq('id', id)
    .single();
  
  if (!missao) return null;

  // ... validacao existente ...

  const result = await updateMissao(id, { status: 'em_andamento' });

  if (result) {
    await supabase
      .from('motoristas')
      .update({ status: 'em_viagem' })
      .eq('id', missao.motorista_id);
  }

  return result;
};
```

### 2. Aplicar o mesmo padrao em aceitarMissao

Atualmente `aceitarMissao` tambem usa `missoes.find()`. Substituir por query direta:

```text
const aceitarMissao = async (id: string) => {
  const { data: missao } = await supabase
    .from('missoes')
    .select('id, motorista_id')
    .eq('id', id)
    .single();
    
  if (!missao) return null;
  // ... resto da validacao ...
};
```

### 3. Aplicar em concluirMissao e cancelarMissao

Mesma abordagem -- buscar do banco para garantir que `syncMotoristaAoEncerrarMissao` sempre tenha dados corretos.

### 4. Corrigir Alexandre agora

Alem da correcao de codigo, o Alexandre precisa ter seu status corrigido no banco. Sugiro que o usuario execute manualmente via CCO (concluir e recriar a missao) ou que executemos um UPDATE pontual.

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useMissoes.ts` | `iniciarMissao`, `aceitarMissao`, `concluirMissao`, `cancelarMissao`: substituir `missoes.find()` por query direta ao banco |

## Resultado

- Nenhuma operacao de status depende mais do estado local (que pode estar desatualizado)
- O motorista sera SEMPRE atualizado para `em_viagem` ao iniciar, independente da velocidade de operacao
- Conclusao e cancelamento tambem ficam imunes a stale data

