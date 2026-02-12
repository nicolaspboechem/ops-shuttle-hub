

# Corrigir "Chamar Base" - Rota visivel no card + registro no historico

## Problemas identificados

### 1. Rota nao aparece no card do Mapa de Servico
No `MapaServicoCard.tsx` (linha 155), a rota (origem -> destino) da missao so aparece quando `missao.status === 'em_andamento'`. Missoes de "Chamar Base" comecam com status `pendente`, entao a rota fica invisivel ate o motorista iniciar a missao.

### 2. Nenhuma viagem e criada no historico
O `handleChamarBase` em `MapaServico.tsx` apenas cria uma missao via `createMissao()`, mas nunca insere um registro na tabela `viagens`. Por isso, o retorno a base nao aparece no historico de viagens do motorista.

## Solucao

### Etapa 1: Exibir rota para TODOS os status ativos no card

**Arquivo:** `src/components/mapa-servico/MapaServicoCard.tsx`

Alterar a condicao da linha 155 de:
```tsx
{missao?.status === 'em_andamento' && missao.ponto_embarque && missao.ponto_desembarque && (
```
Para:
```tsx
{missao?.ponto_embarque && missao.ponto_desembarque && (
```

Isso mostra a rota (ex: "Ponto X -> Base") em qualquer status ativo (pendente, aceita, em_andamento), ja que o badge so renderiza para status ativos.

### Etapa 2: Criar viagem no historico ao chamar base

**Arquivo:** `src/pages/MapaServico.tsx`

No `handleChamarBase`, apos criar a missao, inserir um registro na tabela `viagens` com:
- `evento_id`: o evento atual
- `motorista_id`: o motorista chamado
- `motorista`: nome do motorista (campo legado)
- `tipo_operacao`: `'missao'`
- `ponto_embarque`: localizacao atual do motorista
- `ponto_desembarque`: nome da base
- `observacao`: `'Retorno a base solicitado'` (identificador diferenciador)
- `origem_missao_id`: ID da missao criada (vinculo bidirecional)
- `status`: `'agendado'`
- `placa`, `tipo_veiculo`: preenchidos a partir do veiculo vinculado ao motorista
- `veiculo_id`: veiculo do motorista
- `h_pickup`: horario atual (para registro de quando foi solicitado)
- `criado_por`: usuario logado

Apos criar a viagem, atualizar a missao com o `viagem_id` para manter o vinculo bidirecional (missao -> viagem e viagem -> missao via `origem_missao_id`).

Codigo aproximado:
```tsx
const handleChamarBase = useCallback(async () => {
  if (!chamarBaseMotorista || !eventoId) return;
  
  const missao = await createMissao({
    motorista_id: chamarBaseMotorista.id,
    titulo: 'Retorno a Base',
    ponto_embarque: chamarBaseMotorista.ultima_localizacao || 'Local atual',
    ponto_desembarque: baseNome,
    prioridade: 'normal',
  });

  // Criar viagem no historico
  if (missao) {
    const agora = new Date().toISOString();
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    
    const { data: viagem } = await supabase
      .from('viagens')
      .insert({
        evento_id: eventoId,
        motorista_id: chamarBaseMotorista.id,
        motorista: chamarBaseMotorista.nome,
        tipo_operacao: 'missao',
        ponto_embarque: chamarBaseMotorista.ultima_localizacao || 'Local atual',
        ponto_desembarque: baseNome,
        observacao: 'Retorno a base solicitado',
        origem_missao_id: missao.id,
        status: 'agendado',
        veiculo_id: chamarBaseMotorista.veiculo_id || null,
        placa: chamarBaseMotorista.veiculo?.placa || null,
        tipo_veiculo: chamarBaseMotorista.veiculo?.tipo_veiculo || null,
        h_pickup: horaAtual,
        criado_por: user?.id,
      })
      .select('id')
      .single();

    // Vincular viagem a missao
    if (viagem) {
      await supabase
        .from('missoes')
        .update({ viagem_id: viagem.id })
        .eq('id', missao.id);
    }
  }

  if (retornandoPontoNome) {
    await supabase
      .from('motoristas')
      .update({ ultima_localizacao: retornandoPontoNome, ultima_localizacao_at: new Date().toISOString() })
      .eq('id', chamarBaseMotorista.id);
  }
  setChamarBaseMotorista(null);
}, [chamarBaseMotorista, eventoId, createMissao, baseNome, retornandoPontoNome, user]);
```

Isso requer acesso ao `user` do `useAuth()`, que precisa ser importado no `MapaServico.tsx`.

## Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/components/mapa-servico/MapaServicoCard.tsx` | Remover condicao `status === 'em_andamento'` da exibicao de rota |
| `src/pages/MapaServico.tsx` | Importar `useAuth`, criar viagem + vincular missao no `handleChamarBase` |

## Resultado

- Card do Mapa de Servico mostra a rota "Ponto X -> Base" imediatamente apos chamar base (status pendente)
- Historico de viagens do motorista exibe a viagem com ponto de origem, destino (Base), horario e a observacao "Retorno a base solicitado" para identificacao

