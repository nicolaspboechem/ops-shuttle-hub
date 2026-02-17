

# Exibir Nome/Apelido do Veiculo nas Notificacoes de Combustivel

## Problema

Na central de notificacoes, os alertas de combustivel mostram apenas a placa do veiculo (ex: "Leony Pereira (SUL0H29)"). O padrao do sistema e exibir o nome/apelido como informacao principal e a placa como secundaria.

## Alteracao

### Arquivo: `src/hooks/useNotifications.tsx`

**Linha 262** -- Trocar a variavel para priorizar nome do veiculo:

| De | Para |
|----|------|
| `const placaVeiculo = alerta.veiculo?.placa \|\| 'Veiculo';` | `const nomeVeiculo = alerta.veiculo?.nome \|\| alerta.veiculo?.placa \|\| 'Veiculo';` |

**Linha 269** -- Atualizar a descricao para usar nome + placa entre parenteses:

| De | Para |
|----|------|
| `description: \`${motoristaNome} (${placaVeiculo})\`` | `description: \`${motoristaNome} - ${nomeVeiculo}${alerta.veiculo?.nome && alerta.veiculo?.placa ? \` (${alerta.veiculo.placa})\` : ''}\`` |

**Linha 275** -- Manter a placa no campo `placa` para compatibilidade, mas o campo visual (description) usara o nome.

Resultado visual: `Combustivel Baixo - 1/2` com descricao `Leony Pereira - Van Branca (SUL0H29)` em vez de `Leony Pereira (SUL0H29)`.

Nenhum outro arquivo precisa ser alterado.

