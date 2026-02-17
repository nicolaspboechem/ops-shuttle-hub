

# Corrigir InnerSidebar Expandindo com Scroll

## Problema

A sidebar interna (cinza/branca) cresce junto com o conteudo da pagina em vez de ficar fixa. Causa: o container pai usa `h-full` ou `min-h-[calc(100vh-4rem)]` que **cresce** com o conteudo. O `sticky top-0 h-screen` da sidebar nao funciona quando o pai ultrapassa a viewport.

## Solucao

Duas alteracoes coordenadas:

### 1. InnerSidebar - trocar sticky por altura relativa ao pai

Mudar `sticky top-0 h-screen` para `h-full overflow-hidden`. A restricao de altura vira do pai.

### 2. Paginas - container com altura fixa e overflow controlado

Em cada pagina, o `div` que envolve `InnerSidebar` + conteudo precisa ter altura fixa (`h-screen`) e `overflow-hidden`. O conteudo ao lado fica com `overflow-auto`.

## Alteracoes por Arquivo

| Arquivo | De | Para |
|---------|-----|------|
| `InnerSidebar.tsx` (linha 41) | `sticky top-0 h-screen` | `h-full overflow-hidden` |
| `Veiculos.tsx` (linha 534) | `flex h-full` | `flex h-screen overflow-hidden` |
| `Motoristas.tsx` (linha 1083) | `flex min-h-[calc(100vh-4rem)]` | `flex h-screen overflow-hidden` |
| `MapaServico.tsx` (linha 561) | `flex min-h-[calc(100vh-4rem)]` | `flex h-screen overflow-hidden` |
| `RotasShuttle.tsx` (linha 278) | `flex h-full` | `flex h-screen overflow-hidden` |

Os paineis de conteudo ao lado ja possuem `overflow-auto` na maioria dos casos. Onde nao tiver, sera adicionado.

