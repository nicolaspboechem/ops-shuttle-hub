
# Adicionar Aba de Historico de Combustivel no Modal de Detalhes do Veiculo

## O que sera feito

Adicionar uma nova aba **"Combustivel"** no `VeiculoDetalheModal`, ao lado das abas existentes (Resumo, Historico de Uso, Vistorias). Essa aba mostrara o historico de alertas de combustivel emitidos pelos motoristas para aquele veiculo, usando dados da tabela `alertas_frota`.

## Dados exibidos por alerta

- Data e hora do alerta
- Motorista que reportou
- Nivel de combustivel no momento do alerta
- Observacao do motorista (se houver)
- Status do alerta (aberto, pendente, resolvido)
- Data de resolucao (se resolvido)

## Metricas resumidas no topo da aba

- Total de abastecimentos/alertas registrados
- Ultimo alerta (data)

## Mudancas tecnicas

| Arquivo | Mudanca |
|---|---|
| `src/components/veiculos/VeiculoDetalheModal.tsx` | Adicionar query para buscar alertas de `alertas_frota` filtrados por `veiculo_id`. Adicionar nova aba "Combustivel" com icone `Fuel`. Alterar grid de tabs de `grid-cols-3` para `grid-cols-4`. Renderizar lista de alertas com data, motorista, nivel, observacao e status. |

## Estrutura da aba

```text
[Resumo] [Hist. Uso] [Vistorias] [Combustivel]

--- Aba Combustivel ---
Metricas: "X alertas registrados"

Tabela/Lista:
| Data/Hora | Motorista | Nivel | Observacao | Status |
|-----------|-----------|-------|------------|--------|
| 12/02 20:30 | Edenilson | 1/4 | Precisa abastecer | Resolvido |
| 11/02 15:00 | Joao | Vazio | - | Aberto |
```

Nao envolve mudancas no banco de dados -- os dados ja existem na tabela `alertas_frota` com join para `motoristas`.
