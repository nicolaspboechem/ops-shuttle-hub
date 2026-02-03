

# Plano: Ajustar Layout do Tutorial para Mobile

## Problema Identificado

O componente `TutorialPopover` apresenta problemas de layout em dispositivos móveis:

1. O popover pode sair da área visível da tela
2. Não considera o espaço ocupado pelo header e bottom nav dos apps mobile
3. A largura fixa de 320px pode ser muito grande em telas pequenas
4. O cálculo de posicionamento horizontal está incorreto para viewports estreitos

## Mudanças Propostas

### 1. Melhorar Responsividade do Popover

- Usar largura adaptativa: `max-w-[min(320px,_calc(100vw-32px))]`
- Centralizar horizontalmente de forma mais simples e confiável
- Garantir margens seguras (16px) em todos os lados

### 2. Considerar Safe Areas

- Detectar se há bottom nav (mobile) e ajustar posição `top: 'top'` para ficar acima dela
- Considerar o header fixo ao calcular posição `bottom`
- Usar `safe-area-inset` para dispositivos com notch

### 3. Simplificar Lógica de Posicionamento

**Antes**: Cálculos complexos com `style` inline
**Depois**: Classes Tailwind + posicionamento simplificado

### 4. Ajustar para Contexto Mobile

- Posição padrão `center` quando não encontrar target
- Padding extra na parte inferior para não sobrepor a bottom nav (80px)

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/app/TutorialPopover.tsx` | Refatorar posicionamento para mobile-first |

---

## Seção Técnica

### Novo Código do TutorialPopover

```tsx
// Ajustes principais:

// 1. Largura responsiva
className="absolute pointer-events-auto w-[calc(100vw-32px)] max-w-[320px]"

// 2. Posicionamento central simplificado (sempre centralizado horizontalmente)
style={{
  left: '50%',
  transform: 'translateX(-50%)',
  ...positionStyles
}}

// 3. Safe area para bottom nav em mobile
const bottomOffset = 80; // Altura da bottom nav + margem

// 4. Cálculo de posição vertical melhorado
if (calculatedPosition === 'top') {
  positionStyles = {
    bottom: `${window.innerHeight - position.y + 16}px`,
  };
} else if (calculatedPosition === 'bottom') {
  positionStyles = {
    top: `${position.y + 16}px`,
  };
} else {
  // Center - considera a bottom nav
  positionStyles = {
    top: '50%',
    transform: 'translate(-50%, -50%)',
    marginBottom: `${bottomOffset}px`,
  };
}
```

### Lógica de Cálculo de Posição Atualizada

```typescript
const calculatePosition = () => {
  // Para posição center, não precisa de target
  if (step.position === 'center' || !step.targetSelector) {
    setCalculatedPosition('center');
    return;
  }

  const target = document.querySelector(step.targetSelector);
  if (!target) {
    setCalculatedPosition('center');
    return;
  }

  const rect = target.getBoundingClientRect();
  const popoverHeight = 200; // Altura aproximada com padding
  const headerHeight = 60; // Altura do header mobile
  const bottomNavHeight = 80; // Altura da bottom nav
  
  const availableTop = rect.top - headerHeight;
  const availableBottom = window.innerHeight - rect.bottom - bottomNavHeight;
  
  // Priorizar posição que tenha mais espaço
  if (step.position === 'top' && availableTop >= popoverHeight) {
    setCalculatedPosition('top');
    setPosition({ x: 0, y: rect.top });
  } else if (availableBottom >= popoverHeight) {
    setCalculatedPosition('bottom');
    setPosition({ x: 0, y: rect.bottom });
  } else if (availableTop >= popoverHeight) {
    setCalculatedPosition('top');
    setPosition({ x: 0, y: rect.top });
  } else {
    // Fallback para center se não couber
    setCalculatedPosition('center');
  }
};
```

### CSS Classes Ajustadas

```tsx
<motion.div
  className={cn(
    "fixed pointer-events-auto mx-4",
    "w-[calc(100vw-32px)] max-w-[320px]",
    "left-1/2 -translate-x-1/2",
    calculatedPosition === 'center' && "top-1/2 -translate-y-1/2 mb-10"
  )}
  style={calculatedPosition !== 'center' ? {
    top: calculatedPosition === 'bottom' ? `${position.y + 12}px` : 'auto',
    bottom: calculatedPosition === 'top' ? `${window.innerHeight - position.y + 12}px` : 'auto',
  } : undefined}
>
```

