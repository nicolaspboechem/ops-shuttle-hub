

# Plano: Tutorial de Onboarding para Admin dentro do Evento

## Visão Geral

Adicionar um tutorial guiado para administradores quando acessam um evento pela primeira vez. O tutorial explicará as funcionalidades específicas do contexto de evento: Dashboard, Viagens, Motoristas, Veículos, Auditoria e Equipe.

## Diferença do Tutorial Atual

| Tutorial | Contexto | Quando aparece |
|----------|----------|----------------|
| **Admin CCO** (existente) | Página Home (/eventos) | 1º acesso ao sistema |
| **Admin Evento** (novo) | Dashboard do evento | 1º acesso a qualquer evento |

## Fluxo do Tutorial

```text
Admin entra no evento pela 1ª vez
           │
           ▼
┌─────────────────────────────────────────┐
│   Tutorial "Bem-vindo ao Evento!"       │
│   Step 1: Visão geral do Dashboard      │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   Step 2: Menu lateral                  │
│   "Navegue pelas seções do evento"      │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   Step 3: Viagens Ativas                │
│   "Acompanhe todas as viagens"          │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   Step 4: Cadastros                     │
│   "Gerencie motoristas e veículos"      │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   Step 5: Equipe                        │
│   "Adicione operadores e supervisores"  │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   Step 6: Configurações                 │
│   "Personalize a operação"              │
└─────────────────────────────────────────┘
```

## Steps do Tutorial

1. **Bem-vindo ao Evento**
   - Posição: Center
   - "Este é o painel de controle do evento. Aqui você monitora e gerencia toda a operação."

2. **Dashboard em Tempo Real**
   - Target: Cards de métricas
   - "Acompanhe viagens ativas, motoristas online e veículos em operação em tempo real."

3. **Viagens**
   - Target: Link "Viagens Ativas" no menu
   - "Veja todas as viagens em andamento e finalizadas. Use os filtros para encontrar rapidamente."

4. **Cadastros**
   - Target: Seção "Cadastros" no menu
   - "Cadastre e gerencie motoristas, veículos e rotas shuttle."

5. **Equipe do Evento**
   - Target: Link "Equipe" no menu
   - "Adicione operadores e supervisores. Eles terão acesso apenas a este evento."

6. **Configurações**
   - Target: Link "Configurações" no menu
   - "Personalize horários, alertas e módulos ativos da operação."

7. **Central de Ajuda**
   - Posição: Center
   - "Precisa de ajuda? Use o botão de ajuda (?) para ver guias e FAQs."

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useTutorial.ts` | Adicionar `adminEventoSteps` |
| `src/pages/Dashboard.tsx` | Integrar tutorial + botão de ajuda |
| `src/components/layout/AppSidebar.tsx` | Adicionar `data-tutorial` nos links |

## Estrutura do localStorage

```text
tutorial_admin_seen = "true"        // Tutorial do CCO (já existe)
tutorial_admin_evento_seen = "true" // Tutorial do Evento (novo)
```

Usar chave diferente para que o tutorial do evento apareça independentemente do tutorial do CCO.

---

## Seção Técnica

### Novos Steps para Admin Evento

```typescript
export const adminEventoSteps: TutorialStep[] = [
  {
    id: 'welcome-evento',
    title: 'Bem-vindo ao Evento!',
    description: 'Este é o painel de controle da operação. Aqui você monitora viagens, gerencia equipe e acompanha métricas em tempo real.',
    position: 'center',
  },
  {
    id: 'dashboard-metricas',
    title: 'Métricas em Tempo Real',
    description: 'Os cards mostram viagens ativas, motoristas online, veículos em operação e tempo médio. Tudo atualiza automaticamente.',
    targetSelector: '[data-tutorial="metrics"]',
    position: 'bottom',
  },
  {
    id: 'viagens',
    title: 'Viagens',
    description: 'Acompanhe viagens ativas e finalizadas. Use filtros por status, tipo de operação e motorista.',
    targetSelector: '[data-tutorial="viagens"]',
    position: 'right',
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    description: 'Gerencie motoristas, veículos e rotas shuttle. Todos os cadastros são específicos deste evento.',
    targetSelector: '[data-tutorial="cadastros"]',
    position: 'right',
  },
  {
    id: 'equipe',
    title: 'Equipe do Evento',
    description: 'Adicione operadores e supervisores. Eles poderão acessar apenas este evento com suas funções específicas.',
    targetSelector: '[data-tutorial="equipe"]',
    position: 'right',
  },
  {
    id: 'configuracoes-evento',
    title: 'Configurações',
    description: 'Personalize horário de virada do dia, alertas de atraso e módulos ativos (Missões, Shuttle, Transfer).',
    targetSelector: '[data-tutorial="configuracoes"]',
    position: 'right',
  },
  {
    id: 'ajuda-evento',
    title: 'Precisa de Ajuda?',
    description: 'Use o botão de ajuda para ver guias, FAQs e entrar em contato com o suporte quando precisar.',
    position: 'center',
  },
];
```

### Modificações no AppSidebar

Adicionar atributos `data-tutorial` para os seletores:

```tsx
// Seção Monitoramento
{ name: 'Viagens Ativas', href: '...', icon: Bus, dataTutorial: 'viagens' },

// Seção Cadastros
<div data-tutorial="cadastros">...</div>

// Seção Administração
{ name: 'Equipe', href: '...', icon: Users, dataTutorial: 'equipe' },

// Configurações
{ name: 'Configurações', href: '...', icon: Settings, dataTutorial: 'configuracoes' },
```

### Integração no Dashboard

```tsx
import { useTutorial, adminEventoSteps } from '@/hooks/useTutorial';
import { TutorialPopover } from '@/components/app/TutorialPopover';
import { HelpDrawer } from '@/components/app/HelpDrawer';

export default function Dashboard() {
  const tutorial = useTutorial('admin_evento', adminEventoSteps);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <EventLayout>
      {/* Botão de ajuda no header */}
      <Button onClick={() => setShowHelp(true)}>
        <HelpCircle className="h-4 w-4" />
      </Button>

      {/* Cards de métricas */}
      <div data-tutorial="metrics">
        ...
      </div>

      {/* Tutorial Popover */}
      {tutorial.isActive && tutorial.currentStep && (
        <TutorialPopover
          step={tutorial.currentStep}
          currentIndex={tutorial.currentIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.next}
          onSkip={tutorial.skip}
          onComplete={tutorial.complete}
        />
      )}

      {/* Drawer de ajuda */}
      <HelpDrawer 
        open={showHelp} 
        onOpenChange={setShowHelp} 
        role="admin" 
      />
    </EventLayout>
  );
}
```

### Atualização do Hook useTutorial

Atualizar o tipo `TutorialRole` para incluir o novo papel:

```typescript
export type TutorialRole = 'motorista' | 'operador' | 'supervisor' | 'cliente' | 'admin' | 'admin_evento';
```

