

# Corrigir Flickering na Sidebar do Evento

## Causa Raiz

O componente `NavItem` esta definido como funcao **dentro** do render de `AppSidebar` (linha 100). Isso e um anti-pattern classico do React: cada re-render do `AppSidebar` cria uma **nova referencia** de `NavItem`, fazendo o React desmontar e remontar todos os elementos do menu. O resultado e:

- Tooltips perdem estado e piscam (`data-state="delayed-open"` aparecendo repetidamente)
- Hover e clique sao interrompidos pela remontagem
- Qualquer re-render do componente pai (causado por hooks como `useEventos`) aciona o problema

## Solucao

Extrair `NavItem` para fora do corpo do `AppSidebar`, transformando-o em um componente separado no mesmo arquivo. As props `collapsed` e `isBottom` passam a ser recebidas como props explicitas em vez de dependerem de closure.

## Detalhes Tecnicos

### Arquivo: `src/components/layout/AppSidebar.tsx`

1. Criar interface `NavItemProps` com: `item`, `collapsed`, `isBottom`
2. Mover a funcao `NavItem` para fora do `AppSidebar`, antes da definicao do componente principal
3. Receber `collapsed` como prop em vez de ler do escopo pai
4. Usar `React.memo` no `NavItem` extraido para evitar re-renders desnecessarios quando as props nao mudam

Estrutura resultante:

```text
// Fora do AppSidebar - componente estavel
const NavItem = memo(({ item, collapsed, isBottom }: NavItemProps) => {
  // ... mesma logica atual, mas com collapsed vindo das props
});

// Componente principal
export function AppSidebar(...) {
  // ... sem NavItem dentro do render
  // Uso: <NavItem item={item} collapsed={collapsed} isBottom />
}
```

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/AppSidebar.tsx` | Extrair NavItem para fora do render + React.memo |

