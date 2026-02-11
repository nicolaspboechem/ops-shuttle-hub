

# Colunas Inteligentes no Mapa de Servico

## Resumo

Duas mudancas no Mapa de Servico:
1. **Esconder colunas vazias** -- colunas dinamicas sem motoristas nao serao renderizadas
2. **Recolher/expandir colunas** -- cada coluna tera um botao no header para colapsar, mostrando apenas o titulo e o badge com contagem

## Mudancas

### 1. `src/pages/MapaServico.tsx`

**Filtrar colunas vazias**: No render das colunas dinamicas, renderizar apenas as que possuem pelo menos 1 motorista (apos filtros aplicados):

```text
dynamicColumns
  .filter(col => (filteredDynamic[col.id]?.length || 0) > 0)
  .map(col => <MapaServicoColumn ... />)
```

Para as colunas fixas (Em Viagem, Retornando, Outros), aplicar a mesma logica -- so renderizar se tiver motoristas.

**Estado de colunas colapsadas**: Adicionar um `useState<Set<string>>` chamado `collapsedColumns` que armazena os IDs das colunas recolhidas. Passar `collapsed` e `onToggleCollapse` como props para `MapaServicoColumn`.

### 2. `src/components/mapa-servico/MapaServicoColumn.tsx`

**Novas props**: `collapsed?: boolean` e `onToggleCollapse?: () => void`.

**Botao de colapsar**: Adicionar um botao `ChevronLeft`/`ChevronRight` no header da coluna. Ao clicar, alterna entre colapsado e expandido.

**Visual colapsado**: Quando colapsada, a coluna fica com largura minima (~48px), mostrando apenas:
- O badge com a contagem de motoristas
- O titulo rotacionado verticalmente
- O botao para expandir

Continua sendo um drop target valido (droppable) mesmo colapsada.

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/MapaServico.tsx` | Filtrar colunas vazias, estado collapsedColumns, passar props |
| `src/components/mapa-servico/MapaServicoColumn.tsx` | Props collapsed/onToggleCollapse, visual colapsado com titulo vertical |

