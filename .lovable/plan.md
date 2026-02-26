

# Usar as OperationTabs como filtro dos graficos da Auditoria

## O que muda

As abas Missao/Transfer/Shuttle que ja existem no topo da pagina de Auditoria passarao a filtrar tambem os graficos. O dropdown "Filtrar graficos por tipo" dentro do componente `AuditoriaResumoTab` sera removido.

## Alteracoes

### `src/components/auditoria/AuditoriaResumoTab.tsx`

1. Remover o state `filtroGrafico` e o `useMemo` de `viagensGrafico` (que fazia filtragem local)
2. Remover o dropdown Select de filtro por tipo e o `contadoresGrafico`
3. Todos os graficos (Viagens por Dia, Viagens por Hora, Tipo de Veiculo) passam a usar `viagensFiltradas` em vez de `viagensGrafico`
4. Remover a prop `todasViagens` da interface (nao sera mais necessaria)

### `src/pages/Auditoria.tsx`

1. Remover a prop `todasViagens={viagens}` da chamada do `AuditoriaResumoTab`

### Resultado

- Interface mais limpa, sem dropdown redundante
- Os graficos respondem diretamente as abas Missao/Transfer/Shuttle do topo
- KPIs e rankings continuam usando `viagensFiltradas` (mesmo comportamento)

