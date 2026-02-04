

# Plano: Sistema de Versionamento do App - V1.0.0

## Objetivo

Criar um sistema centralizado de versionamento que exiba a versão atual (V1.0.0) em todas as interfaces do app (desktop e mobile), facilitando o controle e acompanhamento de atualizações.

---

## Estratégia de Versionamento

### Padrão Semântico (SemVer)
Seguir o padrão **MAJOR.MINOR.PATCH**:

| Tipo | Quando incrementar | Exemplo |
|------|-------------------|---------|
| **MAJOR** | Mudanças que quebram compatibilidade ou redesigns completos | 1.0.0 → 2.0.0 |
| **MINOR** | Novas funcionalidades sem quebrar compatibilidade | 1.0.0 → 1.1.0 |
| **PATCH** | Correções de bugs e pequenas melhorias | 1.0.0 → 1.0.1 |

### Como Atualizar
Para atualizar a versão, basta editar **um único arquivo** (`src/lib/version.ts`) e a mudança reflete automaticamente em todas as interfaces.

---

## Onde a Versão Será Exibida

| Interface | Localização | Formato |
|-----------|-------------|---------|
| **Sidebar Desktop** | Rodapé, abaixo do botão Sair | `V1.0.0` discreto |
| **Configurações** | Card informativo no topo | Badge com versão |
| **App Motorista** | Aba "Mais" | Texto discreto no rodapé |
| **App Operador** | Aba "Mais" | Texto discreto no rodapé |
| **App Supervisor** | Aba "Mais" | Texto discreto no rodapé |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/version.ts` | **CRIAR** | Arquivo central com constante de versão |
| `src/components/layout/AppSidebar.tsx` | Modificar | Exibir versão no rodapé |
| `src/pages/Configuracoes.tsx` | Modificar | Adicionar card de versão |
| `src/components/app/SupervisorMaisTab.tsx` | Modificar | Exibir versão no rodapé |
| `src/components/app/OperadorMaisTab.tsx` | Modificar | Exibir versão no rodapé |
| `package.json` | Modificar | Sincronizar versão para 1.0.0 |

---

## Seção Técnica

### 1. Arquivo Central de Versão

Criar `src/lib/version.ts`:

```typescript
/**
 * Versão do aplicativo CCO AS Brasil
 * 
 * Seguir padrão SemVer (MAJOR.MINOR.PATCH):
 * - MAJOR: Mudanças que quebram compatibilidade ou redesigns
 * - MINOR: Novas funcionalidades sem quebrar compatibilidade  
 * - PATCH: Correções de bugs e pequenas melhorias
 * 
 * Atualizar este arquivo a cada nova versão!
 */
export const APP_VERSION = '1.0.0';

// Informações adicionais opcionais
export const APP_BUILD_DATE = '2026-02-04';
export const APP_NAME = 'CCO AS Brasil';
```

### 2. Componente de Exibição da Versão

Criar componente reutilizável para consistência visual:

```typescript
// src/components/ui/version-badge.tsx
import { APP_VERSION } from '@/lib/version';

interface VersionBadgeProps {
  className?: string;
  variant?: 'default' | 'subtle';
}

export function VersionBadge({ className, variant = 'default' }: VersionBadgeProps) {
  if (variant === 'subtle') {
    return (
      <span className={cn("text-[10px] text-muted-foreground/50", className)}>
        V{APP_VERSION}
      </span>
    );
  }
  
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      V{APP_VERSION}
    </span>
  );
}
```

### 3. Sidebar Desktop - Rodapé

Adicionar no `AppSidebar.tsx`, após o botão de logout:

```tsx
import { APP_VERSION } from '@/lib/version';

// No rodapé da sidebar, após o botão Sair
<div className="py-2 text-center">
  <span className="text-[10px] text-sidebar-foreground/40">
    V{APP_VERSION}
  </span>
</div>
```

### 4. Página de Configurações - Card de Versão

Adicionar card no final da página:

```tsx
import { APP_VERSION, APP_BUILD_DATE } from '@/lib/version';
import { Info } from 'lucide-react';

// Após os outros cards
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Info className="w-5 h-5 text-primary" />
        <div>
          <CardTitle className="text-base">Sobre o Sistema</CardTitle>
          <CardDescription>Informações da versão atual</CardDescription>
        </div>
      </div>
      <Badge variant="secondary" className="font-mono">
        V{APP_VERSION}
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      CCO AS Brasil - Centro de Controle Operacional
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Atualizado em {format(parseISO(APP_BUILD_DATE), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
    </p>
  </CardContent>
</Card>
```

### 5. Tabs "Mais" dos Apps Mobile

Adicionar no rodapé de cada aba:

```tsx
import { APP_VERSION } from '@/lib/version';

// No final do componente, antes do fechamento
<div className="text-center py-4">
  <span className="text-[10px] text-muted-foreground/50">
    CCO AS Brasil · V{APP_VERSION}
  </span>
</div>
```

### 6. Sincronizar package.json

Atualizar a versão no package.json para consistência:

```json
{
  "name": "vite_react_shadcn_ts",
  "private": true,
  "version": "1.0.0",
  ...
}
```

---

## Interface Visual

### Sidebar Desktop (Colapsada e Expandida)
```
┌─────────────────────────────┐    ┌────────┐
│ AS BRASIL                   │    │ [logo] │
│ CCO                         │    ├────────┤
├─────────────────────────────┤    │  ...   │
│ ...navegação...             │    ├────────┤
├─────────────────────────────┤    │ [⚙️]   │
│ ⚙️ Configurações            │    │ [🚪]   │
│ 🚪 Sair                     │    ├────────┤
├─────────────────────────────┤    │ V1.0.0 │
│         V1.0.0              │    └────────┘
└─────────────────────────────┘
```

### Aba "Mais" Mobile
```
┌─────────────────────────────────────┐
│ 🛡️ Perfil Supervisor               │
│ Usuário: João                       │
│ Evento: Operação XYZ                │
├─────────────────────────────────────┤
│ ...outras opções...                 │
├─────────────────────────────────────┤
│ [🚪 Sair do Sistema]                │
├─────────────────────────────────────┤
│      CCO AS Brasil · V1.0.0         │
└─────────────────────────────────────┘
```

---

## Resultado Esperado

1. **Versão centralizada** - Um único arquivo para atualizar
2. **Visível em todas as interfaces** - Desktop e mobile
3. **Formato consistente** - Mesmo padrão visual em todos os lugares
4. **Fácil de atualizar** - Apenas editar `src/lib/version.ts`
5. **Rastreabilidade** - Usuários e equipe sabem qual versão estão usando

---

## Processo de Atualização Futuro

Sempre que fizer uma nova versão:

1. Editar `src/lib/version.ts`:
   - Incrementar `APP_VERSION` seguindo SemVer
   - Atualizar `APP_BUILD_DATE`
   
2. Opcional: Atualizar `package.json` para manter sincronizado

3. A versão será atualizada automaticamente em todas as interfaces

