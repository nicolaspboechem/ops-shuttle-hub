
# Corrigir layout do Mapa de Servico para usar sidebar interna do evento

## Problema

O `MapaServico.tsx` esta usando `MainLayout` (sidebar externa com Home, Eventos, etc.) em vez de `EventLayout` (sidebar interna do evento com Dashboard, Viagens Ativas, etc.). Todas as outras paginas dentro de `/evento/:eventoId/*` usam `EventLayout`.

## Solucao

Alterar uma unica linha no arquivo `src/pages/MapaServico.tsx`:
- Trocar o import de `MainLayout` por `EventLayout`
- Trocar `<MainLayout>` por `<EventLayout>` no JSX

Isso fara o Mapa de Servico usar a mesma sidebar interna do evento que o Dashboard, Viagens Ativas e as demais paginas do CCO.

## Arquivo modificado

1. **Editar** `src/pages/MapaServico.tsx`
   - Linha 8: trocar `import { MainLayout }` por `import { EventLayout }`
   - No JSX: trocar `<MainLayout>` / `</MainLayout>` por `<EventLayout>` / `</EventLayout>`

Nenhum outro arquivo precisa ser alterado -- a rota (`/evento/:eventoId/mapa-servico`) e o item no AppSidebar ja estao corretos.
