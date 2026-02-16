

# Paginacao nas Missoes (CCO) e App Operador

## Resumo

Aplicar o mesmo sistema de paginacao (`usePaginatedList` + `LoadMoreFooter`) nas listas de missoes do Mapa de Servico e nas viagens ativas do App Operador.

---

## 1. MissoesPanel.tsx (Mapa de Servico - Aba Missoes)

### Vista Card
- Aplicar `usePaginatedList(filteredMissoes)` sobre o grid de cards
- Renderizar apenas `visibleItems` no `.map()`
- Adicionar `<LoadMoreFooter>` abaixo do grid

### Vista Lista (tabela)
- Mesma logica: paginar `filteredMissoes` na `<TableBody>`
- Adicionar `<LoadMoreFooter>` abaixo da `<Card>` da tabela

### Vista Kanban
- Paginar cada coluna individualmente: aplicar `usePaginatedList` sobre cada `missoesByStatus[col.id]`
- Como sao 5 colunas com hooks separados, a abordagem sera criar um sub-componente `MissaoKanbanColumnPaginated` que internamente usa o hook
- Cada coluna tera seu proprio "Ver mais" no rodape

**Nota:** Como o hook nao pode ser chamado condicionalmente (regra dos hooks), sera necessario usar o hook uma vez sobre `filteredMissoes` para as vistas card/list, e o sub-componente para kanban.

## 2. AppOperador.tsx (App Operador - Viagens Ativas)

- Ja possui paginacao para `sortedEncerradas`
- Adicionar `usePaginatedList(sortedAtivas)` para a secao "Em andamento"
- Renderizar apenas os itens visiveis com `<LoadMoreFooter>` abaixo

---

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/motoristas/MissoesPanel.tsx` | Paginar vistas card, list e kanban (20 itens iniciais) |
| `src/pages/app/AppOperador.tsx` | Paginar viagens ativas (20 itens iniciais) |

