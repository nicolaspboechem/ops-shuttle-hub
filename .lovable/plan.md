

# Corrigir InnerSidebar Expandindo com Scroll

## Problema

A sidebar interna (cinza/branca) deveria ficar fixa na tela, mas ela cresce junto com o conteudo da pagina. Isso acontece porque:

- A `InnerSidebar` usa `sticky top-0 h-screen`, que funciona bem quando o **pai** tem altura fixa
- Porem, o container pai nas paginas usa `h-full` ou `min-h-[calc(100vh-4rem)]`, que **cresce** com o conteudo
- Quando o conteudo e maior que a tela, o pai cresce, e `sticky` nao segura a sidebar — ela acompanha o scroll

## Solucao

Duas alteracoes coordenadas:

### 1. InnerSidebar - trocar `sticky` por posicionamento fixo relativo ao pai

Mudar de `sticky top-0 h-screen` para simplesmente `h-full` com `overflow-hidden`. A restricao de altura vem do pai (que sera corrigido).

### 2. Paginas que usam InnerSidebar - container com altura fixa

Nas 4 paginas que usam `InnerSidebar`, o container `flex` pai precisa ter altura fixa (`h-[calc(100vh)]` ou equivalente) e `overflow-hidden`, para que:
- A InnerSidebar ocupe 100% da altura sem crescer
- O conteudo ao lado tenha `overflow-auto` para scroll independente

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/InnerSidebar.tsx` | Trocar `sticky top-0 h-screen` por `h-full overflow-hidden` |
| `src/pages/Veiculos.tsx` | Container: `flex h-full` para `flex h-[calc(100vh)] overflow-hidden` |
| `src/pages/Motoristas.tsx` | Mesmo ajuste no container |
| `src/pages/MapaServico.tsx` | Mesmo ajuste no container |
| `src/pages/RotasShuttle.tsx` | Mesmo ajuste no container |

A sidebar principal (`AppSidebar`) ja e `fixed`, entao o conteudo principal (`main`) com `ml-16/ml-64` e o ponto de referencia. O container interno precisa preencher esse espaco sem ultrapassar.

