

# Paginacao com 10 itens e aba "Mais" no Header

## 1. Paginacao de 10 em 10

**Arquivo: `src/pages/app/AppOperador.tsx`**

- Alterar o `usePaginatedList` para usar `defaultPageSize: 10` nas listas de viagens ativas e encerradas
- Remover o seletor de tamanho de pagina (20/50/100) do `LoadMoreFooter` -- no mobile, so precisa do botao "Ver mais" e do contador "Exibindo X de Y"
- Aplicar tambem nas missoes ativas e finalizadas (adicionar `usePaginatedList` para elas)

**Arquivo: `src/components/ui/load-more-footer.tsx`**

- Tornar o seletor de page size opcional via prop `showPageSizeSelector?: boolean` (default true para desktop, false para mobile)
- Ou: o AppOperador simplesmente nao passa `onPageSizeChange` / nao renderiza o seletor

## 2. Mover aba "Mais" para o Header

**Arquivo: `src/components/app/OperadorBottomNav.tsx`**

- Remover a aba "mais" do array de tabs do bottom nav (ficam apenas: Viagens, Nova, Historico)

**Arquivo: `src/pages/app/AppOperador.tsx`**

- Adicionar um botao com icone `MoreHorizontal` (tres pontinhos) no header, ao lado do botao de refresh
- Ao clicar, abre o conteudo da aba "Mais" (pode usar um Drawer/Sheet que sobe de baixo, ou um DropdownMenu com as opcoes de logout/info)
- Alternativa mais simples: adicionar um `DropdownMenu` no header com as opcoes que estao no `OperadorMaisTab` (nome do usuario, evento, botao sair)

## Detalhes Tecnicos

### Paginacao (AppOperador.tsx)
```
// Antes (default 20)
usePaginatedList(sortedAtivas)

// Depois (default 10)
usePaginatedList(sortedAtivas, { defaultPageSize: 10 })
usePaginatedList(sortedEncerradas, { defaultPageSize: 10 })
```

Adicionar paginacao tambem para missoes:
```
usePaginatedList(missoesAtivasFiltradas, { defaultPageSize: 10 })
usePaginatedList(missoesFinalizadasFiltradas, { defaultPageSize: 10 })
```

### Header com "Mais" (AppOperador.tsx)
- Adicionar `DropdownMenu` no header com: nome do usuario, nome do evento, separador, "Trocar Evento", "Sair"
- Usar o mesmo pattern do `MobileHeader` que ja existe no projeto

### BottomNav (OperadorBottomNav.tsx)
- Remover entrada `{ id: 'mais', ... }` do array `tabs`
- Manter tipo `OperadorTabId` sem 'mais' ou manter para compatibilidade

### Arquivos alterados
1. `src/pages/app/AppOperador.tsx` -- paginacao 10, header com menu "mais"
2. `src/components/app/OperadorBottomNav.tsx` -- remover aba "mais"
3. `src/components/ui/load-more-footer.tsx` -- prop opcional para ocultar seletor de tamanho

