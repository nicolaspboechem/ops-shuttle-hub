
# Corrigir Triggers Incorretos em Todas as Tabelas

## Problema
O erro ao vincular o veiculo SUL0H29 ao motorista Lorram Dionisio e causado pelo trigger `update_motoristas_updated_at` na tabela `motoristas`. Esse trigger executa a funcao `update_updated_at_column()` que tenta fazer `NEW.updated_at = NOW()`, mas a coluna se chama `data_atualizacao`.

A migracao anterior so removeu o trigger da tabela `veiculos`. Existem mais 3 triggers com o mesmo problema:

| Trigger | Tabela | Status |
|---------|--------|--------|
| `update_motoristas_updated_at` | motoristas | Causa o erro atual |
| `update_motorista_presenca_updated_at` | motorista_presenca | Potencial erro futuro |
| `update_viagens_updated_at` | viagens | Potencial erro futuro |

## Solucao

Uma unica migracao SQL para remover os 3 triggers de uma vez:

```sql
DROP TRIGGER IF EXISTS update_motoristas_updated_at ON public.motoristas;
DROP TRIGGER IF EXISTS update_motorista_presenca_updated_at ON public.motorista_presenca;
DROP TRIGGER IF EXISTS update_viagens_updated_at ON public.viagens;
```

Nao ha risco de regressao: todos esses campos sao atualizados pelo codigo via `atualizado_por` e `data_atualizacao` nos hooks (`useCadastros.ts`, `useViagens.ts`, etc).

## Resultado

- Vinculacao de veiculos funcionara sem erro
- Atualizacao de motoristas, presenca e viagens funcionara sem erro
- Nenhum trigger problematico restante no sistema
