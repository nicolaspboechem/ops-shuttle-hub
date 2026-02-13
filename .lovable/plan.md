
# Recuperar exibicao de rota no Localizador (Painel TV)

## Problema encontrado

O card do localizador ja tem o codigo para exibir a rota (origem -> destino), mas dois bugs impedem a exibicao:

1. **Query de missoes incompleta**: No `PainelLocalizador.tsx` (linha 82), a query de missoes busca apenas `ponto_desembarque` mas NAO busca `ponto_embarque`. O `LocalizadorCard` precisa dos dois campos para exibir a rota.

2. **Truncamento excessivo para TV**: O `LocalizadorVeiculoCard` (usado no painel de veiculos) trunca nomes de rota com `max-w-[80px]`, muito pequeno para leitura em TV.

## Correcoes

| Arquivo | Mudanca |
|---|---|
| `src/pages/PainelLocalizador.tsx` | Linha 82: adicionar `ponto_embarque` na query de missoes: `.select('id, motorista_id, ponto_embarque, ponto_desembarque, status')` |
| `src/components/localizador/LocalizadorCard.tsx` | Aumentar a visibilidade da rota no card: fonte maior, remover truncamento agressivo, destacar com cor de fundo para leitura em TV |

## Detalhes tecnicos

### PainelLocalizador.tsx - Query de missoes (linha 82)

```text
// ANTES:
.select('id, motorista_id, ponto_desembarque, status')

// DEPOIS:
.select('id, motorista_id, ponto_embarque, ponto_desembarque, status')
```

Isso faz com que `missao.ponto_embarque` deixe de ser `undefined` e o card passe a exibir a rota completa.

### LocalizadorCard.tsx - Melhorar visualizacao para TV

- Aumentar fonte da rota de `text-xs` para `text-sm`
- Remover `flex-wrap` para manter a rota em uma unica linha
- Adicionar fundo sutil (`bg-blue-500/10 rounded px-2 py-1`) para destacar a rota visualmente
- Manter o fallback de viagem (quando nao tem missao mas esta em transito)

Essas duas correcoes sao suficientes para restaurar a exibicao da rota nos cards do painel localizador.
