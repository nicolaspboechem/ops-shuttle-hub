

# Mover Missoes para o Mapa de Servico

## Resumo

Extrair toda a logica de missoes de `Motoristas.tsx` para um componente isolado `MissoesPanel.tsx`, e integra-lo na pagina `MapaServico.tsx` com uma sidebar interna de duas abas.

## Por que e seguro

1. **Codigo de missoes e autocontido**: as linhas 77-88 (estados) e 1076-1522 (logica + JSX) em `Motoristas.tsx` nao dependem de nenhuma variavel do cadastro de motoristas alem de `motoristasCadastrados` (para nomes) e `pontosEmbarque`. Ambos podem ser buscados independentemente via hooks.
2. **DndContext isolado**: o `MissoesPanel` tera seu proprio `DndContext` interno, completamente separado do DndContext do Mapa de Servico. Nao ha conflito.
3. **React Query deduplica**: tanto `MapaServico` quanto `MissoesPanel` chamam `useMissoes(eventoId)`, mas o React Query reutiliza o cache automaticamente - zero queries duplicadas.
4. **Renderizacao nao-destrutiva**: as duas abas usam `block/hidden` (padrao ja existente), preservando estado de filtros e formularios ao alternar.

## Etapas

### 1. Criar `src/components/motoristas/MissoesPanel.tsx`

Componente standalone que recebe apenas `eventoId` como prop. Internamente:
- Usa `useMissoes(eventoId)` para dados de missoes
- Usa `useMotoristas(eventoId)` para nomes dos motoristas (listagem para filtro e exibicao)
- Usa `usePontosEmbarque(eventoId)` para pontos
- Usa `useSensors` do dnd-kit para o kanban
- Contem TODOS os estados de filtro, modal e drag (movidos de Motoristas.tsx)
- Contem TODO o JSX: filtros, kanban, card view, list view, modais (MissaoTipoModal, MissaoInstantaneaModal, MissaoModal)
- Nenhuma dependencia externa alem dos hooks e componentes ja existentes

### 2. Atualizar `src/pages/MapaServico.tsx`

- Importar `InnerSidebar` e `MissoesPanel`
- Adicionar sidebar com duas abas: **Localizacao** (icone `MapPin`) e **Missoes** (icone `ClipboardList`)
- Layout: sidebar branca a esquerda, conteudo a direita
- Conteudo atual do mapa fica dentro de `div className={activeSection === 'localizacao' ? 'block' : 'hidden'}`
- MissoesPanel fica dentro de `div className={activeSection === 'missoes' ? 'block' : 'hidden'}`
- O DndContext do mapa so esta ativo quando a aba Localizacao esta visivel (ja e o caso com block/hidden, pois o DndContext fica no DOM mas nao interfere)

### 3. Limpar `src/pages/Motoristas.tsx`

Remover:
- Imports: `ClipboardList`, `useMissoes`, `MissaoModal`, `MissaoCard`, `MissaoKanbanCard`, `MissaoKanbanColumn`, `MissaoTipoModal`, `MissaoInstantaneaModal`, `usePontosEmbarque`
- Do array `sections`: remover `{ id: 'missoes', ... }` (fica so Motoristas + Auditoria)
- Estados (linhas 78-88): `showMissaoModal`, `showMissaoTipoModal`, `showMissaoInstantanea`, `editingMissao`, `missaoFilter`, `missaoMotoristaFilter`, `missaoViewMode`, `missaoSearchTerm`, `missaoDataFilter`
- Logica (linhas 1076-1184): `filteredMissoes`, `handleSaveMissao`, `handleDeleteMissao`, `clearMissaoFilters`, `hasActiveMissaoFilters`, `activeMissao`, `handleMissaoDragStart`, `handleMissaoDragEnd`, `missoesByStatus`, `missaoKanbanColumns`
- JSX (linhas 1186-1521): todo o `missoesContent` + modais
- Div de renderizacao (linha 1547-1549): `activeSection === 'missoes'`

Total removido: ~450 linhas de codigo morto

## Arquivos afetados

| Arquivo | Tipo | Mudanca |
|---|---|---|
| `src/components/motoristas/MissoesPanel.tsx` | Novo | Componente standalone com toda logica de missoes (~450 linhas) |
| `src/pages/MapaServico.tsx` | Editado | Adicionar InnerSidebar + integrar MissoesPanel |
| `src/pages/Motoristas.tsx` | Editado | Remover ~450 linhas de codigo de missoes |

## Riscos mitigados

- **Zero codigo morto**: tudo que sai de Motoristas vai para MissoesPanel
- **Zero quebra de funcionalidade**: MissoesPanel usa exatamente os mesmos hooks e componentes
- **Zero conflito de DnD**: cada DndContext e isolado dentro de seu proprio componente
- **Performance mantida**: React Query deduplica queries, renderizacao nao-destrutiva preserva estado
