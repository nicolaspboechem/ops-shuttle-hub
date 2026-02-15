

# Correcao: Missoes Fantasma + Criacao de Viagem pelo CCO

## Resumo

Duas correcoes no arquivo `src/hooks/useMissoes.ts`:

1. **Auto-limpeza de missoes fantasma**: Ao carregar missoes, cancelar automaticamente missoes de dias anteriores que ainda estejam `aceita` ou `em_andamento`
2. **Criar viagem ao iniciar missao pelo CCO**: Replicar a logica do `AppMotorista.tsx` dentro de `iniciarMissao`, criando um registro na tabela `viagens` para que o motorista veja a viagem no app

---

## Detalhes Tecnicos

### Alteracao 1: Auto-limpeza no `fetchMissoes`

Apos buscar as missoes do banco, identificar missoes fantasma (status `aceita` ou `em_andamento` com `data_programada` anterior ao dia operacional atual) e cancela-las automaticamente:

- Importar `useServerTime` e `getDataOperacional` no hook `useMissoes`
- Dentro de `fetchMissoes`, apos receber os dados, filtrar missoes fantasma
- Executar um UPDATE em batch para `status = 'cancelada'`
- Para missoes `em_andamento`, tambem chamar `syncMotoristaAoEncerrarMissao` para liberar o motorista
- Buscar `horario_virada_dia` do evento para calcular o dia operacional correto

### Alteracao 2: Criar viagem no `iniciarMissao`

Expandir a query de fetch dentro de `iniciarMissao` para incluir dados do motorista e veiculo. Apos atualizar o status da missao, criar um registro em `viagens` replicando a mesma estrutura que `AppMotorista.tsx` usa (linhas 283-334):

```text
iniciarMissao:
  1. Buscar missao com campos expandidos (ponto_embarque_id, ponto_desembarque_id)
  2. Buscar motorista (nome, veiculo_id) e veiculo (placa, tipo_veiculo)
  3. Validar que nao ha outra missao em_andamento
  4. Verificar se ja existe viagem com origem_missao_id = id (evitar duplicata)
  5. Atualizar missao para em_andamento
  6. Criar registro em viagens com:
     - evento_id, motorista_id, veiculo_id
     - ponto_embarque, ponto_desembarque (texto e FK)
     - motorista (nome texto), placa, tipo_veiculo
     - tipo_operacao: 'transfer'
     - status: 'em_andamento'
     - h_inicio_real: getAgoraSync().toISOString()
     - origem_missao_id: missao.id
  7. Criar log em viagem_logs (acao: 'inicio', via: 'cco_missao')
  8. Atualizar missao.viagem_id com o ID da viagem criada
  9. Atualizar motorista.status para 'em_viagem'
```

### Arquivo modificado

| Arquivo | Alteracoes |
|---------|-----------|
| `src/hooks/useMissoes.ts` | Importar `useServerTime` e `getDataOperacional`. Adicionar auto-limpeza no `fetchMissoes`. Expandir `iniciarMissao` para criar viagem e log. |

### Seguranca contra duplicatas

A funcao `iniciarMissao` verificara se ja existe uma viagem com `origem_missao_id = id` antes de criar uma nova, evitando viagens duplicadas caso o operador clique duas vezes ou o Realtime dispare um refetch.

