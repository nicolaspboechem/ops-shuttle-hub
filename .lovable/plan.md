
# Diferenciar Missao Aceita de Em Transito no Localizador

## Problema

Os status "Missao Aceita" e "Em Transito" usam tons de azul quase identicos nos cards do Localizador, dificultando a distincao visual rapida - especialmente em TVs.

## Solucao

Alterar a cor de "Missao Aceita" de azul para **roxo/violeta**, mantendo "Em Transito" em azul com pulse. Isso cria contraste claro entre os dois estados.

Cores atuais vs novas:

| Status | Cor atual | Nova cor |
|--------|-----------|----------|
| Disponivel | Verde | Verde (sem mudanca) |
| Missao Pendente | Amber | Amber (sem mudanca) |
| **Missao Aceita** | **Azul (bg-blue-500)** | **Roxo (bg-violet-500 / text-violet-400)** |
| Em Transito | Azul pulsante (bg-blue-600) | Azul pulsante (sem mudanca) |
| Indisponivel | Vermelho | Vermelho (sem mudanca) |

## Alteracao

### `src/components/localizador/LocalizadorCard.tsx`

Linha 15 - trocar:
- `color: 'bg-blue-500'` para `'bg-violet-500'`
- `textColor: 'text-blue-400'` para `'text-violet-400'`

Apenas 1 linha alterada em 1 arquivo.
