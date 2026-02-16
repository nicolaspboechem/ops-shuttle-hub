

# Correcao da Logica de Historico de Uso de Veiculos

## Conceito Central

O uso de um veiculo e definido pelo ciclo **vinculacao -> desvinculacao** no proprio veiculo, independentemente do motorista. Veiculos sao rotativos: motorista A pode vincular e motorista B pode usar depois. O pareamento e feito por ordem cronologica no veiculo, nao por motorista.

Cada ciclo de uso = 1 vinculacao seguida da proxima desvinculacao naquele veiculo. A duracao = `desvinculacao.created_at - vinculacao.created_at`.

## Fontes de Dados

A tabela `veiculo_vistoria_historico` e a fonte principal. Registros relevantes:

- `tipo_vistoria = 'vinculacao'` -- veiculo atribuido a um motorista
- `tipo_vistoria = 'desvinculacao'` -- veiculo liberado (checkout, troca, supervisor, auto-checkout)

O checkout do motorista (`useMotoristaPresenca.handleCheckout`) ja registra desvinculacao na tabela (implementado na iteracao anterior). O mesmo vale para supervisor e auto-checkout.

## Logica de Pareamento

Para cada veiculo:
1. Buscar todos os registros de vinculacao e desvinculacao, ordenados por `created_at` crescente
2. Percorrer sequencialmente: cada `vinculacao` abre um ciclo de uso
3. A proxima `desvinculacao` (qualquer motorista) fecha o ciclo
4. Se nao houver desvinculacao, o veiculo esta "Em uso" atualmente
5. Calcular duracao em minutos entre vinculacao e desvinculacao

Exemplo de timeline de um veiculo:
```text
09:00 vinculacao  (motorista A) -> abre ciclo 1
12:00 desvinculacao (motorista A) -> fecha ciclo 1 (3h)
14:00 vinculacao  (motorista B) -> abre ciclo 2
18:00 desvinculacao (motorista B) -> fecha ciclo 2 (4h)
```

## Estrutura do Registro de Uso

Cada ciclo gera um registro com:
- `vinculado_em`: timestamp da vinculacao
- `desvinculado_em`: timestamp da desvinculacao (ou null = em uso)
- `motorista_nome`: nome do motorista que recebeu o veiculo (da vinculacao)
- `duracao_minutos`: diferenca entre desvinculacao e vinculacao
- `vinculado_por`: quem realizou a vinculacao (`realizado_por_nome`)
- `desvinculado_por`: quem realizou a desvinculacao
- `observacoes`: observacoes da desvinculacao (ex: checkout com nota)

## Alteracoes

### `src/hooks/useVeiculoPresencaHistorico.ts`

Reescrever a logica de agregacao:
- Remover `motorista_presenca` como fonte de usos (manter query apenas se necessario para estatisticas complementares)
- Usar exclusivamente `veiculo_vistoria_historico` com tipos `vinculacao` e `desvinculacao`
- No `useMemo`, agrupar por `veiculo_id`, ordenar por `created_at` crescente
- Percorrer sequencialmente pareando vinculacao com proxima desvinculacao (independente do motorista)
- Atualizar a interface `VeiculoUsoRegistro` para os novos campos:
  - `vinculado_em` (substituindo `checkin_at`)
  - `desvinculado_em` (substituindo `checkout_at`)
  - `vinculado_por` / `desvinculado_por`
  - `em_uso` (boolean, quando nao ha desvinculacao)
- Recalcular estatisticas baseadas nos ciclos pareados

### `src/components/veiculos/VeiculosUsoAuditoria.tsx`

Ajustar a tabela para as novas colunas:
- "Vinculado em" em vez de "Check-in"
- "Desvinculado em" em vez de "Check-out" (exibir badge "Em uso" se null)
- "Por" -- quem realizou a acao
- Manter coluna de duracao e observacoes
- Atualizar exportacao Excel com novos campos

### `src/components/veiculos/VeiculoUsoDetalheModal.tsx`

Atualizar o modal de detalhes para exibir:
- Quem vinculou e quem desvinculou
- Status "Em uso" quando aplicavel
- Labels corretos (vinculacao/desvinculacao em vez de check-in/out)

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useVeiculoPresencaHistorico.ts` | Nova logica de pareamento sequencial por veiculo |
| `src/components/veiculos/VeiculosUsoAuditoria.tsx` | Colunas e labels atualizados |
| `src/components/veiculos/VeiculoUsoDetalheModal.tsx` | Exibir novos campos no detalhe |

