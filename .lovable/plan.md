

# Reorganizacao de Colunas + Scroll no Mapa de Servico

## Layout Proposto

```text
|                SCROLLAVEL                    |   |        FIXO (DIREITA)         |
|                                              | | |                               |
|  [Base]  [Ponto A]  [Ponto B]  [Sem Local]  | | | [Em Viagem] [Retornando] [Outros]
|                                              | | |                               |
|  <========= barra de scroll ==========>      |   |                               |
```

A tela sera dividida em duas areas:
- **Esquerda (scrollavel)**: Base como 1a coluna, depois os demais pontos em ordem alfabetica, e "Sem Local" no final
- **Direita (fixa, sempre visivel)**: "Em Viagem", "Retornando pra Base", "Outros" -- com largura responsiva para nunca sair da tela

## Mudancas

### 1. `src/pages/MapaServico.tsx`

**Reordenar `dynamicColumns`**: Remover "Em Transito" das colunas dinamicas. Reorganizar para que a coluna Base seja a primeira, seguida pelos outros pontos ordenados, e "Sem Local" no final.

**Mover "Em Viagem" para colunas fixas**: A coluna "Em Transito" (renomeada visualmente para "Em Viagem") passa a ser fixa na direita, junto com "Retornando" e "Outros".

**Corrigir deteccao de "retornando"**: Buscar tambem o ponto cujo nome contenha "retornando" nos pontos_embarque. Motoristas com `ultima_localizacao` igual a esse ponto tambem entram na coluna "Retornando pra Base", nao apenas os que tem missao ativa. Filtrar esse ponto das colunas dinamicas.

**Feedback "Chamar Base"**: Apos confirmar, atualizar `ultima_localizacao` do motorista para o nome do ponto "Retornando" (se existir), dando feedback visual imediato.

**Container fixo responsivo**: O container das colunas fixas usara `max-w-[50vw]` com `overflow-y-auto` para nunca ultrapassar metade da tela.

### 2. `src/components/mapa-servico/MapaServicoColumn.tsx`

**Largura responsiva para colunas fixas**: Quando `isFixed`, usar `w-[200px] min-w-[160px]` em vez de `min-w-[300px] w-[320px]`, garantindo que cabem na tela.

**Scroll vertical**: Trocar `max-h-[calc(100vh-14rem)]` por `flex-1 min-h-0 overflow-y-auto` para scroll vertical mais fluido.

### 3. `src/components/mapa-servico/MapaServicoScrollContainer.tsx`

**Correcao do scroll**: O problema atual e que o container pai usa `flex-1` mas os filhos com `shrink-0` nao forcam overflow. A correcao sera garantir que o div interno tenha `overflow-x: scroll` (nao `auto`) e `min-width: min-content` nos filhos, forcando a barra de scroll a aparecer sempre que houver conteudo alem da area visivel.

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/MapaServico.tsx` | Reordenar colunas (Base primeiro), mover Em Viagem para fixas, corrigir deteccao retornando, feedback chamar base |
| `src/components/mapa-servico/MapaServicoColumn.tsx` | Largura responsiva para fixas, scroll vertical melhorado |
| `src/components/mapa-servico/MapaServicoScrollContainer.tsx` | Corrigir scroll lateral forcando overflow visivel |

