

# Diferenciar Missao Aceita de Em Transito no Localizador

## Problema

Os status "Missao Aceita" e "Em Transito" usam tons de azul quase identicos nos cards do Localizador, dificultando a distincao visual rapida - especialmente em TVs.

## Solucao

Alterar a cor de "Missao Aceita" de azul para **roxo/violeta**, mantendo "Em Transito" em azul com pulse.

| Status | Cor atual | Nova cor |
|--------|-----------|----------|
| Missao Aceita | Azul (bg-blue-500) | Roxo (bg-violet-500 / text-violet-400) |
| Em Transito | Azul pulsante | Sem mudanca |

## Alteracao

### `src/components/localizador/LocalizadorCard.tsx`

Linha 15 do `statusConfig` - trocar cores de `missao_aceita`:
- `color`: `'bg-blue-500'` para `'bg-violet-500'`
- `textColor`: `'text-blue-400'` para `'text-violet-400'`

1 linha alterada, 1 arquivo.

