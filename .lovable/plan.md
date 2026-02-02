
# Plano: Hover Animations + Tutorial de Primeiro Login (Apps de Equipe)

## Objetivo

Adicionar duas melhorias de UX aos aplicativos de campo (Motorista, Operador, Supervisor, Cliente):

1. **Hover Animations** - Efeitos visuais de interacao em cards e botoes
2. **Tutorial de Primeiro Login** - Popups guiados que aparecem apenas no primeiro acesso de cada usuario

---

## Escopo

**Aplicativos afetados:**
- AppMotorista (`/app/:eventoId/motorista`)
- AppOperador (`/app/:eventoId/operador`)
- AppSupervisor (`/app/:eventoId/supervisor`)
- AppCliente (`/app/:eventoId/cliente`)

**Excluido:** Interface Admin (CCO) - rotas `/evento/...`

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                    HOVER ANIMATIONS                             │
├─────────────────────────────────────────────────────────────────┤
│  tailwind.config.ts                                             │
│    - Novas animacoes: hover-lift, hover-glow, tap-shrink        │
│                                                                 │
│  src/index.css                                                  │
│    - Classes utilitarias: .interactive-card, .interactive-btn   │
├─────────────────────────────────────────────────────────────────┤
│  Componentes atualizados:                                       │
│    - ViagemCardMobile.tsx                                       │
│    - MissaoCardMobile.tsx                                       │
│    - SupervisorMotoristaCard.tsx                                │
│    - VeiculoCardSupervisor.tsx                                  │
│    - MotoristaBottomNav.tsx                                     │
│    - OperadorBottomNav.tsx                                      │
│    - SupervisorBottomNav.tsx                                    │
│    - ClienteBottomNav.tsx                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  TUTORIAL DE PRIMEIRO LOGIN                     │
├─────────────────────────────────────────────────────────────────┤
│  src/hooks/useTutorial.ts (NOVO)                                │
│    - Hook para gerenciar estado do tutorial                     │
│    - Usa localStorage para persistir "ja visto"                 │
│    - Chave por role: tutorial_motorista_seen, etc.              │
├─────────────────────────────────────────────────────────────────┤
│  src/components/app/TutorialPopover.tsx (NOVO)                  │
│    - Componente reutilizavel de popover animado                 │
│    - Suporte a steps multiplos                                  │
│    - Botoes "Proximo", "Pular", "Concluir"                      │
├─────────────────────────────────────────────────────────────────┤
│  src/components/app/TutorialOverlay.tsx (NOVO)                  │
│    - Overlay escurecido com spotlight no elemento alvo          │
│    - Suporta diferentes posicoes (top, bottom, left, right)     │
├─────────────────────────────────────────────────────────────────┤
│  Integracao nos Apps:                                           │
│    - AppMotorista.tsx: Tutorial sobre missoes e viagens         │
│    - AppOperador.tsx: Tutorial sobre criar viagens              │
│    - AppSupervisor.tsx: Tutorial sobre frota e localizador      │
│    - AppCliente.tsx: Tutorial sobre dashboard                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Secao Tecnica

### 1. Hover Animations - Tailwind Config

Adicionar novos keyframes e animacoes:

```typescript
// tailwind.config.ts
keyframes: {
  // ... existentes ...
  "hover-lift": {
    "0%": { transform: "translateY(0)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
    "100%": { transform: "translateY(-2px)", boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }
  },
  "tap-shrink": {
    "0%": { transform: "scale(1)" },
    "50%": { transform: "scale(0.97)" },
    "100%": { transform: "scale(1)" }
  },
},
animation: {
  // ... existentes ...
  "hover-lift": "hover-lift 0.2s ease-out forwards",
  "tap-shrink": "tap-shrink 0.15s ease-out",
}
```

### 2. Classes Utilitarias - index.css

```css
@layer utilities {
  /* Interactive card with hover effect */
  .interactive-card {
    @apply transition-all duration-200 ease-out;
    @apply hover:shadow-lg hover:-translate-y-0.5;
    @apply active:scale-[0.98] active:shadow-md;
  }
  
  /* Interactive button with press feedback */
  .interactive-btn {
    @apply transition-all duration-150;
    @apply hover:brightness-110 hover:scale-105;
    @apply active:scale-95 active:brightness-95;
  }
  
  /* Bottom nav item */
  .nav-item-interactive {
    @apply transition-all duration-200;
    @apply hover:bg-muted/50 active:bg-muted;
  }
}
```

### 3. Hook useTutorial

```typescript
// src/hooks/useTutorial.ts
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;  // CSS selector do elemento alvo
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface UseTutorialReturn {
  isActive: boolean;
  currentStep: TutorialStep | null;
  currentIndex: number;
  totalSteps: number;
  next: () => void;
  skip: () => void;
  complete: () => void;
}

export function useTutorial(
  role: 'motorista' | 'operador' | 'supervisor' | 'cliente',
  steps: TutorialStep[]
): UseTutorialReturn {
  const storageKey = `tutorial_${role}_seen`;
  const [hasSeen, setHasSeen] = useState(() => 
    localStorage.getItem(storageKey) === 'true'
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  const markAsSeen = () => {
    localStorage.setItem(storageKey, 'true');
    setHasSeen(true);
  };

  // ... lógica de navegação ...
}
```

### 4. Componente TutorialPopover

```typescript
// src/components/app/TutorialPopover.tsx
interface TutorialPopoverProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function TutorialPopover({ ... }: TutorialPopoverProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed z-[100] bg-card border rounded-lg shadow-xl p-4 max-w-xs"
    >
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} de {totalSteps}
          </span>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Pular
            </Button>
            {currentIndex < totalSteps - 1 ? (
              <Button size="sm" onClick={onNext}>
                Proximo
              </Button>
            ) : (
              <Button size="sm" onClick={onComplete}>
                Concluir
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

### 5. Tutorial Steps por App

**Motorista:**
```typescript
const motoristaSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao App Motorista!',
    description: 'Aqui voce vera suas missoes e viagens designadas.',
  },
  {
    id: 'checkin',
    title: 'Check-in Diario',
    description: 'Faca seu check-in para comecar a receber viagens.',
    targetSelector: '[data-tutorial="checkin"]',
  },
  {
    id: 'viagens',
    title: 'Suas Viagens',
    description: 'Deslize para a direita para iniciar uma viagem, ou toque no botao.',
    targetSelector: '[data-tutorial="viagem-card"]',
  },
  {
    id: 'nav',
    title: 'Navegacao',
    description: 'Use a barra inferior para acessar Veiculo, criar Corrida e ver Historico.',
    targetSelector: 'nav',
  },
];
```

**Supervisor:**
```typescript
const supervisorSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Painel do Supervisor',
    description: 'Gerencie frota, viagens e localizacao da equipe.',
  },
  {
    id: 'stats',
    title: 'Filtros Rapidos',
    description: 'Toque nos cards de status para filtrar motoristas ou veiculos.',
    targetSelector: '[data-tutorial="stats"]',
  },
  {
    id: 'swipe',
    title: 'Acoes Rapidas',
    description: 'Deslize os cards para realizar acoes como editar localizacao ou vincular veiculos.',
  },
  {
    id: 'nova',
    title: 'Criar Viagem',
    description: 'Toque no botao central para criar uma nova viagem rapidamente.',
    targetSelector: '[data-tutorial="nova-btn"]',
  },
];
```

### 6. Integracao nos Apps

Exemplo para AppMotorista:

```typescript
// AppMotorista.tsx
import { useTutorial } from '@/hooks/useTutorial';
import { TutorialPopover } from '@/components/app/TutorialPopover';

const motoristaSteps = [ /* ... */ ];

export default function AppMotorista() {
  const tutorial = useTutorial('motorista', motoristaSteps);
  
  // ... codigo existente ...

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Tutorial Overlay */}
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
      
      {/* Adicionar data-tutorial nos elementos alvo */}
      <CheckinCheckoutCard data-tutorial="checkin" ... />
      
      {/* ... resto do layout ... */}
    </div>
  );
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/hooks/useTutorial.ts` | CRIAR | Hook de estado do tutorial |
| `src/components/app/TutorialPopover.tsx` | CRIAR | Componente de popup do tutorial |
| `tailwind.config.ts` | MODIFICAR | Adicionar keyframes de hover |
| `src/index.css` | MODIFICAR | Adicionar classes utilitarias |
| `src/components/app/ViagemCardMobile.tsx` | MODIFICAR | Adicionar interactive-card |
| `src/components/app/MissaoCardMobile.tsx` | MODIFICAR | Adicionar interactive-card |
| `src/components/app/SupervisorMotoristaCard.tsx` | MODIFICAR | Adicionar interactive-card |
| `src/components/app/VeiculoCardSupervisor.tsx` | MODIFICAR | Adicionar interactive-card |
| `src/components/app/MotoristaBottomNav.tsx` | MODIFICAR | Adicionar nav-item-interactive |
| `src/components/app/OperadorBottomNav.tsx` | MODIFICAR | Adicionar nav-item-interactive |
| `src/components/app/SupervisorBottomNav.tsx` | MODIFICAR | Adicionar nav-item-interactive |
| `src/components/app/ClienteBottomNav.tsx` | MODIFICAR | Adicionar nav-item-interactive |
| `src/pages/app/AppMotorista.tsx` | MODIFICAR | Integrar tutorial |
| `src/pages/app/AppOperador.tsx` | MODIFICAR | Integrar tutorial |
| `src/pages/app/AppSupervisor.tsx` | MODIFICAR | Integrar tutorial |
| `src/pages/app/AppCliente.tsx` | MODIFICAR | Integrar tutorial |

---

## Fluxo do Tutorial

```text
Usuario faz primeiro login
         │
         ▼
┌─────────────────────────────────┐
│ useTutorial verifica localStorage│
│ tutorial_${role}_seen === null  │
└─────────────────────────────────┘
         │ Nao visto
         ▼
┌─────────────────────────────────┐
│ TutorialPopover aparece         │
│ com animacao fade-in            │
└─────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
[Proximo]  [Pular]
    │         │
    ▼         └────────────────┐
Proximo step                   │
    │                          ▼
    └───► Ultimo step ───► [Concluir]
                              │
                              ▼
                   localStorage.set(key, 'true')
                   Tutorial nunca mais aparece
```

---

## Resultado Visual

### Hover Animation em Card

```text
Estado normal:
┌──────────────────────────────────┐
│ Viagem Card                      │
│ (shadow normal)                  │
└──────────────────────────────────┘

Hover/Touch:
┌──────────────────────────────────┐  ↑ translate -2px
│ Viagem Card                      │
│ (shadow increased)               │
└──────────────────────────────────┘
      ████████████████████  <- sombra mais pronunciada
```

### Tutorial Popover

```text
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────┐        │
│  │ 👋 Bem-vindo!           │        │
│  │                         │        │
│  │ Aqui voce vera suas     │        │
│  │ missoes designadas.     │        │
│  │                         │        │
│  │ 1 de 4    [Pular] [▶]   │        │
│  └─────────────────────────┘        │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ CheckinCard (destacado)        │ │
│  └────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## Ordem de Implementacao

1. Adicionar animacoes no Tailwind config
2. Criar classes utilitarias no index.css
3. Aplicar classes nos cards existentes
4. Aplicar classes nas bottom navs
5. Criar hook useTutorial
6. Criar componente TutorialPopover
7. Integrar tutorial no AppMotorista
8. Integrar tutorial no AppOperador
9. Integrar tutorial no AppSupervisor
10. Integrar tutorial no AppCliente
