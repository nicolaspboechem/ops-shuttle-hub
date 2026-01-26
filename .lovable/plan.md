
# Plano: Redesign da Página Inicial - CCO AS Brasil

## Objetivo
Transformar a página inicial de "TransControl" para "CCO - AS Brasil", exibindo diretamente o painel de eventos públicos com opção de login.

---

## Mudanças Visuais

### ANTES (Atual)
- Ícone de ônibus genérico
- Título "TransControl"
- Dois botões centralizados
- Layout minimalista sem conteúdo

### DEPOIS (Proposto)
- Logo oficial AS Brasil (horizontal)
- Título "CCO - AS Brasil" com subtítulo "Centro de Controle Operacional"
- Grid de eventos públicos diretamente visível
- Botão de login discreto no header
- Visual alinhado com o PainelPublico existente

---

## Estrutura da Nova Página

```text
┌─────────────────────────────────────────────────────┐
│  HEADER                                              │
│  ┌─────────┐                              ┌───────┐ │
│  │ AS Logo │  CCO - AS Brasil             │ LOGIN │ │
│  └─────────┘  Centro de Controle          └───────┘ │
│               Operacional                           │
├─────────────────────────────────────────────────────┤
│  CONTEÚDO PRINCIPAL                                 │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │     Eventos Disponíveis                         ││
│  │     Selecione um evento para ver as rotas       ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  Evento 1 │  │  Evento 2 │  │  Evento 3 │       │
│  │  (Card)   │  │  (Card)   │  │  (Card)   │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                     │
│  (Se não houver eventos: mensagem informativa)     │
└─────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Arquivo: `src/pages/Index.tsx`

**Alterações:**

1. **Imports adicionais:**
   - `useEventosPublicos` para buscar eventos públicos
   - `EventosGrid` para exibir os cards
   - `Input` e `Search` para busca (quando múltiplos eventos)
   - `logoASHorizontal` para o header
   - `useNavigate` para navegação

2. **Comportamento:**
   - Se usuário logado → redireciona para `/eventos` (admin) ou `/app` (staff)
   - Se não logado → exibe landing com eventos públicos
   - Clique no evento → navega para `/painel/:eventoId`
   - Clique em "Entrar" → navega para `/auth`

3. **Layout:**
   - Header sticky com logo AS Brasil e botão "Entrar"
   - Seção de busca (se houver mais de 1 evento)
   - Grid de eventos usando componente existente `EventosGrid`
   - Estado vazio estilizado quando não há eventos

4. **Branding:**
   - Título: "CCO - AS Brasil"
   - Subtítulo: "Centro de Controle Operacional"
   - Logo horizontal da AS Brasil no header
   - Cores consistentes com o restante do sistema

---

## Código Proposto

```tsx
// src/pages/Index.tsx - Estrutura principal

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, Search, Bus } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEventosPublicos } from '@/hooks/useEventosPublicos';
import { EventosGrid } from '@/components/public/EventosGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logoASHorizontal from '@/assets/logo_as_horizontal.png';

const Index = () => {
  const { user, loading: authLoading, isAdmin, eventRoles } = useAuth();
  const { eventos, loading: eventosLoading } = useEventosPublicos();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Redireciona usuários logados
  if (user && !authLoading) {
    if (isAdmin) return <Navigate to="/eventos" replace />;
    if (eventRoles.length > 0) return <Navigate to="/app" replace />;
  }

  // Filtra eventos pela busca
  const filteredEventos = eventos.filter(e =>
    e.nome_planilha.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (authLoading || eventosLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header com logo e botão login */}
      <Header onLogin={() => navigate('/auth')} />

      {/* Conteúdo principal */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {eventos.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <TitleSection />
            {eventos.length > 1 && (
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            )}
            <EventosGrid
              eventos={filteredEventos}
              onSelect={(id) => navigate(`/painel/${id}`)}
            />
          </>
        )}
      </main>
    </div>
  );
};
```

---

## Resumo de Alterações

| Componente | Alteração |
|------------|-----------|
| `src/pages/Index.tsx` | Reescrever completamente com nova estrutura |
| Branding | "TransControl" → "CCO - AS Brasil" |
| Layout | Cards centralizados → Grid de eventos com header |
| Funcionalidade | Eventos públicos carregados diretamente |
| Navegação | Evento clicado → `/painel/:id` |
| Login | Botão discreto no header → `/auth` |

---

## Benefícios

1. **Conteúdo imediato** - Visitante vê eventos disponíveis sem cliques extras
2. **Identidade visual** - Marca AS Brasil em destaque
3. **Experiência fluida** - Mesma estrutura do PainelPublico, evitando página intermediária desnecessária
4. **Reutilização** - Usa componentes existentes (EventosGrid, EventoCard)
5. **Consistência** - Visual alinhado com Auth.tsx e PainelPublico.tsx
