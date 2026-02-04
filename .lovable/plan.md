

# Plano: Interface Azul - Header e Navegação Inferior

## Objetivo

Aplicar fundo azul (`bg-primary`) tanto na **barra de navegação inferior** quanto no **header superior** de todos os apps mobile, garantindo consistência visual em qualquer dispositivo, independente do tema (claro/escuro).

---

## Componentes Afetados

### Navegação Inferior (Bottom Nav)
| Arquivo | App |
|---------|-----|
| `src/components/app/MotoristaBottomNav.tsx` | Motorista |
| `src/components/app/OperadorBottomNav.tsx` | Operador |
| `src/components/app/SupervisorBottomNav.tsx` | Supervisor |
| `src/components/app/ClienteBottomNav.tsx` | Cliente |

### Header Superior
| Arquivo | App |
|---------|-----|
| `src/pages/app/AppMotorista.tsx` | Motorista |
| `src/pages/app/AppOperador.tsx` | Operador |
| `src/pages/app/AppSupervisor.tsx` | Supervisor |
| `src/pages/app/AppHome.tsx` | Seleção de Evento |
| `src/components/app/ClienteHeaderNav.tsx` | Cliente (desktop) |

---

## Mudanças Visuais

```text
┌─────────────────────────────────────┐
│ ████████████ AZUL ████████████████  │ ← Header azul
│ [Logo]  Evento XYZ        [Menu] ⋯  │
├─────────────────────────────────────┤
│                                     │
│         Conteúdo do App             │
│         (área branca/escura)        │
│                                     │
├─────────────────────────────────────┤
│ ████████████ AZUL ████████████████  │ ← Bottom nav azul
│ 🏠      🚗      ⚪      📋      ⋯   │
│ Início  Veículo [+]  Histórico Mais │
└─────────────────────────────────────┘
```

---

## Seção Técnica

### 1. Bottom Navigation - Mudanças

**Container `<nav>`:**
```tsx
// Antes
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">

// Depois
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-primary safe-area-bottom">
```

**Botões normais:**
```tsx
// Antes
className={cn(
  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full nav-item-interactive rounded-lg",
  isActive ? "text-primary" : "text-muted-foreground"
)}

// Depois
className={cn(
  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors",
  isActive 
    ? "text-primary-foreground" 
    : "text-primary-foreground/70 hover:text-primary-foreground/90"
)}
```

**Ícones (simplificar):**
```tsx
// Antes
<Icon className={cn("w-5 h-5", isActive && "text-primary")} />

// Depois
<Icon className="w-5 h-5" />
```

**Labels:**
```tsx
// Antes
<span className="text-[10px] font-medium">{tab.label}</span>

// Depois
<span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>
  {tab.label}
</span>
```

**Botão central (Nova/Corrida) - Inverter cores:**
```tsx
// Antes
<div className={cn(
  "w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg",
  "bg-primary text-primary-foreground"
)}>

// Depois - Círculo branco com ícone azul
<div className="w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg bg-white text-primary">
```

### 2. Header Superior - Mudanças

**Container `<header>`:**
```tsx
// Antes
<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">

// Depois
<header className="sticky top-0 z-50 bg-primary safe-area-top">
```

**Logo (usar versão branca):**
```tsx
// Antes
import logoAS from '@/assets/as_logo_reduzida_preta.png';

// Depois
import logoAS from '@/assets/as_logo_reduzida_branca.png';
```

**Textos do header:**
```tsx
// Antes
<h1 className="text-base font-semibold">{eventoNome}</h1>
<span className="text-xs text-muted-foreground">{role}</span>

// Depois
<h1 className="text-base font-semibold text-primary-foreground">{eventoNome}</h1>
<span className="text-xs text-primary-foreground/70">{role}</span>
```

**Botões/ícones do header:**
```tsx
// Antes
<Button variant="ghost" size="icon">
  <MoreVertical className="w-5 h-5" />
</Button>

// Depois
<Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
  <MoreVertical className="w-5 h-5" />
</Button>
```

### 3. ClienteHeaderNav (Desktop)

Similar ao header mobile, mas mantendo os botões de tab:
```tsx
// Header
<header className="sticky top-0 z-50 bg-primary">

// Botões de tab
<Button
  variant={isActive ? "secondary" : "ghost"}
  className={cn(
    isActive 
      ? "bg-white text-primary" 
      : "text-primary-foreground hover:bg-white/10"
  )}
>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `MotoristaBottomNav.tsx` | Nav azul + textos brancos |
| `OperadorBottomNav.tsx` | Nav azul + textos brancos |
| `SupervisorBottomNav.tsx` | Nav azul + textos brancos |
| `ClienteBottomNav.tsx` | Nav azul + textos brancos |
| `AppMotorista.tsx` | Header azul + logo branca |
| `AppOperador.tsx` | Header azul + logo branca |
| `AppSupervisor.tsx` | Header azul + logo branca |
| `AppHome.tsx` | Header azul + logo branca |
| `ClienteHeaderNav.tsx` | Header azul + logo branca |

---

## Resultado Esperado

1. **Identidade visual forte** - Azul primário presente em header e navegação
2. **Consistência entre temas** - Mesmo visual em modo claro e escuro
3. **Delimitação clara** - Header e nav bem definidos em qualquer dispositivo
4. **Contraste adequado** - Texto branco sobre azul garante legibilidade
5. **Botão central destacado** - Inversão de cores (branco/azul) para ação principal

