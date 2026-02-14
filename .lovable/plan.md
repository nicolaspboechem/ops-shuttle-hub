

# Correcao: Motorista com missao em andamento nao aparece em "Em Viagem"

## Problema

Quando uma missao e iniciada pelo CCO (kanban de missoes), a funcao `iniciarMissao` atualiza apenas o status da **missao** para `em_andamento`, mas NAO atualiza o status do **motorista** para `em_viagem`. Isso causa:

1. O `useLocalizadorMotoristas` agrupa o motorista pela sua `ultima_localizacao` (ex: GIG) em vez de coloca-lo em `em_transito`
2. A logica `emTransitoPorMissao` no MapaServico deveria compensar, mas depende de um fetch separado de missoes que pode estar dessincronizado com os dados de motoristas
3. Resultado: motoristas como Simmy e Renato ficam presos na coluna do ponto atual em vez de aparecer em "Em Viagem"

Dados do banco confirmam o problema:

```text
Marlon   | motorista.status = em_viagem   | missao = em_andamento | Aparece em Em Viagem
Simmy    | motorista.status = disponivel  | missao = em_andamento | NAO aparece (bug)
Renato   | motorista.status = disponivel  | missao = em_andamento | NAO aparece (bug)
```

## Solucao

### 1. Atualizar motorista.status ao iniciar missao (useMissoes.ts)

Na funcao `iniciarMissao`, apos validar e atualizar a missao, tambem atualizar o motorista:

```text
const iniciarMissao = async (id: string) => {
  // ... validacao existente ...

  const result = await updateMissao(id, { status: 'em_andamento' });
  
  if (result && missao) {
    // Atualizar status do motorista para em_viagem
    await supabase
      .from('motoristas')
      .update({ status: 'em_viagem' })
      .eq('id', missao.motorista_id);
  }
  
  return result;
};
```

Isso garante que `useLocalizadorMotoristas` imediatamente coloque o motorista no grupo `em_transito`, sem depender do fetch de missoes.

### 2. Atualizar motorista.status ao aceitar missao (useMissoes.ts)

Na funcao `aceitarMissao`, atualizar o status para `em_missao_aceita` NAO e necessario, pois o motorista ainda esta fisicamente no ponto. Nenhuma alteracao aqui.

### 3. Garantir consistencia ao concluir/cancelar (ja implementado)

A funcao `syncMotoristaAoEncerrarMissao` ja atualiza o motorista de volta para `disponivel` e atualiza a `ultima_localizacao` para o ponto de desembarque. Isso esta correto.

## Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useMissoes.ts` | `iniciarMissao`: adicionar update de `motoristas.status = 'em_viagem'` apos iniciar a missao com sucesso |

## Resultado

- Motorista com missao `em_andamento` tera `motoristas.status = 'em_viagem'`
- `useLocalizadorMotoristas` o colocara imediatamente em `em_transito`
- MapaServico e PainelLocalizador exibirao o motorista em "Em Viagem" sem depender de fetch separado
- Ao concluir ou cancelar a missao, o motorista volta para `disponivel` (ja implementado)

