

# Melhorias no Mapa de Servico

## Melhorias propostas

### 1. Barra de Filtros no Header

Adicionar ao header do Mapa de Servico:

- **Busca por nome**: input de texto que filtra motoristas em todas as colunas simultaneamente (com `useDeferredValue` para fluidez)
- **Filtro por status**: chips clicaveis para filtrar por Disponivel, Em Viagem, Indisponivel (multi-select, toggle on/off)
- **Filtro Backup**: chip toggle para mostrar apenas veiculos BACKUP
- **Filtro Sem Veiculo**: chip toggle para destacar motoristas sem veiculo vinculado

Os filtros aplicam-se sobre os dados ja separados em grupos (dynamicMotoristas, retornandoBase, outros), filtrando os motoristas dentro de cada coluna sem alterar a estrutura de colunas.

### 2. Scroll Horizontal Melhorado

Atualmente o scroll horizontal eh um `overflow-x-auto` basico. Melhorias:

- **Botoes de navegacao lateral**: setas esquerda/direita fixas nas bordas da area scrollavel, visiveis quando ha mais colunas fora da tela
- **Indicador visual de scroll**: gradiente sutil nas bordas indicando que ha mais conteudo
- **Scroll suave**: usar `scrollBy({ behavior: 'smooth' })` nos botoes

### 3. Contadores por Status no Header

Adicionar mini-badges no header mostrando:
- Disponiveis (verde)
- Em Transito (azul)
- Retornando (amarelo)
- Total

Isso da uma visao rapida da distribuicao sem precisar contar visualmente.

### 4. Auto-refresh com Indicador

Adicionar toggle de auto-refresh (ex: a cada 30s) com um indicador visual de progresso circular no botao Atualizar, mostrando o tempo ate o proximo refresh.

---

## Detalhes tecnicos

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/MapaServico.tsx` | Adicionar state de filtros, logica de filtragem, botoes de scroll, contadores, auto-refresh |
| `src/components/mapa-servico/MapaServicoColumn.tsx` | Nenhuma mudanca necessaria |
| `src/components/mapa-servico/MapaServicoCard.tsx` | Nenhuma mudanca necessaria |

### Implementacao dos filtros

```text
Header atual:
[Icon] Mapa de Servico  |  12 motoristas ativos  |  [Atualizar]

Header novo:
[Icon] Mapa de Servico  |  [🟢 8] [🔵 3] [🟡 1]  |  [Atualizar ⟳]
[🔍 Buscar motorista...]  [Disponivel] [Em Viagem] [Backup] [Sem Veiculo]
```

### Implementacao do scroll lateral

- Ref no container scrollavel (`scrollContainerRef`)
- Detectar `scrollLeft` e `scrollWidth` via `onScroll` para mostrar/esconder setas
- Botoes posicionados com `absolute` nas bordas do container
- Gradiente CSS via pseudo-elementos ou divs sobrepostas com `pointer-events-none`

### Auto-refresh

- State `autoRefresh: boolean` (default: false)
- `useEffect` com `setInterval(refetch, 30000)` quando ativo
- Indicador visual: barra de progresso fina no topo ou animacao no botao

